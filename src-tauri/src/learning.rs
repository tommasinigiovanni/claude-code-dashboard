use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct MemoryFile {
    pub name: String,
    pub description: String,
    pub memory_type: String,
    pub content: String,
    pub project: String,
    pub path: String,
}

fn parse_frontmatter(text: &str) -> (String, String, String, String) {
    let mut name = String::new();
    let mut description = String::new();
    let mut memory_type = String::new();
    let content;

    if text.starts_with("---") {
        let rest = &text[3..];
        if let Some(end_idx) = rest.find("---") {
            let frontmatter = &rest[..end_idx];
            content = rest[end_idx + 3..].trim().to_string();

            for line in frontmatter.lines() {
                let line = line.trim();
                if let Some(val) = line.strip_prefix("name:") {
                    name = val.trim().to_string();
                } else if let Some(val) = line.strip_prefix("description:") {
                    description = val.trim().to_string();
                } else if let Some(val) = line.strip_prefix("type:") {
                    memory_type = val.trim().to_string();
                }
            }
        } else {
            content = text.to_string();
        }
    } else {
        content = text.to_string();
    }

    (name, description, memory_type, content)
}

fn read_memories_from_dir(
    dir: &std::path::Path,
    project_name: &str,
    memories: &mut Vec<MemoryFile>,
) {
    let memory_dir = dir.join("memory");
    if !memory_dir.exists() || !memory_dir.is_dir() {
        return;
    }

    let entries = match std::fs::read_dir(&memory_dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|x| x.to_str()) != Some("md") {
            continue;
        }

        let raw = match std::fs::read_to_string(&path) {
            Ok(s) => s,
            Err(_) => continue,
        };

        let (name, description, memory_type, content) = parse_frontmatter(&raw);

        let file_name = path
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();

        let display_name = if name.is_empty() {
            file_name
        } else {
            name
        };

        // Truncate content preview to 500 chars
        let preview = if content.len() > 500 {
            format!("{}...", &content[..500])
        } else {
            content
        };

        memories.push(MemoryFile {
            name: display_name,
            description,
            memory_type: if memory_type.is_empty() {
                "unknown".to_string()
            } else {
                memory_type
            },
            content: preview,
            project: project_name.to_string(),
            path: path.to_string_lossy().to_string(),
        });
    }

    // Also check for MEMORY.md index file in the project dir itself
    let memory_index = dir.join("MEMORY.md");
    if memory_index.exists() {
        if let Ok(raw) = std::fs::read_to_string(&memory_index) {
            let preview = if raw.len() > 500 {
                format!("{}...", &raw[..500])
            } else {
                raw
            };
            memories.push(MemoryFile {
                name: "MEMORY.md".to_string(),
                description: "Memory index file".to_string(),
                memory_type: "project".to_string(),
                content: preview,
                project: project_name.to_string(),
                path: memory_index.to_string_lossy().to_string(),
            });
        }
    }
}

#[tauri::command]
pub async fn read_memories(
    project_path: Option<String>,
) -> Result<Vec<MemoryFile>, String> {
    let home = dirs::home_dir().ok_or("Home not found")?;
    let projects_dir = home.join(".claude").join("projects");
    let mut memories = Vec::new();

    if !projects_dir.exists() {
        return Ok(memories);
    }

    if let Some(ref path) = project_path {
        // Find matching project directory
        // Project dirs are encoded as path with / replaced by -
        let normalized = path.replace('/', "-").replace('\\', "-");
        // Remove leading dash if present
        let normalized = normalized.strip_prefix('-').unwrap_or(&normalized);

        if let Ok(entries) = std::fs::read_dir(&projects_dir) {
            for entry in entries.flatten() {
                let dir_name = entry.file_name().to_string_lossy().to_string();
                if dir_name.contains(normalized) || normalized.contains(&dir_name) {
                    read_memories_from_dir(&entry.path(), &dir_name, &mut memories);
                }
            }
        }

        // If no exact match, try matching by the last path component
        if memories.is_empty() {
            let last_component = std::path::Path::new(path)
                .file_name()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default();

            if let Ok(entries) = std::fs::read_dir(&projects_dir) {
                for entry in entries.flatten() {
                    let dir_name = entry.file_name().to_string_lossy().to_string();
                    if dir_name.contains(&last_component) {
                        read_memories_from_dir(&entry.path(), &dir_name, &mut memories);
                    }
                }
            }
        }
    } else {
        // Read all projects
        if let Ok(entries) = std::fs::read_dir(&projects_dir) {
            for entry in entries.flatten() {
                if !entry.path().is_dir() {
                    continue;
                }
                let dir_name = entry.file_name().to_string_lossy().to_string();
                read_memories_from_dir(&entry.path(), &dir_name, &mut memories);
            }
        }
    }

    Ok(memories)
}
