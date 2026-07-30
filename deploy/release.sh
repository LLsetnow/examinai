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

# The production instance is intentionally not used for `next build`: its
# limited resources can make the web server unreachable during compilation.
# GitHub Actions supplies a Linux-built archive for the exact source revision.
test -s .next-release.tgz
rm -rf .next
tar -xzf .next-release.tgz
rm -f .next-release.tgz

systemctl restart examinai
