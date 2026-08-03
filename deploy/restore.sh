#!/usr/bin/env bash
# Restore MongoDB from a mongodump archive.
# Usage: ./deploy/restore.sh path/to/mongo_YYYYMMDD_HHMMSS.gz

set -euo pipefail
if [ $# -lt 1 ]; then echo "Usage: $0 path/to/mongo_archive.gz"; exit 1; fi
cd "$(dirname "$0")/.."

echo "→ Restoring MongoDB from $1…"
cat "$1" | docker compose exec -T mongo mongorestore --archive --gzip --drop

echo "✅ Restore complete."
