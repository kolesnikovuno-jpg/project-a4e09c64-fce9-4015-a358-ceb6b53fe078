# EGG Local Runner — Ollama + MCP (prototype)

This is an **optional client-side executor**, not an AI model installed on the EGG website.
The existing EGG backend retains the project DNA, two fixed sphere branches, synthesis and Author decisions.
The runner uses only Python's standard library; no Survival LLM dependency or paid API key.

## Requirements

- Python 3.10+ on a computer that can run Ollama.
- Ollama installed, running on localhost, with a downloaded model.
- An EGG project with an **already started** flow cycle.
- A short-lived EGG project-scoped access key with **read** and **contribute** permissions, issued by the Author through the EGG connect interface.
- Updated EGG MCP deployment that exposes `flowCompatibility.awaiting[].aiAssignment`.

## Run

On macOS/Linux:

```bash
ollama pull granite4.2:8b
export EGG_ACCESS_KEY='egg_v1_YOUR_PROJECT_KEY'
python3 tools/egg-local-runner.py --project YOUR_PROJECT_UUID
```

The default is **dry-run**: it reads the next active sphere, calls local Ollama, prints the result, and does **not** write to EGG.

To submit one sphere result after inspecting the dry-run:

```bash
python3 tools/egg-local-runner.py --project YOUR_PROJECT_UUID --write
```

To process up to eight sphere visits in one command:

```bash
python3 tools/egg-local-runner.py --project YOUR_PROJECT_UUID --write --max-steps 8
```

The two branches may have two simultaneously active stations. This first prototype handles them sequentially, while preserving each branch's internal order. EGG automatically creates its deterministic Yolk synthesis when both branches complete; the Author must approve/revise the cycle. The runner does **not** automatically produce a semantic Yolk interpretation.

## Boundaries

- No credentials are saved to disk. Never commit or share your EGG access key.
- Local inference does not mean the project is offline: MCP communicates with EGG over HTTPS and sends the sphere assignment and result to the EGG service.
- The local model receives project information, so install only software you trust.
- The runner has **no internet research**, source verification, image generation or legal clearance. Its output is unverified analysis. In particular, legal/IP research requires separately authorized source tools.
- The runner does not create or approve a concept, initiate a cycle, change DNA, approve Author decisions, or access Google Drive.
- The runner stops on invalid model JSON, MCP failures and revision conflicts; it does not silently overwrite concurrent changes.
- Small local models may be insufficient for reliable sphere work. Validate the result before enabling multi-step writes.
- This is a prototype; not yet end-to-end tested against a running local Ollama and authenticated EGG deployment.
