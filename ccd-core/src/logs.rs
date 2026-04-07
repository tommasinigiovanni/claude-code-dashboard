use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LogEntry {
    pub timestamp: String,
    pub entry_type: String, // "user", "assistant", "tool_use", "tool_result", "system"
    pub content: String,
    pub session_id: String,
}

fn get_projects_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Home dir not found")?;
    Ok(home.join(".claude").join("projects"))
}

pub async fn read_session_logs(
    project_path: Option<String>,
    max_entries: Option<usize>,
) -> Result<Vec<LogEntry>, String> {
    let projects_dir = get_projects_dir()?;
    let max = max_entries.unwrap_or(100);

    // Find the project dir
    let target_dir = if let Some(ref path) = project_path {
        // Find matching project directory
        let entries = std::fs::read_dir(&projects_dir)
            .map_err(|e| format!("Read dir error: {}", e))?;

        let mut best_match: Option<PathBuf> = None;
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                // Check if this project dir corresponds to the path
                let dir_name = entry.file_name().to_string_lossy().to_string();
                let normalized = path.replace('/', "-");
                if dir_name.contains(&normalized.trim_start_matches('-')) {
                    best_match = Some(entry.path());
                    break;
                }
            }
        }
        best_match
    } else {
        // Get most recent project dir
        let mut entries: Vec<_> = std::fs::read_dir(&projects_dir)
            .map_err(|e| format!("Read dir error: {}", e))?
            .flatten()
            .filter(|e| e.path().is_dir())
            .collect();

        entries.sort_by(|a, b| {
            let ta = a.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH);
            let tb = b.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH);
            tb.cmp(&ta)
        });

        entries.first().map(|e| e.path())
    };

    let Some(project_dir) = target_dir else {
        return Ok(Vec::new());
    };

    // Find most recent JSONL file
    let mut jsonl_files: Vec<_> = std::fs::read_dir(&project_dir)
        .map_err(|e| format!("Read dir error: {}", e))?
        .flatten()
        .filter(|e| {
            e.path().extension().and_then(|x| x.to_str()) == Some("jsonl")
        })
        .collect();

    jsonl_files.sort_by(|a, b| {
        let ta = a.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH);
        let tb = b.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH);
        tb.cmp(&ta)
    });

    let Some(jsonl) = jsonl_files.first() else {
        return Ok(Vec::new());
    };

    // Read and parse entries
    let file = std::fs::File::open(jsonl.path())
        .map_err(|e| format!("Open error: {}", e))?;
    let reader = BufReader::new(file);
    let mut entries = Vec::new();

    for line in reader.lines().flatten() {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
            let entry_type = val.get("type").and_then(|t| t.as_str()).unwrap_or("unknown");
            let timestamp = val.get("timestamp").and_then(|t| t.as_str()).unwrap_or("").to_string();
            let session_id = val.get("sessionId").and_then(|s| s.as_str()).unwrap_or("").to_string();

            let content = match entry_type {
                "user" => {
                    val.get("message")
                        .and_then(|m| m.get("content"))
                        .and_then(|c| {
                            if let Some(s) = c.as_str() {
                                Some(s.to_string())
                            } else if let Some(arr) = c.as_array() {
                                // Find text content in array
                                arr.iter()
                                    .find(|item| item.get("type").and_then(|t| t.as_str()) == Some("text"))
                                    .and_then(|item| item.get("text").and_then(|t| t.as_str()))
                                    .map(|s| s.to_string())
                            } else {
                                None
                            }
                        })
                        .unwrap_or_default()
                }
                "assistant" => {
                    val.get("message")
                        .and_then(|m| m.get("content"))
                        .and_then(|c| c.as_array())
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|item| {
                                    let t = item.get("type").and_then(|t| t.as_str())?;
                                    match t {
                                        "text" => item.get("text").and_then(|t| t.as_str()).map(|s| s.to_string()),
                                        "tool_use" => {
                                            let name = item.get("name").and_then(|n| n.as_str()).unwrap_or("tool");
                                            Some(format!("[Tool: {}]", name))
                                        }
                                        _ => None,
                                    }
                                })
                                .collect::<Vec<_>>()
                                .join("\n")
                        })
                        .unwrap_or_default()
                }
                _ => continue,
            };

            if content.is_empty() {
                continue;
            }

            entries.push(LogEntry {
                timestamp,
                entry_type: entry_type.to_string(),
                content: if content.len() > 500 {
                    format!("{}...", &content[..500])
                } else {
                    content
                },
                session_id,
            });
        }
    }

    // Return last N entries
    let start = entries.len().saturating_sub(max);
    Ok(entries[start..].to_vec())
}
