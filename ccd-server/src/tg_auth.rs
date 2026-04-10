use hmac::{Hmac, Mac};
use sha2::Sha256;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha256 = Hmac<Sha256>;

pub struct TgSession {
    #[allow(dead_code)]
    pub user_id: i64,
    pub created_at: u64,
}

pub struct TgAuthState {
    bot_token: String,
    sessions: Mutex<HashMap<String, TgSession>>,
}

impl TgAuthState {
    pub fn new(bot_token: String) -> Self {
        Self {
            bot_token,
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn validate_init_data(&self, init_data: &str) -> Result<String, String> {
        let params: Vec<(String, String)> = form_urlencoded::parse(init_data.as_bytes())
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect();

        let hash = params
            .iter()
            .find(|(k, _)| k == "hash")
            .map(|(_, v)| v.clone())
            .ok_or("Missing hash in initData")?;

        let mut check_pairs: Vec<String> = params
            .iter()
            .filter(|(k, _)| k != "hash")
            .map(|(k, v)| format!("{}={}", k, v))
            .collect();
        check_pairs.sort();
        let data_check_string = check_pairs.join("\n");

        let mut secret_mac = HmacSha256::new_from_slice(b"WebAppData")
            .map_err(|e| format!("HMAC error: {}", e))?;
        secret_mac.update(self.bot_token.as_bytes());
        let secret_key = secret_mac.finalize().into_bytes();

        let mut check_mac = HmacSha256::new_from_slice(&secret_key)
            .map_err(|e| format!("HMAC error: {}", e))?;
        check_mac.update(data_check_string.as_bytes());
        let computed_hash = hex::encode(check_mac.finalize().into_bytes());

        if computed_hash != hash {
            return Err("Invalid initData signature".to_string());
        }

        if let Some((_, auth_date_str)) = params.iter().find(|(k, _)| k == "auth_date") {
            let auth_date: u64 = auth_date_str.parse().unwrap_or(0);
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();
            if now - auth_date > 300 {
                return Err("initData expired".to_string());
            }
        }

        let user_id = params
            .iter()
            .find(|(k, _)| k == "user")
            .and_then(|(_, v)| serde_json::from_str::<serde_json::Value>(v).ok())
            .and_then(|u| u.get("id").and_then(|id| id.as_i64()))
            .unwrap_or(0);

        let token = uuid::Uuid::new_v4().to_string();
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        self.sessions
            .lock()
            .unwrap()
            .insert(token.clone(), TgSession { user_id, created_at: now });
        self.sessions
            .lock()
            .unwrap()
            .retain(|_, s| now - s.created_at < 86400);

        Ok(token)
    }

    pub fn validate_session(&self, token: &str) -> bool {
        let sessions = self.sessions.lock().unwrap();
        if let Some(session) = sessions.get(token) {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();
            now - session.created_at < 86400
        } else {
            false
        }
    }
}
