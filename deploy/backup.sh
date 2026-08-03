#!/usr/bin/env bash
# Backup MongoDB and uploaded files.
# Usage: ./deploy/backup.sh [output-dir]

set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${1:-./backups}"
STAMP="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$OUT"

echo "→ Dumping MongoDB…"
docker compose exec -T mongo mongodump --archive --gzip --db "${DB_NAME:-swell_design_media}" > "$OUT/mongo_${STAMP}.gz"

echo "→ Archiving uploads…"
docker run --rm -v swelldesignla_uploads_data:/data -v "$(pwd)/$OUT:/backup" alpine tar -czf "/backup/uploads_${STAMP}.tar.gz" -C / data

echo "✅ Backup complete: $OUT/mongo_${STAMP}.gz , $OUT/uploads_${STAMP}.tar.gz"
