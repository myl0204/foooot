#!/usr/bin/env bash
# One-command install AND update for Ubuntu/Debian servers.
#
#   sudo bash setup.sh                 # app on http://SERVER_IP:8787
#   sudo bash setup.sh example.com     # app on https://example.com (auto HTTPS)
#
# Safe to re-run: it pulls the latest code, rebuilds and restarts.
set -euo pipefail

REPO="${REPO:-https://github.com/myl0204/foooot.git}"
DIR=/opt/oracle
DOMAIN="${1:-}"

[ "$(id -u)" -eq 0 ] || { echo "Please run with sudo: sudo bash $0 $*"; exit 1; }
say() { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }

say "Installing system packages (git, Node.js 24)"
apt-get update -qq
apt-get install -y -qq git curl ca-certificates >/dev/null
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
echo "node $(node -v)"

say "Fetching the code into $DIR"
id oracle &>/dev/null || useradd --system --create-home --shell /usr/sbin/nologin oracle
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull --ff-only
else
  git clone "$REPO" "$DIR"
fi
chown -R oracle:oracle "$DIR"

if [ ! -f "$DIR/.env" ]; then
  cp "$DIR/.env.example" "$DIR/.env"
  NEED_ENV=1
fi
chown oracle:oracle "$DIR/.env"; chmod 600 "$DIR/.env"

say "Installing dependencies and building"
cd "$DIR"
sudo -u oracle npm ci --no-audit --no-fund
sudo -u oracle npm run build

say "Starting the service"
cp "$DIR/deploy/oracle.service" /etc/systemd/system/oracle.service
systemctl daemon-reload
systemctl enable --quiet oracle
systemctl restart oracle

if [ -n "$DOMAIN" ]; then
  say "Setting up HTTPS for $DOMAIN"
  apt-get install -y -qq caddy >/dev/null
  printf '%s {\n\tencode zstd gzip\n\treverse_proxy 127.0.0.1:8787\n}\n' "$DOMAIN" > /etc/caddy/Caddyfile
  systemctl reload caddy || systemctl restart caddy
fi

say "Checking it's up"
for _ in $(seq 1 30); do
  curl -sf http://127.0.0.1:8787/api/meta >/dev/null && break
  sleep 1
done
if curl -sf http://127.0.0.1:8787/api/meta >/dev/null; then
  echo "✓ Oracle is running"
  if [ -n "$DOMAIN" ]; then echo "  Open: https://$DOMAIN"; else echo "  Open: http://$(hostname -I | awk '{print $1}'):8787"; fi
else
  echo "✗ Not responding yet. See logs: journalctl -u oracle -n 50"
  exit 1
fi

if [ "${NEED_ENV:-0}" = 1 ]; then
  echo
  echo "NOTE: $DIR/.env was created empty, so it's running on the demo league with no AI."
  echo "      Add your keys:  sudo nano $DIR/.env   then:  sudo systemctl restart oracle"
fi
