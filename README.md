# Simple Host

Upload and serve static sites with zero configuration. Built with SvelteKit, Tailwind CSS, DaisyUI, and Lucide icons.

## Quick Start

```bash
docker compose up --build
```

Open http://localhost:5500

## Features

- Drag & drop ZIP file uploads
- Port range selector with slider (only exposed ports)
- Start/stop servers on demand
- Multi-arch Docker image (amd64 + arm64/Raspberry Pi)

## Port Ranges

| Range | Ports |
|-------|-------|
| 4050-4170 | 121 ports |
| 4330-4420 | 91 ports |
| 4450-4495 | 46 ports |

Management UI runs on port **5500**.

## Building the Docker Image

```bash
docker build -t simple-host .
docker run -p 5500:5500 -p 4050-4170:4050-4170 -p 4330-4420:4330-4420 -p 4450-4495:4450-4495 simple-host
```

## GitHub Actions

Push a version tag to trigger the CI build:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This builds a multi-arch image and pushes to `ghcr.io`.
