use std::path::Path;

use serde_json::Value;
use tauri::async_runtime;

use chef_bridge::Recipe;

#[tauri::command]
pub fn chef_run(input: String, ops: Vec<Value>) -> Result<String, String> {
    chef_bridge::execute(&input, &ops).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn chef_builtin_recipes() -> Vec<Recipe> {
    chef_bridge::builtin_recipes()
}

#[tauri::command]
pub async fn chef_stream_file(
    input_path: String,
    output_path: String,
    ops: Vec<Value>,
) -> Result<u64, String> {
    async_runtime::spawn_blocking(move || {
        chef_bridge::stream_file(Path::new(&input_path), Path::new(&output_path), &ops)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}
