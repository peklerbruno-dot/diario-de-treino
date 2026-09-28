# Gera as plantas em DXF (e DWG, se o LibreDWG estiver instalado) a partir de planta.json.
# Rodar: node moveis/plantas/exportar.mjs && python3 moveis/plantas/gerar_dxf.py
# Unidade: centímetro. Origem no canto de baixo à esquerda do lado de dentro das paredes.
import json, math, os, shutil, subprocess, sys
import ezdxf

AQUI = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(AQUI, 'planta.json'), encoding='utf-8'))
W, H, E = D['W'], D['H'], D['E']

CAMADAS = {  # nome: (cor ACI, tipo de linha)
    'ARQ-PAREDE': (8, 'CONTINUOUS'), 'ARQ-PAREDE-HACHURA': (253, 'CONTINUOUS'),
    'ARQ-JANELA': (5, 'CONTINUOUS'), 'ARQ-PORTA': (30, 'CONTINUOUS'),
    'ARQ-FIXOS': (9, 'CONTINUOUS'), 'COZINHA': (1, 'CONTINUOUS'), 'BANHO': (4, 'CONTINUOUS'),
    'MOBILIARIO': (7, 'CONTINUOUS'), 'MOB-TEXTO': (7, 'CONTINUOUS'),
    'TV-GIRO': (6, 'DASHED'), 'AMBIENTES': (3, 'CONTINUOUS'), 'COTAS': (2, 'CONTINUOUS'), 'CARIMBO': (7, 'CONTINUOUS'),
}


def Y(y):  # o app mede y para baixo; o CAD mede para cima
    return H - y


def P(pt, dx=0):
    return (pt[0] + dx, Y(pt[1]))


def ret(msp, x1, y1, x2, y2, camada, dx=0):
    msp.add_lwpolyline([P((x1, y1), dx), P((x2, y1), dx), P((x2, y2), dx), P((x1, y2), dx)], close=True, dxfattribs={'layer': camada})


GIRADOS = []  # textos girados: o conversor para DWG perde a rotação e ela é reposta depois


def largura_texto(s, alt):  # largura aproximada em Arial (o conversor para DWG perde o alinhamento centralizado)
    estreitas, largas = set('iljtfr.,:;|! 1I'), set('mwMW')
    return alt * sum(0.3 if c in estreitas else 0.85 if c in largas else 0.56 for c in s)


def texto(msp, s, x, y, alt, camada, dx=0, rot=0):
    # centraliza à mão: ponto de inserção à esquerda, na linha de base
    cx, cy = P((x, y), dx)
    w, r = largura_texto(s, alt), math.radians(rot)
    ux, uy = math.cos(r), math.sin(r)          # direção do texto
    vx, vy = -math.sin(r), math.cos(r)         # para cima do texto
    ix, iy = cx - ux * w / 2 - vx * alt / 2, cy - uy * w / 2 - vy * alt / 2
    msp.add_text(s, height=alt, rotation=rot, dxfattribs={'layer': camada, 'style': 'PLANTA', 'insert': (ix, iy)})
    if rot:
        GIRADOS.append((s, ix, iy, rot))


def parede(msp, x1, y1, x2, y2, dx):
    ret(msp, x1, y1, x2, y2, 'ARQ-PAREDE', dx)
    h = msp.add_hatch(color=253, dxfattribs={'layer': 'ARQ-PAREDE-HACHURA'})
    h.paths.add_polyline_path([P((x1, y1), dx), P((x2, y1), dx), P((x2, y2), dx), P((x1, y2), dx)], is_closed=True)


def planta(msp, opcao, dx=0):
    # paredes externas (com os vãos das janelas na esquerda e da entrada na direita)
    parede(msp, -E, -E, W + E, 0, dx)          # cima
    parede(msp, -E, H, W + E, H + E, dx)       # baixo
    ys = [0] + [v for a, b in D['JANELAS'] for v in (a, b)] + [H]
    for i in range(0, len(ys), 2):
        parede(msp, -E, ys[i], 0, ys[i + 1], dx)  # esquerda, entre as janelas
    a, b = D['ENTRADA']
    parede(msp, W, 0, W + E, a, dx); parede(msp, W, b, W + E, H, dx)
    for p in D['PAREDES']:
        parede(msp, p['x1'], p['y1'], p['x2'], p['y2'], dx)
    # janelas: caixilho com duas linhas de vidro
    for a, b in D['JANELAS']:
        ret(msp, -E, a, 0, b, 'ARQ-JANELA', dx)
        for xv in (-E / 2 - 2, -E / 2 + 2):
            msp.add_line(P((xv, a), dx), P((xv, b), dx), dxfattribs={'layer': 'ARQ-JANELA'})
        texto(msp, f'JANELA {b - a}', -E - 8, (a + b) / 2, 5, 'COTAS', dx, rot=90)
    # portas: folha aberta a 90° e arco de abertura
    for p in D['PORTAS']:
        hx, hy = p['h']; cx, cy = p['c']; ox, oy = p['o']
        r = math.hypot(cx - hx, cy - hy)
        msp.add_line(P((hx, hy), dx), P((ox, oy), dx), dxfattribs={'layer': 'ARQ-PORTA'})
        a1 = math.degrees(math.atan2(-(cy - hy), cx - hx)); a2 = math.degrees(math.atan2(-(oy - hy), ox - hx))
        ini, fim = (a1, a2) if (a2 - a1) % 360 <= 180 else (a2, a1)
        msp.add_arc(P((hx, hy), dx), r, ini, fim, dxfattribs={'layer': 'ARQ-PORTA'})
    texto(msp, f'ENTRADA {D["ENTRADA"][1] - D["ENTRADA"][0]}', W + E + 8, sum(D['ENTRADA']) / 2, 5, 'COTAS', dx, rot=90)
    # peças fixas
    for f in D['FIXOS']:
        camada = 'BANHO' if f['y1'] >= 450 else 'COZINHA' if f['nome'] in ('Bancada da pia', 'Geladeira') else 'ARQ-FIXOS'
        ret(msp, f['x1'], f['y1'], f['x2'], f['y2'], camada, dx)
        nome = {'Bancada da pia': 'BANCADA', 'Geladeira': 'GELADEIRA', 'Shaft': 'SHAFT', 'Bancada do banheiro': 'BANCADA',
                'Vaso sanitário': 'VASO', 'Box': 'BOX'}.get(f['nome'], f['nome'].upper())
        med = f"{round(f['x2'] - f['x1'])}x{round(f['y2'] - f['y1'])}" if f['nome'] != 'Bancada da pia' else f"{round(f['y2'] - f['y1'])}x{round(f['x2'] - f['x1'])}"
        if f['nome'] == 'Bancada da pia':
            continue
        vertical = (f['y2'] - f['y1']) > (f['x2'] - f['x1']) * 1.3
        texto(msp, f'{nome} {med}', (f['x1'] + f['x2']) / 2, (f['y1'] + f['y2']) / 2, 4, 'MOB-TEXTO', dx, rot=90 if vertical else 0)
    ck, cb = D['cooktop'], D['cuba']
    ret(msp, ck['x1'], ck['y1'], ck['x2'], ck['y2'], 'COZINHA', dx)
    my = (ck['y1'] + ck['y2']) / 2
    for bx, by, r in ((378, my - 12, 7), (378, my + 12, 6), (402, my - 12, 6), (402, my + 12, 8)):
        msp.add_circle(P((bx, by), dx), r, dxfattribs={'layer': 'COZINHA'})
    texto(msp, f"COOKTOP {round(ck['y2'] - ck['y1'])}x{round(ck['x2'] - ck['x1'])} + FORNO 60", 390, ck['y2'] + 6, 3.5, 'MOB-TEXTO', dx)
    ret(msp, cb['x1'], cb['y1'], cb['x2'], cb['y2'], 'COZINHA', dx)
    texto(msp, f"CUBA {round(cb['y2'] - cb['y1'])}x{round(cb['x2'] - cb['x1'])}", 391, cb['y2'] + 5, 3.5, 'MOB-TEXTO', dx)
    banc = next(f for f in D['FIXOS'] if f['nome'] == 'Bancada da pia')
    texto(msp, f"BANCADA {round(banc['y2'] - banc['y1'])}x{round(banc['x2'] - banc['x1'])}", 390, banc['y2'] - 6, 4, 'MOB-TEXTO', dx)
    # cotas da bancada: trechos livres entre ponta, cooktop, cuba e ponta
    marcos = sorted([banc['y1'], banc['y2'], ck['y1'], ck['y2'], cb['y1'], cb['y2']])
    for i in range(0, len(marcos) - 1, 2):
        cota(msp, (banc['x1'], marcos[i]), (banc['x1'], marcos[i + 1]), -8, dx, vertical=True)
    # ambientes
    for a in D['AMBIENTES']:
        area = (a['x2'] - a['x1']) * (a['y2'] - a['y1']) / 10000
        texto(msp, a['nome'], a['tx'], a['ty'], 9, 'AMBIENTES', dx)
        texto(msp, f'{area:.2f} m²'.replace('.', ','), a['tx'], a['ty'] + 11, 6, 'AMBIENTES', dx)
    # móveis da opção
    for it in opcao['itens']:
        if it['redondo']:
            msp.add_circle(P((it['x'], it['y']), dx), it['w'] / 2, dxfattribs={'layer': 'MOBILIARIO'})
        else:
            msp.add_lwpolyline([P(q, dx) for q in it['poly']], close=True, dxfattribs={'layer': 'MOBILIARIO'})
        if it['painel']:  # painel da TV e o giro de 360°
            (x1, y1), (x2, y2) = it['painel']
            msp.add_line(P((x1, y1), dx), P((x2, y2), dx), dxfattribs={'layer': 'MOBILIARIO', 'lineweight': 50})
            msp.add_circle(P((it['x'], it['y']), dx), math.hypot(x2 - x1, y2 - y1) / 2 + 4, dxfattribs={'layer': 'TV-GIRO'})
        xs = [q[0] for q in it['poly']]; ys_ = [q[1] for q in it['poly']]
        larg, alt = max(xs) - min(xs), max(ys_) - min(ys_)
        vertical = alt > larg * 1.4 and larg < 70
        tam = 3.5 if min(larg, alt) < 50 else 5
        nome = it['nome'] if len(it['nome']) <= 28 else it['nome'][:26] + '…'
        cx, cy = (it['x'], it['y'])
        texto(msp, nome, cx, cy - tam * 0.7, tam, 'MOB-TEXTO', dx, rot=90 if vertical else 0)
        texto(msp, f"{round(it['w'])}x{round(it['h'])}" if not it['redondo'] else f"Ø{round(it['w'])}", cx + (tam * 1.4 if vertical else 0), cy + (0 if vertical else tam * 0.9), tam * 0.8, 'MOB-TEXTO', dx, rot=90 if vertical else 0)
    # cotas gerais (internas)
    cota(msp, (0, 0), (W, 0), 30, dx)
    cota(msp, (0, 0), (0, H), -40, dx, vertical=True)
    cota(msp, (0, 450), (0, 0), -25, dx, vertical=True)
    cota(msp, (0, 700), (0, 460), -25, dx, vertical=True)
    cota(msp, (0, H), (300, H), -30, dx)
    cota(msp, (310, H), (W, H), -30, dx)
    # carimbo
    texto(msp, opcao['titulo'], W / 2, H + E + 60, 10, 'CARIMBO', dx)
    texto(msp, 'Apartamento 32 m² · planta de layout · medidas em cm (internas)', W / 2, H + E + 76, 6, 'CARIMBO', dx)


def cota(msp, a, b, dist, dx, vertical=False):
    # cota desenhada com linhas e texto (sem entidade DIMENSION, que o conversor para DWG não aceita bem)
    (x1, y1), (x2, y2) = P(a, dx), P(b, dx)
    at = {'layer': 'COTAS'}
    if vertical:
        xc = x1 + dist; ya, yb = sorted((y1, y2))
        for yy in (ya, yb):
            msp.add_line((x1 - math.copysign(2, dist), yy), (xc + math.copysign(2, dist), yy), dxfattribs=at)
            msp.add_line((xc - 2, yy - 2), (xc + 2, yy + 2), dxfattribs=at)
        msp.add_line((xc, ya), (xc, yb), dxfattribs=at)
        v = f'{round(yb - ya)}'
        msp.add_text(v, height=6, rotation=90, dxfattribs={**at, 'style': 'PLANTA', 'insert': (xc - 2, (ya + yb) / 2 - largura_texto(v, 6) / 2)})
    else:
        yc = y1 + dist; xa, xb = sorted((x1, x2))
        for xx in (xa, xb):
            msp.add_line((xx, y1 - math.copysign(2, dist)), (xx, yc + math.copysign(2, dist)), dxfattribs=at)
            msp.add_line((xx - 2, yc - 2), (xx + 2, yc + 2), dxfattribs=at)
        msp.add_line((xa, yc), (xb, yc), dxfattribs=at)
        v = f'{round(xb - xa)}'
        msp.add_text(v, height=6, dxfattribs={**at, 'style': 'PLANTA', 'insert': ((xa + xb) / 2 - largura_texto(v, 6) / 2, yc + 2)})


def documento():
    doc = ezdxf.new('R2000', setup=True)
    doc.header['$INSUNITS'] = 5  # centímetros
    doc.header['$MEASUREMENT'] = 1
    doc.styles.add('PLANTA', font='arial.ttf')
    for nome, (cor, lt) in CAMADAS.items():
        doc.layers.add(nome, color=cor, linetype=lt)
    return doc


def converter_dwg(dxf):
    dwg = dxf[:-4] + '.dwg'
    ferramenta = shutil.which('dxf2dwg') or '/tmp/lrd/bin/dxf2dwg'
    if not os.path.exists(ferramenta):
        print('sem dwgwrite: só DXF'); return None
    r = subprocess.run([ferramenta, '-y', '-o', dwg, dxf], capture_output=True, text=True, errors='replace')
    if r.returncode != 0 or not os.path.exists(dwg):
        print('falhou DWG', dxf, r.stderr[-500:]); return None
    repor_rotacao(dwg, ferramenta)
    return dwg


def repor_rotacao(dwg, ferramenta):
    # DWG -> JSON, devolve a rotação dos textos girados, JSON -> DWG (ferramentas do LibreDWG)
    pasta = os.path.dirname(ferramenta); js = dwg + '.json'
    subprocess.run([os.path.join(pasta, 'dwgread'), '-O', 'JSON', '-o', js, dwg], capture_output=True)
    d = json.load(open(js, encoding='utf-8', errors='replace'))
    n = 0
    for o in d['OBJECTS']:
        if o.get('entity') != 'TEXT':
            continue
        x, y = o['ins_pt'][:2]
        for s, ix, iy, rot in GIRADOS:
            if o['text_value'] == s and abs(x - ix) < 0.01 and abs(y - iy) < 0.01:
                o['rotation'] = math.radians(rot); o['dataflags'] = o.get('dataflags', 0) & ~0x08; n += 1
                break
    json.dump(d, open(js, 'w', encoding='utf-8'))  # com \u: o leitor de JSON do LibreDWG não aceita UTF-8 cru
    r = subprocess.run([os.path.join(pasta, 'dwgwrite'), '-y', '-I', 'JSON', '-o', dwg, js], capture_output=True, text=True, errors='replace')
    os.remove(js)
    print(f'  {n} textos girados repostos', '' if r.returncode == 0 else r.stderr[-300:])


def main():
    saidas = []
    def salvar(doc, nome):
        f = os.path.join(AQUI, nome); doc.saveas(f)
        print(f, '->', converter_dwg(f) if '--sem-dwg' not in sys.argv else '-')
        GIRADOS.clear()
    for n, op in enumerate(D['opcoes'], 1):
        doc = documento(); planta(doc.modelspace(), op); salvar(doc, f'opcao-{n}.dxf')
    doc = documento(); msp = doc.modelspace()
    for n, op in enumerate(D['opcoes']):
        planta(msp, op, dx=n * 650)
    salvar(doc, 'opcoes-lado-a-lado.dxf')


main()
