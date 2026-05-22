from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path

OUT = Path('/Users/yanqing/Documents/OmniClaw/design/mockups')
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1600, 1080
BG = '#f4f7fb'
NAVY = '#0f172a'
TEXT = '#172033'
MUTED = '#60708d'
BLUE = '#2563eb'
CYAN = '#10b8a6'
ORANGE = '#f59e0b'
GREEN = '#16a34a'
RED = '#ef4444'
WHITE = '#ffffff'
LINE = '#dbe4f0'
PANEL = '#ffffff'
SOFT = '#eef4fb'
SOFT2 = '#f9fbfd'

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
r12 = F(font_alt, 12)
r13 = F(font_alt, 13)
r14 = F(font_alt, 14)
r15 = F(font_alt, 15)
r16 = F(font_alt, 16)
r18 = F(font_alt, 18)
mono12 = F(font_alt, 12)


def draw_shadow(base, box, radius=26, offset=(0, 10), shadow=(20, 28, 45, 26)):
    layer = Image.new('RGBA', base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x1, y1, x2, y2 = box
    ox, oy = offset
    d.rounded_rectangle((x1 + ox, y1 + oy, x2 + ox, y2 + oy), radius=radius, fill=shadow)
    layer = layer.filter(ImageFilter.GaussianBlur(18))
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


def metric_card(base, d, box, label, value, sub=None, accent=None):
    draw_shadow(base, box, radius=24)
    rr(d, box, fill=WHITE, outline=LINE, radius=24)
    x1, y1, x2, y2 = box
    if accent:
        rr(d, (x1 + 14, y1 + 14, x1 + 70, y1 + 22), fill=accent, radius=4)
    d.text((x1 + 18, y1 + 20), label.upper(), font=f10, fill=MUTED)
    d.text((x1 + 18, y1 + 52), value, font=f28, fill=NAVY)
    if sub:
        d.text((x1 + 18, y1 + 92), sub, font=r13, fill=MUTED)


def operator_card(base, d, box, name, location, rate, tags, verified=True, score='4.9', subtitle='On-site proof, field checks'):
    draw_shadow(base, box, radius=24)
    rr(d, box, fill=WHITE, outline=LINE, radius=24)
    x1, y1, x2, y2 = box
    rr(d, (x1 + 18, y1 + 18, x1 + 74, y1 + 74), fill='#dbeafe', radius=18)
    d.text((x1 + 35, y1 + 34), ''.join(p[0] for p in name.split()[:2]).upper(), font=f20, fill=BLUE)
    d.text((x1 + 92, y1 + 22), name, font=f20, fill=NAVY)
    d.text((x1 + 92, y1 + 48), location, font=r13, fill=MUTED)
    pill(d, (x2 - 118, y1 + 18), 'verified' if verified else 'open', fill='#ecfdf5' if verified else '#f3f4f6', fg=GREEN if verified else MUTED, font=f12)
    d.text((x1 + 18, y1 + 98), subtitle, font=r14, fill=TEXT)
    curx = x1 + 18
    for t in tags[:3]:
        curx, _ = pill(d, (curx, y1 + 136), t, fill='#f3f8ff', fg=BLUE, outline='#dbeafe', font=r12, pad_x=10, pad_y=7)
        curx += 8
    d.line((x1 + 18, y1 + 194, x2 - 18, y1 + 194), fill=LINE, width=1)
    d.text((x1 + 18, y1 + 214), f'${rate}/hr', font=f24, fill=NAVY)
    d.text((x1 + 18, y1 + 250), f'Rating {score}', font=r13, fill=MUTED)
    pill(d, (x2 - 110, y1 + 214), 'Hire', fill=BLUE, fg=WHITE, font=f13)
    pill(d, (x2 - 210, y1 + 214), 'View', fill=SOFT, fg=TEXT, font=f13)


def service_card(base, d, box, title, provider, price, meta, tags):
    draw_shadow(base, box, radius=24)
    rr(d, box, fill=WHITE, outline=LINE, radius=24)
    x1, y1, x2, y2 = box
    d.text((x1 + 18, y1 + 20), title, font=f18, fill=NAVY)
    d.text((x1 + 18, y1 + 49), provider, font=r13, fill=MUTED)
    d.text((x1 + 18, y1 + 79), meta, font=r14, fill=TEXT)
    curx = x1 + 18
    for t in tags[:3]:
        curx, _ = pill(d, (curx, y1 + 118), t, fill='#fff7ed', fg='#b45309', outline='#fed7aa', font=r12, pad_x=10, pad_y=7)
        curx += 8
    d.line((x1 + 18, y1 + 170, x2 - 18, y1 + 170), fill=LINE, width=1)
    d.text((x1 + 18, y1 + 190), price, font=f24, fill=NAVY)
    pill(d, (x2 - 102, y1 + 188), 'Book', fill=BLUE, fg=WHITE, font=f13)


def queue_card(base, d, box, title, location, status, budget, action='Open'):
    color_map = {
        'Posted': '#eff6ff',
        'Claimed': '#ecfeff',
        'Delivered': '#fff7ed',
        'Verify': '#fefce8',
        'Paid': '#ecfdf5',
    }
    fg_map = {
        'Posted': BLUE,
        'Claimed': CYAN,
        'Delivered': '#d97706',
        'Verify': '#a16207',
        'Paid': GREEN,
    }
    draw_shadow(base, box, radius=20, offset=(0,6), shadow=(20, 28, 45, 18))
    rr(d, box, fill=WHITE, outline=LINE, radius=20)
    x1, y1, x2, y2 = box
    pill(d, (x1 + 16, y1 + 16), status, fill=color_map[status], fg=fg_map[status], font=f12)
    d.text((x1 + 16, y1 + 52), title, font=f16, fill=NAVY)
    d.text((x1 + 16, y1 + 78), location, font=r13, fill=MUTED)
    d.text((x1 + 16, y1 + 120), budget, font=f18, fill=TEXT)
    pill(d, (x1 + 16, y2 - 42), action, fill=SOFT, fg=TEXT, font=f12, pad_x=10, pad_y=6)


def screen_base(title, subtitle):
    img = Image.new('RGBA', (W, H), BG)
    d = ImageDraw.Draw(img)

    # ambient background
    for i, color in enumerate([(37, 99, 235, 20), (16, 184, 166, 16), (245, 158, 11, 14)]):
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        if i == 0:
            ld.ellipse((-140, -120, 560, 420), fill=color)
        elif i == 1:
            ld.ellipse((980, -140, 1560, 360), fill=color)
        else:
            ld.ellipse((960, 620, 1580, 1180), fill=color)
        layer = layer.filter(ImageFilter.GaussianBlur(42))
        img.alpha_composite(layer)

    sidebar = (32, 32, 292, H - 32)
    draw_shadow(img, sidebar, radius=30)
    rr(d, sidebar, fill='#0f172a', outline='#15223a', radius=30)
    d.text((64, 62), 'ai2human', font=f24, fill=WHITE)
    d.text((64, 94), 'Agent Dispatch OS', font=r13, fill=(202, 214, 232))
    rr(d, (56, 132, 268, 178), fill=(255,255,255,18), outline=(255,255,255,28), radius=16)
    d.text((72, 148), 'Search people, services, tasks', font=r13, fill=(180,193,215))
    menu = ['Overview', 'Humans', 'Services', 'Orders', 'Profile', 'Billing']
    y = 220
    for item in menu:
        active = item == title
        rr(d, (52, y, 272, y + 52), fill=(255,255,255,18) if active else (255,255,255,0), outline=(255,255,255,20) if active else None, radius=18)
        d.text((72, y + 16), item, font=f16, fill=WHITE if active else (196, 208, 226))
        y += 64
    rr(d, (52, H - 210, 272, H - 56), fill=(255,255,255,12), outline=(255,255,255,20), radius=24)
    d.text((72, H - 184), 'Core loop', font=f12, fill=(191,205,230))
    d.text((72, H - 156), 'Task → AI → Human\n→ Verify → Settle', font=f20, fill=WHITE, spacing=6)
    d.text((72, H - 92), 'The app should look like a real\noperator console, not a demo.', font=r13, fill=(180,193,215), spacing=5)

    header = (324, 32, W - 32, 176)
    draw_shadow(img, header, radius=30)
    rr(d, header, fill=WHITE, outline=LINE, radius=30)
    d.text((360, 60), title.upper(), font=f10, fill=MUTED)
    d.text((360, 84), title, font=f34, fill=NAVY)
    d.text((360, 126), subtitle, font=r15, fill=MUTED)
    pill(d, (W - 270, 68), 'Live demo', fill=SOFT, fg=TEXT, font=f13)
    pill(d, (W - 150, 68), 'Sign in', fill=BLUE, fg=WHITE, font=f13)
    return img, d


def make_humans():
    img, d = screen_base('Humans', 'Find real-world operators for AI fallback.')
    metric_card(img, d, (324, 200, 548, 324), 'operators', '2,341', 'active in the network', '#dbeafe')
    metric_card(img, d, (566, 200, 790, 324), 'verified', '712', 'trust-tier profiles', '#dcfce7')
    metric_card(img, d, (808, 200, 1032, 324), 'avg response', '14m', 'first reply time', '#fef3c7')
    metric_card(img, d, (1050, 200, 1274, 324), 'avg rate', '$38/hr', 'blended marketplace', '#e0f2fe')

    draw_shadow(img, (1292, 200, 1568, 488), radius=26)
    rr(d, (1292, 200, 1568, 488), fill=WHITE, outline=LINE, radius=26)
    d.text((1318, 226), 'Top segments', font=f14, fill=NAVY)
    d.text((1318, 264), 'On-site verification', font=f18, fill=TEXT)
    d.text((1318, 296), 'Photo proof', font=f18, fill=TEXT)
    d.text((1318, 328), 'Captcha / manual checks', font=f18, fill=TEXT)
    d.text((1318, 382), 'The market should feel credible, not noisy.', font=r14, fill=MUTED)

    draw_shadow(img, (324, 348, 1568, 432), radius=24)
    rr(d, (324, 348, 1568, 432), fill=WHITE, outline=LINE, radius=24)
    rr(d, (348, 366, 760, 414), fill=SOFT2, outline=LINE, radius=16)
    d.text((370, 382), 'Search humans, skills, city...', font=r14, fill=MUTED)
    pill(d, (786, 366), 'Location', fill=SOFT)
    pill(d, (910, 366), 'Skill', fill=SOFT)
    pill(d, (1006, 366), 'Verified', fill=SOFT)
    pill(d, (1118, 366), 'Sort: Top rated', fill=SOFT)

    cards = [
        ('Kris Ming', 'Shanghai, China', 50, ['verification', 'research', 'writing'], '4.8'),
        ('Louis Cubero', 'NYC, United States', 40, ['marketing', 'ghostwriting', 'creator ops'], '4.9'),
        ('Mihail', 'Krasnoyarsk, Russia', 30, ['field checks', 'photo proof', 'local recon'], '4.6'),
        ('Andy Pk', 'Graz, Austria', 150, ['recon', 'reports', 'verification'], '4.9'),
        ('Priscila Sorenson', 'Florida, United States', 150, ['llm eval', 'data science', 'research'], '4.9'),
        ('Rahmat Ullah', 'Peshawar, Pakistan', 35, ['pickup', 'meetings', 'delivery'], '4.4'),
    ]
    x0, y0 = 324, 456
    w, h = 396, 310
    gapx, gapy = 18, 18
    for idx, c in enumerate(cards):
        col = idx % 3
        row = idx // 3
        x = x0 + col * (w + gapx)
        y = y0 + row * (h + gapy)
        operator_card(img, d, (x, y, x + w, y + h), *c)
    img.save(OUT / 'app-humans.png')


def make_services():
    img, d = screen_base('Services', 'Book structured human execution packages.')
    metric_card(img, d, (324, 200, 610, 324), 'services', '986', 'priced and ready to book', '#dbeafe')
    metric_card(img, d, (628, 200, 914, 324), 'verified supply', '421', 'trusted providers', '#dcfce7')
    metric_card(img, d, (932, 200, 1218, 324), 'average price', '$52', 'fixed and hourly mixed', '#fef3c7')
    metric_card(img, d, (1236, 200, 1568, 324), 'best for', 'Repeatable tasks', 'standardized handoffs', '#e0f2fe')

    draw_shadow(img, (324, 348, 1568, 432), radius=24)
    rr(d, (324, 348, 1568, 432), fill=WHITE, outline=LINE, radius=24)
    cats = ['Verification', 'Research', 'Delivery', 'Events', 'Tech', 'Other']
    x = 348
    for c in cats:
        x, _ = pill(d, (x, 366), c, fill='#eef6ff' if c == 'Verification' else SOFT2, fg=BLUE if c == 'Verification' else TEXT, outline='#dbeafe' if c == 'Verification' else LINE, font=f13)
        x += 10

    services = [
        ('On-site inventory check', 'Kris Ming · Shanghai', '$60 fixed', 'Photo + timestamp within 45 min', ['photo proof', 'retail', 'field ops']),
        ('Local recon walkthrough', 'Andy Pk · Graz', '$140 fixed', 'In-person verification with notes', ['recon', 'premium', 'report']),
        ('Grant and business research', 'HumanAIOS · Florida', '$75/hr', 'Structured research with citations', ['research', 'ops', 'analysis']),
        ('Courier pickup and handoff', 'Rahmat Ullah · Peshawar', '$35/hr', 'Pickup, meeting, and proof of handoff', ['pickup', 'delivery', 'local']),
        ('Community moderation shift', 'Patricia Tani · SF', '$28/hr', 'Human presence for discord or social channels', ['community', 'ops', 'coverage']),
        ('Legal workflow architecture', 'Jimmy Harris · Minneapolis', '$150/hr', 'High-trust advisory for regulated flows', ['legal', 'architecture', 'review']),
    ]
    x0, y0 = 324, 456
    w, h = 396, 262
    gapx, gapy = 18, 18
    for idx, s in enumerate(services):
        col = idx % 3
        row = idx // 3
        x = x0 + col * (w + gapx)
        y = y0 + row * (h + gapy)
        service_card(img, d, (x, y, x + w, y + h), *s)
    img.save(OUT / 'app-services.png')


def make_orders():
    img, d = screen_base('Orders', 'Track task → human accept → delivery → verify → settle.')
    metric_card(img, d, (324, 200, 548, 324), 'open', '21', 'awaiting acceptance', '#dbeafe')
    metric_card(img, d, (566, 200, 790, 324), 'claimed', '8', 'human assigned', '#e0f2fe')
    metric_card(img, d, (808, 200, 1032, 324), 'verify', '4', 'waiting approval', '#fef3c7')
    metric_card(img, d, (1050, 200, 1274, 324), 'paid today', '13', 'settled successfully', '#dcfce7')
    metric_card(img, d, (1292, 200, 1568, 324), 'fail rate', '2.1%', 'kept visible by default', '#fee2e2')

    # Quick create
    draw_shadow(img, (324, 348, 860, 648), radius=26)
    rr(d, (324, 348, 860, 648), fill=WHITE, outline=LINE, radius=26)
    d.text((350, 372), 'Quick create task', font=f20, fill=NAVY)
    d.text((350, 402), 'One compact form. Agents should not need a configuration dungeon.', font=r14, fill=MUTED)
    labels = [('Service', 'On-site inventory check'), ('Location', 'Shanghai'), ('Deadline', '4h'), ('Budget', '$120'), ('Proof', 'photo, timestamp')]
    yy = 448
    for lbl, val in labels:
        d.text((350, yy), lbl.upper(), font=f10, fill=MUTED)
        rr(d, (350, yy + 18, 834, yy + 64), fill=SOFT2, outline=LINE, radius=14)
        d.text((366, yy + 34), val, font=r14, fill=TEXT)
        yy += 86 if lbl == 'Location' else 78
        if lbl == 'Service':
            yy = 448 + 78
        elif lbl == 'Location':
            yy = 526
        elif lbl == 'Deadline':
            yy = 604
            break
    pill(d, (350, 588), 'Post task', fill=BLUE, fg=WHITE, font=f13)

    # Pipeline board
    draw_shadow(img, (880, 348, 1568, 1000), radius=26)
    rr(d, (880, 348, 1568, 1000), fill=WHITE, outline=LINE, radius=26)
    d.text((906, 372), 'Pipeline', font=f20, fill=NAVY)
    stages = ['Posted', 'Claimed', 'Delivered', 'Verify', 'Paid']
    col_w = 120
    start_x = 906
    for i, st in enumerate(stages):
        x = start_x + i * 132
        d.text((x, 408), st, font=f14, fill=MUTED)
        rr(d, (x, 438, x + col_w, 972), fill=SOFT2, outline=LINE, radius=20)
    queue_card(img, d, (918, 458, 1014, 610), 'Alibaba scan', 'Shanghai · 4h', 'Posted', '$120', 'Assign')
    queue_card(img, d, (1050, 458, 1146, 610), 'Store visit', 'Kris Ming', 'Claimed', '$90', 'Open')
    queue_card(img, d, (1182, 458, 1278, 610), 'Photo upload', '2 proofs added', 'Delivered', '$60', 'Review')
    queue_card(img, d, (1314, 458, 1410, 610), 'Manual check', 'Agent callback ok', 'Verify', '$60', 'Verify')
    queue_card(img, d, (1446, 458, 1542, 610), 'Receipt logged', 'x402 mocked', 'Paid', '$60', 'View')

    # Activity drawer-ish bottom left
    draw_shadow(img, (324, 670, 860, 1000), radius=26)
    rr(d, (324, 670, 860, 1000), fill=WHITE, outline=LINE, radius=26)
    d.text((350, 694), 'Selected order', font=f20, fill=NAVY)
    d.text((350, 724), 'Order #FAL-2048 · Human assigned · Waiting verify', font=r14, fill=MUTED)
    items = [
        ('Agent', 'Demo Agent'),
        ('Human', 'Kris Ming'),
        ('Evidence', '2 images · timestamp · receipt'),
        ('Callback', 'Delivered to agent endpoint'),
        ('Settlement', 'Ready after verify')
    ]
    y = 770
    for k, v in items:
        d.text((350, y), k.upper(), font=f10, fill=MUTED)
        d.text((350, y + 18), v, font=r15, fill=TEXT)
        y += 52
    pill(d, (350, 936), 'Verify', fill='#fef3c7', fg='#92400e', font=f13)
    pill(d, (446, 936), 'Reject', fill='#fee2e2', fg=RED, font=f13)
    pill(d, (540, 936), 'Settle', fill=BLUE, fg=WHITE, font=f13)

    img.save(OUT / 'app-orders.png')


def make_profile():
    img, d = screen_base('Profile', 'Build your public operator identity.')
    metric_card(img, d, (324, 200, 548, 324), 'services', '12', 'published to market', '#dbeafe')
    metric_card(img, d, (566, 200, 790, 324), 'completion', '97%', 'rolling 30-day average', '#dcfce7')
    metric_card(img, d, (808, 200, 1032, 324), 'earnings', '$4,820', 'settled this month', '#fef3c7')
    metric_card(img, d, (1050, 200, 1274, 324), 'trust tier', 'Verified', 'priority routing enabled', '#e0f2fe')
    metric_card(img, d, (1292, 200, 1568, 324), 'wallet', 'Connected', 'Privy + embedded wallet', '#f3e8ff')

    draw_shadow(img, (324, 348, 660, 1000), radius=28)
    rr(d, (324, 348, 660, 1000), fill=WHITE, outline=LINE, radius=28)
    rr(d, (356, 382, 484, 510), fill='#dbeafe', radius=30)
    d.text((396, 424), 'KM', font=f34, fill=BLUE)
    d.text((356, 542), 'Kris Ming', font=f24, fill=NAVY)
    d.text((356, 574), '@krisming · Shanghai, China', font=r14, fill=MUTED)
    pill(d, (356, 610), 'Verified operator', fill='#ecfdf5', fg=GREEN, font=f12)
    d.text((356, 668), 'Identity', font=f16, fill=TEXT)
    d.text((356, 700), 'Photo proof, research, writing,\nlocal verification, quick response.', font=r15, fill=MUTED, spacing=6)
    d.text((356, 794), 'Availability', font=f16, fill=TEXT)
    d.text((356, 826), 'Mon - Sun · 09:00 - 17:00 UTC+8', font=r15, fill=MUTED)
    d.text((356, 896), 'Payout method', font=f16, fill=TEXT)
    d.text((356, 928), 'x402 / wallet settlement ready', font=r15, fill=MUTED)

    draw_shadow(img, (686, 348, 1568, 1000), radius=28)
    rr(d, (686, 348, 1568, 1000), fill=WHITE, outline=LINE, radius=28)
    x = 714
    for label, active in [('Public profile', True), ('Services', False), ('Payout', False)]:
        x2, _ = pill(d, (x, 374), label, fill='#eef6ff' if active else SOFT2, fg=BLUE if active else TEXT, outline='#dbeafe' if active else LINE, font=f13)
        x = x2 + 10
    d.text((714, 430), 'Public profile', font=f20, fill=NAVY)
    d.text((714, 460), 'This is what agents and buyers will see in the market.', font=r14, fill=MUTED)
    fields = [
        ('Name', 'Kris Ming'),
        ('Headline', 'On-site proof and rapid local execution'),
        ('City', 'Shanghai'),
        ('Country', 'China'),
        ('Languages', 'English, Chinese'),
        ('Skills', 'verification, writing, research, field checks')
    ]
    yy = 520
    for i, (lbl, val) in enumerate(fields):
        col = i % 2
        row = i // 2
        x1 = 714 + col * 418
        y1 = 520 + row * 114
        d.text((x1, y1), lbl.upper(), font=f10, fill=MUTED)
        rr(d, (x1, y1 + 18, x1 + 388, y1 + 72), fill=SOFT2, outline=LINE, radius=16)
        d.text((x1 + 16, y1 + 38), val, font=r14, fill=TEXT)
    d.text((714, 884), 'Bio', font=f10, fill=MUTED)
    rr(d, (714, 902, 1504, 968), fill=SOFT2, outline=LINE, radius=16)
    d.text((730, 922), 'I help agents close the real-world gap with fast on-site checks, photos, timestamps,\nand concise reporting. Best for verification tasks and lightweight field ops.', font=r14, fill=TEXT, spacing=6)
    img.save(OUT / 'app-profile.png')


def make_sheet():
    sheet = Image.new('RGBA', (2000, 1500), '#eef3f9')
    d = ImageDraw.Draw(sheet)
    d.text((72, 50), 'ai2human app redesign directions', font=f34, fill=NAVY)
    d.text((72, 96), 'High-fidelity mockups. New direction: modern light SaaS, operator-console first.', font=r16, fill=MUTED)
    names = ['app-humans.png', 'app-services.png', 'app-orders.png', 'app-profile.png']
    positions = [(72, 160), (1028, 160), (72, 824), (1028, 824)]
    labels = ['Humans marketplace', 'Services board', 'Orders dispatch console', 'Profile studio']
    for name, pos, label in zip(names, positions, labels):
        im = Image.open(OUT / name).convert('RGBA')
        im = im.resize((900, 608))
        draw_shadow(sheet, (pos[0], pos[1], pos[0] + 900, pos[1] + 608), radius=24, offset=(0, 10), shadow=(15, 23, 42, 24))
        sheet.alpha_composite(im, pos)
        d.text((pos[0], pos[1] - 34), label, font=f20, fill=NAVY)
    sheet.save(OUT / 'app-mockups-sheet.png')


make_humans()
make_services()
make_orders()
make_profile()
make_sheet()
print('done')
