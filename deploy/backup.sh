#!/usr/bin/env bash
#
# Daily backup of the two things that cannot be regenerated.
#
#   sudo cp deploy/backup.sh /usr/local/bin/suvka-backup
#   sudo chmod +x /usr/local/bin/suvka-backup
#   sudo crontab -e
#     15 4 * * * /usr/local/bin/suvka-backup
#
# Photographs first, because they are the only thing here that is irreplaceable. A lost
# database costs the accounts and the published sites, which the owners can recreate from
# the form in two minutes. A lost photograph directory costs every restaurant the pictures
# they took of their own food, and nothing brings those back.

set -euo pipefail

# Fora do repositório. Tem de coincidir com SUVKA_UPLOADS_DIR no .env.production - uma
# cópia que aponta para a pasta errada faz backups vazios durante meses sem se queixar.
PHOTOS_DIR="${SUVKA_UPLOADS_DIR:-/srv/suvka-uploads}"
BACKUP_DIR="${SUVKA_BACKUP_DIR:-/var/backups/suvka}"
KEEP_DAYS="${SUVKA_BACKUP_KEEP_DAYS:-14}"
DB_NAME="${SUVKA_DB_NAME:-suvka}"

STAMP="$(date +%F)"
mkdir -p "$BACKUP_DIR"

echo "==> Fotografias"
if [ -d "$PHOTOS_DIR" ]; then
  # Written to a temporary name and moved into place, so a backup interrupted halfway
  # cannot overwrite yesterday's good one with a truncated file.
  tar -czf "$BACKUP_DIR/photos-$STAMP.tgz.part" -C "$(dirname "$PHOTOS_DIR")" "$(basename "$PHOTOS_DIR")"
  mv "$BACKUP_DIR/photos-$STAMP.tgz.part" "$BACKUP_DIR/photos-$STAMP.tgz"
  echo "    $(du -h "$BACKUP_DIR/photos-$STAMP.tgz" | cut -f1)"
else
  echo "    $PHOTOS_DIR não existe - nada a copiar"
fi

echo "==> Base de dados"
sudo -u postgres pg_dump "$DB_NAME" | gzip > "$BACKUP_DIR/db-$STAMP.sql.gz.part"
mv "$BACKUP_DIR/db-$STAMP.sql.gz.part" "$BACKUP_DIR/db-$STAMP.sql.gz"
echo "    $(du -h "$BACKUP_DIR/db-$STAMP.sql.gz" | cut -f1)"

echo "==> A remover cópias com mais de $KEEP_DAYS dias"
find "$BACKUP_DIR" -name 'photos-*.tgz' -mtime "+$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'db-*.sql.gz' -mtime "+$KEEP_DAYS" -delete

# A backup nobody has ever restored is a hope, not a backup. Verifying the archive is
# readable is the cheapest possible version of that check, and it runs every night.
echo "==> A verificar"
if [ -f "$BACKUP_DIR/photos-$STAMP.tgz" ]; then
  tar -tzf "$BACKUP_DIR/photos-$STAMP.tgz" > /dev/null
  echo "    fotografias: arquivo legível"
fi
gzip -t "$BACKUP_DIR/db-$STAMP.sql.gz"
echo "    base de dados: arquivo legível"

echo "==> Feito: $BACKUP_DIR"
