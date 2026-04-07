mod emitter;
mod ws;

use axum::{
    extract::ws::WebSocketUpgrade,
    extract::Query,
    http::StatusCode,
    response::IntoResponse,
    routing::get,
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

    /// Directory containing the compiled frontend (dist/)
    #[arg(long, default_value = "../dist")]
    static_dir: String,
}

#[derive(serde::Deserialize)]
struct WsQuery {
    token: String,
}

struct AppState {
    token: String,
    tx: broadcast::Sender<emitter::WsMessage>,
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<WsQuery>,
    state: Arc<AppState>,
) -> impl IntoResponse {
    if query.token != state.token {
        return StatusCode::UNAUTHORIZED.into_response();
    }
    ws.on_upgrade(move |socket| ws::handle_socket(socket, state.tx.clone()))
        .into_response()
}

#[tokio::main]
async fn main() {
    let args = Args::parse();

    let (tx, _) = broadcast::channel::<emitter::WsMessage>(1024);

    let state = Arc::new(AppState {
        token: args.token.clone(),
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
        .fallback_service(ServeDir::new(&args.static_dir));

    let addr = SocketAddr::from(([0, 0, 0, 0], args.port));
    println!("ccd-server listening on http://{}", addr);
    println!("Static files from: {}", args.static_dir);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
