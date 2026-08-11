import json
import os
import re

import requests

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
ANALYZE_TIMEOUT_MS = int(os.getenv("ANALYZE_TIMEOUT_MS", "120000"))

DIMENSION_KEYS = ("width", "height", "depth")


def _normalize_tags(tag_list):
    if not tag_list:
        return []
    seen = set()
    tags = []
    for tag in tag_list:
        name = str(tag).strip().lower()
        if name and name not in seen:
            seen.add(name)
            tags.append(name)
    return tags


def _build_prompt(text, tag_names):
    tags_json = json.dumps(tag_names)
    return f"""You analyze furniture product descriptions.

Product text:
{text}

Allowed tags (pick only from this list, use exact spelling):
{tags_json}

Extract standard product dimensions in centimeters when present (width, height, depth).
Convert inches to cm (1 in = 2.54 cm). Use null for unknown dimensions.

Return JSON only:
{{"tags": ["tag1"], "dimensions": {{"width": null, "height": null, "depth": null}}}}"""


def _parse_json_response(raw):
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


def _coerce_dimension(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return round(float(value), 1) if value > 0 else None
    if isinstance(value, str):
        match = re.search(r"[\d.]+", value.replace(",", "."))
        if match:
            number = float(match.group())
            return round(number, 1) if number > 0 else None
    return None


def _normalize_dimensions(raw):
    if not isinstance(raw, dict):
        raw = {}
    return {key: _coerce_dimension(raw.get(key)) for key in DIMENSION_KEYS}


def _tags_record(selected, allowed):
    allowed_set = set(allowed)
    tags = {}
    for name in selected or []:
        tag = str(name).strip().lower()
        if tag in allowed_set:
            tags[tag] = "TRUE"
    return tags


def analyze_text(text, tag_list=None):
    tag_names = _normalize_tags(tag_list)
    prompt = _build_prompt(text.strip(), tag_names)

    response = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        },
        timeout=ANALYZE_TIMEOUT_MS / 1000
    )
    response.raise_for_status()

    body = response.json()
    parsed = _parse_json_response(body.get("response", "{}"))

    return {
        "tags": _tags_record(parsed.get("tags"), tag_names),
        "dimensions": _normalize_dimensions(parsed.get("dimensions"))
    }
