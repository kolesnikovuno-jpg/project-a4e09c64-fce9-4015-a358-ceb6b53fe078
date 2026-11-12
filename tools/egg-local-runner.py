#!/usr/bin/env python3
"""EGG local Ollama runner: one sphere at a time via project-scoped MCP.
Standard library only. Never approves Author decisions or changes DNA.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

def post(url, data, token=None, timeout=120):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers)
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.load(response)

class MCP:
    def __init__(self, url, key):
        if not url.startswith("https://"):
            raise ValueError("EGG MCP URL must use HTTPS")
        self.url, self.key, self.seq = url, key, 0

    def call(self, name, args):
        self.seq += 1
        result = post(self.url, {
            "jsonrpc": "2.0", "id": self.seq, "method": "tools/call",
            "params": {"name": name, "arguments": args},
        }, self.key, timeout=30)
        if "error" in result:
            raise RuntimeError("MCP error: " + str(result["error"]))
        payload = result.get("result", {})
        if payload.get("isError"):
            raise RuntimeError("EGG rejected operation: " + str(payload.get("content", []))[:600])
        blocks = payload.get("content", [])
        for block in blocks:
            if block.get("type") == "text":
                data = json.loads(block["text"])
                if isinstance(data, dict) and data.get("ok") is False:
                    raise RuntimeError("EGG operation failed: " + str(data)[:600])
                return data
        raise RuntimeError("No JSON content in MCP response")

def ollama(prompt, model, url):
    if not url.startswith("http://127.0.0.1:") and not url.startswith("http://localhost:"):
        raise ValueError("Ollama must be bound to localhost")
    result = post(url.rstrip("/") + "/api/chat", {
        "model": model, "stream": False, "format": "json",
        "messages": [
            {"role": "system", "content": prompt["instructions"]},
            {"role": "user", "content": prompt["input"]},
        ], "options": {"temperature": 0.2, "num_predict": 1800},
    }, timeout=300)
    raw = result.get("message", {}).get("content", "")
    return json.loads(raw)

def validate_output(output):
    if not isinstance(output, dict):
        raise ValueError("Model did not return a JSON object")
    text = output.get("text")
    evidence = output.get("evidence")
    if not isinstance(text, str) or not text.strip() or len(text) > 10000:
        raise ValueError("Missing or oversized result text")
    if evidence not in ("observation", "hypothesis", "question"):
        raise ValueError("Invalid evidence type")
    questions = output.get("discoveredQuestions", [])
    if not isinstance(questions, list) or len(questions) > 6:
        raise ValueError("Invalid questions")
    safe = []
    for item in questions:
        if not isinstance(item, dict):
            raise ValueError("Invalid question item")
        domain, question = item.get("domain"), item.get("question")
        if not isinstance(domain, str) or not 1 <= len(domain.strip()) <= 90:
            raise ValueError("Invalid domain")
        if not isinstance(question, str) or not 8 <= len(question.strip()) <= 1000:
            raise ValueError("Invalid question")
        safe.append({"domain": domain.strip(), "question": question.strip(),
                     "basis": str(item.get("basis", ""))[:1200]})
    return {"text": text.strip(), "evidence": evidence,
            "sourceRefs": [], "discoveredQuestions": safe}

def main():
    parser = argparse.ArgumentParser(description="EGG local sphere runner")
    parser.add_argument("--project", required=True, help="EGG project UUID")
    parser.add_argument("--mcp", default="https://egg.kolesnikov.studio/api/mcp")
    parser.add_argument("--model", default=os.environ.get("EGG_OLLAMA_MODEL", "granite4.2:8b"))
    parser.add_argument("--ollama", default="http://127.0.0.1:11434")
    parser.add_argument("--max-steps", type=int, default=1)
    parser.add_argument("--write", action="store_true", help="Actually submit outputs to EGG")
    args = parser.parse_args()
    key = os.environ.get("EGG_ACCESS_KEY", "")
    if not key.startswith("egg_v1_"):
        parser.error("Set EGG_ACCESS_KEY to a project-scoped read+contribute key")
    if not 1 <= args.max_steps <= 8:
        parser.error("--max-steps must be between 1 and 8")
    client = MCP(args.mcp, key)
    for _ in range(args.max_steps):
        state = client.call("egg_get_project_state", {"projectId": args.project})
        project = state.get("project", {})
        awaiting = project.get("flowCompatibility", {}).get("awaiting", [])
        if not awaiting:
            print("No active sphere. Cycle may be awaiting Author or not started.")
            return
        task = awaiting[0]
        assignment = task.get("aiAssignment")
        if not assignment:
            raise RuntimeError("EGG server has no aiAssignment; deploy the updated branch first")
        print("Sphere:", task["sphere"], "revision:", state["revision"])
        output = validate_output(ollama(assignment, args.model, args.ollama))
        print(json.dumps(output, ensure_ascii=False, indent=2))
        if not args.write:
            print("DRY RUN: no changes submitted. Use --write to contribute.")
            return
        response = client.call("egg_contribute_sphere", {
            "projectId": args.project, "expectedRevision": state["revision"],
            "command": "return", "taskId": task["taskId"], **output,
        })
        print("Saved revision:", response.get("revision"))
    print("Step limit reached; re-run to continue if needed.")

if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError, urllib.error.URLError, TimeoutError) as exc:
        print("EGG local runner error:", exc, file=sys.stderr)
        sys.exit(1)
