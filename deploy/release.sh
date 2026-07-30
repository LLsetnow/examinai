#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIRECTORY=/var/examinai

cd "$APP_DIRECTORY"
for attempt in 1 2 3; do
  if git fetch --quiet origin main; then
    break
  fi
  if [ "$attempt" = "3" ]; then
    exit 1
  fi
  sleep 5
done
git reset --hard --quiet origin/main
pnpm install --frozen-lockfile
pnpm run build
systemctl restart examinai
