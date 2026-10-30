#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
if ! command -v codex >/dev/null 2>&1; then
  echo 'Installing the official Codex CLI into this WSL environment...'
  npm install -g @openai/codex@latest
fi
printf 'Starting Codex with PATCH//LIVE development brief...\n'
exec codex --sandbox workspace-write --ask-for-approval on-request "$(cat FIRST_CODEX_PROMPT.md)"
