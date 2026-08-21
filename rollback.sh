#!/usr/bin/env bash
# ============================================================
# rollback.sh — one-command revert to the previous good deploy
# ============================================================
# Reads the commit hash saved by deploy.sh when the last deploy
# succeeded, resets the working tree to that commit, rebuilds the
# containers, and restarts nginx. Interactive confirmation prompt
# before anything destructive happens.
#
# Usage:
#   ./rollback.sh          # interactive — prompts before rolling back
#   ./rollback.sh --yes    # skip confirmation (for scripting / emergencies)
#   ./rollback.sh --help
#
# Environment variables:
#   FORCE=1                # bypass "no rollback target found" safety check
#
# What this DOES:
#   • git reset --hard <previous good commit>
#   • docker compose build (rebuilds from reverted code)
#   • docker compose up -d
#   • docker compose restart nginx (flushes upstream IP cache)
#   • health check /api/health
#
# What this does NOT do:
#   • Reverse database changes (Mongo). All our migrations are additive,
#     so this is virtually never a problem.
#   • Touch uploaded media in /uploads (safe — media is not in git).
#   • Touch .env or environment variables.
#   • Roll back more than one deploy in a single run. Each successful
#     deploy overwrites the rollback target with the commit that WAS live.
# ============================================================

set -euo pipefail
cd "$(dirname "$0")"

# ---- Args ----
YES=0
for arg in "$@"; do
    case "$arg" in
        --yes|-y) YES=1 ;;
        --help|-h)
            sed -n '2,32p' "$0"
            exit 0
            ;;
        *)
            echo "Unknown flag: $arg (try --help)"
            exit 1
            ;;
    esac
done

# ---- Sanity checks ----
if [ ! -f .env ]; then
    echo "❌ .env file missing. This doesn't look like the swell deploy directory."
    exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Docker not installed."
    exit 1
fi

if docker compose version >/dev/null 2>&1; then
    DC="docker compose"
else
    DC="docker-compose"
fi

if [ ! -f .last_deploy_commit ]; then
    echo "❌ No rollback target found (.last_deploy_commit is missing)."
    echo ""
    echo "   This happens when:"
    echo "     • You've never run ./deploy.sh successfully yet, OR"
    echo "     • The file was deleted, OR"
    echo "     • You're running this for the first time after adding rollback support."
    echo ""
    echo "   To roll back manually with git:"
    echo "     git log --oneline -10        # find the commit you want"
    echo "     git reset --hard <hash>"
    echo "     ./deploy.sh --skip-pull"
    echo ""
    if [ "${FORCE:-0}" != "1" ]; then
        exit 1
    fi
    echo "⚠️  FORCE=1 set — continuing anyway (this will likely fail)."
fi

PREV_COMMIT="$(tr -d '[:space:]' < .last_deploy_commit 2>/dev/null || echo '')"
CURR_COMMIT="$(git rev-parse HEAD 2>/dev/null || echo '')"

if [ -z "$PREV_COMMIT" ]; then
    echo "❌ .last_deploy_commit is empty. Nothing to roll back to."
    exit 1
fi

if [ "$PREV_COMMIT" = "$CURR_COMMIT" ]; then
    echo "ℹ️  Current commit ($CURR_COMMIT) is already the rollback target."
    echo "    Nothing to do — you're already on the previous good deploy."
    exit 0
fi

# ---- Show the operator what's about to happen ----
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ROLLBACK PREVIEW"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "  From (current live):  $CURR_COMMIT"
echo "  To (previous good):   $PREV_COMMIT"
echo ""

if git rev-parse "$PREV_COMMIT" >/dev/null 2>&1; then
    echo "  Commits that will be UNDONE:"
    echo ""
    git log --oneline "$PREV_COMMIT..HEAD" 2>/dev/null | sed 's/^/    • /' || echo "    (no commits found — target may be unreachable)"
    echo ""
else
    echo "  ⚠️  Target commit not found in local history."
    echo "     You may need to 'git fetch --all' first."
    exit 1
fi

echo "  What happens next:"
echo "    1. git reset --hard $PREV_COMMIT   (code goes back)"
echo "    2. docker compose build            (~2-4 min)"
echo "    3. docker compose up -d            (containers swap)"
echo "    4. docker compose restart nginx    (flush upstream cache)"
echo "    5. curl /api/health                (verify)"
echo ""
echo "  Database and uploaded media are NOT touched — this is code only."
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

# ---- Confirmation ----
if [ "$YES" -ne 1 ]; then
    read -r -p "  Proceed with rollback? [y/N] " ans
    case "$ans" in
        y|Y|yes|YES) ;;
        *) echo "  Cancelled — no changes made."; exit 0 ;;
    esac
fi

# ---- Do the work ----
echo ""
echo "→ Rolling code back to $PREV_COMMIT"
git reset --hard "$PREV_COMMIT"

echo "→ Rebuilding images"
$DC build

echo "→ Restarting services"
$DC up -d

echo "→ Refreshing nginx upstream cache"
$DC restart nginx >/dev/null 2>&1 || echo "⚠️  Nginx restart skipped (container not present?)"

echo "→ Cleaning old images"
docker image prune -f >/dev/null 2>&1 || true

echo "→ Waiting for backend health…"
sleep 6
if curl -fsS http://localhost/api/health >/dev/null 2>&1; then
    echo ""
    echo "✅ Rollback complete — backend healthy at commit ${PREV_COMMIT:0:8}"
    # Do NOT update .last_deploy_commit here. That way, if the rollback
    # itself turns out to be worse than the current state, running
    # ./rollback.sh a second time is a no-op (which is what we want —
    # forward fixes should go through git + ./deploy.sh, not another rollback).
else
    echo ""
    echo "⚠️  Rollback deployed, but /api/health didn't respond."
    echo "    Check logs:  $DC logs --tail 50 backend"
fi
