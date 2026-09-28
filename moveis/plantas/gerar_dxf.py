# Gera as plantas em DXF (e DWG, se o LibreDWG estiver instalado) a partir de planta.json.
# Rodar: node moveis/plantas/exportar.mjs && python3 moveis/plantas/gerar_dxf.py
# Unidade: centímetro. Origem no canto de baixo à esquerda do lado de dentro das paredes.
import json, math, os, shutil, subprocess, sys
import ezdxf
from ezdxf.enums import TextEntityAlignment

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


def texto(msp, s, x, y, alt, camada, dx=0, rot=0):
    t = msp.add_text(s, height=alt, rotation=rot, dxfattribs={'layer': camada, 'style': 'PLANTA'})
    t.set_placement(P((x, y), dx), align=TextEntityAlignment.MIDDLE_CENTER)


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
    p1, p2 = P(a, dx), P(b, dx)
    if vertical:
        base = (p1[0] + dist, (p1[1] + p2[1]) / 2)
        d = msp.add_linear_dim(base=base, p1=p1, p2=p2, angle=90, dimstyle='COTA', dxfattribs={'layer': 'COTAS'})
    else:
        base = ((p1[0] + p2[0]) / 2, p1[1] + dist)
        d = msp.add_linear_dim(base=base, p1=p1, p2=p2, dimstyle='COTA', dxfattribs={'layer': 'COTAS'})
    d.render()


def documento():
    doc = ezdxf.new('R2010', setup=True)
    doc.header['$INSUNITS'] = 5  # centímetros
    doc.header['$MEASUREMENT'] = 1
    doc.styles.add('PLANTA', font='arial.ttf')
    for nome, (cor, lt) in CAMADAS.items():
        doc.layers.add(nome, color=cor, linetype=lt)
    ds = doc.dimstyles.new('COTA')
    ds.dxf.dimtxt = 6; ds.dxf.dimasz = 4; ds.dxf.dimexe = 2; ds.dxf.dimexo = 2; ds.dxf.dimdec = 0
    ds.dxf.dimtad = 1; ds.dxf.dimgap = 1.5; ds.dxf.dimblk = 'ARCHTICK'; ds.dxf.dimclrd = 2; ds.dxf.dimclre = 2; ds.dxf.dimclrt = 2
    return doc


def converter_dwg(dxf):
    dwg = dxf[:-4] + '.dwg'
    ferramenta = shutil.which('dwgwrite') or '/tmp/lrd/bin/dwgwrite'
    if not os.path.exists(ferramenta):
        print('sem dwgwrite: só DXF'); return None
    r = subprocess.run([ferramenta, '-y', '--as', 'r2000', '-o', dwg, dxf], capture_output=True, text=True)
    if r.returncode != 0 or not os.path.exists(dwg):
        print('falhou DWG', dxf, r.stderr[-500:]); return None
    return dwg


def main():
    saidas = []
    for n, op in enumerate(D['opcoes'], 1):
        doc = documento(); planta(doc.modelspace(), op)
        f = os.path.join(AQUI, f'opcao-{n}.dxf'); doc.saveas(f); saidas.append(f)
    doc = documento(); msp = doc.modelspace()
    for n, op in enumerate(D['opcoes']):
        planta(msp, op, dx=n * 650)
    f = os.path.join(AQUI, 'opcoes-lado-a-lado.dxf'); doc.saveas(f); saidas.append(f)
    for f in saidas:
        print(f, '->', converter_dwg(f) if '--sem-dwg' not in sys.argv else '-')


main()
