#!/usr/bin/env bash
# One-command deploy for AlmaLinux 10 / Hostinger VPS.
# Usage:
#   ./deploy.sh                # pull + build + restart (default)
#   ./deploy.sh --skip-pull    # skip git pull (useful for hotfixes staged on the server)
#   FORCE_DEPLOY=1 ./deploy.sh # deploy even if git pull fails

set -euo pipefail
cd "$(dirname "$0")"

SKIP_PULL=0
for arg in "$@"; do
    case "$arg" in
        --skip-pull) SKIP_PULL=1 ;;
        --help|-h)
            echo "Usage: ./deploy.sh [--skip-pull]"
            echo "  --skip-pull        Do not run 'git pull' (deploys current on-disk code)"
            echo "  FORCE_DEPLOY=1     Continue even if 'git pull' fails (env var)"
            exit 0
            ;;
    esac
done

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

# --- Snapshot current commit BEFORE anything changes ---
# We save this AFTER a successful health check so ./rollback.sh has a target.
# The snapshot represents "what's live right now" — the previous good deploy.
PREV_COMMIT="$(git rev-parse HEAD 2>/dev/null || echo '')"

# --- Git pull (with clear failure messaging) ---
if [ "$SKIP_PULL" -eq 1 ]; then
    echo "→ Skipping git pull (--skip-pull flag)"
elif git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
    echo "→ Pulling latest code from $(git remote get-url origin 2>/dev/null || echo 'origin')"
    if ! git pull --ff-only; then
        echo ""
        echo "❌ git pull failed."
        echo ""
        echo "   The most common cause is that GitHub no longer accepts password authentication."
        echo "   You must use a Personal Access Token (PAT) or an SSH deploy key."
        echo ""
        echo "   QUICK FIX — Personal Access Token (recommended):"
        echo "     1. On any browser, go to:  https://github.com/settings/tokens/new"
        echo "     2. Note:       'VPS deploy'"
        echo "     3. Expiration: 'No expiration' (or 1 year)"
        echo "     4. Scopes:     tick ONLY 'repo'"
        echo "     5. Click 'Generate token' and copy the token (starts with ghp_…)"
        echo "     6. On this VPS run these two commands (paste your token when asked):"
        echo ""
        echo "        git config --global credential.helper store"
        echo "        git pull"
        echo ""
        echo "        When prompted, use your GitHub username and paste the TOKEN as the"
        echo "        password. Git will remember it in ~/.git-credentials for next time."
        echo ""
        echo "   To deploy despite this failure (uses on-disk code), rerun:"
        echo "        FORCE_DEPLOY=1 ./deploy.sh"
        echo ""
        if [ "${FORCE_DEPLOY:-0}" != "1" ]; then
            exit 1
        fi
        echo "⚠️  FORCE_DEPLOY=1 set — continuing with current on-disk code."
    fi
else
    echo "(no git upstream configured — skipping pull)"
fi

echo "→ Building images"
$DC build

echo "→ Restarting services"
$DC up -d

# When Docker recreates a container (backend or frontend), it gets a fresh
# internal IP. Nginx caches upstream IPs and will return 502s until it
# re-resolves. A quick nginx restart flushes that cache and ensures every
# deploy comes back clean without manual intervention.
echo "→ Refreshing nginx upstream cache"
$DC restart nginx >/dev/null 2>&1 || echo "⚠️  Nginx restart skipped (container not present?)"

echo "→ Cleaning old images"
docker image prune -f >/dev/null 2>&1 || true

echo "→ Waiting for backend health…"
sleep 6
if curl -fsS http://localhost/api/health >/dev/null 2>&1; then
    echo "✅ Deployed — backend healthy"
    # Record the PREVIOUS commit so ./rollback.sh knows where to go back to.
    # We only write this when the deploy actually succeeded, so rollback
    # never points at a broken snapshot.
    if [ -n "$PREV_COMMIT" ] && [ "$PREV_COMMIT" != "$(git rev-parse HEAD 2>/dev/null || echo '')" ]; then
        echo "$PREV_COMMIT" > .last_deploy_commit
        echo "   (rollback target saved: ${PREV_COMMIT:0:8} — run ./rollback.sh to revert)"
    fi
else
    echo "⚠️  Deployed — could not verify /api/health locally. Check: $DC logs backend"
    echo "   (rollback target NOT updated — ./rollback.sh will still target the last healthy deploy)"
fi
