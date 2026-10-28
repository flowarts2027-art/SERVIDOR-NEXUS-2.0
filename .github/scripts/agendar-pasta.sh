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

# Imagem repetida: o mesmo arquivo (mesmo conteúdo) já usado em outra pasta do MESMO cliente,
# ou repetido dentro da própria pasta. Se achar, o post não sobe e o erro diz onde está a cópia.
repeated_image() {
  local dir="$1" client="$2" base f h other seen=""
  if [ "$client" = "primeiro-teste" ]; then base="$ROOT"; else base="$ROOT/clientes/$client"; fi
  while IFS= read -r f; do
    h="$(sha256sum "$f" | cut -d' ' -f1)"
    case " $seen " in *" $h "*) fail "${dir#$ROOT/}: imagem repetida dentro da pasta ($(basename "$f")). Cada imagem tem que ser diferente."; return 0 ;; esac
    seen="$seen $h"
    while IFS= read -r other; do
      # Só compara com pastas de post de verdade (AAAA-MM-DD/HHMM). Pasta errada (sem data) não conta (27/10).
      [[ "$other" =~ /[0-9]{4}-[0-9]{2}-[0-9]{2}/[0-2][0-9][0-5][0-9](-story)?/[^/]+$ ]] || continue
      [ "$(sha256sum "$other" | cut -d' ' -f1)" = "$h" ] || continue
      fail "${dir#$ROOT/}: $(basename "$f") é igual a ${other#$ROOT/}. Regra: nunca repetir imagem; crie uma arte nova."
      return 0
    done < <(find "$base" -type f -iregex '.*\.\(jpg\|jpeg\|png\|webp\)' -not -path "$dir/*" \
               $( [ "$client" = "primeiro-teste" ] && printf '%s' "-not -path $ROOT/clientes/*" ) 2>/dev/null)
  done < <(find "$dir" -maxdepth 1 -type f -iregex '.*\.\(jpg\|jpeg\|png\|webp\)' | sort)
  return 1
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
    # Só legenda (27/10): o ChatGPT deixa o texto e o Rodrigo manda as imagens pela página /artes.html.
    if [ -s "$caption" ]; then note "$slot: só legenda; as imagens vão pela página Enviar artes (/artes.html)"; return; fi
    fail "$slot: nenhuma arte encontrada (imagem.jpg, 01.jpg..., video.mp4 ou story.jpg)"; return
  fi

  if [[ "$slot" = *-story ]] && [ "$type" != story ]; then
    fail "$slot: pasta -story exige story.jpg ou story.mp4"; return
  fi

  # Regra do Rodrigo (22/10): nunca a mesma imagem em dois posts, stories ou cartões.
  repeated_image "$dir" "$CLIENT_ID" && return

  # 27/10 (GILTEC): cartão encolhido no meio de um fundo liso (cortado de imagem larga) não sobe.
  local imgs=() bad
  mapfile -t imgs < <(find "$dir" -maxdepth 1 -type f -iregex '.*\.\(jpg\|jpeg\|png\|webp\)' | sort)
  if [ "${#imgs[@]}" -gt 0 ] && command -v python3 >/dev/null; then
    if ! bad="$(python3 "$(dirname "${BASH_SOURCE[0]}")/checar-arte.py" "${imgs[@]}")"; then
      while IFS= read -r line; do [ -n "$line" ] && fail "${slot}: ${line##*/}"; done <<< "$bad"
      return
    fi
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
exit "$FAIL"
