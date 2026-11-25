//! Local diagnosis pipeline. Rules are TOML-configurable and hot-reloadable.

use std::path::Path;
use std::time::Instant;

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Info,
    Warning,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Finding {
    pub rule: String,
    pub severity: Severity,
    pub message: String,
    pub fix_hint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Diagnosis {
    pub kind: String,
    pub findings: Vec<Finding>,
    pub elapsed_ms: u64,
}

#[derive(Debug, Deserialize)]
struct RuleFile {
    #[serde(default)]
    rule: Vec<Rule>,
}

#[derive(Debug, Deserialize)]
struct Rule {
    id: String,
    kind: String,
    pattern: String,
    severity: Severity,
    message: String,
    fix_hint: Option<String>,
}

struct CompiledRule {
    id: String,
    kind: String,
    regex: Regex,
    severity: Severity,
    message: String,
    fix_hint: Option<String>,
}

pub struct Sniffer {
    rules: Vec<CompiledRule>,
}

impl Sniffer {
    /// Compile the embedded default rules.
    pub fn load_default() -> Result<Self> {
        Self::from_toml(include_str!("../rules/default.toml"))
    }

    /// Reload rules from an external TOML file (hot reload).
    pub fn reload(path: &Path) -> Result<Self> {
        let raw = std::fs::read_to_string(path)
            .with_context(|| format!("cannot read rules at {}", path.display()))?;
        Self::from_toml(&raw)
    }

    pub fn rule_count(&self) -> usize {
        self.rules.len()
    }

    fn from_toml(raw: &str) -> Result<Self> {
        let file: RuleFile = toml::from_str(raw).context("invalid rules TOML")?;
        let mut rules = Vec::with_capacity(file.rule.len());
        for rule in file.rule {
            let id = rule.id;
            let regex = Regex::new(&rule.pattern)
                .with_context(|| format!("invalid regex in rule {}", id))?;
            rules.push(CompiledRule {
                id,
                kind: rule.kind,
                regex,
                severity: rule.severity,
                message: rule.message,
                fix_hint: rule.fix_hint,
            });
        }
        Ok(Self { rules })
    }

    /// Synchronous diagnosis. Target: < 200ms for typical clipboard payloads.
    pub fn diagnose(&self, text: &str) -> Diagnosis {
        let start = Instant::now();
        let mut findings = Vec::new();
        let mut kind = "text".to_string();
        let mut has_critical = false;

        for rule in &self.rules {
            if rule.regex.is_match(text) {
                has_critical |= rule.severity == Severity::Critical;
                if kind == "text" {
                    kind = rule.kind.clone();
                }
                findings.push(Finding {
                    rule: rule.id.clone(),
                    severity: rule.severity,
                    message: rule.message.clone(),
                    fix_hint: rule.fix_hint.clone(),
                });
            }
        }
        if has_critical {
            kind = "secret".to_string();
        }

        let trimmed = text.trim();

        // JSON/YAML structural check with line-oriented hint.
        if trimmed.starts_with('{') || trimmed.starts_with('[') {
            kind = "json".to_string();
            if let Err(err) = serde_json::from_str::<serde_json::Value>(trimmed) {
                let line = format!("第 {} 行", err.line());
                findings.push(Finding {
                    rule: "json_syntax".into(),
                    severity: Severity::Warning,
                    message: format!("JSON 语法错误（{}）：{}", line, err),
                    fix_hint: Some("检查引号、逗号与括号是否配对".into()),
                });
            }
        }

        // Plain integer timestamp: seconds (10 digits) or milliseconds (13 digits).
        if let Ok(raw) = trimmed.parse::<i64>() {
            let digits = trimmed.len();
            if digits == 10 || digits == 13 {
                let seconds = if digits == 13 { raw / 1000 } else { raw };
                if let Some(dt) = DateTime::from_timestamp(seconds, 0) {
                    kind = "timestamp".to_string();
                    let delta = Utc::now().timestamp() - seconds;
                    let relative = if delta >= 0 {
                        format!("{} 秒前", delta)
                    } else {
                        format!("{} 秒后", -delta)
                    };
                    findings.push(Finding {
                        rule: "timestamp_convert".into(),
                        severity: Severity::Info,
                        message: format!(
                            "时间戳 → {} / 相对时间 {}",
                            dt.format("%Y-%m-%d %H:%M:%S UTC"),
                            relative
                        ),
                        fix_hint: None,
                    });
                }
            }
        }

        // Non-HTTPS URL and known shorteners.
        if let Some(pos) = text.find("http://") {
            let end = text[pos..]
                .find(char::is_whitespace)
                .map(|i| pos + i)
                .unwrap_or(text.len());
            findings.push(Finding {
                rule: "url_insecure".into(),
                severity: Severity::Warning,
                message: format!("明文 HTTP 链接：{}", &text[pos..end.min(pos + 80)]),
                fix_hint: Some("确认是否可改用 HTTPS".into()),
            });
        }
        for shortener in ["bit.ly", "t.cn", "tinyurl.com", "goo.gl", "is.gd"] {
            if text.contains(shortener) {
                findings.push(Finding {
                    rule: "url_shortener".into(),
                    severity: Severity::Warning,
                    message: format!("短链 {} 会跳转，目标不可见", shortener),
                    fix_hint: Some("展开后确认真实目标再访问".into()),
                });
                break;
            }
        }

        // Mis-decoded text (UTF-8 replacement characters).
        if text.contains('\u{FFFD}') {
            findings.push(Finding {
                rule: "encoding_garbled".into(),
                severity: Severity::Warning,
                message: "检测到乱码替换字符，可能原编码为 GBK/GB18030".into(),
                fix_hint: Some("用_encoding_brute_force 配方尝试还原".into()),
            });
        }

        Diagnosis {
            kind,
            findings,
            elapsed_ms: start.elapsed().as_millis() as u64,
        }
    }
}
