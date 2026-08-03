#!/usr/bin/env bash
# First-time server bootstrap for AlmaLinux 10 (Hostinger VPS).
# Run as root or via sudo.

set -euo pipefail

echo "→ Updating system"
dnf -y update

echo "→ Installing dependencies"
dnf -y install curl git firewalld tar

echo "→ Installing Docker CE"
if ! command -v docker >/dev/null 2>&1; then
    dnf -y install dnf-plugins-core || true
    dnf config-manager --add-repo=https://download.docker.com/linux/centos/docker-ce.repo
    dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
fi

echo "→ Configuring firewall"
systemctl enable --now firewalld || true
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-service=ssh
firewall-cmd --reload

echo "✅ Server ready. Next: clone your repo, copy .env.example to .env, then run ./deploy.sh"
