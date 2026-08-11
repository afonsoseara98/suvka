#!/usr/bin/env bash
#
# Está mesmo vivo?
#
#   ./deploy/healthcheck.sh              # local, na máquina
#   ./deploy/healthcheck.sh https://suvka.com   # de fora, através do Caddy
#
# Sai 0 se estiver bem, 1 se não. Feito para ser usado por um cron, por um monitor externo
# ou pelo deploy.sh - por isso é silencioso quando corre bem e explícito quando falha.
#
# Pergunta três coisas diferentes de propósito, porque falham de maneiras diferentes:
#
#   /api/health   o Node responde E chega à base de dados. A landing page não serve para
#                 isto: é estática, não toca na base de dados, e desenha-se perfeitamente
#                 com o Postgres em baixo.
#   /             o servidor está a servir HTML.
#   systemd       o serviço não está em ciclo de reinícios, que é o estado onde os dois
#                 testes acima podem passar entre falhas.

set -uo pipefail

BASE="${1:-http://127.0.0.1:3000}"
FALHAS=0

verificar() {
  local nome="$1" url="$2" esperado="$3"
  local codigo
  codigo=$(curl -fsS -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")

  if [ "$codigo" = "$esperado" ]; then
    echo "  ok    $nome"
  else
    echo "  FALHA $nome (esperado $esperado, recebido $codigo)" >&2
    FALHAS=$((FALHAS + 1))
  fi
}

echo "==> $BASE"
verificar "base de dados" "$BASE/api/health" 200
verificar "página inicial" "$BASE/" 200

if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet suvka; then
    # NRestarts a subir entre duas execuções é um processo que está a morrer e a voltar -
    # invisível para qualquer teste que só faça um pedido no momento certo.
    reinicios=$(systemctl show suvka -p NRestarts --value 2>/dev/null || echo "?")
    echo "  ok    serviço ativo (reinícios desde o arranque: $reinicios)"
  else
    echo "  FALHA serviço suvka não está ativo" >&2
    FALHAS=$((FALHAS + 1))
  fi
fi

if [ "$FALHAS" -gt 0 ]; then
  echo "!! $FALHAS verificação(ões) falharam. Ver: journalctl -u suvka -n 50 --no-pager" >&2
  exit 1
fi

echo "==> Tudo bem"
