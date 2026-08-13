#!/usr/bin/env bash
#
# The deploy. Run it on the server, as the suvka user:
#
#   ssh suvka@SEU-IP
#   cd /srv/suvka && ./deploy/deploy.sh
#
# Safe to run repeatedly. Stops at the first failure rather than restarting a broken build
# over a working one.

set -euo pipefail

APP_DIR="/srv/suvka"
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

echo "==> Ambiente"
# ANTES DA PRIMEIRA COISA IRREVERSÍVEL
#
# Isto corria implicitamente no build, que é o passo mais longo e o último. Um APP_URL em
# falta parava o deploy DEPOIS das migrações já terem corrido, e ficava um servidor a correr
# código antigo contra um esquema novo com alguém a olhar para um erro sem saber se era grave.
#
# Aqui - a seguir ao git pull e ao npm ci, que são reversíveis, e antes de migrar, que não é.
# As regras não estão copiadas para aqui: isto chama o mesmo app/lib/env.ts que decide se o
# servidor arranca, porque um preflight que discorde do arranque é pior do que nenhum.
npx tsx scripts/preflight.ts .env.production

# O CLI DO PRISMA NÃO VÊ O .env.production SOZINHO
#
# O prisma.config.ts do Prisma 7 lê a ligação com `import "dotenv/config"`, e o dotenv carrega
# `.env` — não `.env.production`. O DATABASE_URL de produção está no `.env.production`, e quem
# o carrega é o systemd, para o SERVIÇO. Esta shell não o tem.
#
# Até ao Prisma 6 isto não se punha: o `datasource` do schema.prisma resolvia
# env("DATABASE_URL") pelo carregador do próprio Prisma. No 7 passou para o ficheiro de config,
# e o carregamento de ambiente é aquele dotenv explícito.
#
# Sem isto, o `migrate deploy` abaixo não sabe a que base se ligar.
set -a
# shellcheck disable=SC1091
. "$APP_DIR/.env.production"
set +a

echo "==> Base de dados"
# `migrate deploy` only applies migrations that already exist. It never generates one and
# never prompts, which is what makes it safe to run unattended against production data.
npx prisma migrate deploy

echo "==> Build"
# Built before the old process is stopped. If this fails, the site currently online stays
# online and the deploy ends here.
npm run build

echo "==> A reiniciar"
sudo systemctl restart suvka

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
echo "   Logs:     journalctl -u suvka -n 50 --no-pager" >&2
echo "   Reverter: ./deploy/rollback.sh" >&2
exit 1
