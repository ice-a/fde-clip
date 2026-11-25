//! Minimal OpenAI-compatible streaming chat client (Rust side, no browser CORS).

use std::time::Duration;

use anyhow::{bail, Context, Result};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// Stream a chat completion. Each decoded `delta.content` is passed to `on_chunk`.
pub async fn stream_chat<F>(
    base_url: &str,
    api_key: &str,
    model: &str,
    messages: &[ChatMessage],
    temperature: f32,
    max_tokens: u32,
    mut on_chunk: F,
) -> Result<()>
where
    F: FnMut(String) + Send,
{
    let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(180))
        .build()
        .context("cannot build HTTP client")?;

    let response = client
        .post(&url)
        .bearer_auth(api_key)
        .json(&serde_json::json!({
            "model": model,
            "messages": messages,
            "stream": true,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }))
        .send()
        .await
        .context("cannot reach provider")?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        bail!("provider returned {}: {}", status, body.chars().take(500).collect::<String>());
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.context("stream read failed")?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));
        while let Some(pos) = buffer.find('\n') {
            let line: String = buffer.drain(..=pos).collect();
            let line = line.trim();
            let Some(data) = line.strip_prefix("data:") else { continue };
            let data = data.trim();
            if data == "[DONE]" {
                return Ok(());
            }
            if let Ok(value) = serde_json::from_str::<serde_json::Value>(data) {
                if let Some(content) = value["choices"][0]["delta"]["content"].as_str() {
                    if !content.is_empty() {
                        on_chunk(content.to_string());
                    }
                }
            }
        }
    }
    Ok(())
}
