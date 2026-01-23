import hashlib
import json
from enum import Enum

from pydantic import BaseModel


def _normalize_value(value):
    if isinstance(value, BaseModel):
        value = value.model_dump(mode="json", by_alias=False, exclude_none=False)
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {str(k): _normalize_value(value[k]) for k in sorted(value)}
    if isinstance(value, (list, tuple)):
        return [_normalize_value(v) for v in value]
    return value


def stable_hash(value) -> str:
    normalized = _normalize_value(value)
    payload = json.dumps(
        normalized, sort_keys=True, separators=(",", ":"), ensure_ascii=True
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
