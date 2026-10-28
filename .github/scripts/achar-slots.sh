#!/usr/bin/env bash
# Recebe (na entrada) a lista de arquivos que mudaram em agendamentos/ e devolve os posts a enviar.
# Feito em 27/10/2026 para o ChatGPT no modo Work subir as artes direto (pedido do Rodrigo).
#
# 1. Arquivo fora do lugar (sem data, sem horário, pasta inventada) vira ERRO com o caminho certo.
#    Antes ele era ignorado em silêncio e nada chegava ao painel.
# 2. Se mudou qualquer arquivo de um dia de um cliente, TODAS as pastas daquele dia e cliente
#    são conferidas de novo. Assim, quando o ChatGPT corrige só uma legenda, os stories que
#    falharam antes também sobem. O que já está no painel não duplica (agendar-pasta.sh confere).
#
# Saída (stdout): uma linha "slots=<lista>" e uma linha "stray=<0|1>". Erros vão como ::error::.
# Uso: printf '%s\n' "$files" | ROOT=agendamentos bash achar-slots.sh

set -uo pipefail
ROOT="${ROOT:-agendamentos}"

slot_re='^agendamentos/((clientes/[a-z0-9][a-z0-9-]{1,48}/)?[0-9]{4}-[0-9]{2}-[0-9]{2}/[0-2][0-9][0-5][0-9](-story)?)/[^/]+$'
doc_re='^agendamentos/([^/]+|clientes/[^/]+/[^/]+)\.md$'

stray=0
groups=""
while IFS= read -r f; do
  [ -n "$f" ] || continue
  case "$f" in agendamentos/*) ;; *) continue ;; esac
  if [[ "$f" =~ $slot_re ]]; then
    slot="${BASH_REMATCH[1]}"
    groups+="${slot%/*}"$'\n'
  elif [[ "$f" =~ $doc_re ]]; then
    continue
  else
    stray=1
    if [[ "$f" =~ ^agendamentos/clientes/([a-z0-9-]+)/ ]]; then
      certo="agendamentos/clientes/${BASH_REMATCH[1]}/AAAA-MM-DD/HHMM/ (ex.: agendamentos/clientes/${BASH_REMATCH[1]}/2026-10-28/0900/)"
    else
      certo="agendamentos/AAAA-MM-DD/HHMM/ (só Flow Arts) ou agendamentos/clientes/<cliente>/AAAA-MM-DD/HHMM/"
    fi
    echo "::error file=$f::Pasta errada, não vai para o painel: $f. Use $certo. Story: HHMM-story/story.png"
  fi
done

slots=""
while IFS= read -r g; do
  [ -n "$g" ] || continue
  for d in "$ROOT/$g"/*/; do
    [ -d "$d" ] || continue
    name="$(basename "$d")"
    [[ "$name" =~ ^[0-2][0-9][0-5][0-9](-story)?$ ]] || continue
    slots+="$g/$name"$'\n'
  done
done < <(printf '%s' "$groups" | sort -u)

# Pasta que mudou mas foi apagada no mesmo push: some da lista (nada a enviar).
echo "slots=$(printf '%s' "$slots" | sort -u | tr '\n' ' ')"
echo "stray=$stray"
