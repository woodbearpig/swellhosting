#!/usr/bin/env bash
# Backup MongoDB and uploaded files.
# Usage: ./deploy/backup.sh [output-dir]

set -euo pipefail
cd "$(dirname "$0")/.."

get_env() {
    local key="$1"; local default="${2:-}"
    local val
    val=$(grep -E "^${key}=" .env | head -1 | cut -d'=' -f2- | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/")
    echo "${val:-$default}"
}

DB=$(get_env DB_NAME swell_design_media)

OUT="${1:-./backups}"
STAMP="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$OUT"

echo "→ Dumping MongoDB ($DB)…"
docker compose exec -T mongo mongodump --archive --gzip --db "$DB" > "$OUT/mongo_${STAMP}.gz"

echo "→ Archiving uploads…"
docker run --rm -v swell_uploads_data:/data -v "$(pwd)/$OUT:/backup" alpine tar -czf "/backup/uploads_${STAMP}.tar.gz" -C / data

echo "✅ Backup complete: $OUT/mongo_${STAMP}.gz , $OUT/uploads_${STAMP}.tar.gz"
