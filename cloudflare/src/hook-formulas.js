// Fórmulas de gancho para os agentes que escrevem posts (pedido do Rodrigo em 18/10).
// Adaptado do hooks.json e do hookscore.py do pacote instagram-agent-skill
// (Jake Schincariol, licença MIT, ver THIRD_PARTY_NOTICES.md), traduzido para pequeno negócio no Brasil.
// Ficaram de fora as fórmulas que dependem de número, prejuízo ou resultado real
// (o Nexus não pode inventar prova): custo confessado, recibo de números, estatística,
// "resultado de outra pessoa", fracassos contados e "anos de bastidor".

export const HOOK_FORMULAS = Object.freeze([
  { id: "pare", nome: "Pare de… faça isto",
    modelo: "Pare de {hábito comum}. Faça {alternativa}.",
    exemplo: "Pare de postar só foto do produto. Mostre quem faz.",
    armadilha: "o hábito tem que ser algo que o público faz de verdade" },
  { id: "ninguem-conta", nome: "Ninguém te conta",
    modelo: "Ninguém te conta que {verdade incômoda sobre o que ele quer}.",
    exemplo: "Ninguém te conta que o cliente olha o Instagram antes de ligar.",
    armadilha: "não serve verdade que todo mundo já fala" },
  { id: "errado-sem-culpa", nome: "Errado, mas não é culpa sua",
    modelo: "Você está fazendo {coisa} errado, e não é culpa sua. {a correção}.",
    exemplo: "Sua legenda está cortada, e não é culpa sua. O Instagram esconde tudo depois da 1ª linha.",
    armadilha: "sem o 'não é culpa sua' vira bronca e a pessoa sai" },
  { id: "copie", nome: "Copie este",
    modelo: "Copie esta {mensagem/modelo}. Use hoje.",
    exemplo: "Copie esta resposta para quem pergunta o preço no direct.",
    armadilha: "o modelo tem que aparecer inteiro no post, para dar print" },
  { id: "se-voce", nome: "Se você…",
    modelo: "Se você {situação bem específica}, este post resolve.",
    exemplo: "Se seu salão lota no sábado e fica vazio na terça, leia isto.",
    armadilha: "situação ampla demais ('se você quer crescer') não filtra ninguém" },
  { id: "lista-favorita", nome: "Lista com a favorita",
    modelo: "{N até 5} {coisas} que {resultado}. A {k}ª quase ninguém faz.",
    exemplo: "3 posts que fazem o cliente chamar no direct. O 3º quase ninguém faz.",
    armadilha: "mais de 5 itens ninguém acredita" },
  { id: "objecao", nome: "A objeção",
    modelo: "\"{objeção do jeito que o cliente fala}.\" Tudo bem. Dá para fazer assim.",
    exemplo: "\"Não tenho tempo de postar.\" Tudo bem. Dá para fazer assim.",
    armadilha: "a frase tem que soar como gente de verdade fala" },
  { id: "antes-depois", nome: "Antes e depois",
    modelo: "Assim era {coisa}. Assim ficou. Mudou só {uma coisa}.",
    exemplo: "Assim era a bio da barbearia. Assim ficou. Mudou só a primeira linha.",
    armadilha: "uma mudança só; três mudanças ninguém acredita" },
  { id: "chamado", nome: "Chamado ao público",
    modelo: "{Grupo bem específico}: este é para você.",
    exemplo: "Dono de pet shop que atende sozinho: este é para você.",
    armadilha: "'empreendedores' não é grupo; tem que ser específico" },
  { id: "pergunta-real", nome: "A pergunta de verdade",
    modelo: "\"{pergunta do jeito que o cliente pergunta}?\"",
    exemplo: "\"Precisa postar todo dia para aparecer?\"",
    armadilha: "não arrume a pergunta; o valor é estar nas palavras do cliente" },
  { id: "versus", nome: "Um contra o outro",
    modelo: "{A} ou {B}? Um deles ganha fácil.",
    exemplo: "Foto do produto ou vídeo do balcão? Um deles ganha fácil.",
    armadilha: "tem que escolher um no fim; empate não tem graça" },
  { id: "nao-precisa", nome: "Você não precisa",
    modelo: "Você não precisa de {o que todo mundo diz que precisa}.",
    exemplo: "Você não precisa dançar no Reels para vender.",
    armadilha: "tirou o peso, coloque o que fazer no lugar" },
  { id: "invertido", nome: "Ditado ao contrário",
    modelo: "{ditado conhecido, invertido}.",
    exemplo: "Propaganda boa não parece propaganda.",
    armadilha: "o original tem que ser algo que todo mundo conhece" },
  { id: "prazo-real", nome: "Prazo de verdade",
    modelo: "Antes de {data/época real}, faça {ação}.",
    exemplo: "Antes do Dia das Mães, arrume isto no seu perfil.",
    armadilha: "nunca invente pressa; só datas reais" },
  { id: "jeito-mais", nome: "O jeito mais…",
    modelo: "O jeito mais {rápido/simples} de {resultado} é {resposta concreta}.",
    exemplo: "O jeito mais simples de ganhar cliente no bairro é mostrar o bairro.",
    armadilha: "resposta mole ('constância') não diz nada" }
]);

// Regras gerais do gancho (do pacote original, adaptadas).
export const HOOK_RULES = Object.freeze([
  "O gancho começa direto na parte interessante: nada de cumprimento, apresentação ou 'neste post vou mostrar'.",
  "De 5 a 12 palavras. A palavra forte (dor, situação, número real) entra nas 3 primeiras palavras.",
  "Fale com uma pessoa ('você', 'seu salão'), não com o ar.",
  "Sem hashtag e sem emoji no gancho.",
  "Se o gancho serviria para qualquer concorrente, ele está genérico: coloque algo específico do nicho.",
  "O que o gancho promete tem que ser entregue logo nas primeiras linhas."
]);

// Escolhe algumas fórmulas por vez (variando pelo texto do tema), para o post não ficar sempre igual.
export function pickHookFormulas(seedText = "", count = 4) {
  const seed = [...String(seedText)].reduce((n, ch) => (n * 31 + ch.codePointAt(0)) >>> 0, 7);
  const total = HOOK_FORMULAS.length;
  const n = Math.max(1, Math.min(total, Number(count) || 4));
  const step = 4; // sem divisor comum com 15: percorre todas sem repetir
  return Array.from({ length: n }, (_, i) => HOOK_FORMULAS[(seed + i * step) % total]);
}

export function hookFormulasText(seedText = "", count = 4) {
  const list = pickHookFormulas(seedText, count)
    .map(f => f.nome + ": " + f.modelo + " Ex.: " + f.exemplo + " (Cuidado: " + f.armadilha + ".)")
    .join(" | ");
  return "Regras do gancho: " + HOOK_RULES.join(" ") + " Escolha a fórmula de gancho que mais combina com o tema, entre estas: " + list;
}

// Revisor do gancho (sem IA). Devolve a lista de problemas da 1ª linha; vazio = ok.
const GREETING = /^\s*(?:oi+|ol[áa]|e a[ií]|fala(?:\s+(?:galera|pessoal|gente))?|bom dia|boa tarde|boa noite|bem[- ]vind[oa]s?|salve)\b/i;
const STOP_SCROLL = /^\s*(?:pare|para|n[ãa]o)\s+(?:de\s+)?(?:rolar|passar|pular)\b/i;
const PREAMBLE = /\b(?:neste|nesse|no)\s+(?:post|v[íi]deo|reels?|carrossel)\s+(?:de hoje\s+)?(?:eu\s+)?(?:vou|vamos|voc[êe]\s+vai)\b|\bhoje\s+(?:eu\s+)?vou\s+(?:te\s+)?(?:mostrar|falar|ensinar)\b/i;
const HASHTAG = /(?:^|\s)#[\p{L}\p{N}_]+/u;
const EMOJI = /\p{Extended_Pictographic}/u;

export function hookProblems(line = "") {
  const text = String(line || "").split("\n")[0].trim();
  if (!text) return [];
  const words = text.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w));
  const out = [];
  if (GREETING.test(text)) out.push("começa com cumprimento");
  if (STOP_SCROLL.test(text)) out.push("pede para parar de rolar");
  if (PREAMBLE.test(text)) out.push("enrola antes de entregar ('neste post vou...')");
  if (HASHTAG.test(text)) out.push("hashtag no gancho");
  if (EMOJI.test(text)) out.push("emoji no gancho");
  if (words.length > 18) out.push("gancho longo (" + words.length + " palavras)");
  else if (words.length < 2) out.push("gancho curto demais");
  return out;
}
