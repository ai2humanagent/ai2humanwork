const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const srcDir = path.join(process.cwd(), 'public', 'brand');
const names = [
  'ai2human-mark',
  'ai2human-mark-dark',
  'ai2human-badge',
  'ai2human-wordmark',
  'ai2human-handshake',
  'ai2human-handshake-dark',
  'ai2human-handshake-mech',
  'ai2human-handshake-mech-dark'
];
const sizes = [256, 512, 1024];

for (const name of names) {
  const svgPath = path.join(srcDir, `${name}.svg`);
  if (!fs.existsSync(svgPath)) continue;
  const svg = fs.readFileSync(svgPath, 'utf8');
  for (const size of sizes) {
    if (name === 'ai2human-wordmark' && size !== 1024) continue;
    const outPath = path.join(srcDir, `${name}-${size}.png`);
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: size },
      background: 'transparent'
    });
    const png = resvg.render();
    fs.writeFileSync(outPath, png.asPng());
    console.log('wrote', outPath);
  }
}
