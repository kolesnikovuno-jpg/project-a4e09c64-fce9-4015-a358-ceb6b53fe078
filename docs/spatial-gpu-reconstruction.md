# Spatial Studio — GPU reconstruction worker

This is a **deployment scaffold**, not an active service. No GPU host or endpoint has been provisioned.

## Engine

Use the official OOOSplat CLI from https://github.com/ooolabdev/ooosplat (Apache-2.0). The upstream documented command is:

```bash
cargo run --manifest-path src-tauri/Cargo.toml --bin splatstudio -- generate /data/input.mp4 --projects-root /data/projects --quality fast
```

The CLI invokes FFmpeg, COLMAP and Brush. The installed engine dependencies and supported GPU drivers must be checked with upstream's `setup:engines` and `verify:engines` commands on a compatible Linux x86_64 Ubuntu 24.04 GPU host. Do not attempt this workload in Vercel Functions.

## Planned API contract

A GPU worker will accept a video job after authenticated upload and return a job identifier. Its states are `queued`, `processing`, `failed`, and `complete`. On completion it returns a signed, expiring URL for a `.ply` output. The website must never expose the worker's secret credentials or a permanent public download link.

1. `POST /jobs` — authenticated upload intent, with file type and size validation.
2. `PUT <signed-upload-url>` — direct upload to private object storage.
3. `GET /jobs/:id` — authenticated status and progress.
4. `GET /jobs/:id/result` — short-lived signed output URL.
5. `DELETE /jobs/:id` — remove video, intermediate frames and model.

Only one worker job should run per GPU until capacity is measured. Add explicit limits on input size, duration, frame count, GPU runtime and storage retention. Never invoke a shell with user-provided paths; pass a validated argument vector to the CLI.

## Browser handoff

Spatial Studio currently extracts local preview frames and displays Gaussian Splat scenes. The final integration will submit the **original recorded video**, not the 24 JPEG thumbnails, to the worker. The output must be validated and converted to a viewer-compatible format if necessary before loading it in the existing 3D viewer.

## Remaining prerequisites

- GPU host (Ubuntu 24.04 x86_64 with compatible GPU and drivers).
- Private object storage and service credentials.
- An authenticated job API and queue.
- Real end-to-end test using a user-supplied video.
- Explicit approval of paid GPU and storage resources before provisioning.

This file intentionally does not claim to perform reconstruction without the above prerequisites.
