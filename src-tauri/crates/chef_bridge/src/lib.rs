//! CyberChef-compatible recipe execution.
//!
//! Recipe JSON uses the same `{op, args}` shape as CyberChef's `RecipeConfig`.
//! MVP implements the small set of ops needed for the Base64 recipe and its
//! streaming variant; the remaining 300+ ops belong to the full `cyberchef`
//! npm integration (see docs/ARCHITECTURE.md for why `@cyberchef/core` is not
//! used).

use std::fs::File;
use std::io::{BufReader, BufWriter, Read, Write};
use std::path::Path;

use anyhow::{bail, Context, Result};
use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recipe {
    pub name: String,
    pub description: String,
    pub ops: Vec<RecipeOp>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecipeOp {
    pub op: String,
    #[serde(default)]
    pub args: Vec<Value>,
}

pub fn builtin_recipes() -> Vec<Recipe> {
    vec![
        Recipe {
            name: "Base64 解码".into(),
            description: "从 Base64 还原 UTF-8 文本，对齐 CyberChef From_Base64 参数".into(),
            ops: vec![RecipeOp {
                op: "From_Base64".into(),
                args: vec![
                    Value::String("A-Za-z0-9+/=".into()),
                    Value::Bool(true),
                ],
            }],
        },
        Recipe {
            name: "Hex 解码".into(),
            description: "把连续 Hex 串还原为 UTF-8 文本".into(),
            ops: vec![RecipeOp {
                op: "From_Hex".into(),
                args: vec![Value::String("Auto".into())],
            }],
        },
        Recipe {
            name: "Magic 自动识别".into(),
            description: "依次尝试 Base64、Hex，取最像文本的结果".into(),
            ops: vec![RecipeOp {
                op: "Magic".into(),
                args: vec![],
            }],
        },
    ]
}

/// Execute a recipe over a UTF-8 string input.
pub fn execute(input: &str, ops: &[Value]) -> Result<String> {
    let mut data = input.to_string();
    for value in ops {
        let name = value["op"].as_str().unwrap_or("");
        let args = value["args"].as_array().cloned().unwrap_or_default();
        data = match name {
            "From_Base64" => {
                let alphabet = args
                    .first()
                    .and_then(Value::as_str)
                    .unwrap_or("A-Za-z0-9+/=");
                let strip = args.get(1).and_then(Value::as_bool).unwrap_or(true);
                decode_base64(&data, alphabet, strip)?
            }
            "To_Base64" => base64::engine::general_purpose::STANDARD.encode(data.as_bytes()),
            "From_Hex" => from_hex(&data)?,
            "To_Hex" => data
                .as_bytes()
                .iter()
                .map(|b| format!("{:02x}", b))
                .collect(),
            "URL_Decode" => url_decode(&data),
            "URL_Encode" => data
                .bytes()
                .map(|b| {
                    if b.is_ascii_alphanumeric() || b"-_.~".contains(&b) {
                        (b as char).to_string()
                    } else {
                        format!("%{:02X}", b)
                    }
                })
                .collect(),
            "Magic" => magic(&data),
            other => bail!("unsupported operation: {}", other),
        };
    }
    Ok(data)
}

/// Stream a Base64 file decode without loading the whole file into memory.
pub fn stream_file(input: &Path, output: &Path, ops: &[Value]) -> Result<u64> {
    if ops.len() != 1 || ops[0]["op"].as_str() != Some("From_Base64") {
        bail!("stream_file currently supports a single From_Base64 operation");
    }
    let alphabet = ops[0]["args"]
        .get(0)
        .and_then(Value::as_str)
        .unwrap_or("A-Za-z0-9+/=");
    let engine = pick_engine(alphabet);

    let mut reader = BufReader::new(File::open(input).context("cannot open input")?);
    let mut writer = BufWriter::new(File::create(output).context("cannot create output")?);
    let mut raw = [0u8; 16 * 1024];
    let mut carry: Vec<u8> = Vec::with_capacity(4);
    let mut written = 0u64;

    loop {
        let n = reader.read(&mut raw)?;
        if n == 0 {
            break;
        }
        for byte in &raw[..n] {
            if is_base64_byte(*byte) {
                carry.push(*byte);
            }
            if carry.len() == 4 * 1024 {
                written += write_block(&mut writer, engine, &mut carry)?;
            }
        }
    }
    while !carry.is_empty() && carry.len() % 4 != 0 {
        carry.push(b'=');
    }
    if !carry.is_empty() {
        written += write_block(&mut writer, engine, &mut carry)?;
    }
    writer.flush()?;
    Ok(written)
}

fn write_block(
    writer: &mut BufWriter<File>,
    engine: &base64::engine::GeneralPurpose,
    carry: &mut Vec<u8>,
) -> Result<u64> {
    let decoded = engine.decode(&carry[..])?;
    writer.write_all(&decoded)?;
    let len = decoded.len() as u64;
    carry.clear();
    Ok(len)
}

fn pick_engine(alphabet: &str) -> &'static base64::engine::GeneralPurpose {
    if alphabet.contains("-_") {
        &base64::engine::general_purpose::URL_SAFE
    } else {
        &base64::engine::general_purpose::STANDARD
    }
}

fn is_base64_byte(byte: u8) -> bool {
    byte.is_ascii_alphanumeric() || matches!(byte, b'+' | b'/' | b'=' | b'-' | b'_')
}

fn decode_base64(data: &str, alphabet: &str, strip: bool) -> Result<String> {
    let engine = pick_engine(alphabet);
    let mut cleaned: String = if strip {
        data.bytes()
            .filter(|b| is_base64_byte(*b))
            .map(char::from)
            .collect()
    } else {
        data.to_string()
    };
    while cleaned.len() % 4 != 0 {
        cleaned.push('=');
    }
    let bytes = engine
        .decode(cleaned.as_bytes())
        .context("Base64 解码失败：请检查字母表与填充")?;
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

fn from_hex(data: &str) -> Result<String> {
    let cleaned: String = data
        .chars()
        .filter(|c| c.is_ascii_hexdigit())
        .collect();
    if cleaned.len() % 2 != 0 {
        bail!("Hex 长度为奇数，无法成对解码");
    }
    let bytes: Result<Vec<u8>, _> = cleaned
        .as_bytes()
        .chunks(2)
        .map(|pair| {
            let text = std::str::from_utf8(pair).unwrap_or("00");
            u8::from_str_radix(text, 16).map_err(|err| anyhow::anyhow!(err))
        })
        .collect();
    Ok(String::from_utf8_lossy(&bytes?).into_owned())
}

fn url_decode(data: &str) -> String {
    let bytes = data.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            b'%' if i + 2 < bytes.len() => {
                let hex = std::str::from_utf8(&bytes[i + 1..i + 3]).unwrap_or("00");
                if let Ok(value) = u8::from_str_radix(hex, 16) {
                    out.push(value);
                    i += 3;
                } else {
                    out.push(bytes[i]);
                    i += 1;
                }
            }
            b'+' => {
                out.push(b' ');
                i += 1;
            }
            byte => {
                out.push(byte);
                i += 1;
            }
        }
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn printable_ratio(text: &str) -> f64 {
    if text.is_empty() {
        return 0.0;
    }
    let good = text
        .chars()
        .filter(|c| c.is_ascii_graphic() || c.is_whitespace())
        .count();
    good as f64 / text.chars().count() as f64
}

fn magic(input: &str) -> String {
    if let Ok(decoded) = decode_base64(input.trim(), "A-Za-z0-9+/=", true) {
        if printable_ratio(&decoded) > 0.9 {
            return decoded;
        }
    }
    if let Ok(decoded) = from_hex(input.trim()) {
        if printable_ratio(&decoded) > 0.9 {
            return decoded;
        }
    }
    input.to_string()
}
