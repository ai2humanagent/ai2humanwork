const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const src = path.join(process.cwd(), 'public', 'brand', 'ai2human-dual-arrow.svg');
const outDir = path.join(process.cwd(), 'public', 'brand');
const sizes = [32, 64, 180];

if (!fs.existsSync(src)) {
  console.error('Source SVG not found:', src);
  process.exit(1);
}

const svg = fs.readFileSync(src, 'utf8');

for (const size of sizes) {
  const outPath = path.join(outDir, `ai2human-dual-arrow-${size}.png`);
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'transparent'
  });
  const png = resvg.render();
  fs.writeFileSync(outPath, png.asPng());
  console.log('wrote', outPath);
}
