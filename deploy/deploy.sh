#!/usr/bin/env bash
#
# The deploy. Run it on the server, as the noctra user:
#
#   ssh noctra@SEU-IP
#   cd /srv/noctra && ./deploy/deploy.sh
#
# Safe to run repeatedly. Stops at the first failure rather than restarting a broken build
# over a working one.

set -euo pipefail

APP_DIR="/srv/noctra"
cd "$APP_DIR"

# Guardado ANTES de mexer em nada, para o rollback.sh saber a que commit voltar. Sem isto,
# voltar atrás depende de alguém se lembrar do sha certo no pior momento possível.
git rev-parse HEAD > "$APP_DIR/.deploy-anterior"

echo "==> A obter a versão mais recente"
git pull --ff-only

echo "==> Dependências"
# `ci` rather than `install`: installs exactly what package-lock.json says, so the server
# never quietly gets a different version of something than the machine it was built on.
npm ci

echo "==> Base de dados"
# `migrate deploy` only applies migrations that already exist. It never generates one and
# never prompts, which is what makes it safe to run unattended against production data.
npx prisma migrate deploy

echo "==> Build"
# Built before the old process is stopped. If this fails, the site currently online stays
# online and the deploy ends here.
npm run build

echo "==> A reiniciar"
sudo systemctl restart noctra

echo "==> À espera que responda"
# Verificado contra /api/health, não contra "/". A página inicial é estática, não toca na
# base de dados e desenha-se perfeitamente com o Postgres em baixo - um deploy que tivesse
# partido todas as contas e todos os sites publicados dizia "Online" e saía 0.
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null http://127.0.0.1:3000/api/health; then
    echo "==> Online"
    "$APP_DIR/deploy/healthcheck.sh"
    exit 0
  fi
  sleep 1
done

echo "!! Não respondeu em 30 segundos." >&2
echo "   Logs:     journalctl -u noctra -n 50 --no-pager" >&2
echo "   Reverter: ./deploy/rollback.sh" >&2
exit 1
