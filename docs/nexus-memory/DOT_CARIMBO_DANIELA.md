# DOT Carimbo — Daniela Martins

Responsável: **DOT Carimbo**, estágio técnico de identidade visual entre Maya (arte) e Clara (revisão).

1. Maya gera foto/layout SEM LOGO; reserva 25% superiores sem texto essencial.
2. DOT Carimbo executa `python scripts/dot_carimbo_daniela.py imagem.jpg arte-final.jpg --brand-pdf /caminho/Apresentacao-Daniela-oficial.pdf`.
3. Carimbo extrai **o símbolo dourado original + Daniela Martins em escrita cursiva + EPILADORA** da página 1 do PDF, cobre eventuais marcas falsas com cabeçalho opaco verde-oliva e aplica a marca oficial.
4. Clara confere corte, legibilidade, formato 4:5/9:16, ortografia e duplicidade de campanhas.
5. Dante aprova; só então Bento/Nexus envia para **daniela-martins**, sempre aguardando aprovação.

**Não substituir por borboleta, letra D com flor nem «Ateliê de Beleza».**

Requer `Pillow` e `PyMuPDF` instalados. Esta PR entrega um utilitário de linha de comando, **não instala automaticamente um DOT autônomo nem altera o pipeline de publicações**. Para ativar automaticamente, integrar este passo antes do envio das artes ao Nexus. O PDF oficial permanece como insumo separado para evitar publicar material privado no repositório.
