/* ============================================================
   「ふつう」ボディの絵づくり 5案（第2稿・リアリティ重視）

   目標を「かわいい絵」から「技術的に正しい絵」に変える。
   知育目的で、見た子がエンジニアに憧れるクオリティを狙う。

   前稿からの作り直し：
   1) プロポーション … 実車の比率に合わせた（全長:全高 ≒ 3:1、全長:タイヤ径 ≒ 7:1）
   2) ホイールアーチ … 上から暗い半円を描くのをやめ、車体の輪郭そのものを弧で
      くり抜いた。タイヤは車体より先に描き、くり抜きから覗かせる（本物と同じ順序）
   3) 面の情報 … 空の映り込み・水平線の反射・環境遮蔽（AO）を入れた。
      車の絵がリアルに見えるかどうかは、色ではなくこの3つで決まる
   4) 機構の描き込み … ブレーキディスク、5本スポーク、ホイールナット、タイヤの
      サイプ、パネルの合わせ目、ドアハンドルの窪み、ミラー、灯火の内部構造
   ============================================================ */
const fs = require('fs');

const V = { w: 230, h: 116 };
const GROUND = 96;

// ---- 実車比率に寄せた寸法 ----
const REAR = 26, FRONT = 200;        // 全長 174
const AX_R = 64, AX_F = 162;         // ホイールベース 98
const TR = 12, ARCH = 14.2;          // タイヤ半径 / アーチ半径
const AX_Y = GROUND - TR;            // 84
const ROCKER = 78;                   // 車体下端
const BELT = 54.5;                   // ベルトライン（窓の下端）
const ROOF = 37.6;

// 車体の輪郭。下端に2つの弧を含め、ホイールアーチを「くり抜き」として持たせる。
// 弧の中心は車軸（AX_Y）であって車体下端ではない。ここを取り違えると、
// アーチがタイヤより高い位置まで開いて、隙間から背景が白く抜ける。
const ARCH_DX = Math.sqrt(ARCH * ARCH - (AX_Y - ROCKER) * (AX_Y - ROCKER));
const arch = cx => `L${(cx + ARCH_DX).toFixed(2)} ${ROCKER} A${ARCH} ${ARCH} 0 0 0 ${(cx - ARCH_DX).toFixed(2)} ${ROCKER} `;
const BODY =
  `M${REAR} ${ROCKER} L${REAR} 68 C${REAR} 62 30 59 36 58.6 L78 57.5 L94 39.5 ` +
  `C95 38.4 96.5 ${ROOF} 98 ${ROOF} L126 ${ROOF} C128 ${ROOF} 129.5 38.2 130.5 39.4 ` +
  `L150 56.4 L186 57.4 C194 57.8 ${FRONT} 61 ${FRONT} 67 L${FRONT} ${ROCKER} ` +
  arch(AX_F) + arch(AX_R) + `Z`;

// ---- 色 ----
const hx = c => ({ r: parseInt(c.slice(1, 3), 16), g: parseInt(c.slice(3, 5), 16), b: parseInt(c.slice(5, 7), 16) });
const toHex = o => '#' + [o.r, o.g, o.b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
function mix(a, b, t) { const x = hx(a), y = hx(b); return toHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t }); }
const lt = (c, a) => mix(c, '#ffffff', a);
const dk = (c, a) => mix(c, '#101a20', a);

// ============================================================
// 共通部品
// ============================================================

// ホイール。ブレーキディスクまで描く（工場で組む部品としての説得力）
function wheelDefs(id) {
  return `
  <radialGradient id="${id}-tyre" cx="0.38" cy="0.3" r="0.86">
    <stop offset="0" stop-color="#4d5a61"/><stop offset=".55" stop-color="#2a343a"/><stop offset="1" stop-color="#141c21"/></radialGradient>
  <linearGradient id="${id}-rim" x1="0.15" y1="0" x2="0.85" y2="1">
    <stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#dbe4e9"/>
    <stop offset=".62" stop-color="#9aa9b2"/><stop offset="1" stop-color="#6e7d86"/></linearGradient>
  <radialGradient id="${id}-hub" cx="0.35" cy="0.3" r="0.8">
    <stop offset="0" stop-color="#f6fafc"/><stop offset="1" stop-color="#98a7af"/></radialGradient>`;
}

function wheel(cx, id) {
  const cy = AX_Y;
  let s = `<g>`;
  // タイヤ本体
  s += `<circle cx="${cx}" cy="${cy}" r="${TR}" fill="url(#${id}-tyre)"/>`;
  // トレッドのサイプ（接地面の溝）
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * (TR - 0.4), y1 = cy + Math.sin(a) * (TR - 0.4);
    const x2 = cx + Math.cos(a) * (TR - 2.1), y2 = cy + Math.sin(a) * (TR - 2.1);
    s += `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#0d1418" stroke-width="0.7" opacity=".55"/>`;
  }
  // サイドウォール（タイヤの側面の段差）
  s += `<circle cx="${cx}" cy="${cy}" r="${TR - 2.3}" fill="none" stroke="#0f171c" stroke-width="1.1" opacity=".7"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${TR - 3.4}" fill="#39454c"/>`;
  // ブレーキディスク（スポークの隙間から見える）
  s += `<circle cx="${cx}" cy="${cy}" r="6.2" fill="#5f6d75"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="6.2" fill="none" stroke="#43505a" stroke-width="0.6"/>`;
  // ホイール（5本スポーク）
  s += `<circle cx="${cx}" cy="${cy}" r="7.4" fill="none" stroke="url(#${id}-rim)" stroke-width="1.7"/>`;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 360 - 90;
    s += `<path d="M${cx - 1.5} ${cy - 1} L${cx + 1.5} ${cy - 1} L${cx + 0.9} ${cy - 6.6} L${cx - 0.9} ${cy - 6.6} Z" ` +
         `fill="url(#${id}-rim)" transform="rotate(${a + 90} ${cx} ${cy})"/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="2.6" fill="url(#${id}-hub)"/>`;
  // ホイールナット
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    s += `<circle cx="${(cx + Math.cos(a) * 1.7).toFixed(2)}" cy="${(cy + Math.sin(a) * 1.7).toFixed(2)}" r="0.42" fill="#6b7a83"/>`;
  }
  // リムの映り込み
  s += `<path d="M${cx - 5.6} ${cy - 4.4} A7.3 7.3 0 0 1 ${cx - 0.6} ${cy - 7.3}" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity=".85"/>`;
  s += `</g>`;
  return s;
}

// 車体の面の情報。ここがリアリティの本体。
function bodyShading(id, color, opt) {
  let s = '';
  // 環境遮蔽：車体の下half と アーチの内側を落とす
  s += `<path d="${BODY}" fill="url(#${id}-ao)"/>`;
  // 空の映り込み（ベルトラインより上の面が明るく空を映す）
  s += `<path d="${BODY}" fill="url(#${id}-sky)" opacity="${opt.sky}"/>`;
  // 水平線の反射。車の絵で最も「本物らしさ」に効く線。
  s += `<path d="M32 ${opt.horizon} L196 ${opt.horizon}" stroke="url(#${id}-horizon)" stroke-width="2.4" fill="none" opacity="${opt.horizonA}"/>`;
  // ショルダーライン（ベルトライン直下の稜線）
  s += `<path d="M36 58.4 L78 57.2 M150 56.8 L188 57.8" stroke="${lt(color, 0.55)}" stroke-width="1.1" fill="none" opacity=".8" stroke-linecap="round"/>`;
  // ルーフとボンネットの鏡面ハイライト
  s += `<path d="M100 ${ROOF + 0.9} L124 ${ROOF + 0.9}" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" opacity="${opt.spec}"/>`;
  s += `<path d="M156 58.4 L184 59.2" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="${opt.spec * 0.8}"/>`;
  return s;
}

function glassAndInterior(id, color, opt) {
  let s = '';
  // 車内（ガラス越しに見える暗がり。これが無いとガラスが板に見える）
  s += `<path d="M89 ${BELT} L99 41 L117 41 L117 ${BELT} Z M121 ${BELT} L121 41 L133 41 L146 ${BELT} Z" fill="#25333c"/>`;
  // ヘッドレストとシートの背もたれ（内装が見える＝人が乗るものだと分かる）
  s += `<rect x="103" y="43.5" width="6.5" height="4.6" rx="2" fill="#3c4a54"/>`;
  s += `<rect x="126" y="43.5" width="6.5" height="4.6" rx="2" fill="#3c4a54"/>`;
  s += `<path d="M101 ${BELT} L101 47 L108 47 L108 ${BELT} Z" fill="#33414a"/>`;
  // ガラス
  s += `<path d="M89 ${BELT} L99 41 L117 41 L117 ${BELT} Z" fill="url(#${id}-glass)"/>`;
  s += `<path d="M121 ${BELT} L121 41 L133 41 L146 ${BELT} Z" fill="url(#${id}-glass)"/>`;
  // ガラスの鏡面（斜めに走る光）
  s += `<path d="M93 ${BELT} L104 41.6 L110 41.6 L98.5 ${BELT} Z" fill="#ffffff" opacity="${opt.glassSpec}"/>`;
  s += `<path d="M124 ${BELT} L129.5 41.6 L133 41.6 L131 ${BELT} Z" fill="#ffffff" opacity="${opt.glassSpec}"/>`;
  // ウィンドウモール（クロム）
  s += `<path d="M89 ${BELT} L99 41 L117 41 M121 41 L133 41 L146 ${BELT}" fill="none" stroke="#e6eef2" stroke-width="0.9" opacity=".9"/>`;
  s += `<path d="M117 41 L117 ${BELT} M121 41 L121 ${BELT}" stroke="#1e2a32" stroke-width="1.6" fill="none"/>`;  // Bピラー
  return s;
}

function details(id, color) {
  let s = '';
  const gap = dk(color, 0.6), edge = lt(color, 0.4);
  // パネルの合わせ目（暗い線＋明るい線の2本で、板と板の段差に見せる）
  [88, 118].forEach(x => {
    s += `<path d="M${x} ${BELT} L${x} ${ROCKER - 1}" stroke="${gap}" stroke-width="0.9" fill="none" opacity=".85"/>`;
    s += `<path d="M${x + 0.9} ${BELT} L${x + 0.9} ${ROCKER - 1}" stroke="${edge}" stroke-width="0.5" fill="none" opacity=".5"/>`;
  });
  // ボンネットとトランクの合わせ目
  s += `<path d="M150.5 56.6 L150.5 ${BELT + 2}" stroke="${gap}" stroke-width="0.8" opacity=".6" fill="none"/>`;
  // ドアハンドル（窪み＋つまみ）
  [[104, 60.5], [132, 60.5]].forEach(([x, y]) => {
    s += `<rect x="${x}" y="${y}" width="10" height="3.4" rx="1.7" fill="${gap}" opacity=".9"/>`;
    s += `<rect x="${x + 0.8}" y="${y + 0.5}" width="8.4" height="1.5" rx="0.75" fill="${edge}" opacity=".85"/>`;
  });
  // サイドミラー
  s += `<path d="M146 51.5 l8.5 -1.2 q2 -0.3 2 1.6 l0 1.4 q0 1.6 -2 1.6 l-8.5 0 z" fill="${dk(color, 0.18)}"/>`;
  s += `<path d="M154 50.6 q2 -0.2 2 1.6 l0 1.2 l-2 0 z" fill="#3d4a53"/>`;
  // ヘッドライト（レンズ＋内部のリフレクター）
  s += `<path d="M186 59.5 L${FRONT - 1} 61.2 Q${FRONT} 62 ${FRONT} 63.4 L${FRONT} 66.4 L186 65.6 Z" fill="url(#${id}-head)"/>`;
  s += `<circle cx="194" cy="63" r="1.9" fill="#ffffff" opacity=".95"/>`;
  s += `<circle cx="194" cy="63" r="0.8" fill="#cfe6f5"/>`;
  s += `<path d="M186 59.5 L${FRONT - 1} 61.2 Q${FRONT} 62 ${FRONT} 63.4" fill="none" stroke="#ffffff" stroke-width="0.7" opacity=".8"/>`;
  // テールランプ
  s += `<path d="M${REAR} 60.5 L34 60.8 L34 66.4 L${REAR} 66.4 Z" fill="url(#${id}-tail)"/>`;
  s += `<path d="M${REAR} 62 L34 62.2" stroke="#ffd9cf" stroke-width="0.7" opacity=".8" fill="none"/>`;
  // バンパー（樹脂パーツなので少しマットに）
  s += `<path d="M184 70 L${FRONT} 70 L${FRONT} ${ROCKER} L184 ${ROCKER} Z" fill="${dk(color, 0.22)}" opacity=".55"/>`;
  s += `<path d="M${REAR} 70 L42 70 L42 ${ROCKER} L${REAR} ${ROCKER} Z" fill="${dk(color, 0.22)}" opacity=".55"/>`;
  // フロントのエアインテーク
  s += `<path d="M188 72.5 L198 72.5 L198 75.5 L188 75.5 Z" fill="#1b252b" opacity=".8"/>`;
  // ロッカーパネル（裾の樹脂。ここを暗くすると車が地面に沈んで見える）
  s += `<path d="M46 74.5 L184 74.5 L184 ${ROCKER} L46 ${ROCKER} Z" fill="${dk(color, 0.45)}" opacity=".8"/>`;
  // 給油口
  s += `<circle cx="44" cy="63" r="2.4" fill="none" stroke="${gap}" stroke-width="0.7" opacity=".7"/>`;
  // アーチのふち（板金の折り返し）。くり抜きの縁に沿わせる。
  [AX_R, AX_F].forEach(cx => {
    s += `<path d="M${(cx - ARCH_DX).toFixed(2)} ${ROCKER} A${ARCH} ${ARCH} 0 0 1 ${(cx + ARCH_DX).toFixed(2)} ${ROCKER}" fill="none" stroke="${dk(color, 0.55)}" stroke-width="1.3"/>`;
    s += `<path d="M${(cx - ARCH_DX + 1.2).toFixed(2)} ${ROCKER - 0.6} A${ARCH - 1.1} ${ARCH - 1.1} 0 0 1 ${(cx + ARCH_DX - 1.2).toFixed(2)} ${ROCKER - 0.6}" fill="none" stroke="${lt(color, 0.3)}" stroke-width="0.6" opacity=".55"/>`;
  });
  return s;
}

function commonDefs(id, color, opt) {
  return `
  <linearGradient id="${id}-body" x1="0" y1="0" x2="0.06" y2="1">
    <stop offset="0" stop-color="${lt(color, 0.42)}"/>
    <stop offset=".22" stop-color="${lt(color, 0.20)}"/>
    <stop offset=".47" stop-color="${color}"/>
    <stop offset=".72" stop-color="${dk(color, 0.16)}"/>
    <stop offset=".9" stop-color="${dk(color, 0.42)}"/>
    <stop offset="1" stop-color="${dk(color, 0.58)}"/></linearGradient>
  <linearGradient id="${id}-ao" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000000" stop-opacity="0"/>
    <stop offset=".62" stop-color="#000000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000814" stop-opacity=".42"/></linearGradient>
  <linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${opt.skyTop}" stop-opacity=".55"/>
    <stop offset=".38" stop-color="${opt.skyTop}" stop-opacity=".12"/>
    <stop offset=".6" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
  <linearGradient id="${id}-horizon" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
    <stop offset=".18" stop-color="#ffffff" stop-opacity=".9"/>
    <stop offset=".8" stop-color="#ffffff" stop-opacity=".75"/>
    <stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
  <linearGradient id="${id}-glass" x1="0.1" y1="0" x2="0.5" y2="1">
    <stop offset="0" stop-color="#cfe6f2" stop-opacity=".95"/>
    <stop offset=".45" stop-color="#8fb4c8" stop-opacity=".9"/>
    <stop offset="1" stop-color="#5d7c8f" stop-opacity=".92"/></linearGradient>
  <radialGradient id="${id}-head" cx="0.65" cy="0.4" r="0.8">
    <stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#e8f2f7"/><stop offset="1" stop-color="#9fb6c2"/></radialGradient>
  <linearGradient id="${id}-tail" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#e2402c"/><stop offset="1" stop-color="#9c2417"/></linearGradient>
  <radialGradient id="${id}-shadow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#0b1620" stop-opacity=".5"/>
    <stop offset=".55" stop-color="#0b1620" stop-opacity=".22"/>
    <stop offset="1" stop-color="#0b1620" stop-opacity="0"/></radialGradient>
  ${wheelDefs(id)}`;
}

// ============================================================
// 案1・案2・案5：塗り分けの違う写実系
// ============================================================
function renderSolid(id, color, opt) {
  let s = `<svg viewBox="0 0 ${V.w} ${V.h}" xmlns="http://www.w3.org/2000/svg">`;
  s += `<defs>${commonDefs(id, color, opt)}</defs>`;
  s += `<rect x="0" y="0" width="${V.w}" height="${V.h}" fill="${opt.bg}"/>`;
  s += `<rect x="0" y="${GROUND}" width="${V.w}" height="${V.h - GROUND}" fill="${opt.floor}"/>`;
  // 接地影（タイヤの下が濃く、車体の下がぼんやり）
  s += `<ellipse cx="113" cy="${GROUND + 0.5}" rx="92" ry="5.2" fill="url(#${id}-shadow)"/>`;
  s += `<ellipse cx="${AX_R}" cy="${GROUND + 0.5}" rx="15" ry="3" fill="#0b1620" opacity=".38"/>`;
  s += `<ellipse cx="${AX_F}" cy="${GROUND + 0.5}" rx="15" ry="3" fill="#0b1620" opacity=".38"/>`;
  // タイヤは車体より先。アーチのくり抜きから覗く（本物と同じ重なり順）
  s += wheel(AX_R, id) + wheel(AX_F, id);
  s += `<path d="${BODY}" fill="url(#${id}-body)"${opt.outline ? ` stroke="${opt.outline}" stroke-width="${opt.outlineW}" stroke-linejoin="round"` : ''}/>`;
  s += bodyShading(id, color, opt);
  s += glassAndInterior(id, color, opt);
  s += details(id, color);
  if (opt.rim) {  // 工場の作業灯：上からの強い光の縁取り
    s += `<path d="M36 58.6 L78 57.5 L94 39.5 C95 38.4 96.5 ${ROOF} 98 ${ROOF} L126 ${ROOF} C128 ${ROOF} 129.5 38.2 130.5 39.4 L150 56.4 L186 57.4" ` +
         `fill="none" stroke="#fff3d0" stroke-width="1.5" stroke-linecap="round" opacity=".8"/>`;
  }
  s += `</svg>`;
  return s;
}

// ============================================================
// 案3：カットモデル（中の機構が見える）
// ============================================================
function renderCutaway(id, color) {
  const opt = STYLE_SOLID;
  let s = `<svg viewBox="0 0 ${V.w} ${V.h}" xmlns="http://www.w3.org/2000/svg">`;
  s += `<defs>${commonDefs(id, color, opt)}
    <clipPath id="${id}-clip"><path d="${BODY}"/></clipPath></defs>`;
  s += `<rect x="0" y="0" width="${V.w}" height="${V.h}" fill="#eef3f6"/>`;
  s += `<rect x="0" y="${GROUND}" width="${V.w}" height="${V.h - GROUND}" fill="#d6dee3"/>`;
  s += `<ellipse cx="113" cy="${GROUND + 0.5}" rx="92" ry="5.2" fill="url(#${id}-shadow)"/>`;
  s += wheel(AX_R, id) + wheel(AX_F, id);
  s += `<path d="${BODY}" fill="url(#${id}-body)"/>`;
  s += bodyShading(id, color, opt);

  // ---- 中身（車体でクリップする） ----
  s += `<g clip-path="url(#${id}-clip)">`;
  s += `<path d="${BODY}" fill="#ffffff" opacity=".72"/>`;   // 透けたボディ
  // フロア（車台）
  s += `<path d="M40 73 L192 73 L192 76 L40 76 Z" fill="#7a8b95"/>`;
  // エンジン（ボンネットの下）
  s += `<rect x="160" y="60" width="26" height="14" rx="2" fill="#5a6a74"/>`;
  s += `<rect x="163" y="56.5" width="20" height="4" rx="1.4" fill="#46545d"/>`;
  for (let i = 0; i < 4; i++) s += `<rect x="${163 + i * 5}" y="57" width="3" height="3" rx="1" fill="#8e9ea8"/>`;  // 4気筒
  s += `<circle cx="166" cy="70" r="3.4" fill="#8e9ea8"/><circle cx="166" cy="70" r="1.4" fill="#5a6a74"/>`;        // プーリー
  // トランスミッション
  s += `<path d="M150 65 L160 63 L160 71 L150 70 Z" fill="#6b7b85"/>`;
  // プロペラシャフト
  s += `<rect x="74" y="70.5" width="78" height="2.2" rx="1.1" fill="#9aa9b2"/>`;
  // 前後のサスペンション（コイル）
  [AX_R, AX_F].forEach(cx => {
    for (let i = 0; i < 5; i++) s += `<path d="M${cx - 4} ${64 + i * 2.4} q4 -1.8 8 0" fill="none" stroke="#8e9ea8" stroke-width="1.3"/>`;
    s += `<rect x="${cx - 1}" y="63" width="2" height="14" fill="#6b7b85"/>`;
  });
  // 燃料タンク
  s += `<path d="M52 66 L74 66 L74 73 L52 73 Z" fill="#6f8a94"/>`;
  s += `<path d="M52 66 L74 66 L74 68 L52 68 Z" fill="#8fa9b2"/>`;
  // シート（骨格まで）
  s += `<path d="M100 47 L108 47 L108 66 L100 66 Z" fill="#8a5c4a"/>`;
  s += `<path d="M100 63 L120 63 L120 67 L100 67 Z" fill="#8a5c4a"/>`;
  s += `<path d="M124 47 L132 47 L132 66 L124 66 Z" fill="#8a5c4a"/>`;
  // ステアリング
  s += `<path d="M138 52 L142 58" stroke="#4b5960" stroke-width="1.6"/>`;
  s += `<ellipse cx="137" cy="51" rx="4.4" ry="1.6" fill="none" stroke="#4b5960" stroke-width="1.5"/>`;
  s += `</g>`;

  s += glassAndInterior(id, color, opt);
  s += details(id, color);
  // 引き出し線と部品名
  const call = (x1, y1, x2, y2, label, anchor) =>
    `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="#2b3f4d" stroke-width="0.6" fill="none"/>` +
    `<circle cx="${x1}" cy="${y1}" r="1.1" fill="#2b3f4d"/>` +
    `<text x="${x2}" y="${y2 - 1.6}" font-size="5" fill="#2b3f4d" text-anchor="${anchor}" font-family="sans-serif">${label}</text>`;
  s += call(172, 66, 196, 26, 'エンジン', 'end');
  s += call(63, 69, 34, 26, 'ねんりょうタンク', 'start');
  s += call(AX_F, 68, 138, 106, 'サスペンション', 'middle');
  s += call(112, 55, 78, 106, 'シート', 'middle');
  s += `</svg>`;
  return s;
}

// ============================================================
// 案4：設計図（ブループリント）
// ============================================================
function renderBlueprint(id) {
  const L = '#8ed0ff', L2 = '#4f9fd0';
  let s = `<svg viewBox="0 0 ${V.w} ${V.h}" xmlns="http://www.w3.org/2000/svg">`;
  s += `<defs><pattern id="${id}-grid" width="8" height="8" patternUnits="userSpaceOnUse">
    <path d="M8 0 L0 0 L0 8" fill="none" stroke="#2b4f74" stroke-width="0.35"/></pattern></defs>`;
  s += `<rect x="0" y="0" width="${V.w}" height="${V.h}" fill="#0f2740"/>`;
  s += `<rect x="0" y="0" width="${V.w}" height="${V.h}" fill="url(#${id}-grid)"/>`;
  // 中心線
  s += `<path d="M0 ${AX_Y} L${V.w} ${AX_Y}" stroke="${L2}" stroke-width="0.4" stroke-dasharray="6 2 1 2" opacity=".7"/>`;
  // 車体の線画
  s += `<path d="${BODY}" fill="none" stroke="${L}" stroke-width="1.1" stroke-linejoin="round"/>`;
  s += `<path d="M89 ${BELT} L99 41 L117 41 L117 ${BELT} Z M121 ${BELT} L121 41 L133 41 L146 ${BELT} Z" fill="none" stroke="${L}" stroke-width="0.8"/>`;
  s += `<path d="M36 58.6 L78 57.5 M150 56.4 L186 57.4 M88 ${BELT} L88 ${ROCKER} M118 ${BELT} L118 ${ROCKER}" fill="none" stroke="${L2}" stroke-width="0.7"/>`;
  [AX_R, AX_F].forEach(cx => {
    s += `<circle cx="${cx}" cy="${AX_Y}" r="${TR}" fill="none" stroke="${L}" stroke-width="1"/>`;
    s += `<circle cx="${cx}" cy="${AX_Y}" r="7.4" fill="none" stroke="${L2}" stroke-width="0.7"/>`;
    s += `<path d="M${cx - 16} ${AX_Y} L${cx + 16} ${AX_Y} M${cx} ${AX_Y - 16} L${cx} ${AX_Y + 16}" stroke="${L2}" stroke-width="0.4" stroke-dasharray="4 2"/>`;
  });
  // 寸法線
  const dim = (x1, x2, y, label) =>
    `<path d="M${x1} ${y} L${x2} ${y}" stroke="${L}" stroke-width="0.5"/>` +
    `<path d="M${x1} ${y - 2} L${x1} ${y + 2} M${x2} ${y - 2} L${x2} ${y + 2}" stroke="${L}" stroke-width="0.5"/>` +
    `<path d="M${x1} ${y} l3 -1.4 l0 2.8 z M${x2} ${y} l-3 -1.4 l0 2.8 z" fill="${L}"/>` +
    `<text x="${(x1 + x2) / 2}" y="${y - 2.6}" font-size="4.6" fill="${L}" text-anchor="middle" font-family="sans-serif">${label}</text>`;
  s += dim(AX_R, AX_F, 106, 'ホイールベース');
  s += dim(REAR, FRONT, 112, 'ぜんちょう');
  s += `<path d="M208 ${ROOF} L208 ${GROUND}" stroke="${L}" stroke-width="0.5"/>` +
       `<path d="M206 ${ROOF} L210 ${ROOF} M206 ${GROUND} L210 ${GROUND}" stroke="${L}" stroke-width="0.5"/>` +
       `<text x="212" y="${(ROOF + GROUND) / 2}" font-size="4.6" fill="${L}" font-family="sans-serif">ぜんこう</text>`;
  s += `</svg>`;
  return s;
}

// ============================================================
// 案5：分解図（組立説明書風）
// ============================================================
function renderExploded(id, color) {
  const opt = STYLE_SOLID;
  let s = `<svg viewBox="0 0 ${V.w} ${V.h}" xmlns="http://www.w3.org/2000/svg">`;
  s += `<defs>${commonDefs(id, color, opt)}</defs>`;
  s += `<rect x="0" y="0" width="${V.w}" height="${V.h}" fill="#f2f5f7"/>`;
  const lead = (x, y1, y2) => `<path d="M${x} ${y1} L${x} ${y2}" stroke="#8fa0ab" stroke-width="0.5" stroke-dasharray="2.5 2"/>`;
  // 引き出し線
  s += lead(AX_R, 78, 96) + lead(AX_F, 78, 96) + lead(113, 30, 44);
  // 車体（持ち上げる）
  s += `<g transform="translate(0,-14)">`;
  s += `<path d="${BODY}" fill="url(#${id}-body)"/>`;
  s += bodyShading(id, color, opt);
  s += glassAndInterior(id, color, opt);
  s += details(id, color);
  s += `</g>`;
  // タイヤ（下ろす）
  s += `<g transform="translate(0,10)">${wheel(AX_R, id)}${wheel(AX_F, id)}</g>`;
  // 部品番号
  const num = (x, y, n) => `<circle cx="${x}" cy="${y}" r="4.6" fill="#ffffff" stroke="#4a5b66" stroke-width="0.7"/>` +
    `<text x="${x}" y="${y + 1.8}" font-size="5.4" fill="#2b3f4d" text-anchor="middle" font-family="sans-serif">${n}</text>`;
  s += num(113, 22, '1') + num(AX_R, 104, '2') + num(AX_F, 104, '2');
  s += `<text x="126" y="24" font-size="5" fill="#4a5b66" font-family="sans-serif">ボディ</text>`;
  s += `<text x="${AX_F + 8}" y="106" font-size="5" fill="#4a5b66" font-family="sans-serif">タイヤ</text>`;
  s += `</svg>`;
  return s;
}

// ---- 塗りの設定 ----
const STYLE_SOLID = { bg: '#eef3f6', floor: '#d6dee3', sky: 1, skyTop: '#cfe8fa', horizon: 66, horizonA: 0.55, spec: 0.85, glassSpec: 0.30, outline: null, outlineW: 0, rim: false };
const STYLE_STUDIO = { ...STYLE_SOLID, bg: '#f7f9fa', floor: '#e2e8ec', horizonA: 0.7, spec: 0.95 };
const STYLE_FACTORY = { ...STYLE_SOLID, bg: '#26333d', floor: '#39474f', skyTop: '#ffe9b8', horizonA: 0.4, spec: 1, glassSpec: 0.22, rim: true };

const CASES = [
  { name: '案1　精密イラスト（自動車カタログ風）',
    note: '面の明暗・空の映り込み・水平線の反射を丁寧に置いた、いちばん本物の車に近い塗り。ホイールはブレーキディスクとナットまで描いてある。',
    render: (id, c) => renderSolid(id, c, STYLE_STUDIO) },
  { name: '案2　カットモデル（中の機構が見える）',
    note: 'ボディを透かして、エンジン・トランスミッション・プロペラシャフト・サスペンション・燃料タンク・シートの骨格を見せる。部品名の引き出し線つき。知育としては最も強い。',
    render: (id, c) => renderCutaway(id, c) },
  { name: '案3　設計図（ブループリント）',
    note: '製図の作法で描く。中心線・寸法線・ホイールベース。「図面から物ができる」ことが伝わる。',
    render: (id) => renderBlueprint(id) },
  { name: '案4　分解図（組立説明書風）',
    note: '部品を離して並べ、番号と引き出し線を添える。工場で組み立てるという設定にそのまま重なる。',
    render: (id, c) => renderExploded(id, c) },
  { name: '案5　工場の作業灯（精密イラスト＋照明）',
    note: '案1と同じ描き込みで、工場の作業灯に照らされた場面にする。上からの光の縁取りが入り、金属の質感が強く出る。',
    render: (id, c) => renderSolid(id, c, STYLE_FACTORY) }
];

const COLORS = [{ label: 'あか', hex: '#d94f24' }, { label: 'あお', hex: '#2f6ba8' }, { label: 'しろ', hex: '#e7ecef' }];

const sections = CASES.map((cs, i) => {
  const big = cs.render('s' + i + 'a', COLORS[0].hex);
  const minis = COLORS.slice(1).map((c, j) =>
    `<div class="mini">${cs.render('s' + i + 'b' + j, c.hex)}<span>${c.label}</span></div>`).join('');
  return `<section><h2>${cs.name}</h2><p class="note">${cs.note}</p>
    <div class="main">${big}</div><div class="minis">${minis}</div></section>`;
}).join('');

const html = `<!doctype html>
<html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>くるまこうじょう：絵づくり5案（リアリティ重視）</title>
<style>
  :root{--line:#cfd8dd;--ink:#16232e;--sub:#65757d}
  *{box-sizing:border-box}
  body{margin:0;padding:20px;background:#eceff1;color:var(--ink);
    font:15px/1.65 "Hiragino Maru Gothic ProN","Hiragino Sans",system-ui,sans-serif}
  h1{font-size:1.3rem;margin:0 0 4px}
  p.lead{margin:0 0 22px;color:var(--sub);font-size:.9rem}
  section{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:16px}
  h2{font-size:1rem;margin:0 0 4px}
  p.note{margin:0 0 10px;color:var(--sub);font-size:.85rem}
  .main svg{width:100%;max-width:660px;display:block;margin:0 auto;border-radius:8px}
  .minis{display:flex;gap:12px;justify-content:center;margin-top:10px;flex-wrap:wrap}
  .mini{width:min(46%,270px);text-align:center}
  .mini svg{width:100%;display:block;border-radius:6px}
  .mini span{font-size:.75rem;color:var(--sub)}
</style></head><body>
<h1>くるまこうじょう：絵づくり 5案（リアリティ重視・第2稿）</h1>
<p class="lead">
前稿から作り直した4点：<b>①プロポーションを実車比率に</b>（全長:全高≒3:1、全長:タイヤ径≒7:1）／
<b>②ホイールアーチを車体の輪郭からくり抜き</b>、タイヤを先に描いて覗かせた（本物と同じ重なり順）／
<b>③空の映り込み・水平線の反射・環境遮蔽</b>を追加（車の絵が本物らしく見えるかは、色ではなくこの3つで決まります）／
<b>④機構の描き込み</b>（ブレーキディスク、5本スポーク、ホイールナット、タイヤのサイプ、パネルの合わせ目、ミラー、灯火の内部構造）。
</p>
${sections}
</body></html>`;

fs.writeFileSync(process.argv[2] || 'デザイン案2.html', html);
console.log('wrote ' + (process.argv[2] || 'デザイン案2.html'));
