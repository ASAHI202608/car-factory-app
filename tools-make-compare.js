/* 第1稿と第2稿の比較図。何がどう動いたかを重ねて見せる。 */
const fs = require('fs');
const V = { w: 230, h: 126 }, GROUND = 96;

// ---- 第1稿 ----
const A = { REAR: 26, FRONT: 200, AX_R: 64, AX_F: 162, TR: 12, ARCH: 14.4, ROCKER: 78, BELT: 54.5, ROOF: 37.2 };
A.AX_Y = GROUND - A.TR;
A.ADX = Math.sqrt(A.ARCH ** 2 - (A.AX_Y - A.ROCKER) ** 2);
A.BIG = (A.AX_Y - A.ROCKER) < 0 ? 1 : 0;
A.archSeg = cx => `L${(cx + A.ADX).toFixed(2)} ${A.ROCKER} A${A.ARCH} ${A.ARCH} 0 ${A.BIG} 0 ${(cx - A.ADX).toFixed(2)} ${A.ROCKER} `;
A.BODY =
  `M${A.REAR} ${A.ROCKER} L${A.REAR} 67.5 C${A.REAR} 61 30 58.6 36 58.2 L80 57.2 L95 39.2 ` +
  `C96 38 97.4 ${A.ROOF} 99 ${A.ROOF} L127 ${A.ROOF} C129 ${A.ROOF} 130.4 37.8 131.4 39 ` +
  `L151 56.2 L187 57.2 C195 57.6 ${A.FRONT} 60.6 ${A.FRONT} 66.6 L${A.FRONT} ${A.ROCKER} ` +
  A.archSeg(A.AX_F) + A.archSeg(A.AX_R) + `Z`;

// ---- 第2稿 ----
const B = { REAR: 26, FRONT: 200, AX_R: 58, AX_F: 164, TR: 13.5, ARCH: 16.2, ROCKER: 88, BELT: 56.5, ROOF: 39.2 };
B.AX_Y = GROUND - B.TR;
B.ADX = Math.sqrt(B.ARCH ** 2 - (B.AX_Y - B.ROCKER) ** 2);
B.BIG = (B.AX_Y - B.ROCKER) < 0 ? 1 : 0;
B.archSeg = cx => `L${(cx + B.ADX).toFixed(2)} ${B.ROCKER} A${B.ARCH} ${B.ARCH} 0 ${B.BIG} 0 ${(cx - B.ADX).toFixed(2)} ${B.ROCKER} `;
B.BODY =
  `M${B.REAR} ${B.ROCKER} L${B.REAR} 66.4 C${B.REAR} 60 30 57.6 36 57.2 ` +
  `L78 56.6 L100 41.4 C104 39.5 112 39.0 120 39.2 C126 39.4 130.4 40.2 133 41.6 ` +
  `L155 56.2 L188 57.0 C196 57.4 ${B.FRONT} 60.4 ${B.FRONT} 66.2 L${B.FRONT} ${B.ROCKER} ` +
  B.archSeg(B.AX_F) + B.archSeg(B.AX_R) + `Z`;

const wheelRing = (S, cx) =>
  `<circle cx="${cx}" cy="${S.AX_Y}" r="${S.TR}" fill="none" stroke="currentColor" stroke-width="1.1"/>` +
  `<circle cx="${cx}" cy="${S.AX_Y}" r="2" fill="currentColor"/>`;

// 1枚の図：塗りつぶし＋輪郭 or 輪郭だけ
function fig(S, opt) {
  const c = opt.color;
  let s = `<g color="${c}">`;
  if (opt.fill) s += `<path d="${S.BODY}" fill="${c}" opacity=".16"/>`;
  s += `<path d="${S.BODY}" fill="none" stroke="${c}" stroke-width="${opt.w || 1.3}" ` +
       `stroke-linejoin="round"${opt.dash ? ` stroke-dasharray="${opt.dash}"` : ''}/>`;
  s += wheelRing(S, S.AX_R) + wheelRing(S, S.AX_F);
  s += `</g>`;
  return s;
}

function base(extra) {
  return `<svg viewBox="0 0 ${V.w} ${V.h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${V.w}" height="${V.h}" fill="#f6f8fa"/>
    <path d="M0 ${GROUND} L${V.w} ${GROUND}" stroke="#9fb0bb" stroke-width="0.7"/>
    ${extra}</svg>`;
}

// ---- 重ね合わせ ----
const ann = (x1, y1, x2, y2, label, anchor, col) =>
  `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${col}" stroke-width="0.5"/>` +
  `<circle cx="${x1}" cy="${y1}" r="1.1" fill="${col}"/>` +
  `<text x="${x2}" y="${y2}" font-size="4.6" fill="${col}" text-anchor="${anchor}" font-family="sans-serif">${label}</text>`;

const OLD = '#c0563b', NEW = '#2f6ba8';

let overlay = fig(A, { color: OLD, w: 1.1, dash: '3 2' }) + fig(B, { color: NEW, fill: true, w: 1.4 });
// 車軸の移動を矢印で
[[A.AX_R, B.AX_R], [A.AX_F, B.AX_F]].forEach(([a, b]) => {
  const y = 108;
  overlay += `<path d="M${a} ${y} L${b} ${y}" stroke="#2f6ba8" stroke-width="0.8"/>` +
             `<path d="M${b} ${y} l${b > a ? -3 : 3} -1.5 l0 3 z" fill="#2f6ba8"/>` +
             `<path d="M${a} ${y - 2.5} L${a} ${y + 2.5}" stroke="${OLD}" stroke-width="0.7" stroke-dasharray="1.5 1.2"/>`;
});
overlay += `<text x="113" y="106" font-size="4.4" fill="#2f6ba8" text-anchor="middle" font-family="sans-serif">車軸を外へ広げた（ホイールベース 98 → 106）</text>`;
// 車体下端の移動
overlay += `<path d="M206 ${A.ROCKER} L222 ${A.ROCKER}" stroke="${OLD}" stroke-width="0.7" stroke-dasharray="2 1.5"/>`;
overlay += `<path d="M206 ${B.ROCKER} L222 ${B.ROCKER}" stroke="${NEW}" stroke-width="0.9"/>`;
overlay += `<path d="M214 ${A.ROCKER} L214 ${B.ROCKER}" stroke="${NEW}" stroke-width="0.8"/>`;
overlay += `<path d="M214 ${B.ROCKER} l-1.5 -3 l3 0 z" fill="${NEW}"/>`;
overlay += `<text x="223" y="${(A.ROCKER + B.ROCKER) / 2}" font-size="4.4" fill="${NEW}" font-family="sans-serif" text-anchor="end" transform="rotate(-90 223 ${(A.ROCKER + B.ROCKER) / 2})">車体を下げた</text>`;
overlay += ann(B.AX_F, B.AX_Y - B.TR, 176, 24, 'タイヤを大きく（径24→27）', 'start', NEW);
overlay += ann(116, B.ROOF, 96, 20, 'キャビンを前へ', 'end', NEW);
overlay += ann(52, 57, 30, 20, '荷室を短く', 'end', NEW);

const html = `<!doctype html>
<html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>くるまこうじょう：比率の修正内容</title>
<style>
  :root{--line:#cfd8dd;--ink:#16232e;--sub:#65757d;--old:#c0563b;--new:#2f6ba8}
  *{box-sizing:border-box}
  body{margin:0;padding:20px;background:#eceff1;color:var(--ink);
    font:15px/1.65 "Hiragino Maru Gothic ProN","Hiragino Sans",system-ui,sans-serif}
  h1{font-size:1.25rem;margin:0 0 4px}
  p.lead{margin:0 0 18px;color:var(--sub);font-size:.9rem}
  section{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:16px}
  h2{font-size:1rem;margin:0 0 8px}
  svg{width:100%;display:block;border-radius:8px}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .two figcaption{font-size:.82rem;text-align:center;margin-top:4px}
  .o{color:var(--old)} .n{color:var(--new)}
  table{border-collapse:collapse;font-size:.85rem;width:100%;max-width:560px}
  th,td{border:1px solid var(--line);padding:5px 10px;text-align:right}
  th{background:#f4f7f9;text-align:left;font-weight:400;color:var(--sub)}
  td.b{color:var(--old)} td.a{color:var(--new);font-weight:700}
  ul{margin:.4rem 0 0;padding-left:1.2rem;font-size:.88rem}
  li{margin-bottom:.3rem}
  .key{display:inline-block;width:22px;height:0;border-top:2px solid;vertical-align:middle;margin-right:4px}
</style></head><body>

<h1>比率の修正内容</h1>
<p class="lead">
  <span class="key o" style="border-top-style:dashed"></span><span class="o">第1稿（破線）</span>
  <span class="key n"></span><span class="n">第2稿（実線・塗り）</span>
</p>

<section>
  <h2>重ね合わせ</h2>
  ${base(overlay)}
</section>

<section>
  <h2>並べて比較（輪郭だけ）</h2>
  <div class="two">
    <figure style="margin:0">${base(fig(A, { color: OLD, fill: true, w: 1.4 }))}<figcaption class="o">第1稿</figcaption></figure>
    <figure style="margin:0">${base(fig(B, { color: NEW, fill: true, w: 1.4 }))}<figcaption class="n">第2稿</figcaption></figure>
  </div>
</section>

<section>
  <h2>動かした数値</h2>
  <table>
    <tr><th></th><th>第1稿</th><th>第2稿</th></tr>
    <tr><th>後輪の位置</th><td class="b">64</td><td class="a">58</td></tr>
    <tr><th>前輪の位置</th><td class="b">162</td><td class="a">164</td></tr>
    <tr><th>ホイールベース</th><td class="b">98</td><td class="a">106</td></tr>
    <tr><th>タイヤ半径</th><td class="b">12</td><td class="a">13.5</td></tr>
    <tr><th>アーチ半径</th><td class="b">14.4</td><td class="a">16.2</td></tr>
    <tr><th>車体の下端</th><td class="b">78</td><td class="a">88</td></tr>
    <tr><th>ベルトライン</th><td class="b">54.5</td><td class="a">56.5</td></tr>
    <tr><th>屋根</th><td class="b">37.2</td><td class="a">39.2</td></tr>
    <tr><th>Cピラーの付け根</th><td class="b">95</td><td class="a">100</td></tr>
    <tr><th>Aピラーの付け根</th><td class="b">151</td><td class="a">155</td></tr>
  </table>
  <ul>
    <li><b>車軸を外へ広げた</b>…ホイールベースが伸び、前後のオーバーハングが短くなった。これが「昔の車」から抜け出す最大の要因</li>
    <li><b>タイヤを大きくした</b>…アーチの余白が詰まり、締まって見える</li>
    <li><b>車体を10下げた</b>…地上高がタイヤ径の0.67倍→0.30倍。持ち上げた四駆のような姿勢が直った</li>
    <li><b>キャビンを前へ、荷室を短く</b>…後輪駆動セダンの姿勢から、いまの車の姿勢へ</li>
    <li><b>屋根を平らから緩い弧に</b>…ピラーの寝かせも強めた</li>
  </ul>
</section>

<section>
  <h2>途中で踏んだ落とし穴</h2>
  <ul>
    <li><b>車体の下端が車軸より下に来ると、ホイールアーチの弧が半円を超える。</b>
      SVGの円弧は「大弧フラグ」を立てないと短いほうの弧を描くので、指定を変えないと
      アーチが裏返って車体が破綻する。第1稿は車軸のほうが下（78 &lt; 82.5ではなく78 &gt; 84）
      だったので気づかなかった。寸法から自動で判定するようにした</li>
    <li><b>車体を下げると、ロッカーパネル・バンパー・グリル・フォグ・稜線も全部ついてこない。</b>
      これらは車体下端からの相対位置で置くべきだった。今回は手で下げたが、
      パーツを増やすときに同じ手当てが要る</li>
  </ul>
</section>

</body></html>`;

fs.writeFileSync(process.argv[2] || '比率の修正.html', html);
console.log('wrote ' + (process.argv[2] || '比率の修正.html'));
