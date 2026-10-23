"""Arte editorial original: diagramas informativos, sem simular documentos oficiais.
Pillow + FFmpeg. Nenhuma foto reaproveitada ou API de imagem paga.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, hashlib, subprocess, textwrap

ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'agendamentos/clientes/maskara-assessoria'
SRC=Path(__file__).parent/'fontes-reels'
SRC.mkdir(parents=True,exist_ok=True)
INK='#203A35'; GOLD='#A07648'; BG='#F5F2E9'; PALE='#E4E9DF'; LINE='#CAD3C7'; WHITE='#FFFFFF'
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
SERIF='/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
def font(n,b=False,s=False):return ImageFont.truetype(SERIF if s else BOLD if b else FONT,n)
def wrap(d,text,width,size,b=False):
    rows=[]; row=''
    for w in text.split():
        if d.textlength((row+' '+w).strip(),font=font(size,b))>width and row:rows.append(row);row=w
        else:row=(row+' '+w).strip()
    return rows+[row]
def txt(d,xy,text,size=32,color=INK,b=False,width=880,gap=10):
    x,y=xy
    for row in wrap(d,text,width,size,b):d.text((x,y),row,font=font(size,b),fill=color);y+=size+gap
    return y
def rr(d,box,fill=WHITE,outline=None,r=20):d.rounded_rectangle(box,radius=r,fill=fill,outline=outline,width=3)
def line(d,pts,fill=LINE,w=5):d.line(pts,fill=fill,width=w,joint='curve')
def label(d,x,y,t,w=240,h=82,fill=WHITE,sz=27):
    rr(d,(x,y,x+w,y+h),fill,LINE,16)
    f=font(sz,True);tw=d.textlength(t,font=f)
    assert tw<w-16,(t,tw,w)
    d.text((x+(w-tw)/2,y+(h-sz)/2-4),t,font=f,fill=INK)
def dot(d,x,y,n,r=26):
    d.ellipse((x-r,y-r,x+r,y+r),fill=INK)
    d.text((x,y-2),str(n),font=font(24,True),fill=WHITE,anchor='mm')
def arrow(d,a,b):
    import math
    line(d,[a,b],GOLD,5);ang=math.atan2(b[1]-a[1],b[0]-a[0]);l=17
    d.polygon([b,(b[0]-l*math.cos(ang-.5),b[1]-l*math.sin(ang-.5)),(b[0]-l*math.cos(ang+.5),b[1]-l*math.sin(ang+.5))],fill=GOLD)
def paper(d,x,y,w=230,h=270,title='DOCUMENTOS',rows=4):
    rr(d,(x+9,y+10,x+w+9,y+h+10),LINE,r=10)
    rr(d,(x,y,x+w,y+h),WHITE,LINE,10)
    txt(d,(x+20,y+22),title,min(27,int((w-35)/max(len(title),1)*1.6)),b=True,width=w-35)
    for j in range(rows):line(d,[(x+22,y+90+j*33),(x+w-25-(j%2)*30,y+90+j*33)],LINE,5)
def folder(d,x,y,w,h,title):
    rr(d,(x,y-26,x+w*.49,y+26),GOLD,r=12)
    rr(d,(x,y,x+w,y+h),PALE,LINE,15)
    txt(d,(x+25,y+35),title,32,b=True,width=w-50)
def check(d,x,y):line(d,[(x,y+13),(x+13,y+27),(x+38,y)],GOLD,7)

# Every artwork has a separately authored semantic diagram and composition.
def diagram(d,k,y):
    if k==0: # route, opening CR carousel
        line(d,[(220,y+80),(820,y+80),(820,y+270),(220,y+270)],GOLD,5)
        for x,z,n,t in [(220,80,1,'Organizar'),(820,80,2,'Conferir'),(820,270,3,'Acompanhar')]:dot(d,x,y+z,n);txt(d,(x-110,y+z+45),t,28,b=True,width=250)
    elif k==1:
        folder(d,145,y+110,450,230,'DOCUMENTOS');paper(d,665,y+15,250,280,'SEU CASO',5)
    elif k==2:
        rr(d,(170,y,860,y+360),WHITE,LINE)
        for j,t in enumerate(['Requisitos aplicáveis','Informações consistentes','Arquivos legíveis']):check(d,210,y+42+j*100);txt(d,(280,y+38+j*100),t,31,width=540)
    elif k==3:
        for j,t in enumerate(['Protocolo','Exigências','Andamento']):
            x=160+j*265;label(d,x,y+100,t,235,100,sz=25)
            if j<2:arrow(d,(x+240,y+150),(x+260,y+150))
        txt(d,(215,y+270),'Acompanhamento, etapa por etapa.',30,width=700)
    elif k==4:
        for x,z,t in [(155,40,'CR'),(430,100,'CRAF'),(705,0,'GT')]:paper(d,x,y+z,220,260,t,3)
    elif k==5:
        paper(d,330,y,420,350,'GUIA DE TRÁFEGO',6);rr(d,(500,y+245,840,y+330),INK,r=14);txt(d,(525,y+263),'ENTENDA A FINALIDADE',22,color=WHITE,b=True,width=295)
    elif k==6:
        dot(d,200,y+165,'A');dot(d,800,y+165,'B');arrow(d,(240,y+165),(750,y+165));label(d,320,y+10,'Finalidade',310,95);label(d,320,y+235,'Condições',310,95)
    elif k==7:
        folder(d,140,y+140,350,180,'DOCUMENTO');paper(d,610,y+10,290,315,'CONFERÊNCIA',5);arrow(d,(500,y+220),(590,y+220))
    elif k==8:
        rr(d,(230,y+20,810,y+335),WHITE,LINE);rr(d,(230,y+20,810,y+90),INK,r=12)
        for i in range(3):
            for j in range(6):
                xx=280+j*78; yy=y+135+i*60;d.ellipse((xx,yy,xx+12,yy+12),fill=GOLD if (i,j)==(1,3) else LINE)
        d.ellipse((500,y+177,560,y+230),outline=GOLD,width=5)
    elif k==9:
        line(d,[(540,y+50),(540,y+340)],GOLD,4);label(d,145,y+95,'SIGMA',310,150,sz=43);label(d,615,y+95,'SINARM',310,150,sz=40);dot(d,540,y+50,'?')
    elif k==10:
        folder(d,140,y+20,340,250,'ORIGEM');folder(d,610,y+120,340,210,'DESTINO');arrow(d,(490,y+145),(595,y+210))
    elif k==11:
        label(d,140,y+20,'Processo',290,100);label(d,590,y+20,'Documentos',330,100);label(d,350,y+245,'Conferência',360,95);arrow(d,(285,y+135),(440,y+230));arrow(d,(750,y+135),(650,y+230))
    elif k==12:
        paper(d,190,y+20,270,320,'INFORMAÇÕES',5);paper(d,620,y+20,270,320,'ARQUIVOS',5);line(d,[(480,y+180),(600,y+180)],GOLD,6);d.ellipse((505,y+140,575,y+210),outline=GOLD,width=5)
    elif k==13:
        for j,t in enumerate(['Receber orientações','Organizar a pasta','Acompanhar exigências']):
            dot(d,210,y+50+j*120,j+1);txt(d,(275,y+29+j*120),t,31,b=True,width=650)
            if j<2:line(d,[(210,y+79+j*120),(210,y+140+j*120)],LINE,4)
    elif k==14:
        paper(d,220,y+10,420,340,'DECISÃO',6);d.ellipse((580,y+80,810,y+310),outline=GOLD,width=15);line(d,[(770,y+280),(875,y+375)],GOLD,23)
    elif k==15:
        rr(d,(170,y+150,900,y+350),PALE,LINE);paper(d,360,y,330,270,'SEUS ARQUIVOS',4);arrow(d,(530,y+280),(530,y+340))
    elif k==16:
        for j,t in enumerate(['Recebidos','Conferir','Organizados']):
            x=145+270*j;folder(d,x,y+95+j*25,240,190,t)
    elif k==17:
        rr(d,(150,y,900,y+340),WHITE,LINE)
        for j,t in enumerate(['Etapa atual','Próxima ação','Orientações']):
            label(d,195,y+35+j*95,t,310,65,fill=PALE,sz=25);line(d,[(550,y+70+j*95),(850-j*35,y+70+j*95)],LINE,5)
    elif k==18:
        rr(d,(150,y,780,y+160),PALE,LINE);txt(d,(190,y+40),'Quero organizar meus documentos.',30,width=540)
        rr(d,(340,y+200,920,y+340),WHITE,LINE);txt(d,(380,y+237),'Vamos entender o seu caso.',30,width=510)
    elif k==19:
        # story: binder with dividers, not reused folder composition
        rr(d,(200,y+35,860,y+400),WHITE,LINE);rr(d,(200,y+35,270,y+400),INK,r=10)
        for j,t in enumerate(['INÍCIO','CONFERÊNCIA','ACOMPANHAMENTO']):
            label(d,305,y+65+j*103,t,500,78,sz=23)
    elif k==20:
        # story: overview board with separate validity fields
        txt(d,(180,y+10),'REVISÃO DA SUA PASTA',25,b=True,width=720)
        for j,t in enumerate(['Identificação','Validades','Pendências']):
            label(d,170+55*j,y+75+j*103,t,620-55*j,80,sz=29);d.ellipse((850-j*25,y+100+j*103,870-j*25,y+120+j*103),fill=GOLD)
    elif k==21:
        paper(d,180,y+15,310,340,'FINALIDADE',5);label(d,570,y+30,'Percurso',290,85);label(d,570,y+170,'Condições',290,85);label(d,570,y+310,'Vigência',290,85)
    elif k==22:
        # story: branching registration flow
        label(d,315,y,'Seu registro',430,85);line(d,[(530,y+90),(530,y+180),(260,y+180),(260,y+235)],GOLD,5);line(d,[(530,y+180),(790,y+180),(790,y+235)],GOLD,5);label(d,135,y+240,'SIGMA',260,110,sz=35);label(d,655,y+240,'SINARM',260,110,sz=33)
    elif k==23:
        # story: envelope and checklist
        rr(d,(180,y+125,670,y+390),PALE,LINE);line(d,[(180,y+125),(425,y+285),(670,y+125)],GOLD,5);paper(d,610,y+5,270,300,'CHECKLIST',4)
    elif k==24:
        paper(d,300,y,420,375,'LEIA A DECISÃO',5);rr(d,(480,y+240,870,y+340),PALE,LINE);txt(d,(505,y+267),'Qual foi o motivo?',29,b=True,width=345)
    elif k==25:
        # story: conversation with service menu
        rr(d,(190,y,880,y+360),WHITE,LINE)
        txt(d,(230,y+25),'COMO PODEMOS AJUDAR?',28,b=True,width=600)
        for j,t in enumerate(['Organizar','Conferir','Acompanhar']):label(d,240+j*25,y+90+j*80,t,510-j*25,65,sz=25)
    elif k==26:
        # reel 25 scene 1: names repeated inconsistently, visual audit
        paper(d,180,y,290,350,'CADASTRO',4);paper(d,580,y+50,290,300,'ANEXOS',3);line(d,[(490,y+150),(550,y+210)],GOLD,8);line(d,[(490,y+210),(550,y+150)],GOLD,8)
    elif k==27:
        # reel25 scene2: scan under inspection
        rr(d,(220,y+15,840,y+360),WHITE,LINE);d.rectangle((255,y+55,805,y+300),outline=INK,width=5)
        for j in range(4):line(d,[(305,y+105+j*43),(730-j*20,y+105+j*43)],LINE,7)
        line(d,[(275,y+205),(785,y+205)],GOLD,8);txt(d,(275,y+320),'LEITURA COMPLETA',20,b=True,width=500)
    elif k==28:
        # reel25 scene3: open notebook of pending tasks
        rr(d,(140,y+25,920,y+355),WHITE,LINE);line(d,[(530,y+35),(530,y+345)],GOLD,4)
        txt(d,(180,y+60),'PENDÊNCIAS',28,b=True,width=310)
        for j in range(3):check(d,590,y+75+j*80);line(d,[(650,y+90+j*80),(865,y+90+j*80)],LINE,5)
    elif k==29:
        # reel27 scene1: source and context linked to separate labels
        label(d,155,y+40,'Origem',270,100);label(d,610,y+40,'Finalidade',300,100);arrow(d,(300,y+155),(430,y+260));arrow(d,(755,y+155),(640,y+260));label(d,320,y+270,'Seu enquadramento',450,90,sz=28)
    elif k==30:
        # reel27 scene2: two separate records within a filing index
        rr(d,(150,y,910,y+370),PALE,LINE);label(d,200,y+50,'Registro',270,100);label(d,570,y+210,'Documentação',290,100,sz=25);line(d,[(485,y+100),(770,y+100),(770,y+195)],GOLD,5)
    elif k==31:
        # reel27 scene3: official-source consultation, no emblem
        rr(d,(170,y+10,900,y+350),WHITE,LINE);rr(d,(170,y+10,900,y+70),INK,r=12);txt(d,(205,y+102),'ORIENTAÇÕES VIGENTES',30,b=True,width=650);label(d,215,y+220,'Confirme o seu caso',640,85,fill=PALE,sz=30)
    elif k==32:
        # reel29 scene1: decision marked for reading, no refusal stamp
        paper(d,170,y+15,390,335,'DECISÃO RECEBIDA',5);label(d,630,y+80,'Ler',250,85);label(d,630,y+230,'Entender',250,85);arrow(d,(575,y+190),(615,y+190))
    elif k==33:
        # reel29 scene2: request / response correspondence
        label(d,150,y+20,'Solicitação',340,105);label(d,580,y+215,'Resposta',340,105);line(d,[(320,y+140),(320,y+270),(560,y+270)],GOLD,6);paper(d,630,y,190,160,'MOTIVOS',1)
    elif k==34:
        # reel29 scene3: individual analysis flow
        label(d,150,y+40,'Seu caso',300,100);label(d,590,y+40,'Regras atuais',330,100);arrow(d,(300,y+155),(430,y+270));arrow(d,(750,y+155),(640,y+270));label(d,330,y+280,'Análise individual',430,95,fill=PALE,sz=29)
    elif k>=35:
        # Additional pieces have individually specified subjects, node positions,
        # document arrangements and reading paths, never a recrop of another post.
        extra={
        35:('Pedido de CR','Conferir o caso','Requisitos'),
        36:('Dúvida inicial','Documentação','Orientação'),
        37:('Sua pasta','CR / CRAF / GT','Revisão'),
        38:('Guia de Tráfego','Vigência','Finalidade'),
        39:('Antes de sair','Documento','Condições'),
        40:('Seu registro','Sistema aplicável','Consulta'),
        41:('Transferência','Arquivos','Conferência'),
        42:('Processo','Etapa atual','Pendências'),
        43:('Decisão','Fundamentos','Análise'),
        44:('Assessoria','Organização','Acompanhamento'),
        45:('Sua necessidade','Seus arquivos','Atendimento'),
        46:('CR de CAC','Por onde começar?','Organização'),
        47:('Checklist inicial','Arquivos legíveis','Conferência'),
        48:('CRAF','Revise sua pasta','Documento'),
        49:('CR / CRAF / GT','O que se aplica?','Seu caso'),
        50:('Guia de Tráfego','Confira a vigência','Atenção'),
        51:('Deslocamento','Qual a finalidade?','Consulta'),
        52:('Seu registro','Qual é o sistema?','Conferir'),
        53:('SIGMA / SINARM','Consulte a origem','Registro'),
        54:('Transferência','Pasta organizada','Antes de iniciar'),
        55:('Documentação','Dados consistentes','Revisão'),
        56:('Indeferimento','Leia os motivos','Decisão'),
        57:('Próximo passo','Análise individual','Orientação'),
        58:('Atendimento','Conte sua demanda','Assessoria'),
        59:('Seus arquivos','O que está pendente?','Organização')}
        a,b,c=extra[k]
        if k==35: # clipboard + pencil
            rr(d,(240,y+20,730,y+365),WHITE,LINE);rr(d,(380,y,590,y+55),GOLD,r=8)
            for j,t in enumerate(['Dados','Arquivos','Requisitos']):check(d,285,y+100+j*80);txt(d,(350,y+90+j*80),t,29,width=330)
            line(d,[(805,y+80),(755,y+330)],INK,20);d.polygon([(745,y+340),(765,y+342),(749,y+365)],fill=GOLD)
        elif k==36: # inquiry cards around a large question
            d.ellipse((160,y+40,420,y+300),fill=INK);d.text((290,y+155),'?',font=font(145,True),fill=BG,anchor='mm')
            label(d,510,y+10,'Por onde começar?',420,85,sz=28);label(d,565,y+150,'O que conferir?',360,85,sz=27);label(d,620,y+290,'Como acompanhar?',330,75,sz=24)
        elif k==37: # filing cabinet
            rr(d,(260,y,800,y+380),PALE,LINE)
            for j,t in enumerate(['CR','CRAF','GT']):
                rr(d,(290,y+25+j*117,770,y+125+j*117),WHITE,LINE,8);label(d,330,y+43+j*117,t,180,62,sz=29);line(d,[(625,y+72+j*117),(710,y+72+j*117)],GOLD,8)
        elif k==38: # clock and GT sheet
            d.ellipse((170,y+50,460,y+340),outline=INK,width=9);line(d,[(315,y+95),(315,y+195),(390,y+235)],GOLD,8)
            paper(d,590,y+10,280,345,'GT / VIGÊNCIA',5)
        elif k==39: # closed travel briefcase, no weapon
            rr(d,(385,y+10,655,y+105),None,INK,18);rr(d,(200,y+80,860,y+360),PALE,INK,22);line(d,[(200,y+185),(860,y+185)],INK,5);rr(d,(480,y+155,570,y+225),GOLD,r=8);txt(d,(300,y+265),'CONFERIR ANTES DE SAIR',28,b=True,width=520)
        elif k==40: # computer registration index
            rr(d,(160,y,910,y+300),INK,r=20);rr(d,(178,y+18,892,y+277),WHITE,r=8);txt(d,(220,y+45),'CONSULTA DO REGISTRO',30,b=True,width=630)
            for j,t in enumerate(['Sistema','Cadastro','Documentação']):txt(d,(230,y+105+j*48),t,25,width=550)
            line(d,[(535,y+300),(535,y+365)],INK,12);line(d,[(390,y+365),(680,y+365)],INK,12)
        elif k==41: # scanner with a document entering
            paper(d,325,y,420,245,'ARQUIVO LEGÍVEL',3);rr(d,(190,y+220,870,y+370),PALE,INK,15);line(d,[(240,y+260),(820,y+260)],INK,8);d.ellipse((785,y+315,810,y+340),fill=GOLD)
        elif k==42: # kanban columns
            for j,t in enumerate(['Recebido','Conferir','Acompanhar']):
                x=150+j*265;rr(d,(x,y+5,x+235,y+370),PALE,r=12);txt(d,(x+15,y+25),t,24,b=True,width=210)
                for z in range(j+1):rr(d,(x+20,y+90+z*80,x+215,y+145+z*80),WHITE,LINE,8)
        elif k==43: # weighing the decision and grounds
            line(d,[(540,y+45),(540,y+330),(350,y+330),(730,y+330)],INK,8);line(d,[(250,y+90),(825,y+90)],GOLD,8)
            for x,t in [(300,'Decisão'),(780,'Motivos')]:
                line(d,[(x,y+95),(x-75,y+235),(x+75,y+235),(x,y+95)],GOLD,4);rr(d,(x-120,y+235,x+120,y+300),WHITE,LINE,10);txt(d,(x-90,y+250),t,25,b=True,width=195)
        elif k==44: # circular service diagram
            d.ellipse((340,y+25,705,y+365),outline=LINE,width=8);label(d,310,y+125,'ASSESSORIA',430,95,fill=INK,sz=30)
            # Center label requires light text on dark field.
            rr(d,(310,y+125,740,y+220),INK,r=16);txt(d,(365,y+150),'ASSESSORIA',31,color=WHITE,b=True,width=350)
            for x,z,t in [(135,0,'Organizar'),(705,80,'Conferir'),(355,300,'Acompanhar')]:label(d,x,y+z,t,250,75,sz=23)
        elif k==45: # email window + outgoing envelope
            rr(d,(145,y+10,760,y+340),WHITE,LINE);txt(d,(180,y+40),'SUA NECESSIDADE',27,b=True,width=520)
            for z in [120,175,230]:line(d,[(190,y+z),(680,y+z)],LINE,5)
            rr(d,(650,y+220,940,y+380),PALE,INK,10);line(d,[(650,y+220),(795,y+320),(940,y+220)],GOLD,4)
        elif k==46: # desk lamp and first page
            paper(d,480,y+35,370,320,'PRIMEIROS PASSOS',4);line(d,[(200,y+350),(345,y+350)],INK,10);line(d,[(270,y+345),(270,y+175),(355,y+75)],INK,8);d.polygon([(310,y+60),(400,y+70),(440,y+160),(300,y+160)],fill=GOLD)
        elif k==47: # crop inspection loupe over scan
            rr(d,(160,y+25,700,y+360),WHITE,LINE)
            for j in range(5):line(d,[(205,y+75+j*52),(650,y+75+j*52)],LINE,5)
            d.ellipse((590,y+40,900,y+350),fill=PALE,outline=GOLD,width=10)
            for j in range(3):line(d,[(650,y+120+j*65),(845,y+120+j*65)],INK,9)
            line(d,[(875,y+320),(945,y+390)],GOLD,18)
        elif k==48: # hanging CRAF folder on an archive rail
            line(d,[(160,y+50),(930,y+50)],INK,8);line(d,[(230,y+50),(230,y+100)],INK,7);line(d,[(850,y+50),(850,y+100)],INK,7)
            folder(d,210,y+120,660,240,'CRAF');label(d,580,y+230,'Conferir',230,75,sz=26)
        elif k==49: # document triangle
            for x,z,t in [(430,0,'CR'),(180,240,'CRAF'),(700,240,'GT')]:
                d.ellipse((x-65,y+z,x+120,y+z+135),fill=WHITE,outline=LINE,width=4);txt(d,(x-25,y+z+40),t,32,b=True,width=160)
            line(d,[(460,y+150),(330,y+220)],GOLD,5);line(d,[(590,y+150),(740,y+220)],GOLD,5);line(d,[(370,y+310),(620,y+310)],GOLD,5)
        elif k==50: # standing desk calendar with GT tag
            rr(d,(210,y+60,830,y+350),WHITE,LINE);d.polygon([(210,y+350),(170,y+390),(870,y+390),(830,y+350)],fill=PALE)
            for x in [340,700]:line(d,[(x,y+25),(x,y+95)],GOLD,12)
            txt(d,(285,y+125),'VIGÊNCIA',55,b=True,width=490);label(d,360,y+240,'GUIA DE TRÁFEGO',460,75,sz=24)
        elif k==51: # route map, two pins and purpose note
            line(d,[(190,y+300),(330,y+300),(330,y+80),(700,y+80),(700,y+250),(870,y+250)],GOLD,7)
            for x,z,t in [(190,300,'Origem'),(870,250,'Destino')]:dot(d,x,y+z,'•');txt(d,(x-70,y+z+45),t,23,width=180)
            label(d,410,y+180,'Finalidade',300,90,sz=29)
        elif k==52: # registration puzzle pieces, separate systems
            rr(d,(170,y+50,490,y+325),WHITE,INK);rr(d,(560,y+50,880,y+325),PALE,INK);d.ellipse((445,y+145,535,y+235),fill=WHITE,outline=INK,width=4);d.ellipse((515,y+145,605,y+235),fill=BG,outline=INK,width=4)
            txt(d,(220,y+95),'SIGMA',37,b=True,width=260);txt(d,(590,y+255),'SINARM',35,b=True,width=260)
        elif k==53: # archive index cards, radial bookmarks
            rr(d,(170,y+100,900,y+370),PALE,LINE)
            for j,t in enumerate(['Origem','Registro','Consulta']):
                x=205+j*220;paper(d,x,y+j*25,195,260,t,3)
        elif k==54: # folder open with inward checklist sheet
            d.polygon([(180,y+180),(480,y+210),(480,y+380),(180,y+345)],fill=PALE,outline=INK);d.polygon([(500,y+210),(860,y+145),(860,y+330),(500,y+380)],fill=PALE,outline=INK)
            paper(d,390,y,300,280,'TRANSFERÊNCIA',3)
        elif k==55: # comparison brackets between two forms
            paper(d,150,y+35,300,310,'DADOS',5);paper(d,640,y+35,300,310,'ARQUIVOS',5)
            for j in range(3):arrow(d,(470,y+110+j*85),(615,y+110+j*85))
        elif k==56: # open letter with a readable decision card
            d.polygon([(200,y+200),(530,y+20),(860,y+200),(860,y+380),(200,y+380)],fill=PALE,outline=INK)
            paper(d,340,y+30,390,285,'MOTIVOS DA DECISÃO',4);d.polygon([(200,y+210),(530,y+330),(860,y+210),(860,y+380),(200,y+380)],fill=BG,outline=INK)
        elif k==57: # decision tree with two distinct next actions
            label(d,320,y,'Análise do caso',450,90,sz=30);line(d,[(540,y+105),(540,y+190),(280,y+190),(280,y+260)],GOLD,5);line(d,[(540,y+190),(800,y+190),(800,y+260)],GOLD,5);label(d,140,y+270,'Orientações',300,90,sz=25);label(d,640,y+270,'Próximas ações',300,90,sz=23)
        elif k==58: # two-person service desk, abstract human figures
            for x in [260,800]:d.ellipse((x-40,y+20,x+40,y+100),fill=INK);rr(d,(x-70,y+115,x+70,y+270),PALE,INK,35)
            rr(d,(380,y+155,680,y+190),GOLD,r=8);paper(d,455,y+200,155,175,'DEMANDA',2)
        elif k==59: # two document trays, pending files
            for x,z,t in [(160,45,'RECEBIDOS'),(580,215,'PENDÊNCIAS')]:
                for j in range(3):rr(d,(x+20+j*15,y+z-j*18,x+300+j*15,y+z+100-j*18),WHITE,LINE,5)
                rr(d,(x,y+z+75,x+365,y+z+160),PALE,INK,12);txt(d,(x+30,y+z+100),t,25,b=True,width=315)

art=[];slots=[]
def render(path,title,sub,k,tag,vertical=False,cta='Salve para consultar.',page=None):
    h=1920 if vertical else 1350
    im=Image.new('RGB',(1080,h),BG);d=ImageDraw.Draw(im)
    # Quiet architectural border; bottom 20% is deliberately empty.
    d.rectangle((0,0,22,h),fill=INK)
    hy=290 if vertical else 80
    txt(d,(80,hy),'MASKARA  /  ASSESSORIA',25,b=True,width=850)
    line(d,[(80,hy+55),(930,hy+55)],LINE,2)
    txt(d,(80,hy+83),'DESPACHANTE · ARMAS DE FOGO',22,color=GOLD,b=True,width=850)
    ty=hy+135
    ts=65 if vertical else 61
    rows=wrap(d,title,850,ts,True)
    while len(rows)>3:ts-=2;rows=wrap(d,title,850,ts,True)
    end=txt(d,(80,ty),title,ts,b=True,width=850,gap=8)
    sy=end+20
    endsub=txt(d,(83,sy),sub,30,color=INK,width=830,gap=8)
    dy=800 if vertical else 535
    assert endsub<dy-20,(title,endsub,dy)
    diagram(d,k,dy)
    cy=1370 if vertical else 1000
    txt(d,(83,cy),cta,27,b=True,width=835,gap=5)
    if page:txt(d,(850,cy+55),page,22,color=GOLD,b=True,width=130)
    assert cy+70<h*.8
    path.parent.mkdir(parents=True,exist_ok=True);im.save(path,quality=94,subsampling=0)
    art.append(dict(path=str(path.relative_to(ROOT)),title=title,sub=sub,scene=k,cta=cta,size=[1080,h],sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    return path

CTA='Precisa de ajuda com a sua documentação? Comente DOCUMENTOS que eu te chamo no direct 📩'
HASH='#DespachanteCAC #Documentacao #AssessoriaDocumental #CAC'
def caption(p,text):
    (p/'legenda.txt').write_text(text+'\n\n'+HASH+'\n\n'+CTA+'\n',encoding='utf-8')
def slot(day,time,kind):
    p=OUT/f'2026-10-{day}'/time;p.mkdir(parents=True,exist_ok=True)
    slots.append(dict(date=f'2026-10-{day}',time=time,format=kind,path=str(p.relative_to(ROOT))))
    return p

feeds={
24:[('Seu CR começa na organização.','Entenda o caminho geral, antes de iniciar.',0),('Comece pelos documentos.','A relação depende do seu caso e das exigências vigentes.',1),('Confira os requisitos aplicáveis.','Legibilidade e informações consistentes fazem diferença.',2),('Acompanhe cada etapa.','A assessoria organiza e acompanha. A decisão é do órgão responsável.',3)],
25:[('CR, CRAF e GT: tudo em ordem?','Confira o que se aplica ao seu caso, as validades e eventuais pendências.',4)],
26:[('Guia de Tráfego: para que serve?','Entenda a documentação de trânsito aplicável ao seu caso.',5),('A finalidade precisa estar clara.','O uso depende das condições e autorizações aplicáveis.',6),('Confira antes de se deslocar.','Consulte o documento e as orientações oficiais vigentes.',7),('Validade também merece atenção.','Confira vigência, finalidade e demais condições aplicáveis.',8)],
27:[('SIGMA ou SINARM?','Sistemas distintos: confirme qual se aplica ao seu registro e ao seu caso.',9)],
28:[('Transferência começa na papelada.','Entre CACs, o caso deve ser conferido antes de iniciar o processo.',10),('Cada processo tem seus requisitos.','Verifique os documentos e as condições aplicáveis.',11),('Os dados precisam conferir.','Informações e arquivos devem estar consistentes e legíveis.',12),('Organize e acompanhe.','As orientações dependem do caso e das regras vigentes.',13)],
29:[('Indeferimento? Entenda o motivo.','Leia a decisão antes de avaliar os próximos passos.',14)],
30:[('Como funciona a assessoria?','Você apresenta a demanda. A Maskara ajuda a organizar o processo.',15),('Documentos bem organizados.','Conferência de arquivos e identificação de pendências.',16),('Acompanhamento do processo.','Atenção às etapas e às orientações recebidas.',17),('Vamos entender o seu caso?','Fale sobre sua necessidade de documentação pelo direct.',18)]}
caps={
24:'CR de CAC: comece entendendo o caminho.\n\nA organização dos documentos é o primeiro passo. Os requisitos e eventuais avaliações devem ser confirmados para o seu caso nas orientações oficiais vigentes. A Maskara ajuda na conferência da documentação e no acompanhamento do processo. A decisão cabe ao órgão responsável.\n\nSalve este guia para consultar.',
25:'Documentação de CAC: CR, CRAF e Guia de Tráfego merecem atenção.\n\nConfira quais documentos se aplicam ao seu caso, suas validades e eventuais pendências. Ter uma pasta organizada ajuda a localizar o que precisa ser conferido. A relação exata deve ser validada conforme sua situação e as orientações oficiais vigentes.\n\nSalve para revisar sua pasta.',
26:'Guia de Tráfego: confira a finalidade antes do deslocamento.\n\nA documentação de trânsito deve ser consultada conforme o caso, a finalidade e as condições aplicáveis. Não presuma que um documento vale para qualquer situação. Confira a vigência e as orientações oficiais antes de se deslocar. A Maskara auxilia na organização e no acompanhamento documental.\n\nSalve este lembrete.',
27:'SIGMA ou SINARM: sabe qual se aplica ao seu registro?\n\nSão sistemas distintos, e o enquadramento do seu caso precisa ser conferido. Antes de iniciar um pedido, consulte os documentos existentes e as orientações oficiais vigentes. A Maskara auxilia na organização dos arquivos e no acompanhamento documental.\n\nMande para quem tem essa dúvida.',
28:'Transferência entre CACs: organize a documentação antes de iniciar.\n\nA relação de documentos e as condições aplicáveis dependem do caso e das regras vigentes. Confira as informações, a legibilidade dos arquivos e as orientações recebidas. A Maskara presta assessoria documental e acompanha as etapas do processo; não comercializa armas nesta campanha.\n\nSalve para lembrar da conferência.',
29:'Processo indeferido: a primeira providência é entender a decisão.\n\nLeia os motivos e identifique o que foi apontado. A possibilidade de revisão ou recurso depende do caso e das regras vigentes e deve ser avaliada com orientação qualificada. A Maskara pode auxiliar na organização da documentação para essa análise. Não há garantia de resultado.\n\nSalve este lembrete.',
30:'Assessoria documental: como funciona o atendimento da Maskara?\n\nVocê explica sua necessidade. A assessoria ajuda a organizar os arquivos, conferir pendências e acompanhar as etapas do processo. Requisitos e próximos passos são confirmados conforme cada caso; a decisão cabe ao órgão responsável.\n\nQuer entender o atendimento? Fale pelo direct.'}
for day,cards in feeds.items():
    p=slot(day,'0900','carousel' if len(cards)>1 else 'post')
    for j,(title,sub,k) in enumerate(cards):
        render(p/(f'{j+1:02d}.jpg' if len(cards)>1 else 'imagem.jpg'),title,sub,k,'Documentação para CAC',cta='Comente DOCUMENTOS no post.' if j==len(cards)-1 else 'Deslize para conferir.' if len(cards)>1 else 'Salve para revisar.',page=f'{j+1:02d}/{len(cards):02d}' if len(cards)>1 else None)
    caption(p,caps[day])

stories=[
(24,'Vai começar seu CR?','Organize a documentação antes de iniciar.',19),
(25,'Sua pasta está atualizada?','Revise validades e pendências do seu caso.',20),
(26,'Sua GT corresponde ao deslocamento?','Confira finalidade e condições aplicáveis.',21),
(27,'Você conhece o seu cadastro?','Confirme o sistema que se aplica ao seu caso.',22),
(28,'Vai iniciar uma transferência?','Converse sobre a documentação antes de começar.',23),
(29,'Recebeu uma decisão?','Entender os motivos vem antes dos próximos passos.',24),
(30,'O que falta organizar?','Conte sua necessidade de documentação à Maskara.',25)]
for day,title,sub,k in stories:
    p=slot(day,'1900-story','story');render(p/'story.jpg',title,sub,k,'Pergunta do dia',True,'Responda DOCUMENTOS no direct.')

# Rodrigo expanded the scope during production: three posts + three stories/day.
# 12h Reels remain on 25, 27 and 29; all other post slots are original feed art.
moreposts=[
(24,'1200','CR: antes de enviar, confira.','Revise a documentação conforme os requisitos do seu caso.',35,'CR de CAC: a conferência vem antes do envio. Informações consistentes e arquivos legíveis ajudam na organização. Os requisitos devem ser confirmados nas orientações oficiais vigentes.'),
(24,'1900','Qual é sua dúvida sobre o CR?','Conte sua necessidade de documentação pelo direct.',36,'CR de CAC: por onde começar? Cada situação precisa de uma conferência própria. A Maskara ajuda a organizar a documentação e acompanhar o processo, sem garantir aprovação ou prazo.'),
(25,'1900','Sua documentação tem uma pasta?','Separe os arquivos e confira eventuais pendências.',37,'Documentação de CAC: saber onde está cada arquivo facilita a conferência. Organize o que se aplica ao seu caso e revise validades e pendências. Evite deixar dados pessoais em comentários públicos.'),
(26,'1200','GT: confira a vigência.','Consulte também a finalidade e as condições aplicáveis.',38,'Guia de Tráfego: vigência e finalidade merecem atenção. Consulte o documento e as orientações oficiais vigentes para o seu caso. Não presuma que a mesma documentação serve para qualquer deslocamento.'),
(26,'1900','Vai se deslocar? Confira antes.','Tire dúvidas sobre a documentação aplicável ao seu caso.',39,'Documentação de trânsito: a conferência deve vir antes do deslocamento. Verifique a finalidade, a vigência e as condições aplicáveis. A Maskara pode auxiliar na organização documental.'),
(27,'1900','Você sabe onde está seu registro?','Consulte a documentação existente antes de iniciar um pedido.',40,'SIGMA ou SINARM: comece pelos documentos que você já tem. O enquadramento e as orientações aplicáveis precisam ser confirmados para seu caso. A assessoria ajuda a organizar essa conferência.'),
(28,'1200','Transferência: revise os arquivos.','Dados consistentes e documentos legíveis merecem atenção.',41,'Transferência entre CACs: reúna a documentação para conferência. A relação exata depende do caso e das regras vigentes. O foco da Maskara é a organização e o acompanhamento documental.'),
(28,'1900','Em qual etapa está seu processo?','Organize as pendências e as orientações recebidas.',42,'Acompanhamento documental: sabe qual é a próxima ação do seu processo? Mantenha as orientações e eventuais exigências organizadas. A decisão e os requisitos cabem ao órgão responsável.'),
(29,'1900','Recurso? Primeiro, analise o caso.','A possibilidade de revisão depende da decisão e das regras vigentes.',43,'Processo indeferido: recorrer não é uma resposta automática. A possibilidade de revisão ou recurso deve ser avaliada com orientação qualificada, conforme o caso. Organize a decisão e os documentos para essa análise. Não há garantia de resultado.'),
(30,'1200','Organização e acompanhamento.','Esse é o foco da assessoria documental da Maskara.',44,'Assessoria documental: organização, conferência e acompanhamento. A Maskara ajuda a identificar pendências e acompanhar as orientações recebidas. Não há promessa de prazo ou de aprovação.'),
(30,'1900','Vamos organizar sua documentação?','Conte sua necessidade no direct para entender o atendimento.',45,'Documentação de CAC: qual é a sua necessidade hoje? Explique sua demanda pelo direct, sem expor dados pessoais nos comentários. A Maskara orienta sobre o atendimento de organização e acompanhamento documental.')]
for day,time,title,sub,k,body in moreposts:
    p=slot(day,time,'post');render(p/'imagem.jpg',title,sub,k,'Assessoria documental',cta='Comente DOCUMENTOS no post.');caption(p,body)

morningstories=[
(24,'Quer iniciar seu CR?','Comece pela organização do seu caso.',46),
(25,'Você revisou o seu CRAF?','Confira a documentação e eventuais pendências.',48),
(26,'Sua GT está vigente?','Confira o documento antes do deslocamento.',50),
(27,'Qual sistema se aplica a você?','Confira o registro e as orientações oficiais.',52),
(28,'Transferência em vista?','Organize a pasta antes de iniciar o processo.',54),
(29,'Entendeu o indeferimento?','Leia com atenção os motivos da decisão.',56),
(30,'Precisa de assessoria documental?','Conte sua necessidade à Maskara.',58)]
noonstories=[
(24,'Seus arquivos estão legíveis?','Faça uma conferência antes de enviar.',47),
(25,'Quais documentos se aplicam?','A relação deve ser conferida para o seu caso.',49),
(26,'Qual a finalidade do deslocamento?','Confirme as condições documentais aplicáveis.',51),
(27,'Já consultou o registro existente?','Esse é um ponto de partida para a conferência.',53),
(28,'As informações conferem?','Revise os dados e os arquivos do processo.',55),
(29,'Qual é o próximo passo?','A possibilidade de revisão precisa de análise.',57),
(30,'O que falta na sua pasta?','Organizar pendências faz parte do atendimento.',59)]
for time,items in [('0900-story',morningstories),('1200-story',noonstories)]:
    for day,title,sub,k in items:
        p=slot(day,time,'story');render(p/'story.jpg',title,sub,k,'Documentação no dia a dia',True,'Responda DOCUMENTOS no direct.')

reels={
25:[('Dados não conferem?','Revise as informações antes de enviar.',26),('Arquivo difícil de ler?','Confira a legibilidade dos documentos.',27),('Pendência sem acompanhar?','Organize as próximas ações do seu caso.',28)],
27:[('SIGMA ou SINARM?','Comece conferindo o seu enquadramento.',29),('O registro precisa conferir.','Consulte os documentos existentes.',30),('Confirme nas fontes oficiais.','As orientações aplicáveis podem mudar.',31)],
29:[('Seu processo foi indeferido?','Primeiro, leia a decisão com atenção.',32),('Qual foi o motivo?','Organize o que foi apontado no processo.',33),('Cada caso precisa de análise.','A possibilidade de revisão deve ser avaliada.',34)]}
rcaps={
25:'Documentação de CAC: três pontos para revisar antes de enviar.\n\nInformações inconsistentes, arquivos ilegíveis e pendências sem acompanhamento merecem atenção. Revise a pasta conforme as exigências do seu caso. A assessoria ajuda a organizar e acompanhar, sem garantir aprovação ou prazo.\n\nSalve este checklist.',
27:'SIGMA ou SINARM: confira o seu caso antes de iniciar um pedido.\n\nConsulte o registro existente e confirme o enquadramento nas orientações oficiais vigentes. A Maskara auxilia na organização documental e no acompanhamento.\n\nMande para quem também tem essa dúvida.',
29:'Processo indeferido: entender os motivos é o primeiro passo.\n\nLeia a decisão e organize os documentos apontados. A possibilidade de revisão ou recurso depende do caso e deve ser avaliada com orientação qualificada. Não há garantia de resultado.\n\nSalve para consultar.'}
for day,scenes in reels.items():
    p=slot(day,'1200','reel');inputs=[]
    for j,(title,sub,k) in enumerate(scenes):
        fp=SRC/f'{day}-c{j+1}.jpg';render(fp,title,sub,k,'Documentação em foco',True,'Comente DOCUMENTOS no post.' if j==2 else 'Confira o próximo ponto.');inputs.append(fp)
    # Cover is the first frame of this Reel, an allowed technical preview.
    (p/'capa.jpg').write_bytes(inputs[0].read_bytes())
    # Only the illustration region moves; typography stays stable in the safe area.
    segments=[]
    for j,fp in enumerate(inputs):
        seg=SRC/f'{day}-c{j+1}.mp4';segments.append(seg)
        filt="split=2[base][moving];[moving]crop=900:450:60:780,scale=936:468,crop=900:450:x='18+12*sin(t)':y=9[m];[base][m]overlay=60:780,format=yuv420p"
        subprocess.run(['ffmpeg','-y','-v','error','-loop','1','-i',str(fp),'-vf',filt,'-t','3','-r','30','-c:v','libx264','-preset','fast','-crf','22','-threads','2',str(seg)],check=True)
    listing=SRC/f'{day}-concat.txt';listing.write_text(''.join(f"file '{s.name}'\n" for s in segments))
    subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(listing),'-f','lavfi','-i','anullsrc=r=44100:cl=stereo','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-t','9','-movflags','+faststart',str(p/'video.mp4')],check=True)
    caption(p,rcaps[day])

manifest={'client':'maskara-assessoria','timezone':'America/Sao_Paulo','dates':['2026-10-24','2026-10-30'],'approval':'pending','style':'Diagramas editoriais originais. Não são documentos oficiais.','slots':slots,'artworks':art}
(Path(__file__).parent/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'slots':len(slots),'artworks':len(art),'files':len(list(OUT.rglob('*.*')))},ensure_ascii=False))
