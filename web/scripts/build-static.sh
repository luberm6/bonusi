#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SHELL_DIR="$ROOT_DIR/shell"
DIST_DIR="$ROOT_DIR/dist"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"
cp -R "$SHELL_DIR/." "$DIST_DIR/"

API_BASE="${PUBLIC_API_BASE:-http://127.0.0.1:4000}"
if [[ "$API_BASE" != */api/v1 ]]; then
  API_BASE="${API_BASE%/}/api/v1"
fi
FILES_ENABLED="${FILES_ENABLED:-false}"
PUSH_ENABLED="${PUSH_ENABLED:-false}"
SMTP_ENABLED="${SMTP_ENABLED:-false}"
mkdir -p "$DIST_DIR/assets"
cat > "$DIST_DIR/assets/config.js" <<EOF
window.__AUTOSERVICE_API_BASE__ = "${API_BASE}";
window.__AUTOSERVICE_FILES_ENABLED__ = ${FILES_ENABLED};
window.__AUTOSERVICE_PUSH_ENABLED__ = ${PUSH_ENABLED};
window.__AUTOSERVICE_SMTP_ENABLED__ = ${SMTP_ENABLED};
EOF

echo "[web-build] static shell built to $DIST_DIR"
echo "[web-build] PUBLIC_API_BASE=$API_BASE"
