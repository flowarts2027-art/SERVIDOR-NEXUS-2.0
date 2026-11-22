#!/usr/bin/env bash
# Instala o servidor da ponte do WhatsApp do Nexus CRM num Ubuntu (Oracle grátis).
# Uso: bash instalar-servidor.sh   (pede a chave do servidor, que fica na aba Contas do CRM)
set -euo pipefail
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
sudo apt-get install -y git >/dev/null
sudo mkdir -p /opt/nexus-ponte && sudo chown "$USER" /opt/nexus-ponte
if [ -d /opt/nexus-ponte/repo/.git ]; then
  git -C /opt/nexus-ponte/repo pull -q
else
  git clone -q --depth 1 -b crm-deploy --filter=blob:none --sparse https://github.com/flowarts2027-art/SERVIDOR-NEXUS-2.0 /opt/nexus-ponte/repo
  git -C /opt/nexus-ponte/repo sparse-checkout set nexus-crm/ponte
fi
cd /opt/nexus-ponte/repo/nexus-crm/ponte && npm install --omit=dev --no-audit --no-fund
if [ ! -f /opt/nexus-ponte/chave.env ]; then
  read -rsp "Cole a chave do servidor (aba Contas do CRM) e aperte Enter: " K; echo
  printf 'SERVER_KEY=%s\nDADOS=/opt/nexus-ponte/contas\n' "$K" > /opt/nexus-ponte/chave.env
  chmod 600 /opt/nexus-ponte/chave.env
fi
sudo tee /etc/systemd/system/nexus-ponte.service >/dev/null <<UNIT
[Unit]
Description=Nexus CRM - ponte do WhatsApp (todas as contas)
After=network-online.target
Wants=network-online.target

[Service]
User=$USER
EnvironmentFile=/opt/nexus-ponte/chave.env
WorkingDirectory=/opt/nexus-ponte/repo/nexus-crm/ponte
ExecStart=$(command -v node) servidor.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable --now nexus-ponte
sleep 5
sudo systemctl --no-pager status nexus-ponte | head -5
echo "PRONTO. Para ver o que está acontecendo: journalctl -u nexus-ponte -f"
