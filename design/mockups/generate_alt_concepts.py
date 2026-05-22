from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path

OUT = Path('/Users/yanqing/Documents/OmniClaw/design/mockups')
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1600, 1080
font_bold = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
font_reg = '/System/Library/Fonts/Supplemental/Arial.ttf'


def F(path, size):
    return ImageFont.truetype(path, size)

f10 = F(font_bold, 10)
f12 = F(font_bold, 12)
f13 = F(font_bold, 13)
f14 = F(font_bold, 14)
f16 = F(font_bold, 16)
f18 = F(font_bold, 18)
f20 = F(font_bold, 20)
f24 = F(font_bold, 24)
f28 = F(font_bold, 28)
f32 = F(font_bold, 32)
f34 = F(font_bold, 34)
f40 = F(font_bold, 40)
f54 = F(font_bold, 54)
r12 = F(font_reg, 12)
r13 = F(font_reg, 13)
r14 = F(font_reg, 14)
r15 = F(font_reg, 15)
r16 = F(font_reg, 16)
r18 = F(font_reg, 18)


def shadow(base, box, radius=28, blur=18, offset=(0, 12), color=(10, 16, 28, 48)):
    layer = Image.new('RGBA', base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x1, y1, x2, y2 = box
    ox, oy = offset
    d.rounded_rectangle((x1 + ox, y1 + oy, x2 + ox, y2 + oy), radius=radius, fill=color)
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer)


def glow(base, bounds, color, blur=70):
    layer = Image.new('RGBA', base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse(bounds, fill=color)
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer)


def rr(d, box, fill, outline=None, width=1, radius=24):
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def pill(d, x, y, text, font, fill, fg, outline=None, px=12, py=8):
    w = int(d.textlength(text, font=font) + px * 2)
    h = font.size + py * 2 - 2
    rr(d, (x, y, x + w, y + h), fill=fill, outline=outline or fill, radius=h // 2)
    d.text((x + px, y + py - 2), text, font=font, fill=fg)
    return x + w + 8


def concept_orbital():
    bg = '#070b14'
    img = Image.new('RGBA', (W, H), bg)
    glow(img, (-250, -150, 580, 500), (75, 94, 255, 90))
    glow(img, (1080, -120, 1740, 420), (24, 214, 196, 70))
    glow(img, (820, 620, 1580, 1240), (255, 132, 54, 40))
    d = ImageDraw.Draw(img)

    rr(d, (20, 20, W - 20, H - 20), fill=(5, 8, 14, 200), outline=(120, 160, 255, 45), radius=38)
    shadow(img, (20, 20, W - 20, H - 20), radius=38, blur=24, offset=(0, 14), color=(0, 0, 0, 90))

    rr(d, (42, 42, W - 42, 120), fill=(10, 16, 28, 220), outline=(150, 180, 255, 35), radius=28)
    d.text((70, 64), 'ai2human', font=f28, fill='#f3f7ff')
    d.text((228, 70), 'Agent Labor Network', font=r15, fill='#91a4c7')
    x = 1040
    for t in ['Humans', 'Orders', 'Services', 'Signals']:
        x = pill(d, x, 58, t, f13, '#101a2f', '#d6e2ff', outline=(255,255,255,24))
    pill(d, W - 230, 58, 'Continue with Privy', f13, '#4f6cff', '#ffffff')

    rr(d, (48, 150, 430, H - 48), fill=(10, 17, 31, 220), outline=(145, 176, 236, 30), radius=34)
    d.text((78, 182), 'Agent dispatch,\nwithout protocol noise.', font=f54, fill='#f4f8ff', spacing=8)
    d.text((82, 324), 'A bold AI-native market for human fallback, proof, and settlement.', font=r16, fill='#9ab0d3')
    for box, color in [((76, 410, 396, 730), (98,124,255,60)), ((120, 454, 352, 686), (34,211,238,60)), ((166, 500, 306, 640), (255,141,55,60))]:
        layer = Image.new('RGBA', (W, H), (0,0,0,0))
        ld = ImageDraw.Draw(layer)
        ld.ellipse(box, outline=color, width=3)
        img.alpha_composite(layer)
    rr(d, (110, 800, 368, 968), fill='#0f1a31', outline=(255,255,255,22), radius=28)
    d.text((136, 830), 'Privy entry', font=f18, fill='#f2f6ff')
    d.text((136, 862), 'No login form.\nWallet / email / google lives inside Privy modal.', font=r15, fill='#90a5ca', spacing=6)
    pill(d, 136, 926, 'Open Privy', f13, '#4f6cff', '#ffffff')

    metrics = [
        ('Active humans', '2,341', '#4f6cff'),
        ('Open tasks', '21', '#2dd4bf'),
        ('Verifying', '4', '#f59e0b'),
        ('Paid today', '13', '#4ade80'),
    ]
    x0 = 460
    for i, (k, v, c) in enumerate(metrics):
        x = x0 + i * 267
        shadow(img, (x, 150, x + 245, 292), radius=24, blur=18, offset=(0,8), color=(0,0,0,55))
        rr(d, (x, 150, x + 245, 292), fill='#0e1830', outline=(145,176,236,30), radius=24)
        rr(d, (x + 18, 168, x + 74, 176), fill=c, radius=4)
        d.text((x + 18, 188), k.upper(), font=f10, fill='#8ea4c7')
        d.text((x + 18, 220), v, font=f32, fill='#f6f9ff')
    rr(d, (460, 326, 1110, 748), fill='#0c1528', outline=(145,176,236,30), radius=30)
    d.text((490, 356), 'Dispatch board', font=f24, fill='#f4f8ff')
    cols = ['Posted', 'Claimed', 'Delivered', 'Verify', 'Paid']
    for i, c in enumerate(cols):
        x = 492 + i * 122
        d.text((x, 394), c, font=f12, fill='#8ea4c7')
        rr(d, (x, 420, x + 102, 706), fill='#121d34', outline=(255,255,255,18), radius=24)
    tasks = [
        ('Alibaba scan', 'Shanghai', '#1d4ed8', 'Posted', 504),
        ('Store visit', 'Kris Ming', '#0f766e', 'Claimed', 626),
        ('Photo proof', '2 uploads', '#b45309', 'Delivered', 748),
        ('Manual review', 'callback ok', '#a16207', 'Verify', 870),
        ('Receipt', 'settled', '#15803d', 'Paid', 992),
    ]
    for title, sub, color, stage, x in tasks:
        rr(d, (x, 450, x + 78, 582), fill='#0d172a', outline=(255,255,255,20), radius=20)
        pill(d, x + 12, 464, stage, f10, color, '#ffffff')
        d.text((x + 12, 504), title, font=f14, fill='#f4f8ff')
        d.text((x + 12, 532), sub, font=r12, fill='#8ea4c7')
    rr(d, (1134, 326, 1542, 748), fill='#0c1528', outline=(145,176,236,30), radius=30)
    d.text((1162, 356), 'Featured operators', font=f24, fill='#f4f8ff')
    y = 408
    for name, loc, rate, ok in [('Kris Ming', 'Shanghai', '$50/hr', True), ('Andy Pk', 'Graz', '$150/hr', True), ('Rahmat Ullah', 'Peshawar', '$35/hr', False)]:
        rr(d, (1162, y, 1514, y + 92), fill='#111c32', outline=(255,255,255,18), radius=22)
        rr(d, (1180, y + 18, 1234, y + 72), fill='#1a2b4d', radius=16)
        d.text((1194, y + 32), ''.join([p[0] for p in name.split()[:2]]), font=f18, fill='#2dd4bf')
        d.text((1250, y + 22), name, font=f18, fill='#f5f8ff')
        d.text((1250, y + 48), f'{loc} · {rate}', font=r13, fill='#90a5ca')
        pill(d, 1430, y + 24, 'verified' if ok else 'open', f10, '#0f2b24' if ok else '#182236', '#4ade80' if ok else '#cdd8ea', outline=(74,222,128,50) if ok else (255,255,255,20), px=8, py=5)
        y += 108
    rr(d, (460, 772, 1542, 1006), fill='#0c1528', outline=(145,176,236,30), radius=30)
    d.text((490, 804), 'Why this direction', font=f20, fill='#f4f8ff')
    d.text((490, 842), 'Feels like an AI-native control room. Stronger visual identity, less SaaS sameness, and Privy handled as a primary action instead of a form.', font=r16, fill='#90a5ca')
    img.save(OUT / 'concept-orbital.png')


def concept_editorial():
    bg = '#f5efe7'
    img = Image.new('RGBA', (W, H), bg)
    d = ImageDraw.Draw(img)
    rr(d, (36, 36, W - 36, H - 36), fill='#fbf8f3', outline='#e1d9cf', radius=36)
    rr(d, (60, 60, W - 60, 132), fill='#151515', radius=26)
    d.text((92, 82), 'ai2human', font=f28, fill='#fff8ef')
    x = 1030
    for t in ['Talent', 'Orders', 'Profile']:
        x = pill(d, x, 77, t, f13, '#262626', '#f7ecdb', outline='#424242')
    pill(d, W - 224, 77, 'Privy entry', f13, '#ef5b2a', '#ffffff')
    d.text((78, 184), 'Not a\nfreelancer site.', font=f54, fill='#141414', spacing=6)
    d.text((82, 314), 'A labor market for agents.\nHumans close the last mile.', font=r18, fill='#5d5248', spacing=8)
    rr(d, (78, 386, 420, 496), fill='#ffefe4', outline='#f7b58a', radius=28)
    d.text((104, 414), 'Continue with Privy', font=f28, fill='#c24818')
    d.text((106, 454), 'Wallet / email / google inside one modal.', font=r15, fill='#7a5c4c')

    blocks = [
        ((470, 182, 760, 340), '#f2dfcf', '2,341', 'available humans'),
        ((790, 182, 1064, 340), '#dbe9ff', '21', 'open orders'),
        ((1092, 182, 1368, 340), '#e2f6ee', '13', 'paid today'),
        ((1394, 182, 1524, 340), '#fff5d6', '97%', 'completion'),
    ]
    for box, fill, val, sub in blocks:
        rr(d, box, fill=fill, outline='#dccfc4', radius=26)
        d.text((box[0] + 22, box[1] + 28), val, font=f40, fill='#141414')
        d.text((box[0] + 22, box[1] + 88), sub, font=r15, fill='#63584e')

    d.text((78, 546), 'Selected operators', font=f32, fill='#141414')
    cards = [
        ('Kris Ming', 'Shanghai · verification / writing', '$50/hr'),
        ('Louis Cubero', 'NYC · creator ops / outreach', '$40/hr'),
        ('Mihail', 'Krasnoyarsk · local proof / checks', '$30/hr'),
    ]
    x = 78
    for i, (n, meta, price) in enumerate(cards):
        rr(d, (x, 596, x + 460, 860), fill='#ffffff' if i != 1 else '#fff8ef', outline='#dccfc4', radius=28)
        d.text((x + 22, 620), n, font=f32, fill='#141414')
        d.text((x + 22, 670), meta, font=r16, fill='#63584e')
        d.text((x + 22, 760), price, font=f28, fill='#141414')
        rr(d, (x + 290, 746, x + 430, 806), fill='#141414', radius=22)
        d.text((x + 330, 764), 'Route', font=f18, fill='#fff8ef')
        x += 478
    rr(d, (78, 884, 1524, 1018), fill='#141414', radius=28)
    d.text((106, 914), 'Task → AI → Human fallback → Verify → Settle', font=f28, fill='#fff8ef')
    d.text((106, 958), 'This direction feels more like an iconic product brand than a normal dashboard.', font=r16, fill='#d2c6b6')
    img.save(OUT / 'concept-editorial.png')


def concept_mission():
    bg = '#08111f'
    img = Image.new('RGBA', (W, H), bg)
    glow(img, (-220, -120, 500, 480), (27, 86, 255, 90))
    glow(img, (1120, 0, 1700, 420), (30, 255, 214, 45))
    d = ImageDraw.Draw(img)
    for x in range(0, W, 40):
        d.line((x, 0, x, H), fill=(255,255,255,10), width=1)
    for y in range(0, H, 40):
        d.line((0, y, W, y), fill=(255,255,255,10), width=1)
    rr(d, (42, 42, 340, 1038), fill=(10, 18, 33, 228), outline=(107, 154, 255, 40), radius=34)
    d.text((72, 72), 'Mission Control', font=f28, fill='#f1f6ff')
    d.text((72, 110), 'ai2human / active network', font=r14, fill='#8fa6ca')
    nodes = [(130,210),(240,260),(176,360),(274,418),(116,510),(226,602),(170,720)]
    for i,(x,y) in enumerate(nodes):
        for j,(x2,y2) in enumerate(nodes):
            if i<j and abs(i-j)<=2:
                d.line((x,y,x2,y2), fill=(96,132,255,70), width=2)
        rr(d,(x-8,y-8,x+8,y+8),fill='#22d3ee' if i%2==0 else '#4f6cff',radius=8)
    d.text((70, 796), 'Launch task', font=f20, fill='#f6f9ff')
    d.text((70, 828), 'One button opens Privy.\nOne button posts a task.\nEverything else is state.', font=r16, fill='#95acd0', spacing=8)
    pill(d, 70, 934, 'Continue with Privy', f13, '#4f6cff', '#ffffff')

    rr(d, (370, 42, 1554, 160), fill=(10, 18, 33, 220), outline=(107,154,255,40), radius=30)
    d.text((406, 74), 'Orders / live mission board', font=f14, fill='#89a0c8')
    d.text((406, 98), 'Tasks move across the board like active missions.', font=f34, fill='#f3f8ff')
    pill(d, 1340, 84, 'Signals', f13, '#0f223f', '#dce7ff', outline=(255,255,255,24))
    pill(d, 1442, 84, 'Post task', f13, '#22c55e', '#ffffff')

    rr(d, (370, 190, 1190, 1038), fill=(10, 18, 33, 228), outline=(107,154,255,40), radius=34)
    cols = ['Inbound', 'Assigned', 'In field', 'Evidence', 'Settle']
    for i,c in enumerate(cols):
        x = 394 + i * 156
        d.text((x, 220), c, font=f18, fill='#dfe8fb')
        rr(d, (x, 258, x + 134, 1008), fill='#0f1b32', outline=(255,255,255,18), radius=26)
    missions = [
        (406, 290, 'Alibaba stock', 'Agent / 4h', '#1d4ed8'),
        (562, 372, 'Store photo', 'Kris Ming', '#0f766e'),
        (718, 464, 'Pickup parcel', 'Rahmat', '#b45309'),
        (874, 556, 'Upload proof', '2 files', '#7c3aed'),
        (1030, 648, 'Release pay', 'x402 mock', '#15803d'),
    ]
    for x,y,t,s,c in missions:
        rr(d, (x, y, x + 110, y + 158), fill='#132342', outline=(255,255,255,20), radius=22)
        rr(d, (x + 14, y + 14, x + 54, y + 20), fill=c, radius=3)
        d.text((x + 14, y + 38), t, font=f16, fill='#f5f8ff')
        d.text((x + 14, y + 68), s, font=r13, fill='#8ea4c7')
        pill(d, x + 14, y + 116, 'Open', f12, '#0f223f', '#dfe8fb', outline=(255,255,255,20), px=10, py=6)

    rr(d, (1216, 190, 1554, 602), fill=(10, 18, 33, 228), outline=(107,154,255,40), radius=34)
    d.text((1248, 220), 'Signals', font=f24, fill='#f2f7ff')
    signal_rows = [('Humans online', '2,341', '#22d3ee'), ('Pending verify', '4', '#f59e0b'), ('Callbacks ok', '91%', '#4ade80'), ('Median response', '14m', '#4f6cff')]
    y = 274
    for a,b,c in signal_rows:
        rr(d, (1248, y, 1520, y + 72), fill='#0f1b32', outline=(255,255,255,18), radius=20)
        rr(d, (1266, y + 18, 1314, y + 24), fill=c, radius=4)
        d.text((1266, y + 34), a, font=r14, fill='#8ea4c7')
        d.text((1450, y + 28), b, font=f24, fill='#f4f8ff')
        y += 88
    rr(d, (1216, 626, 1554, 1038), fill=(10, 18, 33, 228), outline=(107,154,255,40), radius=34)
    d.text((1248, 656), 'Identity entry', font=f24, fill='#f2f7ff')
    d.text((1248, 706), 'Privy is the primary gateway.\nNo standard login screen.\nOne action opens the identity modal.', font=r16, fill='#95acd0', spacing=8)
    rr(d, (1248, 818, 1520, 936), fill='#111f3a', outline=(255,255,255,18), radius=24)
    d.text((1276, 850), 'Continue with Privy', font=f24, fill='#f6f9ff')
    d.text((1276, 890), 'wallet · email · google', font=r14, fill='#95acd0')
    img.save(OUT / 'concept-mission.png')


def make_sheet():
    sheet = Image.new('RGBA', (2000, 1460), '#e9edf4')
    d = ImageDraw.Draw(sheet)
    d.text((70, 46), 'ai2human redesign concepts', font=f40, fill='#111827')
    d.text((70, 96), 'Three directions. None of them inherit the previous app shell.', font=r18, fill='#6b7280')
    items = [
        ('concept-orbital.png', 'A. Orbital / AI Control Room', (70, 150)),
        ('concept-editorial.png', 'B. Editorial / Iconic Brand Product', (1040, 150)),
        ('concept-mission.png', 'C. Mission Control / Tactical Ops', (555, 810)),
    ]
    for file, label, pos in items:
        im = Image.open(OUT / file).convert('RGBA').resize((900, 608))
        shadow(sheet, (pos[0], pos[1], pos[0] + 900, pos[1] + 608), radius=28, blur=22, offset=(0, 14), color=(20, 28, 40, 46))
        sheet.alpha_composite(im, pos)
        d.text((pos[0], pos[1] - 34), label, font=f24, fill='#111827')
    sheet.save(OUT / 'concepts-sheet-v3.png')

concept_orbital()
concept_editorial()
concept_mission()
make_sheet()
print('done')
