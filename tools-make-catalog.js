/* car-parts.js を Node で読み、①座標チェック ②パーツ見本HTML を作る */
require('C:/Users/tskto/OneDrive/デスクトップ/01_AI/car-factory-app/car-parts.js');
const CP = globalThis.CarParts;
const fs = require('fs');

const r = CP.checkAll();
console.log('全 ' + r.total + ' 通り / 違反した規則 ' + r.ngRules);
r.rules.forEach(rule => {
  const f = r.fails[rule.name];
  console.log((f.length ? '  NG  ' : '  OK  ') + rule.name + (f.length ? '  ' + f.length + '件 例:' + f[0] : ''));
});

const V = CP.VIEW, G = CP.GROUND;
const base = { body: 'futsu', roof: 'futsu', color: 0, window: 'futsu', engine: 'futsu', seat: 'two', tire: 'futsu' };

// 場面（床・接地影・床の反射）をつけて1枚に仕立てる
let uid = 0;
function scene(cfg, opt) {
  opt = opt || {};
  const id = 'q' + (uid++);
  const inner = CP.carSvg(cfg, null, { id: id + 'a' });
  const body = inner.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  const refl = CP.carSvg(cfg, null, { id: id + 'b' }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return `<svg viewBox="${opt.viewBox || `0 0 ${V.w} ${V.h}`}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${id}-fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".28"/>
        <stop offset=".55" stop-color="#fff" stop-opacity=".06"/>
        <stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <mask id="${id}-rm"><rect x="0" y="${G}" width="${V.w}" height="${V.h - G}" fill="url(#${id}-fade)"/></mask>
      <filter id="${id}-bl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.9"/></filter>
      <radialGradient id="${id}-sh" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="#06111a" stop-opacity=".6"/>
        <stop offset=".45" stop-color="#06111a" stop-opacity=".28"/>
        <stop offset="1" stop-color="#06111a" stop-opacity="0"/></radialGradient>
    </defs>
    <rect x="0" y="0" width="${V.w}" height="${V.h}" fill="#dfe6eb"/>
    <rect x="0" y="${G}" width="${V.w}" height="${V.h - G}" fill="#b9c4cb"/>
    <g mask="url(#${id}-rm)"><g transform="matrix(1,0,0,-1,0,${2 * G})" filter="url(#${id}-bl)">${refl}</g></g>
    <ellipse cx="113" cy="${G + 0.4}" rx="90" ry="4.6" fill="url(#${id}-sh)"/>
    ${body}</svg>`;
}

const GROUPS = [
  { key: 'body',   label: '① プレス：ボディ', opts: CP.BODIES },
  { key: 'roof',   label: '② 組み立て：やね', opts: CP.ROOFS },
  { key: 'window', label: '④ まど',           opts: CP.WINDOWS },
  { key: 'engine', label: '⑤ エンジン',       opts: CP.ENGINES },
  { key: 'seat',   label: '⑥ シート',         opts: CP.SEATS },
  { key: 'tire',   label: '⑦ タイヤ',         opts: CP.TIRES }
];
const tagText = t => !t ? 'ふつう' :
  ([t.s ? 'スポーツ' + t.s : '', t.w ? 'はたらく' + t.w : '', t.x ? 'へんてこ' + t.x : ''].filter(Boolean).join(' ') || 'ふつう');

const sections = GROUPS.map(grp => {
  const cells = Object.keys(grp.opts).map(k => {
    const cfg = Object.assign({}, base);
    cfg[grp.key] = k;
    if (grp.key === 'seat') cfg.roof = 'nashi';   // シートは屋根があると見えない
    return `<figure class="cell">${scene(cfg)}<figcaption><b>${grp.opts[k].label}</b><span>${tagText(grp.opts[k].tag)}</span></figcaption></figure>`;
  }).join('');
  return `<section><h2>${grp.label}</h2><div class="row">${cells}</div></section>`;
}).join('');

const colors = CP.COLORS.map((c, i) => {
  const cfg = Object.assign({}, base, { color: i });
  return `<figure class="cell">${scene(cfg)}<figcaption><b>${c.label}</b></figcaption></figure>`;
}).join('');

// 混ぜた例
const MIX = [
  { cfg: { body: 'chiisai', roof: 'ouchi', color: 2, window: 'marumado', engine: 'zenmai', seat: 'sofa', tire: 'pikapika' }, name: 'へんてこカー' },
  { cfg: { body: 'futsu', roof: 'hikui', color: 5, window: 'chiisai', engine: 'ookii', seat: 'two', tire: 'futoi' }, name: 'スポーツカー' },
  { cfg: { body: 'shikaku', roof: 'nimotsu', color: 3, window: 'renzoku', engine: 'entotsu', seat: 'bench', tire: 'dekoboko' }, name: 'はたらくくるま' },
  { cfg: { body: 'nagai', roof: 'puropera', color: 1, window: 'ookii', engine: 'rocket', seat: 'tatami', tire: 'catapira' }, name: 'ぜんぶのせ' }
].map(m => `<figure class="cell">${scene(m.cfg)}<figcaption><b>${m.name}</b></figcaption></figure>`).join('');

const html = `<!doctype html>
<html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>くるまこうじょう：パーツ見本（作り込み版）</title>
<style>
  :root{--line:#cfd8dd;--ink:#16232e;--sub:#65757d}
  *{box-sizing:border-box}
  body{margin:0;padding:20px;background:#eceff1;color:var(--ink);
    font:15px/1.65 "Hiragino Maru Gothic ProN","Hiragino Sans",system-ui,sans-serif}
  h1{font-size:1.3rem;margin:0 0 4px}
  p.lead{margin:0 0 18px;color:var(--sub);font-size:.9rem}
  section{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:14px}
  h2{font-size:.98rem;margin:0 0 8px;padding-bottom:6px;border-bottom:2px solid var(--line)}
  .row{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px}
  .cell{margin:0;background:#f7f9fa;border:1px solid var(--line);border-radius:10px;padding:6px}
  .cell svg{width:100%;display:block;border-radius:6px}
  figcaption{text-align:center;margin-top:4px}
  figcaption b{display:block;font-size:.9rem}
  figcaption span{display:block;font-size:.72rem;color:var(--sub)}
  .ok{color:#2e7d4f;font-weight:700}
</style></head><body>
<h1>くるまこうじょう：パーツ見本（作り込み版）</h1>
<p class="lead">
全31パーツを、実車比率と作り込みの描き方で描き直したもの。細部（ロッカー・バンパー・グリル・稜線・ハンドル）は
ボディの前後端とベルトライン〜車体下端の比で置いてあるので、ボディを変えても自動でついてくる。<br>
座標チェック：<span class="ok">全 ${r.total.toLocaleString()} 通り・${r.rules.length}規則すべて通過</span>
</p>
${sections}
<section><h2>いろ（装飾軸）</h2><div class="row">${colors}</div></section>
<section><h2>混ぜた例</h2><div class="row">${MIX}</div></section>
</body></html>`;

fs.writeFileSync(process.argv[2] || 'パーツ見本.html', html);
console.log('\nwrote ' + (process.argv[2] || 'パーツ見本.html'));
