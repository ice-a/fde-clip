use sniffer::{Severity, Sniffer};

#[test]
fn flags_api_key_in_json_within_latency_budget() {
    let sniffer = Sniffer::load_default().expect("default rules must compile");
    let input = r#"{"api_key": "sk-00000000000000000000000000000000"}"#;

    let diagnosis = sniffer.diagnose(input);
    assert_eq!(sniffer.rule_count(), 20);

    assert_eq!(diagnosis.kind, "json");
    assert!(diagnosis
        .findings
        .iter()
        .any(|f| f.rule == "openai_key" && f.severity == Severity::Critical));
    assert!(
        diagnosis.elapsed_ms < 200,
        "diagnosis took {}ms",
        diagnosis.elapsed_ms
    );
}

#[test]
fn converts_unix_timestamp() {
    let sniffer = Sniffer::load_default().expect("default rules must compile");

    let diagnosis = sniffer.diagnose("1700000000");

    assert_eq!(diagnosis.kind, "timestamp");
    assert!(diagnosis
        .findings
        .iter()
        .any(|f| f.rule == "timestamp_convert"));
}

#[test]
fn detects_certificate_and_ip_address() {
    let sniffer = Sniffer::load_default().expect("default rules must compile");

    let diagnosis = sniffer.diagnose("-----BEGIN CERTIFICATE-----\nMIIB\npeer 192.168.1.10");

    assert!(diagnosis
        .findings
        .iter()
        .any(|f| f.rule == "pem_certificate"));
    assert!(diagnosis.findings.iter().any(|f| f.rule == "ipv4_address"));
}
