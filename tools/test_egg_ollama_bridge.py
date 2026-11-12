"""Contract smoke tests for EGG's private Ollama bridge (no model required)."""
import importlib.util
import json
import os
import secrets
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from pathlib import Path

os.environ["EGG_BRIDGE_KEY"] = "test-" + "x" * 40
os.environ["EGG_BRIDGE_MODELS"] = "test-model"
spec = importlib.util.spec_from_file_location("bridge", Path(__file__).with_name("egg_ollama_bridge.py"))
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


class BridgeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), bridge.Handler)
        cls.url = f"http://127.0.0.1:{cls.server.server_port}/v1/responses"
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def request(self, payload, key=None):
        headers = {"Content-Type": "application/json"}
        if key is not None:
            headers["Authorization"] = "Bearer " + key
        request = Request(self.url, data=json.dumps(payload).encode(), headers=headers, method="POST")
        try:
            with urlopen(request, timeout=3) as response:
                return response.status, json.loads(response.read())
        except HTTPError as error:
            return error.code, json.loads(error.read())

    def test_missing_auth(self):
        self.assertEqual(self.request({})[0], 401)

    def test_model_allowlist(self):
        self.assertEqual(self.request({"model": "forbidden"}, os.environ["EGG_BRIDGE_KEY"])[0], 400)

    def test_invalid_prompt(self):
        self.assertEqual(self.request({"model": "test-model"}, os.environ["EGG_BRIDGE_KEY"])[0], 400)

    def test_unreachable_ollama(self):
        old = bridge.OLLAMA_URL
        bridge.OLLAMA_URL = "http://127.0.0.1:1/api/chat"
        try:
            payload = {"model": "test-model", "instructions": "Return JSON", "input": "Hello",
                       "text": {"format": {"type": "json_object"}}, "max_output_tokens": 300}
            self.assertEqual(self.request(payload, os.environ["EGG_BRIDGE_KEY"])[0], 502)
        finally:
            bridge.OLLAMA_URL = old


if __name__ == "__main__":
    unittest.main()
