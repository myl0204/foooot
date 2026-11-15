#!/usr/bin/env bash
# Run on the server from /opt/oracle to pull new code and restart.
set -euo pipefail
cd /opt/oracle
git pull --ff-only
npm ci
npm run build
sudo systemctl restart oracle
sleep 2
curl -sf http://127.0.0.1:8787/api/meta > /dev/null && echo "✓ Oracle is up" || { echo "✗ not responding — check: journalctl -u oracle -n 50"; exit 1; }
