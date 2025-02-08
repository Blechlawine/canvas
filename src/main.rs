use color::Color;
use figment::{
    providers::{Env, Format, Toml},
    Figment,
};
use futures::{stream::StreamExt, SinkExt};
use serde::{Deserialize, Serialize};
use std::{
    fmt::Display,
    net::SocketAddr,
    sync::{Arc, Mutex},
};

use axum::{
    extract::{
        ws::{Message, WebSocket},
        ConnectInfo, State, WebSocketUpgrade,
    },
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use tokio::{net::TcpListener, sync::broadcast};
use tower_http::{
    services::ServeDir,
    trace::{self, TraceLayer},
};
use tracing::Level;

mod color;

#[derive(Clone, Serialize, Default, Deserialize, Debug)]
struct Event {
    x: u16,
    y: u16,
    color: Color,
}
impl Display for Event {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(format!("Event(x: {}, y: {}, color: {})", self.x, self.y, self.color).as_str())
    }
}

#[derive(Clone, Debug)]
struct Canvas {
    width: u32,
    height: u32,
    pixels: Vec<Arc<Mutex<Color>>>,
}
impl Default for Canvas {
    fn default() -> Self {
        let pixels = (0..500 * 500)
            .map(|_| Arc::new(Mutex::new(Color::default())))
            .collect();
        Self {
            width: 500,
            height: 500,
            pixels,
        }
    }
}

#[derive(Serialize, Clone, Debug)]
struct SerializableCanvas {
    width: u32,
    height: u32,
    pixels: Vec<Color>,
}
impl From<Canvas> for SerializableCanvas {
    fn from(value: Canvas) -> Self {
        SerializableCanvas {
            width: value.width,
            height: value.height,
            pixels: value.pixels.iter().map(|x| *x.lock().unwrap()).collect(),
        }
    }
}

impl Canvas {
    fn set_pixel(&mut self, event: Event) {
        let pixel = self.pixels[event.y as usize * 500 + event.x as usize].clone();
        let mut pixel = pixel.lock().unwrap();
        *pixel = event.color;
    }
}

#[derive(Clone, Debug)]
struct AppState {
    sessions: Vec<()>,
    channel: broadcast::Sender<Event>,
    canvas_state: Canvas,
}

#[derive(Deserialize)]
struct Config {
    port: Option<u16>,
    host: Option<String>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_target(false)
        .compact()
        .init();

    let config: Config = Figment::new()
        .merge(Toml::file("canvas.toml"))
        .merge(Env::prefixed("CANVAS_"))
        .extract()
        .expect("Unable to read config");

    let (sender, _) = broadcast::channel(100);
    let state = AppState {
        sessions: vec![],
        channel: sender,
        canvas_state: Default::default(),
    };

    let app = Router::new()
        .route("/ws", get(canvas))
        .route("/canvas", get(get_full_canvas))
        .fallback_service(ServeDir::new("static"))
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(trace::DefaultMakeSpan::new().level(Level::INFO))
                .on_response(trace::DefaultOnResponse::new().level(Level::INFO)),
        )
        .with_state(state);

    let listener = TcpListener::bind((
        config.host.unwrap_or("0.0.0.0".to_string()),
        config.port.unwrap_or(3000),
    ))
    .await
    .unwrap();
    tracing::info!("Listening on {}", listener.local_addr().unwrap());
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .unwrap();
}

async fn get_full_canvas(State(state): State<AppState>) -> impl IntoResponse {
    Json(SerializableCanvas::from(state.canvas_state))
}

async fn canvas(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
) -> Result<Response, Response> {
    Ok(ws
        .on_upgrade(move |socket| handle_canvas_socket(socket, state, addr))
        .into_response())
}

async fn handle_canvas_socket(socket: WebSocket, mut state: AppState, addr: SocketAddr) {
    let (mut socket_tx, mut socket_rx) = socket.split();
    let chan = state.channel;
    let mut event_receiver = chan.subscribe();

    let mut event_rx_task = tokio::spawn(async move {
        while let Ok(event) = event_receiver.recv().await {
            if let Err(err) = socket_tx
                .send(Message::Text(serde_json::to_string(&event).unwrap()))
                .await
            {
                tracing::error!("Error sending event ({event}) to client {addr}: Error: {err}")
            }
        }
    });

    let mut socket_rx_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = socket_rx.next().await {
            match msg {
                Message::Text(msg) => {
                    let result = serde_json::from_str::<Event>(&msg);
                    if let Ok(de) = result {
                        state.canvas_state.set_pixel(de.clone());
                        let _ = chan.send(de);
                    }
                }
                Message::Binary(_) => todo!(),
                Message::Ping(_) => todo!(),
                Message::Pong(_) => todo!(),
                Message::Close(_) => break,
            }
        }
    });

    tokio::select! {
        rv_a = (&mut socket_rx_task) => {
            match rv_a {
                Ok(_) => println!("messages received from {addr}"),
                Err(e) => println!("Error receiving messages from {addr}: {e}"),
            }
            event_rx_task.abort();
        }
        rv_b = (&mut event_rx_task) => {
            match rv_b {
                Ok(_) => println!("messages received from {addr}"),
                Err(e) => println!("Error receiving messages from {addr}: {e}"),
            }
            socket_rx_task.abort();
        }
    }

    tracing::info!("Disconnected: {addr}");
}
