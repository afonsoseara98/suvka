#!/usr/bin/env bash
#
# Repor uma cópia de segurança.
#
#   sudo ./deploy/restore.sh 2026-08-10          # base de dados E fotografias desse dia
#   sudo ./deploy/restore.sh 2026-08-10 fotos    # só as fotografias
#   sudo ./deploy/restore.sh 2026-08-10 base     # só a base de dados
#
# UMA CÓPIA QUE NUNCA FOI REPOSTA É UMA ESPERANÇA, NÃO UMA CÓPIA.
#
# Este script existe para ser corrido uma vez, de propósito, num dia calmo - antes do dia em
# que for preciso. O backup.sh verifica todas as noites que os arquivos são legíveis, mas
# legível não é o mesmo que restaurável.
#
# Destrutivo por natureza: repor a base de dados apaga o que lá está agora. Por isso pede
# confirmação escrita e guarda primeiro uma cópia do estado atual.

set -euo pipefail

DATA="${1:-}"
QUAL="${2:-tudo}"
BACKUP_DIR="${SUVKA_BACKUP_DIR:-/var/backups/suvka}"
UPLOADS_DIR="${SUVKA_UPLOADS_DIR:-/srv/suvka-uploads}"
DB_NAME="${SUVKA_DB_NAME:-suvka}"

if [ -z "$DATA" ]; then
  echo "Uso: $0 AAAA-MM-DD [tudo|base|fotos]" >&2
  echo >&2
  echo "Cópias disponíveis em $BACKUP_DIR:" >&2
  ls -1 "$BACKUP_DIR" 2>/dev/null | sed 's/^/  /' >&2 || echo "  (nenhuma)" >&2
  exit 1
fi

ARQ_BASE="$BACKUP_DIR/db-$DATA.sql.gz"
ARQ_FOTOS="$BACKUP_DIR/photos-$DATA.tgz"

restaurar_base() {
  [ -f "$ARQ_BASE" ] || { echo "!! Não existe $ARQ_BASE" >&2; exit 1; }

  echo "==> A guardar o estado ATUAL antes de o substituir"
  local seguranca="$BACKUP_DIR/db-antes-do-restore-$(date +%F-%H%M%S).sql.gz"
  sudo -u postgres pg_dump "$DB_NAME" | gzip > "$seguranca"
  echo "    $seguranca"

  echo "==> A repor a base de dados de $DATA"
  # Recriada em vez de despejada por cima: um restore sobre dados existentes deixa linhas
  # que a cópia não tinha, e um estado que não é nem o de antes nem o de depois.
  sudo systemctl stop suvka
  sudo -u postgres dropdb --if-exists "${DB_NAME}_old"
  sudo -u postgres psql -c "ALTER DATABASE \"$DB_NAME\" RENAME TO \"${DB_NAME}_old\";"
  sudo -u postgres createdb "$DB_NAME" --owner=suvka
  gunzip -c "$ARQ_BASE" | sudo -u postgres psql "$DB_NAME" > /dev/null
  sudo systemctl start suvka

  echo "    Reposta. A anterior ficou como \"${DB_NAME}_old\" - apague-a quando tiver a certeza:"
  echo "      sudo -u postgres dropdb ${DB_NAME}_old"
}

restaurar_fotos() {
  [ -f "$ARQ_FOTOS" ] || { echo "!! Não existe $ARQ_FOTOS" >&2; exit 1; }

  echo "==> A repor as fotografias de $DATA"
  # Extraídas para o lado e trocadas, para que uma extração interrompida não deixe metade
  # das fotografias dos clientes no sítio e metade não.
  local temporario="${UPLOADS_DIR}.restore-$$"
  mkdir -p "$temporario"
  tar -xzf "$ARQ_FOTOS" -C "$temporario" --strip-components=1

  if [ -d "$UPLOADS_DIR" ]; then
    mv "$UPLOADS_DIR" "${UPLOADS_DIR}.antes-do-restore-$(date +%F-%H%M%S)"
  fi
  mv "$temporario" "$UPLOADS_DIR"
  chown -R suvka:suvka "$UPLOADS_DIR"

  echo "    Repostas. A pasta anterior ficou ao lado, com sufixo .antes-do-restore-*"
}

echo "Isto vai substituir dados em produção ($QUAL, da cópia de $DATA)."
read -r -p "Escreva REPOR para continuar: " confirmacao
[ "$confirmacao" = "REPOR" ] || { echo "Cancelado."; exit 1; }

case "$QUAL" in
  base)  restaurar_base ;;
  fotos) restaurar_fotos ;;
  tudo)  restaurar_base; restaurar_fotos ;;
  *)     echo "!! Segundo argumento tem de ser tudo, base ou fotos" >&2; exit 1 ;;
esac

echo "==> A verificar"
"$(dirname "$0")/healthcheck.sh"
