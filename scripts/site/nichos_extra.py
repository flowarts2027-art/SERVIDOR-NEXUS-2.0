"""Páginas de nicho extras do site da Flow Arts (cada uma com texto próprio).
Sem resultados, clientes ou números inventados. Nichos de saúde ficam de fora de propósito
(regras dos conselhos profissionais para propaganda)."""


def _faq(nome, tem_foto=True, extra=None):
    base = [
        ("Preciso tirar as fotos?" if tem_foto else "Preciso gravar vídeos?",
         "Não precisa. A IA cria as imagens no estilo do seu negócio. Se você tiver fotos reais boas, elas também podem entrar." if tem_foto
         else "Não precisa. A IA cria os vídeos e as artes no estilo do seu negócio. Se você tiver vídeos reais, eles também podem entrar."),
        ("Vocês atendem fora do Rio de Janeiro?", "Sim. O atendimento é 100% online, para todo o Brasil."),
        ("Posso ver antes de contratar?", f"Pode. A Flow Arts faz um exemplo grátis para o seu negócio antes de você decidir."),
    ]
    if extra:
        base.insert(1, extra)
    return base


NICHOS_EXTRA = [
    {
        "slug": "marketing-para-barbearia",
        "nome": "barbearia", "da": "da sua barbearia", "pa": "para a sua barbearia", "tenho": "uma barbearia",
        "titulo": "Marketing para barbearia no Instagram | Flow Arts Marketing",
        "descricao": "Instagram da sua barbearia postando com constância, com IA. Ideias de post para barbearia, preços e um exemplo grátis. Você só aprova.",
        "h1": "Marketing para barbearia: o Instagram da sua barbearia cheio de cadeira marcada.",
        "lead": "Você está de tesoura e máquina na mão o dia todo. A Flow Arts prepara os posts com IA e você só aprova pelo celular.",
        "dor": [
            "Entre um corte e outro, o celular fica no bolso e o perfil, parado.",
            "Cliente novo olha o Instagram antes de marcar. Perfil abandonado passa a impressão de barbearia fraca.",
            "A agenda tem buracos nos horários de semana e ninguém sabe que ainda há vaga.",
        ],
        "ideias": [
            ("O corte em câmera lenta", "Um Reel curto do degradê sendo feito ou da navalha no acabamento. Movimento e detalhe prendem quem está rolando o feed."),
            ("Estilos da estação", "Um carrossel com 4 cortes ou barbas em alta. A pessoa salva para mostrar ao barbeiro."),
            ("Horários livres de hoje", "Um post ou story com as vagas que sobraram. Ajuda a encher a agenda no mesmo dia."),
            ("Cuidado em casa", "Uma dica de como cuidar da barba ou do cabelo entre uma visita e outra. Dica útil é salva e compartilhada."),
            ("O clima da barbearia", "Um vídeo curto do espaço, da cadeira, da música e da cerveja ou café que você oferece. Mostra o ambiente antes de a pessoa chegar."),
        ],
        "faq": _faq("barbearia", True, ("Posso mostrar cortes de clientes?", "Só com a autorização do cliente. Sem isso, a IA cria imagens de referência no estilo da barbearia.")),
        "demo": False,
    },
    {
        "slug": "marketing-para-pet-shop",
        "nome": "pet shop", "da": "do seu pet shop", "pa": "para o seu pet shop", "tenho": "um pet shop",
        "titulo": "Marketing para pet shop no Instagram | Flow Arts Marketing",
        "descricao": "Instagram do seu pet shop postando com constância, com IA. Ideias de post para pet shop, preços e um exemplo grátis. Você só aprova.",
        "h1": "Marketing para pet shop: o Instagram do seu pet shop com a cara de quem ama bicho.",
        "lead": "Banho, tosa, ração e atendimento já tomam o seu dia. A Flow Arts prepara os posts com IA e você só aprova pelo celular.",
        "dor": [
            "Com cachorro molhado no balcão, ninguém lembra de postar.",
            "O dono de pet escolhe onde levar o bicho por confiança, e o Instagram é onde ele vê o cuidado.",
            "Promoções de banho e ração ficam só no balcão e quem não passa por ali nunca fica sabendo.",
        ],
        "ideias": [
            ("Banho e tosa do dia", "Um Reel curto do pet saindo cheiroso e feliz. É o tipo de conteúdo que o tutor compartilha. Use fotos de clientes só com autorização."),
            ("Dica de cuidado", "\"Como saber se a ração está certa para o seu cachorro.\" Dica útil faz o tutor salvar o post."),
            ("Promoção da semana", "Um post direto com o banho, a ração ou o petisco em oferta e até quando vale."),
            ("Pet da semana", "Apresente um pet (com autorização do tutor). Gera comentário e faz o tutor marcar os amigos."),
            ("Quem cuida do seu bicho", "Mostre a equipe e como é o atendimento. Confiança pesa muito na escolha do pet shop."),
        ],
        "faq": _faq("pet shop", True, ("Posso usar fotos dos animais dos clientes?", "Só com a autorização do tutor. Sem isso, a IA cria imagens no estilo do pet shop.")),
        "demo": False,
    },
    {
        "slug": "marketing-para-restaurante",
        "nome": "restaurante", "da": "do seu restaurante", "pa": "para o seu restaurante", "tenho": "um restaurante",
        "titulo": "Marketing para restaurante no Instagram | Flow Arts Marketing",
        "descricao": "Instagram do seu restaurante postando com constância, com IA. Ideias de post para restaurante, preços e um exemplo grátis. Você só aprova.",
        "h1": "Marketing para restaurante: o Instagram do seu restaurante dando vontade de reservar mesa.",
        "lead": "A cozinha e o salão não param. A Flow Arts prepara os posts com IA e você só aprova pelo celular.",
        "dor": [
            "No horário do almoço e do jantar, ninguém consegue fotografar o prato.",
            "Quem decide onde comer olha o Instagram primeiro. Foto escura ou perfil parado manda o cliente para o concorrente.",
            "O prato do dia e as novidades ficam só no cardápio da porta.",
        ],
        "ideias": [
            ("O prato do dia", "Um post com a foto do prato e o preço, todo dia no mesmo horário. Vira hábito para quem vai almoçar."),
            ("Bastidor da cozinha", "Um Reel curto da finalização do prato ou do preparo do molho. Mostra capricho e dá fome."),
            ("Cardápio da semana", "Um carrossel com os pratos da semana, fácil de salvar e compartilhar com o grupo do trabalho."),
            ("Pergunta para o cliente", "\"Feijoada ou moqueca?\" Perguntas fáceis geram comentários e fazem o post chegar a mais gente."),
            ("Como reservar", "Um post fixo que explica como reservar ou pedir pelo WhatsApp. Evita perder cliente por dúvida."),
        ],
        "faq": _faq("restaurante", True, ("Vocês mostram o meu cardápio e os preços?", "Sim, com as informações que você passar. A IA não inventa prato nem preço.")),
        "demo": False,
    },
    {
        "slug": "marketing-para-academia",
        "nome": "academia", "da": "da sua academia", "pa": "para a sua academia", "tenho": "uma academia",
        "titulo": "Marketing para academia no Instagram | Flow Arts Marketing",
        "descricao": "Instagram da sua academia postando com constância, com IA. Ideias de post para academia, preços e um exemplo grátis. Você só aprova.",
        "h1": "Marketing para academia: o Instagram da sua academia chamando gente nova para treinar.",
        "lead": "Você cuida dos alunos e do espaço. A Flow Arts prepara os posts com IA e você só aprova pelo celular.",
        "dor": [
            "Entre aulas e atendimento, sobra pouco tempo para o Instagram.",
            "A academia vive de renovação e de gente nova, e o perfil parado não traz ninguém.",
            "Muita academia posta só promoção. Isso cansa quem segue.",
        ],
        "ideias": [
            ("Dica de treino segura", "Uma dica simples, como aquecer antes de começar. Evita prometer resultado e ainda ajuda o aluno."),
            ("Apresente o professor", "Quem dá a aula, quanto tempo de experiência. A pessoa nova quer saber com quem vai treinar."),
            ("Aula experimental", "Um post convidando para uma aula experimental, com horários e como agendar."),
            ("O espaço por dentro", "Um Reel curto mostrando os aparelhos, a sala de aula e o ambiente. Tira o medo de quem nunca foi a uma academia."),
            ("Conquista do mês", "Comemore a presença e a constância dos alunos, sem prometer resultado de corpo. Gera orgulho e compartilhamento."),
        ],
        "faq": _faq("academia", True, ("Vocês prometem resultado de emagrecimento ou ganho de massa?", "Não. Os posts falam de rotina, dicas seguras e do espaço, sem promessa de resultado.")),
        "demo": False,
    },
    {
        "slug": "marketing-para-loja-de-roupas",
        "nome": "loja de roupas", "da": "da sua loja de roupas", "pa": "para a sua loja de roupas", "tenho": "uma loja de roupas",
        "titulo": "Marketing para loja de roupas no Instagram | Flow Arts Marketing",
        "descricao": "Instagram da sua loja de roupas postando com constância, com IA. Ideias de post para loja de roupas, preços e um exemplo grátis. Você só aprova.",
        "h1": "Marketing para loja de roupas: o Instagram da sua loja virando vitrine que vende.",
        "lead": "Você atende, organiza o estoque e fecha a venda. A Flow Arts prepara os posts com IA e você só aprova pelo celular.",
        "dor": [
            "Chega peça nova toda semana, mas não dá tempo de fotografar e postar.",
            "O Instagram é a vitrine da loja. Vitrine apagada não atrai cliente.",
            "Fotos de peças dobradas ou no cabide vendem menos do que a peça em uso.",
        ],
        "ideias": [
            ("Chegou novidade", "Um carrossel com 4 peças novas, nome do tecido e tamanhos. Facilita salvar e mandar para a amiga."),
            ("Look completo", "Uma peça combinada em um look pronto. Ajuda a cliente a imaginar usando."),
            ("Provador", "Um Reel curto de uma peça sendo escolhida e experimentada, com autorização de quem aparece."),
            ("Dica de estilo", "\"Três jeitos de usar a mesma calça.\" Dica útil faz salvar e compartilhar."),
            ("Como comprar", "Um post fixo que explica tamanhos, prazos, trocas e como pedir pelo WhatsApp."),
        ],
        "faq": _faq("loja de roupas", True, ("Posso mostrar minhas peças reais?", "Sim. Se você mandar as fotos, elas entram. Sem fotos, a IA cria imagens de referência no estilo da loja.")),
        "demo": False,
    },
    {
        "slug": "marketing-para-padaria",
        "nome": "padaria", "da": "da sua padaria", "pa": "para a sua padaria", "tenho": "uma padaria",
        "titulo": "Marketing para padaria no Instagram | Flow Arts Marketing",
        "descricao": "Instagram da sua padaria postando com constância, com IA. Ideias de post para padaria, preços e um exemplo grátis. Você só aprova.",
        "h1": "Marketing para padaria: o Instagram da sua padaria cheirando a pão quente.",
        "lead": "Você acorda de madrugada para o pão sair na hora. A Flow Arts prepara os posts com IA e você só aprova pelo celular.",
        "dor": [
            "Depois de acordar às 3h da manhã, a última coisa que dá vontade é editar foto.",
            "O pão quente sai em horário certo, mas ninguém na vizinhança sabe.",
            "Concorrente com perfil bonito leva quem pesquisa \"padaria perto de mim\".",
        ],
        "ideias": [
            ("Pão saindo do forno", "Um Reel curto da fornada saindo. Aviso de horário faz o cliente passar na hora."),
            ("Pão do dia", "Um post todo dia com o pão especial e o preço. Cria o hábito de olhar."),
            ("Café da manhã completo", "Um combo de pão, café e frios com preço fechado. Ajuda quem decide em cima da hora."),
            ("Encomenda de bolos e salgados", "Explique como encomendar para festas e quanto tempo antes avisar."),
            ("Bastidor de madrugada", "A equipe e a massa antes de o sol nascer. Gente gosta de ver quem faz."),
        ],
        "faq": _faq("padaria", True, ("Vocês falam dos meus horários de fornada?", "Sim. Você passa os horários e a IA usa nos posts.")),
        "demo": False,
    },
    {
        "slug": "marketing-para-confeitaria",
        "nome": "confeitaria", "da": "da sua confeitaria", "pa": "para a sua confeitaria", "tenho": "uma confeitaria",
        "titulo": "Marketing para confeitaria no Instagram | Flow Arts Marketing",
        "descricao": "Instagram da sua confeitaria ou doceria postando com constância, com IA. Ideias de post para bolos e doces, preços e um exemplo grátis. Você só aprova.",
        "h1": "Marketing para confeitaria: o Instagram dos seus bolos e doces dando água na boca.",
        "lead": "Você já gasta o dia na cozinha e nas encomendas. A Flow Arts prepara os posts com IA e você só aprova pelo celular.",
        "dor": [
            "Fotografar o bolo bonito leva tempo, e o tempo vai para a encomenda.",
            "Quem encomenda doce olha o Instagram antes de pedir. Perfil fraco, pedido perdido.",
            "Datas como Dia das Mães, Páscoa e festas juninas chegam e você já está sem tempo de divulgar.",
        ],
        "ideias": [
            ("O bolo sendo decorado", "Um Reel curto da cobertura ou da decoração. É o conteúdo que mais prende na área de doces."),
            ("Cardápio de datas", "Um carrossel com as opções para Páscoa, Dia das Mães e festas, com prazo de encomenda."),
            ("Como encomendar", "Um post fixo com passo a passo, prazo e formas de pagamento."),
            ("Sabores da semana", "Apresente os sabores de bolo ou brigadeiro do dia. Ajuda a decidir rápido."),
            ("Embalagem e entrega", "Mostre como o doce chega ao cliente. Passa cuidado e profissionalismo."),
        ],
        "faq": _faq("confeitaria", True, ("Vocês criam posts para datas comemorativas?", "Sim. Você avisa as datas importantes e a IA prepara os posts antes.")),
        "demo": False,
    },
    {
        "slug": "marketing-para-oficina-mecanica",
        "nome": "oficina mecânica", "da": "da sua oficina", "pa": "para a sua oficina", "tenho": "uma oficina mecânica",
        "titulo": "Marketing para oficina mecânica no Instagram | Flow Arts Marketing",
        "descricao": "Instagram da sua oficina mecânica postando com constância, com IA. Ideias de post para oficina, preços e um exemplo grátis. Você só aprova.",
        "h1": "Marketing para oficina mecânica: o Instagram da sua oficina passando confiança antes de o cliente chegar.",
        "lead": "Você está debaixo do carro, não do computador. A Flow Arts prepara os posts com IA e você só aprova pelo celular.",
        "dor": [
            "Cliente não sabe em quem confiar para consertar o carro, e a primeira busca é pelo Instagram.",
            "Oficina boa que não aparece perde serviço para quem aparece mais.",
            "Você faz o serviço certo, mas a pessoa nunca fica sabendo como.",
        ],
        "ideias": [
            ("Serviço explicado", "Um post mostrando o que foi feito em um serviço e por que isso importa. Explicar passa confiança. Use só com autorização do cliente."),
            ("Dica de manutenção", "\"Quando trocar o óleo do carro.\" Dica útil faz o motorista salvar e voltar na hora certa."),
            ("Sinais de alerta", "Um carrossel com sinais de que o carro precisa de revisão. Gera salvamento e mostra que você entende do assunto."),
            ("A oficina por dentro", "Um Reel curto do espaço, dos equipamentos e da equipe. Oficina limpa e organizada vende confiança."),
            ("Como agendar", "Um post fixo com horários, como agendar pelo WhatsApp e o que levar."),
        ],
        "faq": _faq("oficina mecânica", True, ("Vocês prometem preço ou prazo de serviço?", "Não. Os posts só falam do que você mesmo informar, sem inventar preço, prazo ou resultado.")),
        "demo": False,
    },
    {
        "slug": "marketing-para-floricultura",
        "nome": "floricultura", "da": "da sua floricultura", "pa": "para a sua floricultura", "tenho": "uma floricultura",
        "titulo": "Marketing para floricultura no Instagram | Flow Arts Marketing",
        "descricao": "Instagram da sua floricultura postando com constância, com IA. Ideias de post para floricultura, preços e um exemplo grátis. Você só aprova.",
        "h1": "Marketing para floricultura: o Instagram da sua floricultura florescendo o ano todo.",
        "lead": "Você cuida de flores, entregas e encomendas. A Flow Arts prepara os posts com IA e você só aprova pelo celular.",
        "dor": [
            "Flor tem hora para vender, e você descobre isso só quando a data chega.",
            "Arranjo bonito feito de manhã perde o brilho antes de dar tempo de fotografar.",
            "Quem compra flor decide pelo visual, e o Instagram é a vitrine.",
        ],
        "ideias": [
            ("Arranjo do dia", "Um post com o arranjo pronto, preço e como encomendar para o mesmo dia."),
            ("Montando o buquê", "Um Reel curto do buquê sendo montado. Movimento e cor prendem a atenção."),
            ("Datas importantes", "Dia das Mães, Dia dos Namorados e aniversários. Um carrossel com opções e prazos de encomenda."),
            ("Cuidados com as flores", "Uma dica de como durar mais em casa. Dica útil faz salvar o post."),
            ("Entrega e recado", "Explique como funciona a entrega e o cartão com recado. Tira a dúvida de quem compra de longe."),
        ],
        "faq": _faq("floricultura", True, ("Vocês criam posts para datas como Dia das Mães?", "Sim. Você avisa as datas e a IA prepara os posts com antecedência.")),
        "demo": False,
    },
]
