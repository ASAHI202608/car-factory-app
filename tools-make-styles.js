/* ============================================================
   「ふつう」ボディの絵づくり 5案

   いまの絵は単色の四角＋台形で、前作『のりものづくり』より作り込みが後退していた。
   前作でやっていた「陰影・ハイライト・接地影・細部の描き込み」を取り戻す。

   シルエットそのものも作り直す。四角に台形を載せた形では、どれだけ陰影を足しても
   車に見えない。ボンネットの傾き・フロントガラスの寝かせ・トランクの段差・
   ホイールアーチ — 車らしさはこの4つの線で決まる。
   ============================================================ */
const fs = require('fs');

// ---- 座標（既存の viewBox 0 0 220 112、地面 y=96 を踏襲）----
const V = { w: 220, h: 112 };
const GROUND = 96;
const AX_R = 72, AX_F = 160, AX_Y = 85, TR = 11;   // 車軸と タイヤ半径

// 車体のシルエット。ボンネットの傾き／ガラスの寝かせ／トランクの段差を持たせる。
const BODY = 'M38 80 L38 69 Q38 61 47 60 L82 58 L97 36 Q99 33 104 33 ' +
             'L132 33 Q137 33 139 36 L156 57 L181 58 Q191 59 192 70 L192 80 Z';
const BELT = 55;   // 窓の下端（ベルトライン）

// ---- 色 ----
function hex(c) { return { r: parseInt(c.slice(1, 3), 16), g: parseInt(c.slice(3, 5), 16), b: parseInt(c.slice(5, 7), 16) }; }
function toHex(o) { return '#' + [o.r, o.g, o.b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function mix(c, t, amt) { const a = hex(c), b = hex(t); return toHex({ r: a.r + (b.r - a.r) * amt, g: a.g + (b.g - a.g) * amt, b: a.b + (b.b - a.b) * amt }); }
const lighten = (c, a) => mix(c, '#ffffff', a);
const darken = (c, a) => mix(c, '#1b262c', a);

// ---- 部品 ----
function glass(id, style) {
  const f = style.glassFill || `url(#${id}-glass)`;
  const line = style.outline ? ` stroke="${style.outline.color}" stroke-width="${style.outline.width * 0.7}"` : '';
  return `<path d="M92 ${BELT} L101 39 L116 39 L116 ${BELT} Z" fill="${f}"${line}/>` +
         `<path d="M121 ${BELT} L133 39 L150 ${BELT} Z" fill="${f}"${line}/>`;
}

function wheel(cx, id, style, color) {
  const rimOuter = style.wheel === 'toy' ? 6.6 : 6.0;
  const tyre = style.wheel === 'realistic' ? `url(#${id}-tyre)` : '#2a353b';
  let s = '';
  // ホイールアーチ（上半分だけ描く。下半分はタイヤに隠れるので不要）
  s += `<path d="M${cx - 14} ${AX_Y} A14 14 0 0 1 ${cx + 14} ${AX_Y}" fill="${darken(color, 0.55)}"/>`;
  s += `<circle cx="${cx}" cy="${AX_Y}" r="${TR}" fill="${tyre}"/>`;
  if (style.wheel !== 'flat') {
    s += `<circle cx="${cx}" cy="${AX_Y}" r="${TR - 1.6}" fill="none" stroke="${style.wheel === 'toy' ? '#0f171c' : '#151d22'}" stroke-width="1"/>`;
  }
  // ホイール（リム）
  s += `<circle cx="${cx}" cy="${AX_Y}" r="${rimOuter}" fill="${style.wheel === 'flat' ? '#cdd8dd' : `url(#${id}-rim)`}"/>`;
  // フラット案でも、のっぺりした円1枚だと未完成に見えるので2色にする
  if (style.wheel === 'flat') s += `<circle cx="${cx}" cy="${AX_Y}" r="${rimOuter - 2.4}" fill="#8b9aa1"/>`;
  if (style.wheel !== 'flat') {
    // スポーク5本
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      s += `<rect x="${cx - 0.9}" y="${AX_Y - rimOuter + 0.8}" width="1.8" height="${rimOuter - 1.6}" rx="0.9" ` +
           `fill="#8c9aa2" transform="rotate(${(a * 180 / Math.PI + 90).toFixed(1)} ${cx} ${AX_Y})"/>`;
    }
    s += `<circle cx="${cx}" cy="${AX_Y}" r="1.8" fill="#dfe8ec"/>`;
  }
  if (style.wheel === 'toy') {
    s += `<path d="M${cx - 7} ${AX_Y - 5} a8 8 0 0 1 5 -3" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity=".8"/>`;
  }
  return s;
}

function details(id, style, color) {
  const ln = style.detailLine;
  let s = '';
  // ロッカーパネル（裾の陰）
  s += `<path d="M50 76 L180 76 L180 80 L50 80 Z" fill="${darken(color, 0.4)}" opacity="${style.rocker}"/>`;
  // バンパー
  s += `<path d="M176 71 Q192 71 192 78 L192 80 L176 80 Z" fill="${darken(color, 0.3)}"/>`;
  s += `<path d="M38 71 L52 71 L52 80 L38 80 Z" fill="${darken(color, 0.3)}"/>`;
  // ドアの切れ目とハンドル
  s += `<path d="M118 ${BELT} L118 77" stroke="${ln}" stroke-width="1" fill="none" opacity=".55"/>`;
  s += `<path d="M92 ${BELT} L92 77" stroke="${ln}" stroke-width="1" fill="none" opacity=".35"/>`;
  s += `<rect x="105" y="60" width="9" height="2.6" rx="1.3" fill="${darken(color, 0.35)}"/>`;
  s += `<rect x="128" y="60" width="9" height="2.6" rx="1.3" fill="${darken(color, 0.35)}"/>`;
  // サイドミラー
  s += `<path d="M152 54 l7 -1.5 l1 3 l-7 1.5 z" fill="${darken(color, 0.25)}"/>`;
  // ライト
  s += `<path d="M182 62 Q190 62 190 67 L182 67 Z" fill="url(#${id}-head)"/>`;
  s += `<rect x="38.5" y="62" width="6" height="5" rx="1.6" fill="#c9412d"/>`;
  // 給油口
  s += `<circle cx="55" cy="64" r="1.8" fill="${darken(color, 0.28)}"/>`;
  return s;
}

// ---- 案ごとの描き分け ----
function render(style, color) {
  const id = style.id;
  let defs = '';

  // 車体の陰影
  if (style.shading === 'gradient') {
    defs += `<linearGradient id="${id}-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${lighten(color, 0.34)}"/>
      <stop offset=".42" stop-color="${lighten(color, 0.06)}"/>
      <stop offset=".72" stop-color="${color}"/>
      <stop offset="1" stop-color="${darken(color, 0.34)}"/></linearGradient>`;
  } else if (style.shading === 'cel') {
    defs += `<linearGradient id="${id}-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${lighten(color, 0.22)}"/><stop offset=".44" stop-color="${lighten(color, 0.22)}"/>
      <stop offset=".44" stop-color="${color}"/><stop offset=".8" stop-color="${color}"/>
      <stop offset=".8" stop-color="${darken(color, 0.3)}"/></linearGradient>`;
  } else if (style.shading === 'soft') {
    defs += `<linearGradient id="${id}-body" x1="0" y1="0" x2="0.15" y2="1">
      <stop offset="0" stop-color="${lighten(color, 0.2)}"/>
      <stop offset=".65" stop-color="${color}"/>
      <stop offset="1" stop-color="${darken(color, 0.2)}"/></linearGradient>`;
  } else {
    defs += `<linearGradient id="${id}-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${lighten(color, 0.10)}"/><stop offset="1" stop-color="${darken(color, 0.10)}"/></linearGradient>`;
  }

  defs += `<linearGradient id="${id}-glass" x1="0" y1="0" x2="0.4" y2="1">
    <stop offset="0" stop-color="#eaf6fb"/><stop offset=".5" stop-color="#b9d9e8"/><stop offset="1" stop-color="#8fb6c9"/></linearGradient>`;
  defs += `<radialGradient id="${id}-rim" cx="0.36" cy="0.32" r="0.8">
    <stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#cbd7dd"/><stop offset="1" stop-color="#8c9aa2"/></radialGradient>`;
  defs += `<radialGradient id="${id}-tyre" cx="0.35" cy="0.3" r="0.85">
    <stop offset="0" stop-color="#4a575e"/><stop offset="1" stop-color="#1d262b"/></radialGradient>`;
  defs += `<radialGradient id="${id}-head" cx="0.3" cy="0.3" r="0.9">
    <stop offset="0" stop-color="#fffdf0"/><stop offset="1" stop-color="#f0c martial"/></radialGradient>`.replace('#f0c martial', '#f0c85a');
  defs += `<radialGradient id="${id}-shadow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#16232e" stop-opacity=".42"/><stop offset="1" stop-color="#16232e" stop-opacity="0"/></radialGradient>`;

  const ol = style.outline ? ` stroke="${style.outline.color}" stroke-width="${style.outline.width}" stroke-linejoin="round"` : '';

  let s = `<svg viewBox="0 0 ${V.w} ${V.h}" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>`;
  s += `<rect x="0" y="${GROUND}" width="${V.w}" height="${V.h - GROUND}" fill="#dde5e9"/>`;
  // 接地影（前作でも効いていた。これが無いと車が浮いて見える）
  s += `<ellipse cx="115" cy="${GROUND - 1}" rx="82" ry="6" fill="url(#${id}-shadow)"/>`;
  s += `<path d="${BODY}" fill="url(#${id}-body)"${ol}/>`;
  s += glass(id, style);
  s += details(id, style, color);

  // 面のハイライト。
  // 輪郭を一周させると白い帯（ラインステッカー）に見えてしまったので、
  // 「光が当たる水平な面」だけに短く分けて置く。
  if (style.gloss > 0) {
    s += `<path d="M104 35.4 L132 35.4" fill="none" stroke="#ffffff" stroke-width="${style.glossW}" stroke-linecap="round" opacity="${style.gloss}"/>`;
    s += `<path d="M159 58.4 L178 59.2" fill="none" stroke="#ffffff" stroke-width="${style.glossW * 0.75}" stroke-linecap="round" opacity="${style.gloss * 0.8}"/>`;
    s += `<path d="M51 60.2 L80 58.6" fill="none" stroke="#ffffff" stroke-width="${style.glossW * 0.75}" stroke-linecap="round" opacity="${style.gloss * 0.8}"/>`;
    // ドア面を横に走る反射。面の広がりが出る。
    s += `<path d="M58 67 L174 67.5" fill="none" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" opacity="${style.gloss * 0.4}"/>`;
  }
  if (style.reflection) {
    // 空の映り込み。ドア面の上半分にうっすら
    s += `<path d="M52 60 L180 61 L180 66 L52 65 Z" fill="#dff1fb" opacity=".16"/>`;
  }
  s += wheel(AX_R, id, style, color) + wheel(AX_F, id, style, color);
  s += `</svg>`;
  return s;
}

// ---- 5案 ----
const STYLES = [
  { id: 'a', name: '案1　ミニカー（トミカ風）',
    note: 'おもちゃの実物感。厚みのある造形、強いハイライト、金属的なホイール。「工場で作った製品」という設定と相性がよい。',
    shading: 'gradient', outline: null, gloss: 0.55, glossW: 2.6, wheel: 'toy', rocker: 0.85, reflection: false, detailLine: '#1b262c' },
  { id: 'b', name: '案2　絵本タッチ',
    note: '太めの茶系の輪郭線とやわらかい陰影。手描きの絵本のような温かさ。線があるぶん小さくしても形が読める。',
    shading: 'soft', outline: { color: '#5b4034', width: 2.2 }, gloss: 0.3, glossW: 2.2, wheel: 'flat', rocker: 0.5, reflection: false, detailLine: '#5b4034' },
  { id: 'c', name: '案3　アニメ調（セルシェード）',
    note: '陰影を2段にはっきり切り分け、細い輪郭線を添える。アニメの絵に近い。動かしたときに形が崩れにくい。',
    shading: 'cel', outline: { color: '#243038', width: 1.4 }, gloss: 0.5, glossW: 2.0, wheel: 'realistic', rocker: 0.7, reflection: false, detailLine: '#243038' },
  { id: 'd', name: '案4　写実寄り',
    note: '輪郭線なし。多段のグラデーション、空の映り込み、丁寧な接地影。いちばん本物の車に近い。',
    shading: 'gradient', outline: null, gloss: 0.42, glossW: 1.8, wheel: 'realistic', rocker: 1, reflection: true, detailLine: '#16232e' },
  { id: 'e', name: '案5　フラット＋陰影（現状の延長）',
    note: 'いまのフラットな絵の方向は変えず、陰影・接地影・細部だけを足した中間案。変更量がいちばん小さい。',
    shading: 'flat', outline: null, gloss: 0.28, glossW: 2.2, wheel: 'flat', rocker: 0.55, reflection: false, detailLine: '#16232e' }
];

const COLORS = [
  { label: 'あか', hex: '#e85d2b' },
  { label: 'あお', hex: '#3a6ea5' },
  { label: 'しろ', hex: '#eef2f4' }
];

const cards = STYLES.map(st => {
  const big = render({ ...st, id: st.id + '0' }, COLORS[0].hex);
  const small = COLORS.slice(1).map((c, i) =>
    `<div class="mini"><div>${render({ ...st, id: st.id + (i + 1) }, c.hex)}</div><span>${c.label}</span></div>`).join('');
  return `<section>
    <h2>${st.name}</h2>
    <p class="note">${st.note}</p>
    <div class="main">${big}</div>
    <div class="minis">${small}</div>
  </section>`;
}).join('');

const html = `<!doctype html>
<html lang="ja"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>くるまこうじょう：絵づくり5案</title>
<style>
  :root { --line:#cfd8dd; --ink:#16232e; --sub:#65757d; }
  *{box-sizing:border-box}
  body{margin:0;padding:20px;background:#f4f7f9;color:var(--ink);
    font:15px/1.65 "Hiragino Maru Gothic ProN","Hiragino Sans",system-ui,sans-serif}
  h1{font-size:1.25rem;margin:0 0 4px}
  p.lead{margin:0 0 22px;color:var(--sub);font-size:.9rem}
  section{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:16px}
  h2{font-size:1rem;margin:0 0 4px}
  p.note{margin:0 0 10px;color:var(--sub);font-size:.85rem}
  .main svg{width:100%;max-width:560px;display:block;margin:0 auto}
  .minis{display:flex;gap:12px;justify-content:center;margin-top:8px;flex-wrap:wrap}
  .mini{width:min(46%,230px);text-align:center}
  .mini svg{width:100%;display:block}
  .mini span{font-size:.75rem;color:var(--sub)}
</style></head><body>
<h1>くるまこうじょう：絵づくり 5案（ふつうモデル）</h1>
<p class="lead">シルエットも作り直しています。ボンネットの傾き・フロントガラスの寝かせ・トランクの段差・ホイールアーチの4つを入れると、四角＋台形とは別物になります。<br>
各案とも「あか」を大きく、「あお」「しろ」を小さく並べています。色によって印象が変わるため、3色で見比べてください。</p>
${cards}
</body></html>`;

const out = process.argv[2] || 'デザイン案.html';
fs.writeFileSync(out, html);
console.log('wrote ' + out);
