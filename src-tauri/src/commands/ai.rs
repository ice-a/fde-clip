use ai_client::ChatMessage;
use tauri::{AppHandle, Emitter, State};

use crate::state::AppState;

#[tauri::command]
pub async fn ai_stream(
    app: AppHandle,
    state: State<'_, AppState>,
    selection: String,
    scene: String,
    history: Vec<ChatMessage>,
) -> Result<(), String> {
    let (base_url, model, temperature, max_tokens, provider_id) = {
        let settings = state.settings.lock().map_err(|e| e.to_string())?;
        let provider = settings
            .providers
            .iter()
            .find(|p| p.id == settings.active_provider_id)
            .ok_or_else(|| "没有激活的 Provider，请先在设置中配置".to_string())?;
        (
            provider.base_url.clone(),
            provider.model.clone(),
            provider.temperature,
            provider.max_tokens,
            provider.id.clone(),
        )
    };

    let api_key = keyring::Entry::new("fde-clip", &provider_id)
        .and_then(|entry| entry.get_password())
        .unwrap_or_default();

    let mut messages = vec![ChatMessage {
        role: "system".into(),
        content: prompt_for(&scene),
    }];
    messages.extend(history);
    messages.push(ChatMessage {
        role: "user".into(),
        content: format!("用户选中内容：\n```\n{}\n```", selection),
    });

    let emitter = app.clone();
    ai_client::stream_chat(
        &base_url,
        &api_key,
        &model,
        &messages,
        temperature,
        max_tokens,
        move |chunk| {
            let _ = emitter.emit("ai://chunk", chunk);
        },
    )
    .await
    .map_err(|e| e.to_string())?;

    let _ = app.emit("ai://done", ());
    Ok(())
}

fn prompt_for(scene: &str) -> String {
    match scene {
        "explain" => "解释这段代码或密文：用途、结构、风险。用中文简洁回答。".into(),
        "fix" => "修复以下 JSON 或代码的语法错误，只输出修复后的内容。".into(),
        "recipe" => {
            "把用户目标转换为 CyberChef 配方 JSON（[{op,args}] 数组），只输出 JSON，不要解释。"
                .into()
        }
        "summarize" => "总结剪贴板历史要点，按主题归类。".into(),
        "rewrite" => "改写以下内容并移除敏感信息，保持原意。".into(),
        _ => "用中文简洁回答。".into(),
    }
}
