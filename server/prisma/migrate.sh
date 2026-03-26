#!/usr/bin/env bash
# Usage:
#   ./server/prisma/migrate.sh                     # dev (auto name) + deploy
#   ./server/prisma/migrate.sh --name my-migration # dev with custom name + deploy
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

echo "→ prisma migrate dev..."
npx prisma migrate dev "$@"

echo "→ prisma migrate deploy..."
npx prisma migrate deploy

echo "✓ migrations complete"
