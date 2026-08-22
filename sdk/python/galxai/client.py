"""
GALXAI Official Python Client Implementation (Sync & Async)
"""

import os
import time
import hmac
import hashlib
from typing import Dict, Any, List, Optional, AsyncIterator, Iterator

class GalxError(Exception):
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code

class AuthenticationError(GalxError):
    pass

class RateLimitError(GalxError):
    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message, 429)
        self.retry_after = retry_after

class ChatCompletions:
    def __init__(self, client):
        self._client = client

    def create(self, model: str, messages: List[Dict[str, str]], stream: bool = False, **kwargs) -> Dict[str, Any]:
        payload = {"model": model, "messages": messages, **kwargs}
        return self._client._request("POST", "/v1/chat/completions", json=payload)

    def create_async(self, model: str, messages: List[Dict[str, str]], queue: str = "llm-batch", group_id: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        headers = {"X-Galx-Async": "true", "X-Galx-Queue": queue}
        if group_id:
            headers["X-Galx-Group-Id"] = group_id
        payload = {"model": model, "messages": messages, **kwargs}
        return self._client._request("POST", "/v1/chat/completions", headers=headers, json=payload)

class Images:
    def __init__(self, client):
        self._client = client

    def generate(self, prompt: str, model: str = "openai-gpt-image-2", **kwargs) -> Dict[str, Any]:
        payload = {"prompt": prompt, "model": model, **kwargs}
        return self._client._request("POST", "/v1/images/generations", json=payload)

    def generate_async(self, prompt: str, model: str = "openai-gpt-image-2", queue: str = "image-gen", **kwargs) -> Dict[str, Any]:
        headers = {"X-Galx-Async": "true", "X-Galx-Queue": queue}
        payload = {"prompt": prompt, "model": model, **kwargs}
        return self._client._request("POST", "/v1/images/generations", headers=headers, json=payload)

class Queues:
    def __init__(self, client):
        self._client = client

    def list(self) -> List[Dict[str, Any]]:
        return self._client._request("GET", "/api/queues").get("queues", [])

    def get_stats(self, queue_id: str) -> Dict[str, Any]:
        return self._client._request("GET", f"/api/queues/{queue_id}").get("stats", {})

    def bulk_redrive(self, queue_id: str, max_tasks: int = 100) -> Dict[str, Any]:
        return self._client._request("POST", f"/api/queues/{queue_id}/redrive", json={"maxTasks": max_tasks})

class Webhooks:
    @staticmethod
    def verify_signature(raw_payload: bytes, signature_header: str, secret: str, tolerance_seconds: int = 300) -> bool:
        if not signature_header or not secret:
            return False
        parts = dict(kv.split("=") for kv in signature_header.split(","))
        timestamp_str = parts.get("t")
        received_sig = parts.get("v1")
        if not timestamp_str or not received_sig:
            return False
        try:
            timestamp = int(timestamp_str)
            if abs(time.time() * 1000 - timestamp) / 1000 > tolerance_seconds:
                return False
            expected = hmac.new(secret.encode(), f"{timestamp}.{raw_payload.decode()}".encode(), hashlib.sha256).hexdigest()
            return hmac.compare_digest(received_sig, expected)
        except Exception:
            return False

class GalxAI:
    """
    Synchronous GALXAI AI Gateway Client.
    """
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, timeout: float = 60.0):
        self.api_key = api_key or os.environ.get("GALX_API_KEY", "")
        self.base_url = (base_url or os.environ.get("GALX_BASE_URL", "https://gateway.galx.ai")).rstrip("/")
        self.timeout = timeout

        self.chat = type("Chat", (), {"completions": ChatCompletions(self)})()
        self.images = Images(self)
        self.queues = Queues(self)
        self.webhooks = Webhooks()

    def _request(self, method: str, path: str, headers: Optional[Dict[str, str]] = None, json: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        import urllib.request
        import json as json_lib

        url = f"{self.base_url}{path}"
        req_headers = {"Content-Type": "application/json", "User-Agent": "GALXAI-PythonSDK/1.0.0"}
        if self.api_key:
            req_headers["Authorization"] = f"Bearer {self.api_key}"
        if headers:
            req_headers.update(headers)

        data = json_lib.dumps(json).encode("utf-8") if json is not None else None
        req = urllib.request.Request(url, data=data, headers=req_headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                body = resp.read().decode("utf-8")
                return json_lib.loads(body) if body else {}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            if e.code == 401:
                raise AuthenticationError(f"Unauthorized: {err_body}")
            elif e.code == 429:
                raise RateLimitError(f"Rate limited: {err_body}")
            raise GalxError(f"HTTP {e.code}: {err_body}", status_code=e.code)
        except Exception as e:
            raise GalxError(f"Connection failed: {str(e)}")

class AsyncGalxAI:
    """
    Asynchronous GALXAI AI Gateway Client (using httpx).
    """
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, timeout: float = 60.0):
        self.api_key = api_key or os.environ.get("GALX_API_KEY", "")
        self.base_url = (base_url or os.environ.get("GALX_BASE_URL", "https://gateway.galx.ai")).rstrip("/")
        self.timeout = timeout
        self.webhooks = Webhooks()
