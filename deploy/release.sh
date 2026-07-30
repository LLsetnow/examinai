#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIRECTORY=/var/examinai

cd "$APP_DIRECTORY"
git fetch --quiet origin main
git reset --hard --quiet origin/main
pnpm install --frozen-lockfile
pnpm run build
systemctl restart examinai
