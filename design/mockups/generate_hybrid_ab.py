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
f34 = F(font_bold, 34)
f42 = F(font_bold, 42)
f56 = F(font_bold, 56)
r12 = F(font_reg, 12)
r13 = F(font_reg, 13)
r14 = F(font_reg, 14)
r15 = F(font_reg, 15)
r16 = F(font_reg, 16)
r18 = F(font_reg, 18)

BG = '#07101d'
WHITE = '#f8f5ef'
TEXT = '#efe9df'
INK = '#121212'
MUTED = '#94a3b8'
MUTED2 = '#7a8598'
LINE = (255, 255, 255, 24)
BLUE = '#5b7cff'
CYAN = '#23d3c2'
ORANGE = '#f47f36'
GREEN = '#40d58a'
CREAM = '#f4ede3'
PEACH = '#f7dfcf'
SKY = '#dce7ff'
MINT = '#d8efe8'
GOLD = '#f4e9bf'
PANEL = '#0d1729'
PANEL2 = '#101d34'


def shadow(base, box, radius=28, blur=20, offset=(0, 12), color=(0, 0, 0, 70)):
    layer = Image.new('RGBA', base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x1, y1, x2, y2 = box
    ox, oy = offset
    d.rounded_rectangle((x1 + ox, y1 + oy, x2 + ox, y2 + oy), radius=radius, fill=color)
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer)


def glow(base, bounds, color, blur=78):
    layer = Image.new('RGBA', base.size, (0,0,0,0))
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


def base_screen(title, subtitle):
    img = Image.new('RGBA', (W, H), BG)
    glow(img, (-240, -140, 540, 440), (91, 124, 255, 90))
    glow(img, (1120, -120, 1700, 380), (35, 211, 194, 56))
    glow(img, (920, 700, 1640, 1260), (244, 127, 54, 34))
    d = ImageDraw.Draw(img)

    rr(d, (18, 18, W - 18, H - 18), fill=(7, 12, 22, 210), outline=(118, 153, 255, 30), radius=40)

    # top nav
    rr(d, (40, 40, W - 40, 116), fill=(10, 16, 29, 226), outline=(255,255,255,20), radius=26)
    d.text((66, 61), 'ai2human', font=f28, fill=WHITE)
    d.text((224, 68), 'Agent Labor Network', font=r14, fill=MUTED)
    x = 1030
    for item in ['Humans', 'Orders', 'Profile']:
        x = pill(d, x, 57, item, f13, '#1b2437', TEXT, outline=(255,255,255,18))
    pill(d, W - 220, 57, 'Continue with Privy', f13, ORANGE, WHITE)

    # left editorial rail
    rr(d, (40, 140, 420, H - 40), fill=(12, 19, 34, 230), outline=(255,255,255,18), radius=34)
    d.text((70, 176), title, font=f56, fill=WHITE)
    d.text((74, 318), subtitle, font=r18, fill=(204, 216, 236), spacing=8)
    rr(d, (70, 438, 390, 560), fill=(255,255,255,10), outline=(255,255,255,18), radius=28)
    d.text((96, 466), 'Continue with Privy', font=f28, fill=WHITE)
    d.text((98, 510), 'Wallet / email / google inside one modal.', font=r15, fill=MUTED)
    rr(d, (70, 606, 390, 980), fill=(8, 14, 26, 180), outline=(255,255,255,18), radius=30)
    return img, d


def metric_card(base, d, box, value, label, fill, fg=INK):
    shadow(base, box, radius=24, blur=18, offset=(0, 8), color=(0,0,0,45))
    rr(d, box, fill=fill, radius=24)
    x1, y1, x2, y2 = box
    d.text((x1 + 18, y1 + 22), value, font=f42, fill=fg)
    d.text((x1 + 18, y1 + 84), label, font=r14, fill='#6b7280' if fill != PANEL else MUTED)


def people_card(base, d, box, name, role, price, accent):
    shadow(base, box, radius=22, blur=16, offset=(0, 8), color=(0,0,0,38))
    rr(d, box, fill='#f7f3ed', outline='#e6ddd2', radius=22)
    x1,y1,x2,y2 = box
    rr(d, (x1+18, y1+18, x1+84, y1+84), fill=accent, radius=18)
    d.text((x1+37, y1+37), ''.join([p[0] for p in name.split()[:2]]).upper(), font=f20, fill=WHITE)
    d.text((x1+102, y1+24), name, font=f24, fill=INK)
    d.text((x1+102, y1+56), role, font=r14, fill='#6b7280')
    d.text((x1+18, y1+122), price, font=f28, fill=INK)
    rr(d, (x2-138, y2-74, x2-24, y2-24), fill='#151515', radius=22)
    d.text((x2-101, y2-55), 'Route', font=f18, fill=WHITE)


def make_humans():
    img, d = base_screen('Humans,\nnot hires.', 'A market for agents.\nHumans close the last mile.')
    metric_card(img, d, (448, 150, 720, 302), '2,341', 'available humans', PEACH)
    metric_card(img, d, (746, 150, 1018, 302), '712', 'priority trust tier', SKY)
    metric_card(img, d, (1044, 150, 1316, 302), '14m', 'median response', MINT)
    metric_card(img, d, (1342, 150, 1542, 302), '$38', 'avg rate', GOLD)

    rr(d, (448, 338, 1542, 420), fill=PANEL, outline=LINE, radius=24)
    rr(d, (470, 356, 820, 402), fill=PANEL2, outline=LINE, radius=14)
    d.text((490, 372), 'Search people, city, skill, proof type...', font=r14, fill=MUTED)
    x = 844
    for item, fill, fg in [('Location', '#1b2437', TEXT), ('Skill', '#1b2437', TEXT), ('Verified', '#1b2437', TEXT), ('Top rated', ORANGE, WHITE)]:
        x = pill(d, x, 356, item, f13, fill, fg, outline=LINE if fill != ORANGE else None)

    people = [
        ('Kris Ming', 'Shanghai · verification / writing', '$50/hr', BLUE),
        ('Louis Cubero', 'NYC · creator ops / outreach', '$40/hr', CYAN),
        ('Mihail', 'Krasnoyarsk · local proof / checks', '$30/hr', ORANGE),
        ('Andy Pk', 'Graz · recon / multisensory reports', '$150/hr', '#111827'),
        ('Priscila Sorenson', 'Florida · eval / research', '$150/hr', '#6d28d9'),
        ('Rahmat Ullah', 'Peshawar · pickup / meetings', '$35/hr', '#0f766e'),
    ]
    x0, y0, w, h = 448, 456, 344, 236
    gx, gy = 18, 18
    for i, item in enumerate(people):
        x = x0 + (i % 3) * (w + gx)
        y = y0 + (i // 3) * (h + gy)
        people_card(img, d, (x, y, x + w, y + h), *item)

    rr(d, (448, 960, 1542, 1014), fill='#111111', radius=22)
    d.text((476, 978), 'Task → AI → Human fallback → Verify → Settle', font=f24, fill=WHITE)
    img.save(OUT / 'hybrid-ab-humans.png')


def make_orders():
    img, d = base_screen('Orders,\nnot forms.', 'State, proof, and settlement\nin one surface.')
    metric_card(img, d, (448, 150, 706, 302), '21', 'open orders', PEACH)
    metric_card(img, d, (726, 150, 984, 302), '8', 'human assigned', SKY)
    metric_card(img, d, (1004, 150, 1262, 302), '4', 'waiting verify', GOLD)
    metric_card(img, d, (1282, 150, 1542, 302), '13', 'paid today', MINT)

    rr(d, (448, 338, 842, 960), fill=PANEL, outline=LINE, radius=28)
    d.text((476, 370), 'Quick create task', font=f24, fill=WHITE)
    d.text((476, 404), 'One compact action for agents.', font=r14, fill=MUTED)
    fields = [('Service', 'On-site inventory check'), ('Location', 'Shanghai'), ('Deadline', '4h'), ('Budget', '$120'), ('Proof', 'photo, timestamp')]
    yy = 452
    for label, val in fields:
        d.text((476, yy), label.upper(), font=f10, fill=MUTED)
        rr(d, (476, yy + 18, 812, yy + 68), fill=PANEL2, outline=LINE, radius=14)
        d.text((494, yy + 36), val, font=r14, fill=TEXT)
        yy += 92
    pill(d, 476, 884, 'Post task', f13, ORANGE, WHITE)
    pill(d, 582, 884, 'Preview payload', f13, '#1b2437', TEXT, outline=LINE)

    rr(d, (870, 338, 1542, 960), fill=PANEL, outline=LINE, radius=28)
    d.text((900, 370), 'Dispatch board', font=f24, fill=WHITE)
    cols = ['Posted', 'Claimed', 'Delivered', 'Verify', 'Paid']
    for i, c in enumerate(cols):
        x = 900 + i * 128
        d.text((x, 404), c, font=f13, fill=MUTED)
        rr(d, (x, 432, x + 104, 920), fill=PANEL2, outline=LINE, radius=24)
    tasks = [
        ('Alibaba scan', 'Shanghai', BLUE, 912),
        ('Store visit', 'Kris Ming', CYAN, 1040),
        ('Photo upload', '2 proofs', ORANGE, 1168),
        ('Manual review', 'callback ok', '#ca8a04', 1296),
        ('Receipt', 'settled', GREEN, 1424),
    ]
    for title, sub, color, x in tasks:
        rr(d, (x, 462, x + 76, 602), fill='#16233f', outline=LINE, radius=18)
        rr(d, (x + 14, 476, x + 50, 484), fill=color, radius=4)
        d.text((x + 14, 502), title, font=f14, fill=WHITE)
        d.text((x + 14, 530), sub, font=r12, fill=MUTED)
        rr(d, (x + 14, 560, x + 64, 592), fill='#0f172a', radius=12)
        d.text((x + 28, 569), 'Open', font=f10, fill=TEXT)

    rr(d, (900, 720, 1512, 914), fill='#111111', radius=24)
    d.text((928, 748), 'Selected order', font=f20, fill=WHITE)
    d.text((928, 786), 'Demo Agent · Kris Ming · 2 images · callback ok · ready to settle', font=r15, fill='#d1d5db')
    pill(d, 928, 844, 'Verify', f13, GOLD, '#7c2d12')
    pill(d, 1020, 844, 'Reject', f13, '#fecaca', '#7f1d1d')
    pill(d, 1112, 844, 'Settle', f13, BLUE, WHITE)
    img.save(OUT / 'hybrid-ab-orders.png')


def make_profile():
    img, d = base_screen('Profile,\nnot signup.', 'Privy-first identity.\nThen operator studio.')
    metric_card(img, d, (448, 150, 706, 302), '12', 'published services', PEACH)
    metric_card(img, d, (726, 150, 984, 302), '97%', 'completion', SKY)
    metric_card(img, d, (1004, 150, 1262, 302), '$4,820', 'settled this month', MINT)
    metric_card(img, d, (1282, 150, 1542, 302), 'Privy', 'identity gateway', GOLD)

    rr(d, (448, 338, 780, 960), fill=PANEL, outline=LINE, radius=30)
    rr(d, (484, 382, 624, 522), fill='#1b2e53', radius=30)
    d.text((534, 434), 'KM', font=f42, fill=CYAN)
    d.text((484, 560), 'Kris Ming', font=f28, fill=WHITE)
    d.text((484, 598), '@krisming · Shanghai, China', font=r14, fill=MUTED)
    pill(d, 484, 636, 'Verified operator', f12, '#0f2b24', GREEN, outline=(64,213,138,60))
    d.text((484, 740), 'This should feel like public identity and operator reputation, not account settings.', font=r16, fill=TEXT, spacing=6)

    rr(d, (808, 338, 1542, 960), fill=PANEL, outline=LINE, radius=30)
    x = 836
    for item, fill, fg in [('Continue with Privy', ORANGE, WHITE), ('Public profile', '#1b2437', TEXT), ('Services', '#1b2437', TEXT), ('Payout', '#1b2437', TEXT)]:
        x = pill(d, x, 364, item, f13, fill, fg, outline=LINE if fill != ORANGE else None)
    d.text((836, 428), 'Privy-first entry', font=f24, fill=WHITE)
    d.text((836, 462), 'No traditional login form. One action opens wallet / email / google inside Privy.', font=r14, fill=MUTED)
    rr(d, (836, 520, 1488, 668), fill='#f7f2ea', radius=26)
    d.text((872, 560), 'Continue with Privy', font=f34, fill=INK)
    d.text((874, 612), 'Wallet / email / google available inside one modal.', font=r16, fill='#6b7280')
    rr(d, (874, 620, 1034, 664), fill=ORANGE, radius=18)
    d.text((916, 634), 'Open Privy', font=f16, fill=WHITE)
    # profile fields preview
    labels = [('Name', 'Kris Ming'), ('Headline', 'On-site proof and rapid local execution'), ('Skills', 'verification, writing, research'), ('Rate', '$50/hr')]
    for i, (label, val) in enumerate(labels):
        col = i % 2
        row = i // 2
        x1 = 836 + col * 338
        y1 = 740 + row * 96
        d.text((x1, y1), label.upper(), font=f10, fill=MUTED)
        rr(d, (x1, y1 + 18, x1 + 310, y1 + 68), fill=PANEL2, outline=LINE, radius=14)
        d.text((x1 + 16, y1 + 36), val, font=r14, fill=TEXT)
    img.save(OUT / 'hybrid-ab-profile.png')


def make_sheet():
    sheet = Image.new('RGBA', (2000, 1460), '#eceff4')
    d = ImageDraw.Draw(sheet)
    d.text((70, 46), 'ai2human hybrid direction A + B', font=f42, fill='#111827')
    d.text((70, 98), 'AI control-room structure + editorial brand attitude + Privy-first identity flow.', font=r18, fill='#6b7280')
    items = [
        ('hybrid-ab-humans.png', 'Humans market', (70, 150)),
        ('hybrid-ab-orders.png', 'Orders dispatch', (1040, 150)),
        ('hybrid-ab-profile.png', 'Profile / Privy entry', (555, 810)),
    ]
    for file, label, pos in items:
        im = Image.open(OUT / file).convert('RGBA').resize((900, 608))
        shadow(sheet, (pos[0], pos[1], pos[0] + 900, pos[1] + 608), radius=28, blur=22, offset=(0, 14), color=(20, 28, 40, 46))
        sheet.alpha_composite(im, pos)
        d.text((pos[0], pos[1] - 34), label, font=f24, fill='#111827')
    sheet.save(OUT / 'hybrid-ab-sheet.png')

make_humans()
make_orders()
make_profile()
make_sheet()
print('done')
