use serde::Serialize;
use std::collections::HashMap;
use std::io::{BufRead, BufReader};

#[derive(Debug, Serialize, Clone)]
pub struct UsageEntry {
    pub date: String,
    pub cost_usd: f64,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cache_read_tokens: u64,
    pub cache_creation_tokens: u64,
    pub sessions: u32,
    pub project: String,
}

fn get_projects_dir() -> Result<std::path::PathBuf, String> {
    let home = dirs::home_dir().ok_or("Home dir not found")?;
    Ok(home.join(".claude").join("projects"))
}

// Approximate cost calculation based on Claude model pricing
fn estimate_cost(input: u64, output: u64, cache_read: u64, cache_create: u64) -> f64 {
    // Opus pricing per 1M tokens (approximate)
    let input_cost = (input as f64) * 15.0 / 1_000_000.0;
    let output_cost = (output as f64) * 75.0 / 1_000_000.0;
    let cache_read_cost = (cache_read as f64) * 1.5 / 1_000_000.0;
    let cache_create_cost = (cache_create as f64) * 18.75 / 1_000_000.0;
    input_cost + output_cost + cache_read_cost + cache_create_cost
}

#[tauri::command]
pub async fn read_usage_stats() -> Result<Vec<UsageEntry>, String> {
    let projects_dir = get_projects_dir()?;

    if !projects_dir.exists() {
        return Ok(Vec::new());
    }

    let mut aggregated: HashMap<(String, String), UsageEntry> = HashMap::new();

    let project_entries = std::fs::read_dir(&projects_dir)
        .map_err(|e| format!("Read dir error: {}", e))?;

    for project_entry in project_entries.flatten() {
        if !project_entry.path().is_dir() {
            continue;
        }

        let raw_name = project_entry.file_name().to_string_lossy().to_string();
        // Convert dir name to short project name (last 2 parts)
        let parts: Vec<&str> = raw_name.split('-').collect();
        let project_name = if parts.len() >= 2 {
            parts[parts.len()-2..].join("/")
        } else {
            raw_name.clone()
        };

        // Read all JSONL files (including subagents/)
        scan_dir_for_usage(&project_entry.path(), &project_name, &mut aggregated);

        // Also scan subagents directory
        let subagents_dir = project_entry.path().join("subagents");
        if subagents_dir.exists() {
            scan_dir_for_usage(&subagents_dir, &project_name, &mut aggregated);
        }

        // Scan session subdirectories (UUID dirs)
        if let Ok(entries) = std::fs::read_dir(project_entry.path()) {
            for sub in entries.flatten() {
                if sub.path().is_dir() {
                    let subdir_name = sub.file_name().to_string_lossy().to_string();
                    // Skip non-UUID dirs
                    if subdir_name.len() > 20 {
                        scan_dir_for_usage(&sub.path(), &project_name, &mut aggregated);
                        let sub_subagents = sub.path().join("subagents");
                        if sub_subagents.exists() {
                            scan_dir_for_usage(&sub_subagents, &project_name, &mut aggregated);
                        }
                    }
                }
            }
        }
    }

    let mut results: Vec<UsageEntry> = aggregated.into_values().collect();
    results.sort_by(|a, b| b.date.cmp(&a.date)); // Most recent first
    Ok(results)
}

fn scan_dir_for_usage(
    dir: &std::path::Path,
    project_name: &str,
    aggregated: &mut HashMap<(String, String), UsageEntry>,
) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for file_entry in entries.flatten() {
        let path = file_entry.path();
        if path.extension().and_then(|x| x.to_str()) != Some("jsonl") {
            continue;
        }

        let file = match std::fs::File::open(&path) {
            Ok(f) => f,
            Err(_) => continue,
        };
        let reader = BufReader::new(file);
        let mut session_counted = false;

        for line in reader.lines().flatten() {
            let val: serde_json::Value = match serde_json::from_str(&line) {
                Ok(v) => v,
                Err(_) => continue,
            };

            let entry_type = val.get("type").and_then(|t| t.as_str()).unwrap_or("");

            // Extract tokens from assistant messages (interactive sessions)
            if entry_type == "assistant" {
                let usage = match val.get("message").and_then(|m| m.get("usage")) {
                    Some(u) => u,
                    None => continue,
                };

                let input = usage.get("input_tokens").and_then(|t| t.as_u64()).unwrap_or(0);
                let output = usage.get("output_tokens").and_then(|t| t.as_u64()).unwrap_or(0);
                let cache_read = usage.get("cache_read_input_tokens").and_then(|t| t.as_u64()).unwrap_or(0);
                let cache_create = usage.get("cache_creation_input_tokens").and_then(|t| t.as_u64()).unwrap_or(0);

                if input == 0 && output == 0 {
                    continue;
                }

                let timestamp = val.get("timestamp").and_then(|t| t.as_str()).unwrap_or("");
                let date = if timestamp.len() >= 10 {
                    timestamp[..10].to_string()
                } else {
                    "unknown".to_string()
                };

                let cost = estimate_cost(input, output, cache_read, cache_create);

                let key = (date.clone(), project_name.to_string());
                let entry = aggregated.entry(key).or_insert_with(|| UsageEntry {
                    date: date.clone(),
                    cost_usd: 0.0,
                    input_tokens: 0,
                    output_tokens: 0,
                    cache_read_tokens: 0,
                    cache_creation_tokens: 0,
                    sessions: 0,
                    project: project_name.to_string(),
                });

                entry.cost_usd += cost;
                entry.input_tokens += input;
                entry.output_tokens += output;
                entry.cache_read_tokens += cache_read;
                entry.cache_creation_tokens += cache_create;

                if !session_counted {
                    entry.sessions += 1;
                    session_counted = true;
                }
            }

            // Also check for result entries (from --print mode)
            if entry_type == "result" {
                if let Some(cost) = val.get("total_cost_usd").and_then(|c| c.as_f64()) {
                    let timestamp = val.get("timestamp").and_then(|t| t.as_str()).unwrap_or("");
                    let date = if timestamp.len() >= 10 { timestamp[..10].to_string() } else { "unknown".to_string() };

                    let (input, output) = if let Some(usage) = val.get("usage") {
                        (usage.get("input_tokens").and_then(|t| t.as_u64()).unwrap_or(0),
                         usage.get("output_tokens").and_then(|t| t.as_u64()).unwrap_or(0))
                    } else { (0, 0) };

                    let key = (date.clone(), project_name.to_string());
                    let entry = aggregated.entry(key).or_insert_with(|| UsageEntry {
                        date: date.clone(), cost_usd: 0.0, input_tokens: 0, output_tokens: 0,
                        cache_read_tokens: 0, cache_creation_tokens: 0, sessions: 0,
                        project: project_name.to_string(),
                    });
                    entry.cost_usd += cost;
                    entry.input_tokens += input;
                    entry.output_tokens += output;
                }
            }
        }
    }
}
