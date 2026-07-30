#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIRECTORY=/var/examinai

cd "$APP_DIRECTORY"
git fetch --quiet origin main
git checkout --quiet main
git pull --ff-only --quiet origin main
npm ci --omit=dev
npm run build
systemctl restart examinai
