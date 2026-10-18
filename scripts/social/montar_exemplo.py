"""Monta o carrossel de EXEMPLO de um nicho (só para vendas, não vai para o Instagram).

Uso: python3 montar_exemplo.py <nicho> <pasta_saida> foto1 foto2 foto3 foto4 foto5
Os títulos vêm de exemplos-nicho.json (escritos por código, sem letra errada).
Saída: <pasta_saida>/<nicho>-1.jpg ... <nicho>-5.jpg, prontos para Master › Caçador › Exemplos por nicho.
"""
import json
import os
import subprocess
import sys
import tempfile

AQUI = os.path.dirname(os.path.abspath(__file__))


def main():
    if len(sys.argv) != 8:
        sys.exit(__doc__)
    nicho, saida, fotos = sys.argv[1], sys.argv[2], sys.argv[3:]
    titulos = json.load(open(os.path.join(AQUI, "exemplos-nicho.json"), encoding="utf-8"))
    if nicho not in titulos or nicho.startswith("_"):
        sys.exit("Nicho desconhecido: " + nicho)
    cards = [
        # Fotos do ChatGPT: a cabeça fica perto do topo; corta de 8% para baixo e ancora em cima.
        {"n": i + 1, "l1": l1, "l2": l2, "rodape": rodape, "photo": os.path.abspath(foto), "faixa": [0.08, 1.0], "ancora": 0.0}
        for i, ((l1, l2, rodape), foto) in enumerate(zip(titulos[nicho], fotos))
    ]
    os.makedirs(saida, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        plano = os.path.join(tmp, "cards.json")
        json.dump(cards, open(plano, "w", encoding="utf-8"), ensure_ascii=False)
        subprocess.run([sys.executable, os.path.join(AQUI, "render_carousel.py"), plano, tmp], check=True)
        prontos = sorted(f for f in os.listdir(tmp) if f.lower().endswith((".jpg", ".jpeg", ".png")))
        for i, nome in enumerate(prontos[:5], 1):
            os.replace(os.path.join(tmp, nome), os.path.join(saida, f"{nicho}-{i}.jpg"))
    print("Pronto:", ", ".join(f"{nicho}-{i}.jpg" for i in range(1, 6)))


if __name__ == "__main__":
    main()
