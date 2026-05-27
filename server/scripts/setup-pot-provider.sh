#!/usr/bin/env bash
# Setup do bgutil-ytdlp-pot-provider na VPS.
# Resolve o erro "Sign in to confirm you're not a bot" do yt-dlp.
#
# Rode este script UMA VEZ na VPS de producao (com sudo se necessario):
#   bash server/scripts/setup-pot-provider.sh
#
# Requisitos: docker, pip (python3), yt-dlp instalado.

set -euo pipefail

CONTAINER_NAME="${POT_PROVIDER_CONTAINER:-bgutil-provider}"
PORT="${POT_PROVIDER_PORT:-4416}"
IMAGE="brainicism/bgutil-ytdlp-pot-provider"

echo "==> 1/4 Verificando Docker..."
if ! command -v docker >/dev/null 2>&1; then
  echo "ERRO: docker nao encontrado. Instale o Docker antes (https://docs.docker.com/engine/install/)." >&2
  exit 1
fi

echo "==> 2/4 Subindo container '${CONTAINER_NAME}' na porta ${PORT}..."
if docker ps -a --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  echo "    Container ja existe. Reiniciando..."
  docker restart "${CONTAINER_NAME}" >/dev/null
else
  docker run --name "${CONTAINER_NAME}" \
    --restart unless-stopped \
    -d --init \
    -p "${PORT}:4416" \
    "${IMAGE}"
fi

echo "==> 3/4 Instalando/atualizando yt-dlp e o plugin pip..."
if ! command -v pip >/dev/null 2>&1 && ! command -v pip3 >/dev/null 2>&1; then
  echo "ERRO: pip/pip3 nao encontrado. Instale o python3-pip antes." >&2
  exit 1
fi
PIP_BIN="$(command -v pip3 || command -v pip)"
"${PIP_BIN}" install -U bgutil-ytdlp-pot-provider yt-dlp

echo "==> 4/4 Testando provider..."
sleep 2
if curl -sf "http://127.0.0.1:${PORT}/ping" >/dev/null; then
  echo "    Provider respondeu em http://127.0.0.1:${PORT}"
else
  echo "    AVISO: provider nao respondeu em /ping. Confira 'docker logs ${CONTAINER_NAME}'." >&2
fi

echo
echo "Pronto. Verifique com:"
echo "  yt-dlp -v https://youtu.be/dQw4w9WgXcQ 2>&1 | grep -i 'pot\\|bgutil'"
echo "Deve aparecer '[debug] [BgUtilHttpPOT] ...' nas linhas iniciais."
