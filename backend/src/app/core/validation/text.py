from __future__ import annotations


def normalize_text(name: str, value: str, *, maximum_length: int) -> str:
    """Return safe, non-blank text or raise a boundary-specific error."""
    if not isinstance(value, str):
        raise ValueError(f"{name} must be text")
    normalized = value.strip()
    if not normalized:
        raise ValueError(f"{name} must not be blank")
    if len(normalized) > maximum_length:
        raise ValueError(f"{name} must be at most {maximum_length} characters")
    if not normalized.isprintable():
        raise ValueError(f"{name} must not contain control characters")
    return normalized
