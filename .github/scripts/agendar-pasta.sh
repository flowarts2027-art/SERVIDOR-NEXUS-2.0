#!/usr/bin/env bash
# Sobe para o painel da Flow Arts os posts prontos da pasta agendamentos/ (pedido do Rodrigo, 21/10).
# As artes são feitas fora (ChatGPT, sem custo na OpenAI). Cada post entra ESPERANDO A APROVAÇÃO
# do Rodrigo no painel; nada é publicado sem esse OK.
#
# Pasta de cada post: agendamentos/AAAA-MM-DD/HHMM/  (ex.: agendamentos/2026-10-22/0900/)
#   legenda.txt                      obrigatória (menos no story)
#   imagem.jpg                       post de uma imagem (4:5)
#   01.jpg, 02.jpg ... 10.jpg        carrossel (2 a 10 cartões, 4:5)
#   video.mp4 + capa.jpg             Reel (9:16)
#   story.jpg  ou  story.mp4 + capa.jpg   Story (9:16)
#
# Outro cliente (22/10): agendamentos/clientes/<id-do-cliente>/AAAA-MM-DD/HHMM/  (ex.: clientes/quatree-dog/2026-10-24/0900/)
#   O post vai para o painel DAQUELE cliente, esperando aprovação, igual à Flow Arts.
#
# Uso: agendar-pasta.sh SLOT...   (SLOT = AAAA-MM-DD/HHMM ou clientes/<id>/AAAA-MM-DD/HHMM)
# DRY_RUN=1 só mostra o que faria, sem banco nem envio.

set -euo pipefail
ROOT="${AGENDAMENTOS_DIR:-agendamentos}"
DRY_RUN="${DRY_RUN:-0}"
FAIL=0

note() { echo "::notice::$*"; }
fail() { echo "::error::$*"; FAIL=1; }

mime() {
  case "${1,,}" in
    *.jpg|*.jpeg) echo image/jpeg ;;
    *.png) echo image/png ;;
    *.webp) echo image/webp ;;
    *.mp4) echo video/mp4 ;;
    *) echo application/octet-stream ;;
  esac
}

# Arquivo com nome-base exato (qualquer extensão de imagem), ou vazio.
image_named() {
  find "$1" -maxdepth 1 -type f -iregex ".*/$2\.\(jpg\|jpeg\|png\|webp\)" | sort | head -1
}

# Wrangler pode imprimir avisos como "[WARNING]" antes do JSON: procura o primeiro array que é JSON válido.
q() {
  local raw
  raw="$(npx --yes wrangler@4 d1 execute servidor-nexus --remote --json --command "$1" 2>/tmp/wr.err || true)"
  # Só aceita a resposta de consulta do D1: lista de objetos com "results". Erro da API sai como falha.
  printf '%s' "$raw" | python3 -c '
import sys, json
t = sys.stdin.read(); d = json.JSONDecoder(); i = t.find("[")
while i >= 0:
    try:
        v, _ = d.raw_decode(t[i:])
        if isinstance(v, list) and v and isinstance(v[0], dict) and "results" in v[0]:
            print(json.dumps(v)); sys.exit(0)
    except ValueError: pass
    i = t.find("[", i + 1)
sys.exit(1)' 2>/dev/null \
    || { echo "::error::D1: $(printf '%s' "$raw" | tr '\n' ' ' | cut -c1-300) | $(tr '\n' ' ' </tmp/wr.err | cut -c1-300)" >&2; echo "[]"; }
}

session_ready=0
HASH=""
declare -A CLIENT_OK=()
# A sessão temporária do Master (15 min) é apagada no fim, mesmo se der erro.
cleanup() { if [ -n "$HASH" ]; then q "DELETE FROM master_sessions WHERE token_hash='$HASH'" >/dev/null 2>&1 || true; fi; }
trap cleanup EXIT

start_session() {
  [ "$session_ready" = 1 ] && return 0
  local found
  TOKEN="$(openssl rand -hex 32)"
  HASH="$(printf '%s' "$TOKEN" | sha256sum | cut -d' ' -f1)"
  local exp; exp="$(date -u -d '+15 minutes' +%Y-%m-%dT%H:%M:%S.000Z)"
  q "INSERT INTO master_sessions(token_hash, expires_at) VALUES('$HASH', '$exp')" >/dev/null
  session_ready=1
}

# Confere no banco que o cliente existe (uma vez por cliente).
client_exists() {
  local id="$1"
  [ -n "${CLIENT_OK[$id]:-}" ] && return 0
  local found
  found="$(q "SELECT id FROM clients WHERE id='$id' LIMIT 1")"
  [ "$(printf '%s' "$found" | jq -r '.[0].results[0].id // empty' 2>/dev/null || true)" = "$id" ] || return 1
  CLIENT_OK[$id]=1
}

process_slot() {
  local slot="$1" CLIENT_ID="primeiro-teste"
  if [[ "$slot" =~ ^clientes/([a-z0-9][a-z0-9-]{1,48})/(.+)$ ]]; then
    CLIENT_ID="${BASH_REMATCH[1]}"
    local rest="${BASH_REMATCH[2]}"
    [[ "$rest" =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2})/([0-2][0-9])([0-5][0-9])(-story)?$ ]] || { fail "$slot: nome inválido (use clientes/<cliente>/AAAA-MM-DD/HHMM)"; return; }
  else
    [[ "$slot" =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2})/([0-2][0-9])([0-5][0-9])(-story)?$ ]] || { fail "$slot: nome inválido (use AAAA-MM-DD/HHMM)"; return; }
  fi
  local day="${BASH_REMATCH[1]}" time="${BASH_REMATCH[2]}:${BASH_REMATCH[3]}" dir="$ROOT/$slot"
  [ -d "$dir" ] || { note "$slot: pasta apagada, nada a fazer"; return; }

  local iso; iso="$(date -u -d "${day}T${time}:00-03:00" +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null)" || { fail "$slot: data inválida"; return; }
  if [ "$(date -u -d "$iso" +%s)" -lt "$(( $(date -u +%s) + 600 ))" ]; then
    note "$slot: horário passou ou falta menos de 10 min; não enviado"; return
  fi

  local args=() type="" caption="$dir/legenda.txt" video story single
  local cards=()
  mapfile -t cards < <(find "$dir" -maxdepth 1 -type f -iregex '.*/[0-9][0-9]\.\(jpg\|jpeg\|png\|webp\)' | sort)
  single="$(image_named "$dir" imagem)"
  story="$(image_named "$dir" story)"
  video="$(find "$dir" -maxdepth 1 -type f \( -iname video.mp4 -o -iname story.mp4 \) | head -1)"
  local cover; cover="$(image_named "$dir" capa)"

  if [ "${#cards[@]}" -ge 2 ]; then
    type=carousel
    [ "${#cards[@]}" -le 10 ] || { fail "$slot: carrossel com mais de 10 cartões"; return; }
    for f in "${cards[@]}"; do args+=(-F "images=@$f;type=$(mime "$f")"); done
  elif [ -n "$single" ]; then
    type=post
    args+=(-F "images=@$single;type=$(mime "$single")")
  elif [ -n "$video" ]; then
    case "${video,,}" in *story.mp4) type=story ;; *) type=reel ;; esac
    [ -n "$cover" ] || { fail "$slot: falta capa.jpg para o vídeo"; return; }
    args+=(-F "video=@$video;type=video/mp4" -F "cover=@$cover;type=$(mime "$cover")")
  elif [ -n "$story" ]; then
    type=story
    args+=(-F "images=@$story;type=$(mime "$story")")
  else
    fail "$slot: nenhuma arte encontrada (imagem.jpg, 01.jpg..., video.mp4 ou story.jpg)"; return
  fi

  if [[ "$slot" = *-story ]] && [ "$type" != story ]; then
    fail "$slot: pasta -story exige story.jpg ou story.mp4"; return
  fi

  if [ "$type" != story ]; then
    [ -s "$caption" ] || { fail "$slot: falta legenda.txt"; return; }
    args+=(-F "caption=<$caption")
  fi

  if [ "$DRY_RUN" = 1 ]; then
    note "$slot: enviaria $type para $iso no painel de $CLIENT_ID (esperando aprovação), ${#args[@]} campos"
    return
  fi

  start_session || return
  client_exists "$CLIENT_ID" || { fail "$slot: cliente '$CLIENT_ID' não encontrado no Nexus"; return; }
  # Substituições autorizadas pelo Rodrigo: bloquear as peças que repetiam imagens.
  local superseded="" superseded_count
  case "$slot" in
    clientes/quatree-dog/2026-10-23/1500) superseded=upload-carousel-5a57541d-188e-4b77-8031-3d9c79ea6da6 ;;
    2026-10-23/1200) superseded=upload-reel-0cad7c84-a287-4b8f-8339-e322531f2018 ;;
  esac
  if [ -n "$superseded" ]; then
    q "UPDATE post_ledger SET status='cancelled',approval_status='rejected',updated_at=CURRENT_TIMESTAMP WHERE id='$superseded' AND client_id='$CLIENT_ID' AND scheduled_for='$iso' AND status NOT IN ('published','publishing')" >/dev/null
    superseded_count="$(q "SELECT COUNT(*) AS n FROM post_ledger WHERE id='$superseded' AND client_id='$CLIENT_ID' AND status='cancelled' AND approval_status='rejected'" | jq -r '.[0].results[0].n // 0')"
    [ "$superseded_count" = 1 ] || { fail "$slot: peça repetida anterior não cancelada; substituição interrompida"; return; }
    note "$slot: peça anterior que repetia imagens cancelada; histórico preservado"
  fi
  local existing format_filter
  if [ "$type" = story ]; then
    format_filter="json_extract(payload_json,'\$.creativeFeatures.requestedFormat')='story'"
  else
    format_filter="COALESCE(json_extract(payload_json,'\$.creativeFeatures.requestedFormat'),'post')<>'story'"
  fi
  existing="$(q "SELECT COUNT(*) AS n FROM post_ledger WHERE client_id='$CLIENT_ID' AND scheduled_for='$iso' AND json_extract(payload_json,'\$.source')='master:upload' AND $format_filter AND COALESCE(approval_status,'')<>'rejected' AND COALESCE(status,'') NOT LIKE 'cancel%'" | jq -r '.[0].results[0].n // 0')"
  if [ "${existing:-0}" != 0 ]; then
    note "$slot: já existe um post enviado para $time; não duplicado (cancele no painel para trocar)"; return
  fi

  local out
  out="$(curl -sS --max-time 300 -b "nexus_master=$TOKEN" -X POST "$BASE/api/master/upload" \
    -F "clientId=$CLIENT_ID" -F "approval=cliente" -F "type=$type" -F "date=$day" -F "time=$time" "${args[@]}")" || true
  if printf '%s' "$out" | jq -e '.ok == true and .approval == "pending"' >/dev/null 2>&1; then
    note "$slot: $type enviado ao painel, esperando aprovação ($(printf '%s' "$out" | jq -r .id))"
  else
    fail "$slot: envio falhou: $(printf '%s' "$out" | tr '\n' ' ' | cut -c1-300)"
  fi
}

[ "$#" -gt 0 ] || { note "Nenhum post novo na pasta agendamentos."; exit 0; }
for slot in "$@"; do process_slot "$slot"; done
if [ "$DRY_RUN" != 1 ] && [ "$FAIL" = 0 ] && [[ " $* " == *" 2026-10-23/0900-story "* ]] && [[ " $* " == *" clientes/quatree-dog/2026-10-23/1900-story "* ]]; then
  # Só retirar os horários antigos depois de comprovar os três novos horários de ambos.
  for story_client in primeiro-teste quatree-dog; do
    ready_stories="$(q "SELECT COUNT(*) AS n,COUNT(DISTINCT scheduled_for) AS d FROM post_ledger WHERE client_id='$story_client' AND scheduled_for IN ('2026-10-23T12:00:00.000Z','2026-10-23T15:00:00.000Z','2026-10-23T22:00:00.000Z') AND json_extract(payload_json,'\$.creativeFeatures.requestedFormat')='story' AND approval_status IN ('pending','approved') AND status='ready'" | jq -r '.[0].results[0] | ((.n // 0)|tostring)+":"+((.d // 0)|tostring)')"
    [ "$ready_stories" = 3:3 ] || { fail "$story_client: novos stories incompletos; horários antigos preservados"; exit 1; }
  done
  q "UPDATE post_ledger SET status='cancelled',approval_status='rejected',updated_at=CURRENT_TIMESTAMP WHERE ((client_id='primeiro-teste' AND id IN ('upload-story-059e253c-a03e-4ea9-ac94-6de1cc7636e3','upload-story-87921cf5-d7d2-447f-94dd-6ca1026d73af')) OR (client_id='quatree-dog' AND id='upload-story-4781fa26-2c09-4d9a-a39a-530ffee30ebc')) AND scheduled_for LIKE '2026-10-23%' AND status NOT IN ('published','publishing')" >/dev/null
  old_stories="$(q "SELECT COUNT(*) AS n FROM post_ledger WHERE id IN ('upload-story-059e253c-a03e-4ea9-ac94-6de1cc7636e3','upload-story-87921cf5-d7d2-447f-94dd-6ca1026d73af','upload-story-4781fa26-2c09-4d9a-a39a-530ffee30ebc') AND status='cancelled' AND approval_status='rejected'" | jq -r '.[0].results[0].n // 0')"
  [ "$old_stories" = 3 ] || fail "Cancelamento dos 3 stories substituídos não confirmado"
  note "Stories antigos substituídos: $old_stories cancelados, histórico preservado"
  for story_client in primeiro-teste quatree-dog; do
    verified_stories="$(q "SELECT COUNT(*) AS n FROM post_ledger WHERE client_id='$story_client' AND scheduled_for IN ('2026-10-23T12:00:00.000Z','2026-10-23T15:00:00.000Z','2026-10-23T22:00:00.000Z') AND json_extract(payload_json,'\$.creativeFeatures.requestedFormat')='story' AND approval_status IN ('pending','approved') AND status='ready'" | jq -r '.[0].results[0].n // 0')"
    [ "$verified_stories" = 3 ] || fail "$story_client: 3 stories nos horários 09/12/19 não confirmados"
    note "$story_client: $verified_stories stories exclusivos 09h/12h/19h ativos confirmados no painel"
  done
fi
exit "$FAIL"
