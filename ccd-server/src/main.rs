mod emitter;
mod tg_auth;
mod ws;

use axum::{
    extract::ws::WebSocketUpgrade,
    extract::{Json, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use clap::Parser;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::broadcast;
use tower_http::services::ServeDir;

#[derive(Parser)]
#[command(name = "ccd-server", about = "Claude Code Dashboard Web Server")]
struct Args {
    /// Port to listen on
    #[arg(long, default_value = "3100")]
    port: u16,

    /// Authentication token (required)
    #[arg(long, env = "CCD_TOKEN")]
    token: String,

    /// Telegram bot token for Mini App auth
    #[arg(long, env = "CCD_BOT_TOKEN")]
    bot_token: Option<String>,

    /// Directory containing the compiled frontend (dist/)
    #[arg(long, default_value = "../dist")]
    static_dir: String,
}

#[derive(serde::Deserialize)]
struct WsQuery {
    token: Option<String>,
    tg_session: Option<String>,
}

struct AppState {
    token: String,
    tg_auth: Option<tg_auth::TgAuthState>,
    tx: broadcast::Sender<emitter::WsMessage>,
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<WsQuery>,
    state: Arc<AppState>,
) -> impl IntoResponse {
    // Try standard token auth
    if let Some(ref token) = query.token {
        if token == &state.token {
            return ws
                .on_upgrade(move |socket| ws::handle_socket(socket, state.tx.clone()))
                .into_response();
        }
    }

    // Try Telegram session auth
    if let Some(ref tg_session) = query.tg_session {
        if let Some(ref tg_auth) = state.tg_auth {
            if tg_auth.validate_session(tg_session) {
                return ws
                    .on_upgrade(move |socket| ws::handle_socket(socket, state.tx.clone()))
                    .into_response();
            }
        }
    }

    StatusCode::UNAUTHORIZED.into_response()
}

#[derive(serde::Deserialize)]
struct TgAuthRequest {
    init_data: String,
}

#[derive(serde::Serialize)]
struct TgAuthResponse {
    token: String,
}

async fn tg_auth_handler(
    State(state): State<Arc<AppState>>,
    Json(body): Json<TgAuthRequest>,
) -> impl IntoResponse {
    let tg_auth = match &state.tg_auth {
        Some(auth) => auth,
        None => return StatusCode::NOT_FOUND.into_response(),
    };

    match tg_auth.validate_init_data(&body.init_data) {
        Ok(token) => Json(TgAuthResponse { token }).into_response(),
        Err(_) => StatusCode::UNAUTHORIZED.into_response(),
    }
}

#[tokio::main]
async fn main() {
    let args = Args::parse();

    let (tx, _) = broadcast::channel::<emitter::WsMessage>(1024);

    let state = Arc::new(AppState {
        token: args.token.clone(),
        tg_auth: args.bot_token.map(|t| tg_auth::TgAuthState::new(t)),
        tx,
    });

    let app = Router::new()
        .route(
            "/ws",
            get({
                let state = state.clone();
                move |ws: WebSocketUpgrade, query: Query<WsQuery>| {
                    ws_handler(ws, query, state)
                }
            }),
        )
        .route("/tg-auth", post(tg_auth_handler))
        .fallback_service(ServeDir::new(&args.static_dir))
        .with_state(state.clone());

    let addr = SocketAddr::from(([0, 0, 0, 0], args.port));
    println!("ccd-server listening on http://{}", addr);
    println!("Static files from: {}", args.static_dir);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
