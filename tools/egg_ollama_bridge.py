"""EGG private Responses-to-Ollama adapter. Python standard library only.

Run on the machine hosting Ollama, behind a PRIVATE authenticated HTTPS reverse proxy.
Never expose this HTTP listener directly to the public Internet.
"""
import json
import os
import secrets
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOST = os.environ.get("EGG_BRIDGE_HOST", "127.0.0.1")
PORT = int(os.environ.get("EGG_BRIDGE_PORT", "8765"))
KEY = os.environ.get("EGG_BRIDGE_KEY", "")
OLLAMA_URL = os.environ.get("EGG_OLLAMA_URL", "http://127.0.0.1:11434/api/chat")
ALLOWED_MODELS = set(filter(None, os.environ.get("EGG_BRIDGE_MODELS", "").split(",")))
MAX_BODY = 65536


class Handler(BaseHTTPRequestHandler):
    def reply(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/v1/responses":
            return self.reply(404, {"error": "not_found"})
        auth = self.headers.get("Authorization", "")
        if not KEY or not secrets.compare_digest(auth, "Bearer " + KEY):
            return self.reply(401, {"error": "unauthorized"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 1 or size > MAX_BODY:
                return self.reply(413, {"error": "invalid_request_size"})
            data = json.loads(self.rfile.read(size))
            model = data.get("model")
            if not isinstance(model, str) or model not in ALLOWED_MODELS:
                return self.reply(400, {"error": "model_not_allowed"})
            instructions, user_input = data.get("instructions"), data.get("input")
            if not isinstance(instructions, str) or not isinstance(user_input, str):
                return self.reply(400, {"error": "invalid_prompt"})
            if data.get("text", {}).get("format", {}).get("type") != "json_object":
                return self.reply(400, {"error": "json_mode_required"})
            token_limit = data.get("max_output_tokens", 2200)
            if not isinstance(token_limit, int) or not 1 <= token_limit <= 4096:
                return self.reply(400, {"error": "invalid_token_limit"})
            payload = json.dumps({
                "model": model, "stream": False, "format": "json",
                "messages": [{"role": "system", "content": instructions},
                             {"role": "user", "content": user_input}],
                "options": {"num_predict": token_limit},
            }).encode("utf-8")
            request = urllib.request.Request(OLLAMA_URL, data=payload,
                headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(request, timeout=32) as response:
                raw = response.read(100000)
            result = json.loads(raw)
            answer = result.get("message", {}).get("content", "")
            if not isinstance(answer, str) or not answer.strip() or len(answer) > 25000:
                return self.reply(502, {"error": "empty_model_output"})
            # EGG validates the returned JSON against the exact sphere/yolk schema.
            json.loads(answer)
            self.reply(200, {"status": "completed", "output": [
                {"type": "message", "content": [{"type": "output_text", "text": answer}]}
            ]})
        except (ValueError, TypeError, KeyError, json.JSONDecodeError):
            self.reply(502, {"error": "invalid_model_json"})
        except (urllib.error.URLError, TimeoutError):
            self.reply(502, {"error": "ollama_unavailable"})
        except Exception:
            self.reply(500, {"error": "bridge_failed"})

    def log_message(self, fmt, *args):
        # Avoid logging project content or Authorization headers.
        pass


if __name__ == "__main__":
    if not KEY or len(KEY) < 32 or not ALLOWED_MODELS:
        raise SystemExit("Set EGG_BRIDGE_KEY (>=32 chars) and EGG_BRIDGE_MODELS")
    if HOST not in ("127.0.0.1", "::1", "localhost"):
        raise SystemExit("Bind to loopback only; put authenticated HTTPS proxy in front")
    print(f"EGG bridge listening on {HOST}:{PORT} (loopback only)")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
