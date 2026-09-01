/* ============================================================
   「ふつう」ボディ：SVGで到達できる限界まで作り込んだ版（比率修正・第2稿）

   第1稿は「昔の車のサイズ感」に見えた。原因は色や描き込みではなく寸法だった。
   実車の目安と並べると外れているのが数字で分かる：

                       第1稿    実車の目安    第2稿
     ホイールベース/全長  0.563   0.60〜0.62    0.609
     全長 / タイヤ径      7.25    6.3〜6.8      6.44
     タイヤ径 / 全高      0.41    0.45〜0.50    0.48
     荷室長 / ボンネット長 69/49  ほぼ同じ      52/45

   古く見えていた理由は3つ：
     ・前後のオーバーハングが長く、ホイールベースが短い（1970年代の比率）
     ・タイヤが小さく、アーチの中に余白が多い
     ・荷室が長く、キャビンが後ろに寄っている（後輪駆動セダンの姿勢）

   第2稿では車軸を外へ広げ、タイヤを大きくし、キャビンを前へ出した。
   ピラーの寝かせ方も強め、屋根は平らではなく緩い弧にしている。

   写真らしさを作っているのは色ではなく次の5つ：
     1. パネル分割 2. 稜線 3. 映り込み 4. 床の反射 5. 接地影
   ============================================================ */
const fs = require('fs');

const V = { w: 230, h: 126 };
const GROUND = 96;

// ---- 寸法（実車比率に合わせた第2稿）----
const REAR = 26, FRONT = 200;
const AX_R = 58, AX_F = 164;          // ホイールベース106（全長の0.609）
const TR = 13.5, ARCH = 16.2;         // タイヤを大きく。アーチの余白を詰める
const ROCKER = 88, BELT = 56.5, ROOF = 39.2;   // 地上高8＝タイヤ径の0.30（実車の範囲）
const AX_Y = GROUND - TR;             // 82.5
const ADX = Math.sqrt(ARCH * ARCH - (AX_Y - ROCKER) ** 2);
// 車体下端が車軸より下に来るとアーチは半円を超えるので、大弧フラグが要る
const BIG = (AX_Y - ROCKER) < 0 ? 1 : 0;

// 車体の輪郭。屋根は平らにせず緩い弧、ピラーは強めに寝かせる。
const arch = cx => `L${(cx + ADX).toFixed(2)} ${ROCKER} A${ARCH} ${ARCH} 0 ${BIG} 0 ${(cx - ADX).toFixed(2)} ${ROCKER} `;
const BODY =
  `M${REAR} ${ROCKER} L${REAR} 66.4 C${REAR} 60 30 57.6 36 57.2 ` +
  `L78 56.6 L100 41.4 ` +
  `C104 39.5 112 39.0 120 39.2 C126 39.4 130.4 40.2 133 41.6 ` +
  `L155 56.2 L188 57.0 C196 57.4 ${FRONT} 60.4 ${FRONT} 66.2 L${FRONT} ${ROCKER} ` +
  arch(AX_F) + arch(AX_R) + `Z`;

// ---- 色 ----
const hx = c => ({ r: parseInt(c.slice(1, 3), 16), g: parseInt(c.slice(3, 5), 16), b: parseInt(c.slice(5, 7), 16) });
const toHex = o => '#' + [o.r, o.g, o.b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = hx(a), y = hx(b); return toHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t }); };
const lt = (c, a) => mix(c, '#ffffff', a);
const dk = (c, a) => mix(c, '#0d151a', a);

// ============================================================
function defs(id, C) {
  return `
  <linearGradient id="${id}-side" x1="0" y1="0" x2="0.04" y2="1">
    <stop offset="0"    stop-color="${lt(C, 0.46)}"/>
    <stop offset=".16"  stop-color="${lt(C, 0.24)}"/>
    <stop offset=".38"  stop-color="${lt(C, 0.04)}"/>
    <stop offset=".58"  stop-color="${dk(C, 0.10)}"/>
    <stop offset=".76"  stop-color="${dk(C, 0.34)}"/>
    <stop offset=".92"  stop-color="${dk(C, 0.56)}"/>
    <stop offset="1"    stop-color="${dk(C, 0.40)}"/></linearGradient>
  <linearGradient id="${id}-hood" x1="0" y1="0" x2="0.2" y2="1">
    <stop offset="0" stop-color="${lt(C, 0.60)}"/><stop offset=".55" stop-color="${lt(C, 0.30)}"/>
    <stop offset="1" stop-color="${lt(C, 0.06)}"/></linearGradient>
  <linearGradient id="${id}-roof" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${lt(C, 0.68)}"/><stop offset="1" stop-color="${lt(C, 0.16)}"/></linearGradient>
  <linearGradient id="${id}-lamp" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
    <stop offset=".2" stop-color="#ffffff" stop-opacity=".85"/>
    <stop offset=".8" stop-color="#ffffff" stop-opacity=".7"/>
    <stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
  <linearGradient id="${id}-bounce" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${lt(C, 0.3)}" stop-opacity="0"/>
    <stop offset="1" stop-color="${lt(C, 0.5)}" stop-opacity=".5"/></linearGradient>
  <linearGradient id="${id}-glass" x1="0.1" y1="0" x2="0.55" y2="1">
    <stop offset="0" stop-color="#dcefff" stop-opacity=".97"/>
    <stop offset=".34" stop-color="#8fb6cd" stop-opacity=".93"/>
    <stop offset=".7" stop-color="#4c6c80" stop-opacity=".95"/>
    <stop offset="1" stop-color="#33505f" stop-opacity=".97"/></linearGradient>
  <radialGradient id="${id}-rim" cx="0.34" cy="0.28" r="0.85">
    <stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#e4ecf1"/>
    <stop offset=".64" stop-color="#a8b7c0"/><stop offset="1" stop-color="#66757e"/></radialGradient>
  <radialGradient id="${id}-tyre" cx="0.36" cy="0.28" r="0.9">
    <stop offset="0" stop-color="#48555c"/><stop offset=".5" stop-color="#252f35"/>
    <stop offset="1" stop-color="#101619"/></radialGradient>
  <radialGradient id="${id}-lens" cx="0.62" cy="0.36" r="0.85">
    <stop offset="0" stop-color="#ffffff"/><stop offset=".42" stop-color="#dbe9f2"/>
    <stop offset="1" stop-color="#7f96a4"/></radialGradient>
  <linearGradient id="${id}-tail" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#8e1f14"/><stop offset=".45" stop-color="#e0402a"/>
    <stop offset="1" stop-color="#a52a1a"/></linearGradient>
  <radialGradient id="${id}-shadow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#06111a" stop-opacity=".62"/>
    <stop offset=".45" stop-color="#06111a" stop-opacity=".3"/>
    <stop offset="1" stop-color="#06111a" stop-opacity="0"/></radialGradient>
  <filter id="${id}-blur" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="0.9"/></filter>
  <linearGradient id="${id}-fade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity=".30"/>
    <stop offset=".55" stop-color="#ffffff" stop-opacity=".07"/>
    <stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
  <mask id="${id}-refmask">
    <rect x="0" y="${GROUND}" width="${V.w}" height="${V.h - GROUND}" fill="url(#${id}-fade)"/></mask>
  <clipPath id="${id}-bodyclip"><path d="${BODY}"/></clipPath>`;
}

// ============================================================
function bodyArt(id, C) {
  let s = '';
  s += `<path d="${BODY}" fill="url(#${id}-side)"/>`;
  s += `<g clip-path="url(#${id}-bodyclip)">`;

  // パネル分割：空を向く面（ボンネット・屋根・トランク）は明るい
  s += `<path d="M155 56.2 L188 57.0 C196 57.4 ${FRONT} 60.4 ${FRONT} 66.2 L${FRONT} 61.6 L155 59.8 Z" fill="url(#${id}-hood)" opacity=".95"/>`;
  s += `<path d="M78 56.6 L36 57.2 L36 61 L78 60.2 Z" fill="url(#${id}-hood)" opacity=".72"/>`;
  s += `<path d="M100 41.4 C104 39.5 112 39.0 120 39.2 C126 39.4 130.4 40.2 133 41.6 L129 43.4 L103 43.2 Z" fill="url(#${id}-roof)"/>`;

  // 床の照り返し
  s += `<rect x="0" y="78" width="${V.w}" height="${ROCKER - 78}" fill="url(#${id}-bounce)" opacity=".5"/>`;

  // 稜線。線は少なく細く。増やすとステッカーに見える。
  s += `<path d="M46 62.2 L92 61.2 L155 60.2 L188 61.0" fill="none" stroke="${lt(C, 0.55)}" stroke-width="0.9" stroke-linecap="round" opacity=".7"/>`;
  s += `<path d="M46 63.1 L92 62.1 L155 61.1 L188 61.9" fill="none" stroke="${dk(C, 0.3)}" stroke-width="0.6" stroke-linecap="round" opacity=".35"/>`;
  s += `<path d="M48 74.6 C86 73.0 132 72.4 186 73.2" fill="none" stroke="${lt(C, 0.30)}" stroke-width="0.9" stroke-linecap="round" opacity=".6"/>`;
  s += `<path d="M48 75.8 C86 74.2 132 73.6 186 74.4" fill="none" stroke="${dk(C, 0.44)}" stroke-width="1.0" stroke-linecap="round" opacity=".5"/>`;

  // 天井照明の映り込み
  s += `<path d="M60 65.4 L178 63.8 L178 64.8 L60 66.4 Z" fill="url(#${id}-lamp)" opacity=".4"/>`;
  s += `<path d="M104 40.0 L128 40.2 L128 41.3 L104 41.1 Z" fill="url(#${id}-lamp)" opacity=".6"/>`;
  s += `<path d="M160 57.6 L186 58.3 L186 59.2 L160 58.5 Z" fill="url(#${id}-lamp)" opacity=".55"/>`;

  // 環境遮蔽：アーチの内側を細く落とす
  [AX_R, AX_F].forEach(cx => {
    s += `<path d="M${(cx - ADX).toFixed(2)} ${ROCKER} A${ARCH} ${ARCH} 0 0 1 ${(cx + ADX).toFixed(2)} ${ROCKER}" ` +
         `fill="none" stroke="#0a1218" stroke-width="5" opacity=".26" filter="url(#${id}-blur)"/>`;
  });
  s += `<path d="M84 ${BELT} L154 ${BELT} L154 57.6 L84 57.6 Z" fill="#0a1218" opacity=".1"/>`;
  s += `</g>`;
  return s;
}

// ============================================================
function glass(id, C) {
  const g1 = `M86 ${BELT} L102 43.0 L118 42.6 L118 ${BELT} Z`;
  const g2 = `M122 ${BELT} L122 42.6 L133 43.0 L150 ${BELT} Z`;
  let s = '';
  s += `<path d="${g1} ${g2}" fill="#141d23"/>`;
  s += `<rect x="104" y="45.4" width="7" height="5" rx="2.4" fill="#3a4750"/>`;
  s += `<rect x="127" y="45.4" width="7" height="5" rx="2.4" fill="#3a4750"/>`;
  s += `<path d="M102 ${BELT} L102 49.4 L110 49.4 L110 ${BELT} Z" fill="#2f3b44"/>`;
  s += `<path d="M139 51.4 a4.6 2 0 1 0 0.1 0" fill="none" stroke="#46545e" stroke-width="1.4"/>`;
  s += `<path d="${g1}" fill="url(#${id}-glass)"/><path d="${g2}" fill="url(#${id}-glass)"/>`;
  s += `<path d="M90 ${BELT} L104 43.6 L110 43.6 L96 ${BELT} Z" fill="#ffffff" opacity=".34"/>`;
  s += `<path d="M125.5 ${BELT} L130 43.2 L133 43.2 L132.5 ${BELT} Z" fill="#ffffff" opacity=".30"/>`;
  s += `<path d="M113.5 ${BELT} L116.6 43.0 L118 43.0 L116 ${BELT} Z" fill="#ffffff" opacity=".18"/>`;
  s += `<path d="M86 ${BELT} L102 43.0 L118 42.6 M122 42.6 L133 43.0 L150 ${BELT}" fill="none" stroke="#eef5f9" stroke-width="1" opacity=".92"/>`;
  s += `<path d="M118 42.6 L118 ${BELT} L122 ${BELT} L122 42.6 Z" fill="#151d22"/>`;
  s += `<path d="M140 ${BELT - 0.4} L150 ${BELT - 2.6}" stroke="#20282e" stroke-width="0.9" stroke-linecap="round"/>`;
  return s;
}

// ============================================================
function wheel(id, cx) {
  const cy = AX_Y;
  const rim = 8.8, disc = 7.2;
  let s = `<g>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${TR}" fill="url(#${id}-tyre)"/>`;
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    s += `<line x1="${(cx + Math.cos(a) * (TR - 0.3)).toFixed(2)}" y1="${(cy + Math.sin(a) * (TR - 0.3)).toFixed(2)}" ` +
         `x2="${(cx + Math.cos(a) * (TR - 2.2)).toFixed(2)}" y2="${(cy + Math.sin(a) * (TR - 2.2)).toFixed(2)}" ` +
         `stroke="#0a1013" stroke-width="0.68" opacity=".6"/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="${TR - 2.4}" fill="none" stroke="#0c1317" stroke-width="1.2" opacity=".8"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${TR - 3.4}" fill="#323d44"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${disc}" fill="#5b6870"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${disc}" fill="none" stroke="#414d55" stroke-width="0.5"/>`;
  s += `<path d="M${cx - disc - 0.3} ${cy - 3.2} a${disc + 0.4} ${disc + 0.4} 0 0 0 0 6.4 l2.2 0 a${disc - 1.8} ${disc - 1.8} 0 0 1 0 -6.4 z" fill="#c0392b"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${rim}" fill="none" stroke="url(#${id}-rim)" stroke-width="1.6"/>`;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * 360;
    s += `<path d="M${cx - 1.25} ${cy - 1.7} L${cx + 1.25} ${cy - 1.7} L${cx + 0.6} ${cy - rim + 0.6} L${cx - 0.6} ${cy - rim + 0.6} Z" ` +
         `fill="url(#${id}-rim)" transform="rotate(${a} ${cx} ${cy})"/>`;
    s += `<path d="M${cx + 0.6} ${cy - rim + 0.6} L${cx + 1.25} ${cy - 1.7} L${cx + 0.65} ${cy - 1.8} Z" ` +
         `fill="#5d6b74" opacity=".7" transform="rotate(${a} ${cx} ${cy})"/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="3.0" fill="url(#${id}-rim)"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="1.7" fill="#8f9ea7"/>`;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    s += `<circle cx="${(cx + Math.cos(a) * 2.1).toFixed(2)}" cy="${(cy + Math.sin(a) * 2.1).toFixed(2)}" r="0.45" fill="#5f6d76"/>`;
  }
  s += `<path d="M${cx - 6.6} ${cy - 5.8} A${rim} ${rim} 0 0 1 ${cx - 0.5} ${cy - rim}" fill="none" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" opacity=".9"/>`;
  s += `<path d="M${cx + 5.4} ${cy + 6.9} A${rim} ${rim} 0 0 1 ${cx + 8.1} ${cy + 3.4}" fill="none" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" opacity=".45"/>`;
  s += `</g>`;
  return s;
}

// ============================================================
function details(id, C) {
  const gap = dk(C, 0.62), edge = lt(C, 0.42);
  let s = '';
  [[86, BELT, ROCKER - 3], [121, BELT, ROCKER - 3]].forEach(([x, y1, y2]) => {
    s += `<path d="M${x} ${y1} L${x} ${y2}" stroke="${gap}" stroke-width="0.85" opacity=".8"/>`;
    s += `<path d="M${x + 0.85} ${y1} L${x + 0.85} ${y2}" stroke="${edge}" stroke-width="0.45" opacity=".45"/>`;
  });
  s += `<path d="M155.5 56.4 L155.5 60" stroke="${gap}" stroke-width="0.8" opacity=".6"/>`;
  s += `<path d="M78.5 56.8 L78.5 60" stroke="${gap}" stroke-width="0.8" opacity=".5"/>`;

  [[102, 63.2], [134, 62.6]].forEach(([x, y]) => {
    s += `<rect x="${x}" y="${y}" width="10.5" height="3.2" rx="1.6" fill="${gap}" opacity=".92"/>`;
    s += `<rect x="${x + 0.7}" y="${y + 0.4}" width="9.1" height="1.3" rx="0.65" fill="${edge}" opacity=".9"/>`;
  });

  s += `<path d="M150 53.4 l9 -1.4 q2.4 -0.4 2.4 1.8 l0 1.5 q0 1.8 -2.4 1.8 l-9 0 z" fill="${dk(C, 0.12)}"/>`;
  s += `<path d="M150.6 52.4 l7.4 -1.1 q1.6 -0.2 1.6 1.2 l0 0.9 l-9 0.6 z" fill="${lt(C, 0.30)}"/>`;
  s += `<path d="M159 52.4 q2.4 -0.3 2.4 1.9 l0 1.3 l-2.4 0 z" fill="#37444d"/>`;

  s += `<path d="M186 58.6 L${FRONT - 1.5} 60.2 Q${FRONT} 61 ${FRONT} 62.4 L${FRONT} 66 L186 64.8 Z" fill="url(#${id}-lens)"/>`;
  s += `<circle cx="194.6" cy="62.4" r="2.2" fill="#3d5563"/>`;
  s += `<circle cx="194.6" cy="62.4" r="1.6" fill="#e8f4fb"/>`;
  s += `<circle cx="194.6" cy="62.4" r="0.65" fill="#ffffff"/>`;
  s += `<path d="M187 59.8 L197.4 61.4" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" opacity=".95"/>`;
  s += `<path d="M186 58.6 L${FRONT - 1.5} 60.2 Q${FRONT} 61 ${FRONT} 62.4" fill="none" stroke="#ffffff" stroke-width="0.7" opacity=".85"/>`;

  s += `<path d="M${REAR} 59 L35 59.4 L35 65.4 L${REAR} 65.4 Z" fill="url(#${id}-tail)"/>`;
  s += `<path d="M${REAR + 0.6} 60.4 L34.2 60.8 M${REAR + 0.6} 62.4 L34.2 62.7" stroke="#ffd9cf" stroke-width="0.8" opacity=".85"/>`;
  s += `<path d="M${REAR} 59 L35 59.4" fill="none" stroke="#ffb4a4" stroke-width="0.6" opacity=".8"/>`;

  s += `<path d="M183 75.6 L${FRONT} 75 L${FRONT} ${ROCKER} L183 ${ROCKER} Z" fill="${dk(C, 0.30)}" opacity=".5"/>`;
  s += `<path d="M${REAR} 75.6 L43 76 L43 ${ROCKER} L${REAR} ${ROCKER} Z" fill="${dk(C, 0.30)}" opacity=".5"/>`;
  s += `<path d="M186 79 L198.5 78.4 L198 83.4 L186 83.8 Z" fill="#141c21"/>`;
  for (let i = 0; i < 5; i++) s += `<path d="M${187 + i * 2.4} 79.2 L${187 + i * 2.4} 83.4" stroke="#2b363d" stroke-width="0.7"/>`;
  s += `<circle cx="184" cy="80.6" r="1.5" fill="#cfe0ea"/><circle cx="184" cy="80.6" r="0.7" fill="#ffffff"/>`;

  s += `<path d="M46 83.4 L184 83" stroke="${lt(C, 0.25)}" stroke-width="0.5" opacity=".45"/>`;
  s += `<path d="M46 83.6 L184 83.2 L184 ${ROCKER} L46 ${ROCKER} Z" fill="${dk(C, 0.5)}" opacity=".75"/>`;
  s += `<circle cx="44" cy="65" r="2.5" fill="none" stroke="${gap}" stroke-width="0.65" opacity=".65"/>`;

  [AX_R, AX_F].forEach(cx => {
    s += `<path d="M${(cx - ADX).toFixed(2)} ${ROCKER} A${ARCH} ${ARCH} 0 0 1 ${(cx + ADX).toFixed(2)} ${ROCKER}" fill="none" stroke="${dk(C, 0.55)}" stroke-width="1.4"/>`;
    s += `<path d="M${(cx - ADX + 1.4).toFixed(2)} ${ROCKER - 0.7} A${ARCH - 1.2} ${ARCH - 1.2} 0 0 1 ${(cx + ADX - 1.4).toFixed(2)} ${ROCKER - 0.7}" fill="none" stroke="${lt(C, 0.34)}" stroke-width="0.6" opacity=".6"/>`;
  });
  return s;
}

// ============================================================
const car = (id, C) => bodyArt(id, C) + glass(id, C) + details(id, C) + wheel(id, AX_R) + wheel(id, AX_F);

function scene(id, C, opt) {
  opt = opt || {};
  const vb = opt.viewBox || `0 0 ${V.w} ${V.h}`;
  let s = `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">`;
  s += `<defs>${defs(id, C)}</defs>`;
  s += `<rect x="0" y="0" width="${V.w}" height="${V.h}" fill="${opt.bg || '#e9eef1'}"/>`;
  s += `<rect x="0" y="${GROUND}" width="${V.w}" height="${V.h - GROUND}" fill="${opt.floor || '#cfd8de'}"/>`;
  s += `<g mask="url(#${id}-refmask)"><g transform="matrix(1,0,0,-1,0,${2 * GROUND})" filter="url(#${id}-blur)">${car(id + 'r', C)}</g></g>`;
  s += `<ellipse cx="113" cy="${GROUND + 0.4}" rx="88" ry="4.6" fill="url(#${id}-shadow)"/>`;
  s += `<ellipse cx="${AX_R}" cy="${GROUND + 0.3}" rx="14" ry="2.5" fill="#06111a" opacity=".45" filter="url(#${id}-blur)"/>`;
  s += `<ellipse cx="${AX_F}" cy="${GROUND + 0.3}" rx="14" ry="2.5" fill="#06111a" opacity=".45" filter="url(#${id}-blur)"/>`;
  s += car(id, C);
  if (opt.dims) {
    const L = '#2f6ba8';
    const dim = (x1, x2, y, label) =>
      `<path d="M${x1} ${y} L${x2} ${y}" stroke="${L}" stroke-width="0.5"/>` +
      `<path d="M${x1} ${y - 2} L${x1} ${y + 2} M${x2} ${y - 2} L${x2} ${y + 2}" stroke="${L}" stroke-width="0.5"/>` +
      `<text x="${(x1 + x2) / 2}" y="${y - 2.4}" font-size="4.4" fill="${L}" text-anchor="middle" font-family="sans-serif">${label}</text>`;
    s += dim(AX_R, AX_F, 112, 'ホイールベース（全長の0.61）');
    s += dim(REAR, FRONT, 121, '全長');
    s += `<path d="M${AX_F} ${AX_Y - TR} L${AX_F} ${AX_Y + TR}" stroke="${L}" stroke-width="0.5" stroke-dasharray="2 1.5"/>`;
  }
  s += `</svg>`;
  return s;
}

// ---- 出力 ----
const COLORS = [
  { label: 'あか', hex: '#d0451f' }, { label: 'あお', hex: '#2b6499' },
  { label: 'きいろ', hex: '#e5aa08' }, { label: 'みどり', hex: '#3a8757' },
  { label: 'しろ', hex: '#dfe5e9' }, { label: 'くろ', hex: '#2a3339' }
];
const GARAGE = { bg: '#dfe6eb', floor: '#b9c4cb' };
const minis = COLORS.slice(1).map((c, i) =>
  `<figure><div>${scene('m' + i, c.hex, GARAGE)}</div><figcaption>${c.label}</figcaption></figure>`).join('');

const html = `<!doctype html>
<html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>くるまこうじょう：SVG 作り込み版（比率修正）</title>
<style>
  :root{--line:#cfd8dd;--ink:#16232e;--sub:#65757d}
  *{box-sizing:border-box}
  body{margin:0;padding:20px;background:#eceff1;color:var(--ink);
    font:15px/1.65 "Hiragino Maru Gothic ProN","Hiragino Sans",system-ui,sans-serif}
  h1{font-size:1.3rem;margin:0 0 4px}
  p.lead{margin:0 0 20px;color:var(--sub);font-size:.9rem}
  section{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:16px}
  h2{font-size:1rem;margin:0 0 8px}
  .hero svg{width:100%;max-width:820px;display:block;margin:0 auto;border-radius:10px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}
  figure{margin:0} figure svg{width:100%;display:block;border-radius:8px}
  figcaption{text-align:center;font-size:.78rem;color:var(--sub);margin-top:2px}
  .zooms{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
  .zooms svg{width:100%;display:block;border-radius:8px;border:1px solid var(--line)}
  table{border-collapse:collapse;font-size:.84rem;margin-top:6px}
  th,td{border:1px solid var(--line);padding:4px 10px;text-align:right}
  th{background:#f4f7f9;text-align:left;font-weight:400;color:var(--sub)}
  td.ok{color:#2e7d4f}
</style></head><body>

<h1>くるまこうじょう：SVGで作り込んだ「ふつう」ボディ（比率修正）</h1>
<p class="lead">「昔のサイズ感」の原因は描き込みではなく寸法だった。車軸を外へ広げ、タイヤを大きくし、キャビンを前へ出している。</p>

<section>
  <h2>寸法の比較</h2>
  <table>
    <tr><th></th><th>第1稿</th><th>実車の目安</th><th>第2稿</th></tr>
    <tr><th>ホイールベース / 全長</th><td>0.563</td><td>0.60〜0.62</td><td class="ok">0.609</td></tr>
    <tr><th>全長 / タイヤ径</th><td>7.25</td><td>6.3〜6.8</td><td class="ok">6.44</td></tr>
    <tr><th>タイヤ径 / 全高</th><td>0.41</td><td>0.45〜0.50</td><td class="ok">0.48</td></tr>
    <tr><th>全長 / 全高</th><td>2.96</td><td>2.9〜3.1</td><td class="ok">3.06</td></tr>
    <tr><th>荷室長 / ボンネット長</th><td>69 / 49</td><td>ほぼ同じ</td><td class="ok">52 / 45</td></tr>
  </table>
</section>

<section class="hero">
  <h2>第2稿</h2>
  ${scene('hero', COLORS[0].hex, GARAGE)}
</section>

<section class="hero">
  <h2>寸法線つき</h2>
  ${scene('dim', COLORS[1].hex, { ...GARAGE, dims: true })}
</section>

<section>
  <h2>拡大（細部の確認）</h2>
  <div class="zooms">
    <div>${scene('z1', COLORS[0].hex, { ...GARAGE, viewBox: '150 50 62 52' })}</div>
    <div>${scene('z2', COLORS[0].hex, { ...GARAGE, viewBox: '76 34 78 44' })}</div>
    <div>${scene('z3', COLORS[1].hex, { ...GARAGE, viewBox: '38 62 54 44' })}</div>
  </div>
</section>

<section>
  <h2>ほかの色</h2>
  <div class="grid">${minis}</div>
</section>

</body></html>`;

fs.writeFileSync(process.argv[2] || 'SVG作り込み版.html', html);
console.log('wrote ' + (process.argv[2] || 'SVG作り込み版.html'));
