use chef_bridge::{builtin_recipes, execute};
use serde_json::json;

#[test]
fn builtin_base64_recipe_decodes_text() {
    let recipe = builtin_recipes()
        .into_iter()
        .find(|recipe| recipe.name == "Base64 解码")
        .expect("builtin recipe must exist");
    let ops: Vec<serde_json::Value> = recipe
        .ops
        .iter()
        .map(|op| json!({ "op": op.op, "args": op.args }))
        .collect();

    let output = execute("SGVsbG8gZmRlLWNsaXAh", &ops).expect("recipe must run");

    assert_eq!(output, "Hello fde-clip!");
}

#[test]
fn magic_auto_detects_base64() {
    let ops = vec![json!({ "op": "Magic", "args": [] })];

    let output = execute("SGVsbG8gZmRlLWNsaXAh", &ops).expect("magic must run");

    assert_eq!(output, "Hello fde-clip!");
}
