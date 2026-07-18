"""Small dependency-free smoke test for a running Prewise AI server."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request


def _request(url: str, api_key: str, payload: dict | None = None) -> dict:
    headers = {"Accept": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    body = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=body, headers=headers, method="POST" if body else "GET")
    with urllib.request.urlopen(request, timeout=90) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    base_url = os.getenv("LLM_BASE_URL", "http://127.0.0.1:8000/v1").rstrip("/")
    api_key = os.getenv("LLM_API_KEY", "")
    model = os.getenv("LLM_MODEL", "prewise-security-v1")
    try:
        models = _request(f"{base_url}/models", api_key)
        response = _request(
            f"{base_url}/chat/completions",
            api_key,
            {
                "model": model,
                "messages": [
                    {"role": "system", "content": "Trả lời ngắn gọn bằng tiếng Việt."},
                    {"role": "user", "content": "Xác nhận máy chủ AI đang hoạt động."},
                ],
                "temperature": 0,
                "max_tokens": 64,
            },
        )
    except (OSError, urllib.error.HTTPError, ValueError) as exc:
        print(f"AI server smoke test failed: {exc}", file=sys.stderr)
        return 1
    content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
    if not content:
        print("AI server returned no assistant content", file=sys.stderr)
        return 1
    print(json.dumps({"models": models.get("data", []), "response": content}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
