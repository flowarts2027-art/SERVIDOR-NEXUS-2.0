#!/usr/bin/env bash
# Monta o Reel vertical (1080x1920) a partir de uma imagem.
# Movimento de câmera visível: aproxima 10% e sobe um pouco (a frase escrita na imagem tem 10% de margem dos lados, então não corta), com entrada e saída suaves.
# A imagem é ampliada 2x antes do zoom para o movimento não "tremer".
# Uso: render_reel.sh entrada.jpg saida.mp4 [segundos]
set -euo pipefail
src="$1"; out="$2"; duration="${3:-10}"
case "$duration" in ''|*[!0-9]*) duration=10 ;; esac
[ "$duration" -lt 5 ] && duration=5
[ "$duration" -gt 30 ] && duration=30
fps=30
frames=$((duration * fps))
fade_out=$(awk "BEGIN{print $duration-0.5}")
# Easing (suave no começo e no fim): p = (1 - cos(pi*on/frames)) / 2
p="(1-cos(PI*on/${frames}))/2"
ffmpeg -hide_banner -loglevel error -y -loop 1 -i "$src" -t "$duration" \
  -vf "scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840,\
zoompan=z='1+0.10*${p}':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)*(0.6-0.3*${p})':d=1:s=1080x1920:fps=${fps},\
fade=t=in:st=0:d=0.4,fade=t=out:st=${fade_out}:d=0.5,format=yuv420p" \
  -c:v libx264 -preset medium -crf 20 -movflags +faststart -an "$out"
test -s "$out"
