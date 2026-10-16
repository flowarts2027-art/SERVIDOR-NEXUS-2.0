# Agente de marketing do carrossel (Flow Arts)

Origem: agente escrito pelo Rodrigo com o ChatGPT em 16/10/2026 (4 etapas) e testado no nicho "salão de beleza de bairro". O padrão visual é o carrossel de pet shop aprovado por ele.

## Como funciona no Nexus
1. **Estrategista + redator + diretor de arte** (`cloudflare/src/carousel-agent.js`, `planMarketingCarousel`): uma chamada à IA devolve 5 cartões (gancho, dor, solução, como funciona, chamada) com título em 2 linhas, rodapé e cena em inglês, mais uma ficha de continuidade (mesma pessoa, local e luz).
2. **Conferência no código** (`validateCarouselPlan`): 5 cartões na ordem; linha 1 ≤ 24 e linha 2 ≤ 30 caracteres; sem números, preço, %, "garantido", "dobre", "lucro", "viral"; o cartão 5 não repete "Comente QUERO". Reprovou: a IA corrige 1 vez. Reprovou de novo: para sem gastar imagem.
3. **Foto sem texto** (`generateOriginalMedia` com `photoOnly`): parede livre em cima, pessoa e ação no meio, telas só com fotos.
4. **Revisor visual** (`reviewCarouselPhoto`): olha a foto. Sem texto, combina com o título e com o nicho, mãos e rostos ok, pessoa inteira, nota ≥ 65. Até 3 fotos por cartão.
5. **Montagem** (`.github/workflows/carousel-card-render.yml` + `scripts/social/render_carousel.py`): título preto/azul, logo da Flow Arts, rodapé com seta, numeração e botão "Comente QUERO", escritos por código. Cada cartão volta para o Nexus em `/api/internal/carousel-render/upload`.

## Ligar e desligar
- Vale para marcas com perfil próprio (hoje: Flow Arts, `primeiro-teste`).
- Desligar e voltar ao carrossel antigo: variável `NEXUS_CAROUSEL_AGENT=false` na Cloudflare.
