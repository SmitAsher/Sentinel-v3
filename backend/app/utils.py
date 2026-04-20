"""
Utility helpers shared across the backend.
"""

import hashlib


def hash_ip(ip: str) -> str:
    """Anonymize an IP address using SHA-256 truncation."""
    return hashlib.sha256(ip.encode()).hexdigest()[:12]


def safe_int(value, default: int = 0) -> int:
    """Safely cast a value to int."""
    try:
        return int(value)
    except (ValueError, TypeError):
        return default
