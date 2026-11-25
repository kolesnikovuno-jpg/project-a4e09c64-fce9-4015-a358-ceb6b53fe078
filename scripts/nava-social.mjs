// Build-time HTML shells for every Nava URL, identical for browsers and crawlers.
// Preserve the built SPA scripts, styles, analytics and root; only replace head metadata.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const dist = path.resolve('dist');
const dir = path.join(dist, 'og');
fs.mkdirSync(dir, { recursive: true });
const { origin, image, copy } = JSON.parse(fs.readFileSync('src/lib/nava-social.json', 'utf8'));
const imageName = path.basename(image);
const imageUrl = origin + image;
const src = PNG.sync.read(fs.readFileSync('src/assets/nava-hero.png'));
const width = 1200, height = 630;
const out = new PNG({ width, height });
// Fit the complete current hero image without cropping the chair. Sample the
// edge colour for the narrow matte; bilinear sampling avoids hard pixel edges.
const scale = Math.min(width / src.width, height / src.height);
const w = Math.round(src.width * scale), h = Math.round(src.height * scale);
const ox = Math.floor((width - w) / 2), oy = Math.floor((height - h) / 2);
const edge = [0, 0, 0];
let count = 0;
for (let y = 0; y < src.height; y += Math.max(1, Math.floor(src.height / 100))) {
  for (const x of [0, src.width - 1]) {
    const p = (y * src.width + x) * 4;
    for (let c = 0; c < 3; c++) edge[c] += src.data[p+c] * src.data[p+3]/255 + 240*(1-src.data[p+3]/255);
    count++;
  }
}
const matte = edge.map(n => Math.round(n / count));
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const p = (y * width + x) * 4;
  out.data[p+3] = 255;
  if (x < ox || x >= ox+w || y < oy || y >= oy+h) {
    for (let c = 0; c < 3; c++) out.data[p+c] = matte[c];
    continue;
  }
  const sx = Math.max(0, Math.min(src.width-1, (x-ox+0.5)*src.width/w-0.5));
  const sy = Math.max(0, Math.min(src.height-1, (y-oy+0.5)*src.height/h-0.5));
  const x0 = Math.floor(sx), y0 = Math.floor(sy), x1 = Math.min(x0+1,src.width-1), y1 = Math.min(y0+1,src.height-1);
  const dx = sx-x0, dy = sy-y0;
  const sample = c => (src.data[(y0*src.width+x0)*4+c]*(1-dx)+src.data[(y0*src.width+x1)*4+c]*dx)*(1-dy)+(src.data[(y1*src.width+x0)*4+c]*(1-dx)+src.data[(y1*src.width+x1)*4+c]*dx)*dy;
  const alpha = sample(3)/255;
  for (let c = 0; c < 3; c++) out.data[p+c] = Math.round(sample(c)*alpha+matte[c]*(1-alpha));
}
const bytes = PNG.sync.write(out, {colorType: 2});
fs.writeFileSync(path.join(dir, imageName), bytes);
if (bytes.readUInt32BE(16) !== width || bytes.readUInt32BE(20) !== height) throw new Error('Invalid Nava social image dimensions');
const escape = s => s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const meta = (attribute, key, value) => '<meta '+attribute+'="'+key+'" content="'+escape(String(value))+'">';
const base = fs.readFileSync(path.join(dist,'index.html'),'utf8');
function shell(lang, canonical) {
  const m = copy[lang];
  const tags = [
    '<title>'+escape(m.title)+'</title>', meta('name','description',m.description),
    '<link rel="canonical" href="'+canonical+'">',
    ...Object.entries({'og:type':'website','og:site_name':'Kolesnikov Studio','og:title':m.title,'og:description':m.description,'og:url':canonical,'og:locale':m.locale,'og:image':imageUrl,'og:image:secure_url':imageUrl,'og:image:type':'image/png','og:image:width':width,'og:image:height':height,'og:image:alt':m.alt}).map(([k,v])=>meta('property',k,v)),
    ...Object.entries(copy).filter(([l])=>l!==lang).map(([,v])=>meta('property','og:locale:alternate',v.locale)),
    ...Object.entries({'twitter:card':'summary_large_image','twitter:title':m.title,'twitter:description':m.description,'twitter:image':imageUrl,'twitter:image:alt':m.alt}).map(([k,v])=>meta('name',k,v)),
    ...Object.keys(copy).map(l=>'<link rel="alternate" hreflang="'+l+'" href="'+origin+'/'+l+'">'),
    '<link rel="alternate" hreflang="x-default" href="'+origin+'/">'
  ];
  const html = base.replace(/<html\b[^>]*>/i,'<html lang="'+lang+'">')
    .replace(/<title>[\s\S]*?<\/title>/gi,'')
    .replace(/<meta\s+(?:name=["'](?:description|twitter:[^"']+)["']|property=["']og:[^"']+["'])[^>]*>\s*/gi,'')
    .replace(/<link\s+rel=["'](?:canonical|alternate)["'][^>]*>\s*/gi,'')
    .replace(/<\/head>/i,'    '+tags.join('\n    ')+'\n  </head>');
  if ((html.match(/property="og:title"/g)||[]).length!==1 || !html.includes(imageUrl) || !html.includes('/assets/')) throw new Error('Invalid Nava SPA shell');
  return html;
}
function write(name,lang,canonical) {
  fs.writeFileSync(path.join(dir,name+'.html'),shell(lang,canonical));
}
write('nava-root','en',origin+'/');
for (const lang of Object.keys(copy)) write('nava-'+lang,lang,origin+'/'+lang);
console.log('Nava social preview: '+src.width+'x'+src.height+' → '+width+'x'+height+'; '+bytes.length+' bytes.');
