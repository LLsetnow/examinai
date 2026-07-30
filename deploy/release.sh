#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIRECTORY=/var/examinai

cd "$APP_DIRECTORY"
test -s .source-release.tgz
tar -xzf .source-release.tgz
rm -f .source-release.tgz

pnpm install --frozen-lockfile

# The production instance is intentionally not used for `next build`: its
# limited resources can make the web server unreachable during compilation.
# GitHub Actions supplies a Linux-built archive for the exact source revision.
test -s .next-release.tgz
rm -rf .next
tar -xzf .next-release.tgz
rm -f .next-release.tgz

systemctl restart examinai
