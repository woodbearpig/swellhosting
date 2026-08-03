#!/usr/bin/env bash
# One-command deploy for AlmaLinux 10 / Hostinger VPS.
# Usage: ./deploy.sh

set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
    echo "❌ .env file missing. Copy .env.example to .env and fill in your values first."
    exit 1
 fi

if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Docker not installed. Run ./deploy/install-almalinux.sh first (or see README)."
    exit 1
 fi

# Pick docker compose command
if docker compose version >/dev/null 2>&1; then
    DC="docker compose"
else
    DC="docker-compose"
fi

echo "→ Pulling latest code"
git pull --ff-only || echo "(skipping git pull — no upstream configured)"

echo "→ Building images"
$DC build

echo "→ Restarting services"
$DC up -d

echo "→ Cleaning old images"
docker image prune -f >/dev/null 2>&1 || true

echo "→ Waiting for backend health…"
sleep 6
if curl -fsS http://localhost/api/health >/dev/null 2>&1; then
    echo "✅ Deployed — backend healthy"
else
    echo "⚠️  Deployed — could not verify /api/health locally. Check: $DC logs backend"
fi
