"""
Rule Engine — RegEx / YARA-style Pattern Matching
===================================================
Deterministic detection layer that runs BEFORE and alongside the ML model.
Each rule is referenced in the academic justification section of the project.
"""

import re
from dataclasses import dataclass


@dataclass
class RuleMatch:
    rule_name: str
    severity: str          # "critical" | "high" | "medium" | "low"
    matched_pattern: str
    description: str


# ─── Rule Definitions ───
RULES = [
    {
        "name": "SQL Injection (SQLi)",
        "severity": "critical",
        "pattern": re.compile(r"(?i)(\%27)|(\')|(\-\-)|(\%23)|(#)|(union\s+select)|(or\s+1\s*=\s*1)"),
        "description": "Detects common SQL injection escape sequences and tautologies.",
    },
    {
        "name": "Cross-Site Scripting (XSS)",
        "severity": "high",
        "pattern": re.compile(r"(?i)(\%3C|<)\s*script.*?(\%3E|>)"),
        "description": "Detects inline <script> tag injections in payloads.",
    },
    {
        "name": "Directory / Path Traversal",
        "severity": "high",
        "pattern": re.compile(r"(?i)(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)"),
        "description": "Detects attempts to escape the web root via relative path sequences.",
    },
    {
        "name": "Command Injection",
        "severity": "critical",
        "pattern": re.compile(r"(?i)(;|&&|\|\|)\s*(wget|curl|nc\s|bash\s|sh\s|cat\s|rm\s)"),
        "description": "Detects chained OS command execution attempts.",
    },
    {
        "name": "CSRF Token Absence Probe",
        "severity": "medium",
        "pattern": re.compile(r"(?i)(csrf|xsrf).*?(missing|absent|null|none)", re.DOTALL),
        "description": "Flags payloads probing for missing CSRF tokens.",
    },
    {
        "name": "IDOR Pattern",
        "severity": "medium",
        "pattern": re.compile(r"(?i)(user_id|account_id|order_id)\s*=\s*\d+"),
        "description": "Detects sequential numeric ID enumeration attempts (Insecure Direct Object Reference).",
    },
]


def scan_payload(payload: str) -> list[RuleMatch]:
    """Run all rules against a payload string. Returns list of matches."""
    matches: list[RuleMatch] = []
    for rule in RULES:
        hit = rule["pattern"].search(payload)
        if hit:
            matches.append(
                RuleMatch(
                    rule_name=rule["name"],
                    severity=rule["severity"],
                    matched_pattern=hit.group(),
                    description=rule["description"],
                )
            )
    return matches
