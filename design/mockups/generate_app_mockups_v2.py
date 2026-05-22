from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path

OUT = Path('/Users/yanqing/Documents/OmniClaw/design/mockups')
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1600, 1080
BG = '#060a14'
BG2 = '#091120'
NAVY = '#eaf2ff'
TEXT = '#d7e5ff'
MUTED = '#88a0c8'
BLUE = '#4f7cff'
CYAN = '#27e1d1'
ORANGE = '#ff8c3a'
GREEN = '#44e199'
RED = '#ff6b7d'
WHITE = '#f8fbff'
LINE = (143, 173, 233, 36)
PANEL = '#0c1424'
PANEL2 = '#101a2f'
SOFT = '#121d34'
SOFT2 = '#0d172a'

font_regular = '/System/Library/Fonts/SFNS.ttf'
font_bold = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
font_alt = '/System/Library/Fonts/Supplemental/Arial.ttf'


def F(path, size):
    return ImageFont.truetype(path, size)

f10 = F(font_bold, 10)
f11 = F(font_bold, 11)
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
r12 = F(font_alt, 12)
r13 = F(font_alt, 13)
r14 = F(font_alt, 14)
r15 = F(font_alt, 15)
r16 = F(font_alt, 16)
r18 = F(font_alt, 18)


def blur_glow(base, bounds, color, radius=80):
    layer = Image.new('RGBA', base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse(bounds, fill=color)
    layer = layer.filter(ImageFilter.GaussianBlur(radius))
    base.alpha_composite(layer)


def draw_shadow(base, box, radius=28, offset=(0, 14), shadow=(4, 10, 24, 90)):
    layer = Image.new('RGBA', base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x1, y1, x2, y2 = box
    ox, oy = offset
    d.rounded_rectangle((x1 + ox, y1 + oy, x2 + ox, y2 + oy), radius=radius, fill=shadow)
    layer = layer.filter(ImageFilter.GaussianBlur(24))
    base.alpha_composite(layer)


def rr(d, box, fill, outline=None, width=1, radius=24):
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def pill(d, xy, text, fill=SOFT, fg=TEXT, outline=None, font=r13, pad_x=12, pad_y=8):
    x, y = xy
    tw = d.textlength(text, font=font)
    h = font.size + pad_y * 2 - 2
    w = int(tw + pad_x * 2)
    rr(d, (x, y, x + w, y + h), fill=fill, outline=outline or fill, radius=h // 2)
    d.text((x + pad_x, y + pad_y - 2), text, font=font, fill=fg)
    return x + w, y + h


def panel(base, d, box, radius=28, fill=PANEL, outline=(120, 159, 229, 40)):
    draw_shadow(base, box, radius=radius)
    rr(d, box, fill=fill, outline=outline, radius=radius)


def metric(base, d, box, label, value, sub, glow=None):
    panel(base, d, box, radius=24, fill='#0d172a')
    x1, y1, x2, y2 = box
    if glow:
        rr(d, (x1 + 16, y1 + 16, x1 + 78, y1 + 24), fill=glow, radius=4)
    d.text((x1 + 18, y1 + 20), label.upper(), font=f10, fill=MUTED)
    d.text((x1 + 18, y1 + 50), value, font=f28, fill=WHITE)
    d.text((x1 + 18, y1 + 92), sub, font=r13, fill=MUTED)


def side_nav(base, d, active):
    box = (28, 28, 284, H - 28)
    panel(base, d, box, radius=34, fill='#081022')
    d.text((58, 58), 'ai2human', font=f24, fill=WHITE)
    d.text((58, 90), 'Dispatch Core', font=r13, fill=MUTED)
    rr(d, (52, 128, 260, 174), fill=(255,255,255,18), outline=(255,255,255,24), radius=16)
    d.text((72, 144), 'Search tasks / humans / proofs', font=r13, fill=(184,201,230))
    items = ['Overview', 'Humans', 'Services', 'Orders', 'Profile', 'Signals']
    y = 212
    for item in items:
        on = item == active
        rr(d, (48, y, 264, y + 54), fill=(79,124,255,40) if on else (255,255,255,0), outline=(92,139,255,90) if on else None, radius=18)
        d.text((70, y + 17), item, font=f16, fill=WHITE if on else (192, 207, 232))
        y += 66
    rr(d, (48, H - 220, 264, H - 56), fill=(255,255,255,12), outline=(255,255,255,20), radius=24)
    d.text((68, H - 194), 'Privy auth', font=f12, fill=MUTED)
    d.text((68, H - 164), 'One tap entry.\nWallet-first.', font=f24, fill=WHITE, spacing=6)
    d.text((68, H - 100), 'No generic login form.\nOpen Privy modal directly.', font=r14, fill=MUTED, spacing=5)


def topbar(base, d, title, subtitle):
    box = (314, 28, W - 28, 170)
    panel(base, d, box, radius=30, fill='#0b1427')
    d.text((352, 58), title.upper(), font=f10, fill=MUTED)
    d.text((352, 82), title, font=f42, fill=WHITE)
    d.text((352, 130), subtitle, font=r15, fill=MUTED)
    pill(d, (W - 274, 68), 'Live demo', fill='#12203a', fg=TEXT, outline=(255,255,255,24), font=f13)
    pill(d, (W - 156, 68), 'Continue with Privy', fill=BLUE, fg=WHITE, font=f13)


def people_card(base, d, box, name, city, rate, verified=True, blurb='Fast human fallback for evidence and local checks.', tags=('photo proof','local ops','verification')):
    panel(base, d, box, radius=24, fill='#0d172b')
    x1,y1,x2,y2 = box
    rr(d, (x1 + 18, y1 + 18, x1 + 78, y1 + 78), fill='#122749', radius=18)
    initials = ''.join([p[0] for p in name.split()[:2]]).upper()
    d.text((x1 + 35, y1 + 35), initials, font=f20, fill=CYAN)
    d.text((x1 + 96, y1 + 22), name, font=f20, fill=WHITE)
    d.text((x1 + 96, y1 + 50), city, font=r13, fill=MUTED)
    pill(d, (x2 - 116, y1 + 18), 'verified' if verified else 'open', fill='#0f2b24' if verified else '#161f31', fg=GREEN if verified else MUTED, outline=(68,225,153,70) if verified else (255,255,255,24), font=f12)
    d.text((x1 + 18, y1 + 102), blurb, font=r14, fill=TEXT)
    curx = x1 + 18
    for t in tags:
        curx, _ = pill(d, (curx, y1 + 138), t, fill='#12203a', fg=CYAN, outline=(39,225,209,40), font=r12, pad_x=10, pad_y=7)
        curx += 8
    d.line((x1 + 18, y1 + 194, x2 - 18, y1 + 194), fill=(255,255,255,20), width=1)
    d.text((x1 + 18, y1 + 214), f'${rate}/hr', font=f24, fill=WHITE)
    pill(d, (x2 - 112, y1 + 212), 'Route task', fill=BLUE, fg=WHITE, font=f13)


def service_card(base, d, box, title, provider, price, desc, tags=('proof','field','fixed')):
    panel(base, d, box, radius=24, fill='#0d172b')
    x1,y1,x2,y2 = box
    d.text((x1 + 18, y1 + 18), title, font=f18, fill=WHITE)
    d.text((x1 + 18, y1 + 44), provider, font=r13, fill=MUTED)
    d.text((x1 + 18, y1 + 78), desc, font=r14, fill=TEXT)
    curx = x1 + 18
    for t in tags:
        curx, _ = pill(d, (curx, y1 + 118), t, fill='#201608', fg=ORANGE, outline=(255,140,58,50), font=r12, pad_x=10, pad_y=7)
        curx += 8
    d.line((x1 + 18, y1 + 172, x2 - 18, y1 + 172), fill=(255,255,255,20), width=1)
    d.text((x1 + 18, y1 + 190), price, font=f24, fill=WHITE)
    pill(d, (x2 - 96, y1 + 188), 'Book', fill=BLUE, fg=WHITE, font=f13)


def col_card(base, d, box, title):
    panel(base, d, box, radius=24, fill='#0d172b')
    x1,y1,x2,y2 = box
    d.text((x1 + 16, y1 + 16), title, font=f14, fill=MUTED)


def task_mini(base, d, box, stage, name, sub, cfill, cfg):
    rr(d, box, fill='#12203a', outline=(255,255,255,20), radius=18)
    x1,y1,x2,y2 = box
    pill(d, (x1 + 12, y1 + 12), stage, fill=cfill, fg=cfg, font=f11, pad_x=10, pad_y=6)
    d.text((x1 + 12, y1 + 48), name, font=f16, fill=WHITE)
    d.text((x1 + 12, y1 + 74), sub, font=r12, fill=MUTED)
    pill(d, (x1 + 12, y2 - 36), 'Open', fill=SOFT, fg=TEXT, font=f12, pad_x=10, pad_y=6)


def make_humans():
    img = Image.new('RGBA', (W, H), BG)
    blur_glow(img, (-240, -120, 520, 500), (79,124,255,65))
    blur_glow(img, (1120, -140, 1680, 360), (39,225,209,45))
    blur_glow(img, (980, 640, 1650, 1200), (255,140,58,40))
    d = ImageDraw.Draw(img)
    side_nav(img, d, 'Humans')
    topbar(img, d, 'Humans', 'Route humans into AI workflows when reality is required.')
    metric(img, d, (314, 192, 544, 316), 'operators', '2,341', 'active in dispatch', (79,124,255,160))
    metric(img, d, (562, 192, 792, 316), 'verified', '712', 'priority trust tier', (68,225,153,150))
    metric(img, d, (810, 192, 1040, 316), 'response', '14m', 'median first response', (39,225,209,150))
    metric(img, d, (1058, 192, 1288, 316), 'avg rate', '$38/hr', 'network blended rate', (255,140,58,150))
    panel(img, d, (1306, 192, 1572, 486), radius=24, fill='#0d172b')
    d.text((1330, 216), 'Signal groups', font=f16, fill=WHITE)
    y=260
    for item in ['Photo proof ops', 'On-site verification', 'Captcha fallback', 'Delivery / pickup']:
        pill(d, (1330, y), item, fill='#12203a', fg=CYAN if y<320 else ORANGE, outline=(255,255,255,24), font=f12)
        y += 52
    d.text((1330, 430), 'This screen should feel like a live talent network, not a list of cards.', font=r14, fill=MUTED)
    panel(img, d, (314, 338, 1572, 420), radius=22, fill='#0c1425')
    rr(d, (338, 356, 766, 402), fill='#111c32', outline=(255,255,255,22), radius=16)
    d.text((360, 372), 'Search people, city, skill, proof type...', font=r14, fill=MUTED)
    x = 792
    for item in ['Location', 'Skill', 'Verified', 'Sort: trust score']:
        x2,_ = pill(d, (x, 356), item, fill='#111c32', fg=TEXT, outline=(255,255,255,22), font=f13)
        x = x2 + 10
    cards = [
        ('Kris Ming', 'Shanghai, China', 50),
        ('Louis Cubero', 'NYC, United States', 40),
        ('Mihail', 'Krasnoyarsk, Russia', 30),
        ('Andy Pk', 'Graz, Austria', 150),
        ('Priscila Sorenson', 'Florida, United States', 150),
        ('Rahmat Ullah', 'Peshawar, Pakistan', 35),
    ]
    x0,y0,w,h,gx,gy = 314, 444, 398, 304, 18, 18
    for i,(n,c,r) in enumerate(cards):
        x=x0+(i%3)*(w+gx); y=y0+(i//3)*(h+gy)
        people_card(img,d,(x,y,x+w,y+h),n,c,r)
    img.save(OUT/'app-humans-v2.png')


def make_services():
    img = Image.new('RGBA', (W, H), BG)
    blur_glow(img, (-220, -120, 560, 500), (79,124,255,60))
    blur_glow(img, (1160, -160, 1760, 360), (39,225,209,42))
    d = ImageDraw.Draw(img)
    side_nav(img, d, 'Services')
    topbar(img, d, 'Services', 'Productized human services for agent fallback and structured delivery.')
    metric(img, d, (314, 192, 620, 316), 'catalog', '986', 'priced service listings', (79,124,255,160))
    metric(img, d, (638, 192, 944, 316), 'verified', '421', 'trusted supply', (68,225,153,150))
    metric(img, d, (962, 192, 1268, 316), 'avg price', '$52', 'fixed + hourly blended', (255,140,58,150))
    metric(img, d, (1286, 192, 1572, 316), 'best for', 'Repeatable tasks', 'standardized human actions', (39,225,209,150))
    panel(img, d, (314, 338, 1572, 420), radius=22, fill='#0c1425')
    x=338
    for i,item in enumerate(['Verification','Research','Delivery','Events','Tech','Other']):
        x2,_ = pill(d,(x,356),item,fill='#12203a' if i==0 else '#111c32',fg=CYAN if i==0 else TEXT,outline=(39,225,209,40) if i==0 else (255,255,255,20),font=f13)
        x=x2+10
    services = [
        ('On-site inventory check', 'Kris Ming · Shanghai', '$60 fixed', 'Photo + timestamp within 45 min'),
        ('Local recon walkthrough', 'Andy Pk · Graz', '$140 fixed', 'In-person verification with notes'),
        ('Grant and business research', 'HumanAIOS · Florida', '$75/hr', 'Structured research with citations'),
        ('Courier pickup and handoff', 'Rahmat Ullah · Peshawar', '$35/hr', 'Pickup and proof of handoff'),
        ('Community moderation shift', 'Patricia Tani · SF', '$28/hr', 'Human presence for social channels'),
        ('Legal workflow architecture', 'Jimmy Harris · Minneapolis', '$150/hr', 'High-trust advisory flow'),
    ]
    x0,y0,w,h,gx,gy = 314, 444, 398, 262, 18, 18
    for i,s in enumerate(services):
        x=x0+(i%3)*(w+gx); y=y0+(i//3)*(h+gy)
        service_card(img,d,(x,y,x+w,y+h),*s)
    img.save(OUT/'app-services-v2.png')


def make_orders():
    img = Image.new('RGBA', (W, H), BG)
    blur_glow(img, (-220, -120, 520, 480), (79,124,255,62))
    blur_glow(img, (1080, 620, 1720, 1180), (255,140,58,36))
    d = ImageDraw.Draw(img)
    side_nav(img, d, 'Orders')
    topbar(img, d, 'Orders', 'Task → human accept → delivery → verify → settle, visible in one place.')
    metric(img, d, (314, 192, 544, 316), 'open', '21', 'awaiting human accept', (79,124,255,160))
    metric(img, d, (562, 192, 792, 316), 'claimed', '8', 'human assigned', (39,225,209,150))
    metric(img, d, (810, 192, 1040, 316), 'verify', '4', 'waiting approval', (255,207,84,150))
    metric(img, d, (1058, 192, 1288, 316), 'paid', '13', 'settled today', (68,225,153,150))
    metric(img, d, (1306, 192, 1572, 316), 'fail rate', '2.1%', 'kept visible', (255,107,125,150))

    panel(img,d,(314,338,800,1000),radius=28,fill='#0c1425')
    d.text((340,364),'Create task',font=f20,fill=WHITE)
    d.text((340,392),'Agents should publish work in one short motion.',font=r14,fill=MUTED)
    fields=[('Service','On-site inventory check'),('Location','Shanghai'),('Deadline','4h'),('Budget','$120'),('Proof','photo, timestamp')]
    yy=440
    for lbl,val in fields:
        d.text((340,yy),lbl.upper(),font=f10,fill=MUTED)
        rr(d,(340,yy+18,774,yy+66),fill='#111c32',outline=(255,255,255,22),radius=16)
        d.text((356,yy+35),val,font=r14,fill=TEXT)
        yy += 86
    pill(d,(340,900),'Post task',fill=BLUE,fg=WHITE,font=f13)
    pill(d,(450,900),'Preview payload',fill='#12203a',fg=TEXT,outline=(255,255,255,22),font=f13)

    panel(img,d,(826,338,1572,1000),radius=28,fill='#0c1425')
    d.text((852,364),'Dispatch board',font=f20,fill=WHITE)
    cols=['Posted','Claimed','Delivered','Verify','Paid']
    start_x=852
    colw=126
    for i,c in enumerate(cols):
        x=start_x+i*142
        d.text((x,400),c,font=f14,fill=MUTED)
        rr(d,(x,430,x+colw,970),fill='#101a2f',outline=(255,255,255,18),radius=22)
    task_mini(img,d,(864,454,966,624),'Posted','Alibaba scan','Shanghai · 4h','#16295b',BLUE)
    task_mini(img,d,(1006,454,1108,624),'Claimed','Store visit','Kris Ming','#0f2b24',CYAN)
    task_mini(img,d,(1148,454,1250,624),'Delivered','Photo upload','2 proofs added','#241a0a',ORANGE)
    task_mini(img,d,(1290,454,1392,624),'Verify','Manual check','Agent callback ok','#2b2409','#eab308')
    task_mini(img,d,(1432,454,1534,624),'Paid','Receipt logged','x402 mocked','#0f2b24',GREEN)

    panel(img,d,(340,728,774,970),radius=22,fill='#101a2f')
    d.text((364,752),'Selected order',font=f18,fill=WHITE)
    items=[('Agent','Demo Agent'),('Human','Kris Ming'),('Evidence','2 images · timestamp · receipt'),('Callback','Agent notified'),('Settlement','Ready after verify')]
    y=796
    for k,v in items:
        d.text((364,y),k.upper(),font=f10,fill=MUTED)
        d.text((364,y+18),v,font=r14,fill=TEXT)
        y+=44
    pill(d,(364,928),'Verify',fill='#241a0a',fg=ORANGE,outline=(255,140,58,50),font=f13)
    pill(d,(458,928),'Reject',fill='#2b1017',fg=RED,outline=(255,107,125,60),font=f13)
    pill(d,(554,928),'Settle',fill=BLUE,fg=WHITE,font=f13)
    img.save(OUT/'app-orders-v2.png')


def make_profile():
    img = Image.new('RGBA', (W, H), BG)
    blur_glow(img, (-200, -120, 560, 520), (79,124,255,60))
    blur_glow(img, (1180, -160, 1720, 320), (39,225,209,42))
    d = ImageDraw.Draw(img)
    side_nav(img, d, 'Profile')
    topbar(img, d, 'Profile', 'Operator identity, service publishing, and one-tap Privy auth.')
    metric(img, d, (314, 192, 544, 316), 'services', '12', 'published to market', (79,124,255,160))
    metric(img, d, (562, 192, 792, 316), 'completion', '97%', 'rolling 30 days', (68,225,153,150))
    metric(img, d, (810, 192, 1040, 316), 'earnings', '$4,820', 'settled this month', (255,140,58,150))
    metric(img, d, (1058, 192, 1288, 316), 'trust', 'Verified', 'priority routing', (39,225,209,150))
    metric(img, d, (1306, 192, 1572, 316), 'auth', 'Privy', 'wallet-first entry', (176,132,255,150))

    panel(img,d,(314,338,662,1000),radius=30,fill='#0c1425')
    d.text((342,364),'Operator identity',font=f20,fill=WHITE)
    rr(d,(368,410,508,550),fill='#122749',radius=34)
    d.text((414,458),'KM',font=f42,fill=CYAN)
    d.text((342,584),'Kris Ming',font=f28,fill=WHITE)
    d.text((342,618),'@krisming · Shanghai, China',font=r14,fill=MUTED)
    pill(d,(342,654),'Verified operator',fill='#0f2b24',fg=GREEN,outline=(68,225,153,70),font=f12)
    d.text((342,722),'This card should feel like a public on-chain identity layer, not a boring profile form.',font=r15,fill=TEXT,spacing=6)
    d.text((342,840),'Settlement ready via x402 mock flow',font=r14,fill=MUTED)
    d.text((342,874),'Best for photo proof, research, local checks',font=r14,fill=MUTED)

    panel(img,d,(688,338,1572,1000),radius=30,fill='#0c1425')
    x=716
    for lab,active in [('Continue with Privy',True),('Public profile',False),('Services',False),('Payout',False)]:
        x2,_=pill(d,(x,364),lab,fill=BLUE if active else '#111c32',fg=WHITE if active else TEXT,outline=None if active else (255,255,255,22),font=f13)
        x=x2+10
    d.text((716,430),'Privy-first entry',font=f20,fill=WHITE)
    d.text((716,460),'Do not render a traditional login form. One action opens the wallet/email/google modal.',font=r14,fill=MUTED)
    rr(d,(716,520,1510,680),fill='#101a2f',outline=(255,255,255,20),radius=24)
    d.text((748,554),'Continue with Privy',font=f28,fill=WHITE)
    d.text((748,602),'Wallet first · Email and Google available inside Privy',font=r16,fill=TEXT)
    pill(d,(748,636),'Open Privy modal',fill=BLUE,fg=WHITE,font=f13)
    d.text((716,744),'After auth, the right side becomes profile editing and service publishing.',font=r15,fill=MUTED)
    # light form preview beneath
    labels=[('Name','Kris Ming'),('Headline','On-site proof and rapid local execution'),('Skills','verification, writing, research'),('Rate','$50/hr')]
    yy=800
    xx=716
    for i,(lbl,val) in enumerate(labels):
        x1=716 if i%2==0 else 1118
        y1=800+(i//2)*94
        d.text((x1,y1),lbl.upper(),font=f10,fill=MUTED)
        rr(d,(x1,y1+18,x1+360,y1+68),fill='#111c32',outline=(255,255,255,20),radius=16)
        d.text((x1+16,y1+35),val,font=r14,fill=TEXT)
    img.save(OUT/'app-profile-v2.png')


def make_sheet():
    sheet = Image.new('RGBA', (2000, 1500), '#08101d')
    blur_glow(sheet, (-220, -120, 900, 520), (79,124,255,48), 90)
    blur_glow(sheet, (1320, -100, 1960, 420), (39,225,209,34), 80)
    d = ImageDraw.Draw(sheet)
    d.text((72, 50), 'ai2human app redesign v2', font=f42, fill=WHITE)
    d.text((72, 104), 'Bolder AI direction. Dark control-room interface. Privy-first auth.', font=r18, fill=MUTED)
    names = ['app-humans-v2.png', 'app-services-v2.png', 'app-orders-v2.png', 'app-profile-v2.png']
    positions = [(72, 170), (1028, 170), (72, 824), (1028, 824)]
    labels = ['Humans market', 'Services board', 'Orders dispatch', 'Profile / Privy entry']
    for name, pos, label in zip(names, positions, labels):
        im = Image.open(OUT / name).convert('RGBA').resize((900, 608))
        draw_shadow(sheet, (pos[0], pos[1], pos[0]+900, pos[1]+608), radius=24, offset=(0, 10), shadow=(2,8,18,100))
        sheet.alpha_composite(im, pos)
        d.text((pos[0], pos[1]-34), label, font=f20, fill=WHITE)
    sheet.save(OUT/'app-mockups-sheet-v2.png')

make_humans()
make_services()
make_orders()
make_profile()
make_sheet()
print('done')
