use serde::Serialize;
use std::collections::HashMap;
use std::io::{BufRead, BufReader};

#[derive(Debug, Serialize, Clone)]
pub struct UsageEntry {
    pub date: String,
    pub cost_usd: f64,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub sessions: u32,
    pub project: String,
}

fn get_projects_dir() -> Result<std::path::PathBuf, String> {
    let home = dirs::home_dir().ok_or("Home dir not found")?;
    Ok(home.join(".claude").join("projects"))
}

#[tauri::command]
pub async fn read_usage_stats() -> Result<Vec<UsageEntry>, String> {
    let projects_dir = get_projects_dir()?;

    if !projects_dir.exists() {
        return Ok(Vec::new());
    }

    // key: (date, project)
    let mut aggregated: HashMap<(String, String), UsageEntry> = HashMap::new();

    let project_entries = std::fs::read_dir(&projects_dir)
        .map_err(|e| format!("Read dir error: {}", e))?;

    for project_entry in project_entries.flatten() {
        if !project_entry.path().is_dir() {
            continue;
        }

        let project_name = project_entry
            .file_name()
            .to_string_lossy()
            .to_string();

        // Read all JSONL files in this project dir
        let jsonl_files = match std::fs::read_dir(project_entry.path()) {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        for file_entry in jsonl_files.flatten() {
            let path = file_entry.path();
            if path.extension().and_then(|x| x.to_str()) != Some("jsonl") {
                continue;
            }

            let file = match std::fs::File::open(&path) {
                Ok(f) => f,
                Err(_) => continue,
            };
            let reader = BufReader::new(file);

            for line in reader.lines().flatten() {
                let val: serde_json::Value = match serde_json::from_str(&line) {
                    Ok(v) => v,
                    Err(_) => continue,
                };

                let entry_type = val.get("type").and_then(|t| t.as_str()).unwrap_or("");
                if entry_type != "result" {
                    continue;
                }

                let cost = val
                    .get("total_cost_usd")
                    .or_else(|| val.get("costUSD"))
                    .and_then(|c| c.as_f64())
                    .unwrap_or(0.0);

                let (input_tok, output_tok) = if let Some(usage) = val.get("usage") {
                    let input = usage
                        .get("input_tokens")
                        .and_then(|t| t.as_u64())
                        .unwrap_or(0);
                    let output = usage
                        .get("output_tokens")
                        .and_then(|t| t.as_u64())
                        .unwrap_or(0);
                    (input, output)
                } else {
                    (0, 0)
                };

                // Extract date from timestamp
                let timestamp = val
                    .get("timestamp")
                    .and_then(|t| t.as_str())
                    .unwrap_or("");
                let date = if timestamp.len() >= 10 {
                    timestamp[..10].to_string()
                } else {
                    "unknown".to_string()
                };

                let key = (date.clone(), project_name.clone());
                let entry = aggregated.entry(key).or_insert_with(|| UsageEntry {
                    date: date.clone(),
                    cost_usd: 0.0,
                    input_tokens: 0,
                    output_tokens: 0,
                    sessions: 0,
                    project: project_name.clone(),
                });

                entry.cost_usd += cost;
                entry.input_tokens += input_tok;
                entry.output_tokens += output_tok;
                entry.sessions += 1;
            }
        }
    }

    let mut results: Vec<UsageEntry> = aggregated.into_values().collect();
    results.sort_by(|a, b| a.date.cmp(&b.date));

    Ok(results)
}
