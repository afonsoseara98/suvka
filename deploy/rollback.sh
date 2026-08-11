#!/usr/bin/env bash
#
# Voltar atrás.
#
#   cd /srv/suvka && ./deploy/rollback.sh              # para o deploy anterior
#   cd /srv/suvka && ./deploy/rollback.sh <commit>     # para um commit específico
#
# O deploy.sh grava o commit que estava online antes de mexer em nada. Isto lê esse ficheiro
# e volta lá.
#
# O QUE ISTO NÃO FAZ, E PORQUÊ
#
# Não reverte migrações da base de dados. Uma migração que já correu pode ter apagado uma
# coluna, e o `down` que a repunha não repõe os dados que estavam lá - reverter à cega é
# como se perde informação de clientes a tentar consertar um deploy.
#
# Consequência prática: se o deploy estragado incluía uma migração, este rollback põe código
# antigo contra um esquema novo. Costuma funcionar (o Prisma tolera colunas a mais), mas é
# uma decisão a tomar com os olhos abertos - por isso avisa e pergunta.

set -euo pipefail

APP_DIR="/srv/suvka"
ANTERIOR="$APP_DIR/.deploy-anterior"

cd "$APP_DIR"

ALVO="${1:-}"
if [ -z "$ALVO" ]; then
  if [ ! -f "$ANTERIOR" ]; then
    echo "!! Não há registo de um deploy anterior ($ANTERIOR)." >&2
    echo "   Indique um commit: ./deploy/rollback.sh <commit>" >&2
    exit 1
  fi
  ALVO=$(cat "$ANTERIOR")
fi

ATUAL=$(git rev-parse HEAD)
echo "==> Agora:  $ATUAL"
echo "==> Voltar: $ALVO"

if [ "$ATUAL" = "$ALVO" ]; then
  echo "==> Já está nesse commit. Nada a fazer."
  exit 0
fi

# Uma migração pelo meio muda a natureza do que se está a fazer.
if ! git diff --quiet "$ALVO" "$ATUAL" -- prisma/migrations; then
  echo
  echo "!! ATENÇÃO: houve migrações da base de dados entre esses dois commits." >&2
  echo "   Este script NÃO as reverte. O código antigo vai correr contra o esquema novo." >&2
  echo
  read -r -p "   Continuar mesmo assim? [s/N] " resposta
  case "$resposta" in
    s|S|sim|Sim) ;;
    *) echo "   Cancelado."; exit 1 ;;
  esac
fi

echo "==> A mudar de código"
git checkout --detach "$ALVO"

echo "==> Dependências"
npm ci

echo "==> Build"
npm run build

echo "==> A reiniciar"
sudo systemctl restart suvka

echo "==> A verificar"
sleep 3
if ./deploy/healthcheck.sh; then
  echo "==> Rollback concluído em $ALVO"
else
  echo "!! O rollback correu mas o serviço não está saudável. Ver os logs." >&2
  exit 1
fi
