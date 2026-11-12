# EGG — self-hosted AI bridge (experimental)

The existing /api/egg-flow-ai endpoint now supports an **explicit opt-in** self-hosted provider. This is not an embedded local model and does not install Survival LLM. It preserves the current one-step / one-CAS-save behavior, Author authentication, revision locking, sphere order and Yolk review.

## Configuration (server-side Vercel environment only)

- EGG_AUTOMATION_ENDPOINT: a dedicated HTTPS endpoint implementing the **OpenAI Responses API** request/response shape, including `instructions`, `input`, `text.format.type=json_object`, `store=false` and a completed response with `output[].content[].text`. A generic Ollama chat-completions URL will NOT work without an adapter.
- EGG_AUTOMATION_ENDPOINT_KEY: a private bearer secret for the bridge; never expose it to browser code or commit it.
- EGG_AUTOMATION_MODEL: the model identifier accepted by the bridge.

All three variables must be set together. If EGG_AUTOMATION_ENDPOINT is set but invalid or its key/model is missing, the provider is **not configured**; it does not silently fall back to a cloud provider. When no endpoint is set, the existing Vercel AI Gateway / OpenAI selection remains unchanged.

## Network boundary

A model running on a laptop cannot be reached directly by a Vercel serverless function through localhost. Use an authenticated HTTPS bridge/tunnel that is accessible from Vercel, with TLS and a dedicated credential. Do not expose an unauthenticated local inference port publicly. The bridge receives potentially private project text: choose a trusted deployment and apply appropriate retention/access controls.

## Pilot acceptance criteria

1. Author session and project revision are valid; start with `mode:preflight` (one real, potentially charged inference; no project mutation).
2. One `mode:step` call generates one sphere result; inspect response `completed`, `next` and revision.
3. Run remaining steps individually; the Yolk synthesis/review is reached only after both streams finish.
4. Invalid model output, provider timeout, revision conflict or missing configuration must leave the project unchanged.
5. Only the Author may approve the resulting cycle. No automatic infinite loop or unattended agent is enabled.

This change is an adapter seam, not evidence that a local model is running or that Survival LLM is compatible. Validate the specific bridge and model separately before deployment.

## Ollama pilot (adapter included)

Survival LLM is an offline Python application using Ollama, local search and memory. Its application API is **not** an OpenAI Responses endpoint. EGG's pilot bridge connects to the underlying Ollama model only; it does **not** call Survival LLM's library search, personal memory or user interface.

The standard-library adapter lives in `tools/egg_ollama_bridge.py`. On the machine running Ollama:

1. Install Ollama and download a model capable of producing JSON objects.
2. Set `EGG_BRIDGE_KEY` to a new random 32+ character secret, `EGG_BRIDGE_MODELS` to the exact allowed Ollama model name, and optionally `EGG_OLLAMA_URL` (default `http://127.0.0.1:11434/api/chat`).
3. Run `python3 tools/egg_ollama_bridge.py`. It listens on loopback port 8765, never directly on a public interface.
4. Configure an authenticated HTTPS reverse proxy/tunnel forwarding only `/v1/responses` to that port. Keep proxy access private and use TLS; ensure Vercel can reach it.
5. In Vercel server-side secrets set `EGG_AUTOMATION_ENDPOINT=https://YOUR-PRIVATE-BRIDGE/v1/responses`, `EGG_AUTOMATION_ENDPOINT_KEY` to the bridge key, and `EGG_AUTOMATION_MODEL` to the exact allowed model. Never put these in `VITE_*` variables or source control.
6. Run `python3 -m unittest tools/test_egg_ollama_bridge.py` for local contract checks. These do not test real model output.
7. Sign in as the EGG Author and use the existing automation preflight followed by a single step. Review JSON schema compatibility, duration and result quality before running all steps.

**Important:** This requires a continuously available model host and an HTTPS route. The model does not run inside Vercel, and a stopped personal computer will make the bridge unavailable. No credentials have been configured or deployment triggered by this commit.
