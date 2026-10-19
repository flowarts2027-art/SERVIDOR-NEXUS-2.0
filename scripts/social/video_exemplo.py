"""Faz o vídeo de EXEMPLO de um nicho a partir dos 5 cartões (pedido do Rodrigo em 19/10).

Uso: python3 video_exemplo.py <pasta_com_cartao-1..5.jpg> <saida.mp4>
Cada cartão fica 3 s na tela, com um zoom leve, e passa para o próximo com uma transição suave.
Saída: MP4 vertical 1080x1350, H.264, com faixa de áudio muda (abre em qualquer WhatsApp).
"""
import os
import subprocess
import sys

SEGUNDOS = 3.0
TRANSICAO = 0.5
FPS = 30


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    pasta, saida = sys.argv[1], sys.argv[2]
    cartoes = [os.path.join(pasta, f"cartao-{i}.jpg") for i in range(1, 6)]
    cartoes = [c for c in cartoes if os.path.exists(c)]
    if len(cartoes) < 2:
        sys.exit("Faltam cartões em " + pasta)
    entradas, filtros = [], []
    quadros = int(SEGUNDOS * FPS)
    for i, c in enumerate(cartoes):
        entradas += ["-loop", "1", "-t", str(SEGUNDOS), "-i", c]
        # Zoom bem leve (até 4%) para o cartão não ficar parado.
        filtros.append(
            f"[{i}:v]scale=1080:1350,setsar=1,"
            f"zoompan=z='min(zoom+0.0013,1.04)':d={quadros}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1350:fps={FPS},"
            f"format=yuv420p[v{i}]"
        )
    atual, tempo = "v0", SEGUNDOS
    for i in range(1, len(cartoes)):
        offset = tempo - TRANSICAO
        filtros.append(f"[{atual}][v{i}]xfade=transition=fade:duration={TRANSICAO}:offset={offset:.2f}[x{i}]")
        atual, tempo = f"x{i}", offset + SEGUNDOS
    entradas += ["-f", "lavfi", "-t", f"{tempo:.2f}", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"]
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *entradas,
           "-filter_complex", ";".join(filtros),
           "-map", f"[{atual}]", "-map", f"{len(cartoes)}:a",
           "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p", "-profile:v", "main",
           "-c:a", "aac", "-b:a", "64k", "-shortest", "-movflags", "+faststart", saida]
    subprocess.run(cmd, check=True)
    print("Pronto:", saida)


if __name__ == "__main__":
    main()
