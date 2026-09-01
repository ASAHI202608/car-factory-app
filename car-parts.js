/* ============================================================
   車の絵と座標系（アプリと検証ページの共通定義）

   ここが唯一の定義。app.js と prototype-parts.html の両方がこれを読む。

   【座標の決まりごと】
   すべて「車軸の高さ」を基準に組み立てる。個々のパーツに絶対座標を書かない。
     車軸の高さ   = 地面 − タイヤ半径
     車体の下端   = 車軸の高さ + ボディごとの下がり量
     ホイールアーチ = タイヤ半径 + すきま
   これでタイヤを大きくすると車体が持ち上がり、絵が破綻しない。

   【細部は相対位置で置く】
   ロッカーパネル・バンパー・グリル・稜線・ドアハンドルは、
   ボディの前後端とベルトライン〜車体下端の比で置く。絶対座標で書くと、
   ボディを1つ変えるたびに全部を手で直すことになる（実際に踏んだ）。
     fx(t) … 前後方向。0=車体後端、1=車体前端
     fy(t) … 上下方向。0=ベルトライン、1=車体下端

   【比率は実車に合わせる】
     ホイールベース/全長 0.60〜0.62 ／ 全長/タイヤ径 6.3〜6.8
     タイヤ径/全高 0.45〜0.50 ／ 地上高/タイヤ径 0.22〜0.32
   数値は checkAll() が全組み合わせで検査する。

   【写真らしさを作る5つ】
     1. パネル分割 2. 稜線 3. 映り込み 4. 床の反射 5. 接地影
   ============================================================ */
(function (root) {
  'use strict';

  var VIEW = { w: 230, h: 126 };
  var GROUND = 96;
  var ADDON_H = 15;      // やねの上に載る飾りの高さ

  // ------------------------------------------------------------
  // ボディ
  //   drop  … 車体下端が車軸より下がる量（地上高を決める）
  //   cabL/cabR … キャビンの前後端（ピラーの付け根）
  //   roofL/roofR … 屋根の水平部分
  //   belt/roof … ベルトラインと屋根の高さ
  // ------------------------------------------------------------
  var BODIES = {
    futsu: {
      label: 'ふつう', rear: 26, front: 200, axR: 58, axF: 164, drop: 5.5,
      belt: 56.5, roof: 39.2, cabL: 78, cabR: 155, roofL: 100, roofR: 133,
      w: 1.0, lenRatio: [6.0, 7.0], tag: { s: 0, w: 0, x: 0 }
    },
    nagai: {
      label: 'ながい', rear: 26, front: 216, axR: 62, axF: 180, drop: 5.5,
      belt: 56.0, roof: 38.4, cabL: 78, cabR: 172, roofL: 100, roofR: 152,
      w: 0.92, lenRatio: [6.5, 8.0], tag: { s: 1, w: 2, x: 0 }
    },
    marui: {
      label: 'まるい', rear: 40, front: 192, axR: 70, axF: 161, drop: 5.0,
      belt: 58.0, roof: 35.0, cabL: 84, cabR: 152, roofL: 104, roofR: 136,
      w: 1.0, lenRatio: [5.2, 6.2], tag: { s: 0, w: 0, x: 2 }, round: true
    },
    chiisai: {
      label: 'ちいさい', rear: 52, front: 184, axR: 78, axF: 158, drop: 5.0,
      belt: 57.0, roof: 34.5, cabL: 88, cabR: 148, roofL: 104, roofR: 132,
      w: 1.08, lenRatio: [4.5, 5.5], tag: { s: 2, w: 0, x: 1 }, round: true
    },
    shikaku: {
      label: 'しかく', rear: 28, front: 198, axR: 62, axF: 170, drop: 5.5,
      belt: 55.0, roof: 30.0, cabL: 62, cabR: 158, roofL: 74, roofR: 148,
      w: 0.86, lenRatio: [5.8, 6.8], tag: { s: 0, w: 2, x: 1 }, box: true
    }
  };

  // ------------------------------------------------------------
  // やね
  // ------------------------------------------------------------
  var ROOFS = {
    futsu:    { label: 'ふつう',       scale: 1.0,  addon: null,        tag: { s: 0, w: 0, x: 0 } },
    hikui:    { label: 'ひくい',       scale: 0.60, addon: null,        tag: { s: 2, w: 0, x: 0 } },
    nashi:    { label: 'やねなし',     scale: 0,    addon: null,        tag: { s: 2, w: 0, x: 1 } },
    nimotsu:  { label: 'にもつ',       scale: 1.0,  addon: 'luggage',   tag: { s: 0, w: 2, x: 0 } },
    puropera: { label: 'プロペラ',     scale: 1.0,  addon: 'propeller', tag: { s: 0, w: 0, x: 2 } },
    ouchi:    { label: 'おうちのやね', scale: 1.0,  addon: 'house',     tag: { s: 0, w: 1, x: 2 } }
  };

  var WINDOWS = {
    futsu:    { label: 'ふつう',   tag: { s: 0, w: 0, x: 0 } },
    ookii:    { label: 'おおきい', tag: { s: 0, w: 1, x: 0 } },
    chiisai:  { label: 'ちいさい', tag: { s: 2, w: 0, x: 0 } },
    renzoku:  { label: 'でんしゃ', tag: { s: 0, w: 1, x: 2 } },
    marumado: { label: 'まるまど', tag: { s: 0, w: 0, x: 2 } }
  };

  var ENGINES = {
    futsu:   { label: 'ふつう',   tag: { s: 0, w: 0, x: 0 }, w: 1.0 },
    ookii:   { label: 'おおきい', tag: { s: 3, w: 0, x: 0 }, w: 1.55 },
    rocket:  { label: 'ロケット', tag: { s: 2, w: 0, x: 2 }, w: 2.1 },
    zenmai:  { label: 'ぜんまい', tag: { s: 0, w: 0, x: 2 }, w: 0.82 },
    entotsu: { label: 'えんとつ', tag: { s: 0, w: 2, x: 2 }, w: 0.9 }
  };

  var SEATS = {
    two:    { label: '2つ',    tag: { s: 0, w: 0, x: 0 } },
    four:   { label: '4つ',    tag: { s: 0, w: 1, x: 0 } },
    bench:  { label: 'ベンチ', tag: { s: 0, w: 2, x: 0 } },
    sofa:   { label: 'ソファ', tag: { s: 0, w: 0, x: 2 } },
    tatami: { label: 'たたみ', tag: { s: 0, w: 0, x: 2 } }
  };

  // タイヤ。横から見た絵なので「太さ」は幅では出せない。
  // 実車と同じく **扁平率（サイドウォールの厚み）とリムの大きさ** で描き分ける。
  var TIRES = {
    futsu:    { label: 'ふつう',     r: 13.5, rim: 8.8,  tag: { s: 0, w: 0, x: 0 }, w: 1.0 },
    futoi:    { label: 'ふとい',     r: 13.5, rim: 10.8, lowpro: true, tag: { s: 3, w: 0, x: 0 }, w: 1.2 },
    pikapika: { label: 'ピカピカ',   r: 13.5, rim: 10.0, shiny: true,  tag: { s: 2, w: 0, x: 2 }, w: 1.15 },
    dekoboko: { label: 'でこぼこ',   r: 15.5, rim: 8.0,  tread: true,  tag: { s: 0, w: 3, x: 0 }, w: 1.05 },
    catapira: { label: 'キャタピラ', r: 11.0, rim: 6.4,  track: true,  tag: { s: 0, w: 2, x: 2 }, w: 0.8 }
  };

  var COLORS = [
    { key: 'red',    label: 'あか',   hex: '#d0451f', hue: 16 },
    { key: 'blue',   label: 'あお',   hex: '#2b6499', hue: 210 },
    { key: 'yellow', label: 'きいろ', hex: '#e5aa08', hue: 46 },
    { key: 'green',  label: 'みどり', hex: '#3a8757', hue: 138 },
    { key: 'white',  label: 'しろ',   hex: '#dfe5e9', hue: 200 },
    { key: 'black',  label: 'くろ',   hex: '#2a3339', hue: 210 }
  ];

  var BARE = '#96a4ac';

  // ---- 色の計算 ----
  function hxo(c) { return { r: parseInt(c.slice(1, 3), 16), g: parseInt(c.slice(3, 5), 16), b: parseInt(c.slice(5, 7), 16) }; }
  function toHex(o) { return '#' + [o.r, o.g, o.b].map(function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); }).join(''); }
  function mix(a, b, t) { var x = hxo(a), y = hxo(b); return toHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t }); }
  function lt(c, a) { return mix(c, '#ffffff', a); }
  function dk(c, a) { return mix(c, '#0d151a', a); }

  // ============================================================
  // 幾何
  // ============================================================
  function geometry(cfg) {
    var B = BODIES[cfg.body], T = TIRES[cfg.tire], R = ROOFS[cfg.roof || 'futsu'];
    var axY = GROUND - T.r;
    var rocker = axY + B.drop;
    var archR = T.r + 2.7;
    var d = axY - rocker;                       // 負なら車体下端が車軸より下
    var adx = Math.sqrt(Math.max(0.01, archR * archR - d * d));
    var big = d < 0 ? 1 : 0;                    // 半円を超えるときの大弧フラグ
    var cabH = (B.belt - B.roof) * R.scale;
    var roofY = B.belt - cabH;
    var g = {
      B: B, T: T, R: R,
      rear: B.rear, front: B.front, axR: B.axR, axF: B.axF,
      axY: axY, rocker: rocker, archR: archR, adx: adx, big: big,
      belt: B.belt, roofY: roofY, cabH: cabH,
      cabL: B.cabL, cabR: B.cabR, roofL: B.roofL, roofR: B.roofR,
      addonTop: roofY - (R.addon ? ADDON_H : 0),
      len: B.front - B.rear, side: rocker - B.belt
    };
    // 相対位置のヘルパー。細部はすべてこの2つを通す。
    g.fx = function (t) { return g.rear + g.len * t; };
    g.fy = function (t) { return g.belt + g.side * t; };
    return g;
  }

  // ============================================================
  // 輪郭
  // ============================================================
  function archSeg(g, cx) {
    return 'L' + (cx + g.adx).toFixed(2) + ' ' + g.rocker.toFixed(2) +
      ' A' + g.archR + ' ' + g.archR + ' 0 ' + g.big + ' 0 ' +
      (cx - g.adx).toFixed(2) + ' ' + g.rocker.toFixed(2) + ' ';
  }

  // 下部ボディ。キャビンの下を通るベルトラインで閉じる。
  function lowerPath(g) {
    var B = g.B, r = g.rear, f = g.front, bt = g.belt, rk = g.rocker;
    var noseR = B.box ? 3 : 7;              // 箱型は角ばらせる
    var tailR = B.box ? 3 : 7;
    var s = 'M' + r + ' ' + rk.toFixed(2) +
      ' L' + r + ' ' + (bt + 10) +
      ' C' + r + ' ' + (bt + 10 - tailR) + ' ' + (r + 4) + ' ' + (bt + 0.9) + ' ' + (r + 10) + ' ' + (bt + 0.6) +
      ' L' + g.cabL + ' ' + bt +
      ' L' + g.cabR + ' ' + (bt - 0.4) +
      ' L' + (f - 13) + ' ' + (bt + 0.5) +
      ' C' + (f - 5) + ' ' + (bt + 0.9) + ' ' + f + ' ' + (bt + 10 - noseR) + ' ' + f + ' ' + (bt + 10) +
      ' L' + f + ' ' + rk.toFixed(2) + ' ' +
      archSeg(g, g.axF) + archSeg(g, g.axR) + 'Z';
    return s;
  }

  // キャビン。屋根の形はボディの性格（丸い／箱型）で変える。
  function cabinPath(g) {
    if (g.cabH <= 0.5) return '';
    var B = g.B, bt = g.belt, ry = g.roofY, l = g.cabL, r = g.cabR, rl = g.roofL, rr = g.roofR;
    if (B.round) {
      // 丸屋根。ドーム状に立ち上げる
      return 'M' + l + ' ' + bt + ' Q' + (l + (rl - l) * 0.35) + ' ' + ry + ' ' + rl + ' ' + ry +
        ' L' + rr + ' ' + ry + ' Q' + (r - (r - rr) * 0.35) + ' ' + ry + ' ' + r + ' ' + bt + ' Z';
    }
    if (B.box) {
      // 箱型。ピラーをほぼ立てる
      return 'M' + l + ' ' + bt + ' L' + (l + 4) + ' ' + (ry + 1.5) + ' Q' + (l + 5) + ' ' + ry + ' ' + rl + ' ' + ry +
        ' L' + rr + ' ' + ry + ' Q' + (r - 5) + ' ' + ry + ' ' + (r - 5) + ' ' + (ry + 1.5) + ' L' + r + ' ' + bt + ' Z';
    }
    // ふつう。ピラーを寝かせ、屋根は緩い弧
    return 'M' + l + ' ' + bt + ' L' + rl + ' ' + (ry + 2.2) +
      ' C' + (rl + 4) + ' ' + (ry + 0.3) + ' ' + (rl + (rr - rl) * 0.4) + ' ' + (ry - 0.2) + ' ' + ((rl + rr) / 2) + ' ' + (ry - 0.2) +
      ' C' + (rr - (rr - rl) * 0.2) + ' ' + (ry - 0.2) + ' ' + (rr - 2) + ' ' + (ry + 0.6) + ' ' + rr + ' ' + (ry + 2.2) +
      ' L' + r + ' ' + bt + ' Z';
  }

  // ============================================================
  // defs
  // ============================================================
  function defs(id, C) {
    return '' +
    '<linearGradient id="' + id + '-side" x1="0" y1="0" x2="0.04" y2="1">' +
      '<stop offset="0" stop-color="' + lt(C, 0.46) + '"/><stop offset=".16" stop-color="' + lt(C, 0.24) + '"/>' +
      '<stop offset=".38" stop-color="' + lt(C, 0.04) + '"/><stop offset=".58" stop-color="' + dk(C, 0.10) + '"/>' +
      '<stop offset=".76" stop-color="' + dk(C, 0.34) + '"/><stop offset=".92" stop-color="' + dk(C, 0.56) + '"/>' +
      '<stop offset="1" stop-color="' + dk(C, 0.40) + '"/></linearGradient>' +
    '<linearGradient id="' + id + '-hood" x1="0" y1="0" x2="0.2" y2="1">' +
      '<stop offset="0" stop-color="' + lt(C, 0.60) + '"/><stop offset=".55" stop-color="' + lt(C, 0.30) + '"/>' +
      '<stop offset="1" stop-color="' + lt(C, 0.06) + '"/></linearGradient>' +
    '<linearGradient id="' + id + '-roof" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + lt(C, 0.68) + '"/><stop offset="1" stop-color="' + lt(C, 0.14) + '"/></linearGradient>' +
    '<linearGradient id="' + id + '-lamp" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset=".2" stop-color="#ffffff" stop-opacity=".85"/>' +
      '<stop offset=".8" stop-color="#ffffff" stop-opacity=".7"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="' + id + '-bounce" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + lt(C, 0.3) + '" stop-opacity="0"/>' +
      '<stop offset="1" stop-color="' + lt(C, 0.5) + '" stop-opacity=".5"/></linearGradient>' +
    '<linearGradient id="' + id + '-glass" x1="0.1" y1="0" x2="0.55" y2="1">' +
      '<stop offset="0" stop-color="#dcefff" stop-opacity=".97"/><stop offset=".34" stop-color="#8fb6cd" stop-opacity=".93"/>' +
      '<stop offset=".7" stop-color="#4c6c80" stop-opacity=".95"/><stop offset="1" stop-color="#33505f" stop-opacity=".97"/></linearGradient>' +
    '<radialGradient id="' + id + '-rim" cx="0.34" cy="0.28" r="0.85">' +
      '<stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#e4ecf1"/>' +
      '<stop offset=".64" stop-color="#a8b7c0"/><stop offset="1" stop-color="#66757e"/></radialGradient>' +
    '<radialGradient id="' + id + '-tyre" cx="0.36" cy="0.28" r="0.9">' +
      '<stop offset="0" stop-color="#48555c"/><stop offset=".5" stop-color="#252f35"/>' +
      '<stop offset="1" stop-color="#101619"/></radialGradient>' +
    '<radialGradient id="' + id + '-lens" cx="0.62" cy="0.36" r="0.85">' +
      '<stop offset="0" stop-color="#ffffff"/><stop offset=".42" stop-color="#dbe9f2"/>' +
      '<stop offset="1" stop-color="#7f96a4"/></radialGradient>' +
    '<linearGradient id="' + id + '-tail" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#8e1f14"/><stop offset=".45" stop-color="#e0402a"/>' +
      '<stop offset="1" stop-color="#a52a1a"/></linearGradient>' +
    '<filter id="' + id + '-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.9"/></filter>';
  }

  // ============================================================
  // 塗りと稜線（クリップの内側）
  // ============================================================
  function paintArt(id, g, C, built) {
    var color = C;   // C は carSvg で塗装前なら BARE になっている
    var low = lowerPath(g), cab = cabinPath(g);
    var s = '';
    s += '<path d="' + low + '" fill="url(#' + id + '-side)"/>';
    if (cab) s += '<path d="' + cab + '" fill="url(#' + id + '-side)"/>';

    s += '<clipPath id="' + id + '-clip"><path d="' + low + '"/></clipPath>';
    s += '<g clip-path="url(#' + id + '-clip)">';
    // パネル分割：空を向く面は明るい
    s += '<path d="M' + g.cabR + ' ' + (g.belt - 0.4) + ' L' + (g.front - 13) + ' ' + (g.belt + 0.5) +
         ' L' + (g.front - 13) + ' ' + g.fy(0.16) + ' L' + g.cabR + ' ' + g.fy(0.14) + ' Z" fill="url(#' + id + '-hood)" opacity=".95"/>';
    s += '<path d="M' + (g.rear + 10) + ' ' + (g.belt + 0.6) + ' L' + g.cabL + ' ' + g.belt +
         ' L' + g.cabL + ' ' + g.fy(0.14) + ' L' + (g.rear + 10) + ' ' + g.fy(0.16) + ' Z" fill="url(#' + id + '-hood)" opacity=".72"/>';
    // 床の照り返し
    s += '<rect x="0" y="' + g.fy(0.62) + '" width="' + VIEW.w + '" height="' + (g.side * 0.38) + '" fill="url(#' + id + '-bounce)" opacity=".5"/>';
    // 稜線（少なく細く）
    s += '<path d="M' + g.fx(0.11) + ' ' + g.fy(0.20) + ' L' + g.fx(0.5) + ' ' + g.fy(0.16) + ' L' + g.fx(0.9) + ' ' + g.fy(0.19) +
         '" fill="none" stroke="' + lt(color, 0.55) + '" stroke-width="0.9" stroke-linecap="round" opacity=".7"/>';
    s += '<path d="M' + g.fx(0.11) + ' ' + g.fy(0.23) + ' L' + g.fx(0.5) + ' ' + g.fy(0.19) + ' L' + g.fx(0.9) + ' ' + g.fy(0.22) +
         '" fill="none" stroke="' + dk(color, 0.3) + '" stroke-width="0.6" stroke-linecap="round" opacity=".35"/>';
    s += '<path d="M' + g.fx(0.12) + ' ' + g.fy(0.58) + ' C' + g.fx(0.35) + ' ' + g.fy(0.53) + ' ' + g.fx(0.62) + ' ' + g.fy(0.51) + ' ' + g.fx(0.92) + ' ' + g.fy(0.54) +
         '" fill="none" stroke="' + lt(color, 0.30) + '" stroke-width="0.9" stroke-linecap="round" opacity=".6"/>';
    s += '<path d="M' + g.fx(0.12) + ' ' + g.fy(0.62) + ' C' + g.fx(0.35) + ' ' + g.fy(0.57) + ' ' + g.fx(0.62) + ' ' + g.fy(0.55) + ' ' + g.fx(0.92) + ' ' + g.fy(0.58) +
         '" fill="none" stroke="' + dk(color, 0.44) + '" stroke-width="1.0" stroke-linecap="round" opacity=".5"/>';
    // 天井照明の映り込み
    s += '<path d="M' + g.fx(0.18) + ' ' + g.fy(0.30) + ' L' + g.fx(0.9) + ' ' + g.fy(0.25) +
         ' L' + g.fx(0.9) + ' ' + g.fy(0.28) + ' L' + g.fx(0.18) + ' ' + g.fy(0.33) + ' Z" fill="url(#' + id + '-lamp)" opacity=".4"/>';
    // アーチの内側を細く落とす
    [g.axR, g.axF].forEach(function (cx) {
      s += '<path d="M' + (cx - g.adx).toFixed(2) + ' ' + g.rocker.toFixed(2) + ' A' + g.archR + ' ' + g.archR +
           ' 0 ' + g.big + ' 1 ' + (cx + g.adx).toFixed(2) + ' ' + g.rocker.toFixed(2) +
           '" fill="none" stroke="#0a1218" stroke-width="5" opacity=".24" filter="url(#' + id + '-blur)"/>';
    });
    s += '</g>';

    // キャビンの塗り分け
    if (cab) {
      s += '<clipPath id="' + id + '-cclip"><path d="' + cab + '"/></clipPath>';
      s += '<g clip-path="url(#' + id + '-cclip)">';
      s += '<path d="' + cab + '" fill="url(#' + id + '-roof)" opacity=".55"/>';
      s += '<path d="M' + (g.roofL + 2) + ' ' + (g.roofY + 0.6) + ' L' + (g.roofR - 2) + ' ' + (g.roofY + 0.6) +
           ' L' + (g.roofR - 2) + ' ' + (g.roofY + 1.7) + ' L' + (g.roofL + 2) + ' ' + (g.roofY + 1.7) + ' Z" fill="url(#' + id + '-lamp)" opacity=".6"/>';
      s += '</g>';
    }
    return s;
  }

  // ============================================================
  // やねの飾り
  // ============================================================
  function addonArt(g, color) {
    var kind = g.R.addon;
    if (!kind || g.cabH <= 0.5) return '';
    var cx = (g.roofL + g.roofR) / 2, top = g.roofY;
    if (kind === 'propeller') {
      var half = Math.min(30, (g.cabR - g.cabL) * 0.42);
      return '<rect x="' + (cx - 1.8) + '" y="' + (top - ADDON_H) + '" width="3.6" height="' + ADDON_H + '" rx="1.6" fill="#6b7b83"/>' +
        '<rect x="' + (cx - half) + '" y="' + (top - ADDON_H - 2.6) + '" width="' + (half * 2) + '" height="3.2" rx="1.6" fill="#41525a"/>' +
        '<circle cx="' + cx + '" cy="' + (top - ADDON_H - 1) + '" r="3.2" fill="#c9d4d9"/>';
    }
    if (kind === 'house') {
      var l = g.roofL - 4, r = g.roofR + 4;
      return '<path d="M' + l + ' ' + top + ' L' + cx + ' ' + (top - ADDON_H) + ' L' + r + ' ' + top + ' Z" fill="#b5503a"/>' +
        '<path d="M' + l + ' ' + top + ' L' + cx + ' ' + (top - ADDON_H) + '" stroke="#d9705a" stroke-width="1.2" fill="none"/>' +
        '<rect x="' + (r - 12) + '" y="' + (top - ADDON_H - 3) + '" width="6.5" height="11" rx="1" fill="#8d5a4a"/>';
    }
    if (kind === 'luggage') {
      var ll = g.roofL + 2, lr = g.roofR - 2;
      return '<rect x="' + ll + '" y="' + (top - 2.4) + '" width="' + (lr - ll) + '" height="2.6" rx="1.2" fill="#41525a"/>' +
        '<rect x="' + (ll + 2) + '" y="' + (top - 10) + '" width="17" height="7.6" rx="1.6" fill="#c98a3c"/>' +
        '<rect x="' + (ll + 21) + '" y="' + (top - 8) + '" width="13" height="5.6" rx="1.6" fill="#7f9a53"/>';
    }
    return '';
  }

  // ============================================================
  // まど・車内
  // ============================================================
  // built.window / built.seat が false のときは「まだ付いていない」状態を描く。
  // 工程の途中を見せるために要る（窓の穴だけ開いた車体、シートの無い車内）。
  function glassArt(id, g, kind, seat, built) {
    built = built || {};
    var hasGlass = built.window !== false;
    var hasSeat = built.seat !== false;
    var GL = 'url(#' + id + '-glass)';

    // やねなし：キャビンが無いので車内は丸見え。フロントガラスだけ立てる。
    if (g.cabH <= 0.5) {
      var wx = g.cabR - 6;
      return (hasSeat ? seatArt(g, seat) : '') + (!hasGlass ? '' :
        '<path d="M' + wx + ' ' + g.belt + ' L' + (wx - 11) + ' ' + (g.belt - 17) +
        ' L' + (wx - 4) + ' ' + (g.belt - 17) + ' L' + (wx + 4) + ' ' + g.belt + ' Z" fill="' + GL + '"/>');
    }

    var top = g.roofY + g.cabH * 0.10;
    var bot = g.belt - 1.4;
    var l = g.cabL + (g.roofL - g.cabL) * 0.62 + 2;
    var r = g.cabR - (g.cabR - g.roofR) * 0.62 - 2;
    var mid = (l + r) / 2, pil = Math.max(2.4, (r - l) * 0.035);
    var sl = (g.roofL - g.cabL) * 0.5, sr = (g.cabR - g.roofR) * 0.5;

    function pane(x1, x2, slantL, slantR) {
      return '<path d="M' + (x1 + slantL) + ' ' + top + ' L' + (x2 - slantR) + ' ' + top +
        ' L' + x2 + ' ' + bot + ' L' + x1 + ' ' + bot + ' Z"/>';
    }

    // まどの形。clipPath にも描画にも同じ図形を使う。
    var shapes = [];
    if (kind === 'ookii') {
      shapes.push(pane(l, r, sl, sr));
    } else if (kind === 'chiisai') {
      var w = Math.min(20, (r - l) * 0.36);
      shapes.push(pane(r - w, r, 0, sr));
    } else if (kind === 'renzoku') {
      var n = Math.max(3, Math.floor((r - l) / 15)), gp = 2.4;
      var ww = ((r - l) - gp * (n - 1)) / n;
      for (var i = 0; i < n; i++) {
        var x1 = l + i * (ww + gp);
        shapes.push(pane(x1, x1 + ww, i === 0 ? sl : 0, i === n - 1 ? sr : 0));
      }
    } else if (kind === 'marumado') {
      var rr = Math.min((bot - top) * 0.44, (r - l) / 5);
      var cy = (top + bot) / 2;
      shapes.push('<circle cx="' + (l + rr + 4) + '" cy="' + cy + '" r="' + rr + '"/>');
      shapes.push('<circle cx="' + (r - rr - 4) + '" cy="' + cy + '" r="' + rr + '"/>');
    } else {
      shapes.push(pane(l, mid - pil, sl, 0));
      shapes.push(pane(mid + pil, r, 0, sr));
    }

    // 車内の暗がりは **まどの内側だけ** に出す。
    // キャビン全体を暗く塗ると、屋根まで真っ黒になる（実際に踏んだ）。
    var s = '<clipPath id="' + id + '-gclip">' + shapes.join('') + '</clipPath>';
    s += '<g clip-path="url(#' + id + '-gclip)">';
    s += '<rect x="' + (g.cabL - 2) + '" y="' + (g.roofY - 2) + '" width="' + (g.cabR - g.cabL + 4) +
         '" height="' + (g.belt - g.roofY + 4) + '" fill="#141d23"/>';
    if (hasSeat) s += seatArt(g, seat);
    s += '</g>';

    // まだガラスをはめていない工程では、窓の穴が開いたままの車体にする
    if (!hasGlass) return s;

    // ガラス本体（半透明）。奥の車内が透けて見える。
    shapes.forEach(function (sh) { s += sh.replace('/>', ' fill="' + GL + '"/>'); });
    // 斜めに走る光
    s += '<g clip-path="url(#' + id + '-gclip)">';
    s += '<path d="M' + (l + (r - l) * 0.16) + ' ' + top + ' L' + (l + (r - l) * 0.30) + ' ' + top +
         ' L' + (l + (r - l) * 0.12) + ' ' + bot + ' L' + (l - 2) + ' ' + bot + ' Z" fill="#ffffff" opacity=".32"/>';
    s += '<path d="M' + (l + (r - l) * 0.62) + ' ' + top + ' L' + (l + (r - l) * 0.68) + ' ' + top +
         ' L' + (l + (r - l) * 0.56) + ' ' + bot + ' L' + (l + (r - l) * 0.52) + ' ' + bot + ' Z" fill="#ffffff" opacity=".2"/>';
    s += '</g>';
    // まわりのモール（クロム）
    shapes.forEach(function (sh) { s += sh.replace('/>', ' fill="none" stroke="#eef5f9" stroke-width="0.9" opacity=".9"/>'); });
    return s;
  }

  function seatArt(g, kind) {
    var base = g.belt - 1.4;
    var h = (g.cabH > 0.5 ? g.cabH : 16) * 0.55;
    var cx = (g.cabL + g.cabR) / 2;
    var s = '';
    function back(x, hh, w, fill) {
      return '<rect x="' + x + '" y="' + (base - hh) + '" width="' + (w || 5) + '" height="' + hh + '" rx="2.2" fill="' + (fill || '#7d5342') + '"/>';
    }
    if (kind === 'four') s += back(cx - 15, h) + back(cx + 9, h);
    else if (kind === 'bench') s += back(cx - 17, h * 0.85, 34, '#63705a');
    else if (kind === 'sofa') s += back(cx - 19, h * 0.6, 38, '#98505f') + back(cx - 19, h * 0.9, 6, '#98505f') + back(cx + 13, h * 0.9, 6, '#98505f');
    else if (kind === 'tatami') s += '<rect x="' + (cx - 20) + '" y="' + (base - 5.5) + '" width="40" height="5.5" rx="1" fill="#c3b878"/>' +
      '<rect x="' + (cx - 20) + '" y="' + (base - 5.5) + '" width="40" height="1.5" fill="#3f6b4a"/>';
    else s += back(cx - 2, h);
    if (kind !== 'tatami' && kind !== 'sofa') {
      s += '<rect x="' + (cx - 3.5) + '" y="' + (base - h - 5) + '" width="7.5" height="5" rx="2.4" fill="#4a5760"/>';
    }
    return s;
  }

  // ============================================================
  // 単体のパーツ絵（エンジン・シート）
  //
  // 選ぶ画面と「はめ込む」演出の両方で使う。車の geometry に頼らない、
  // 独立した viewBox（0 0 100 100）の絵にする。
  // ============================================================
  function partPedestal() {
    return '<ellipse cx="50" cy="93" rx="34" ry="6" fill="#000" opacity=".14"/>';
  }

  var ENGINE_ICONS = {
    futsu: function () {
      return partPedestal() +
        '<rect x="26" y="42" width="48" height="34" rx="7" fill="#8e9ea7"/>' +
        '<rect x="26" y="42" width="48" height="11" rx="5" fill="#5a6a74"/>' +
        [36, 50, 64].map(function (x) { return '<circle cx="' + x + '" cy="47.5" r="3" fill="#3d4b54"/>'; }).join('') +
        '<rect x="17" y="56" width="11" height="15" rx="3" fill="#6b7b83"/>' +
        '<rect x="72" y="60" width="9" height="11" rx="2.5" fill="#41525a"/>' +
        '<rect x="26" y="42" width="48" height="34" rx="7" fill="none" stroke="#3d4b54" stroke-width="1.4"/>';
    },
    ookii: function () {
      return partPedestal() +
        '<rect x="16" y="40" width="68" height="42" rx="8" fill="#8e9ea7"/>' +
        '<path d="M32 40 Q50 20 68 40 Z" fill="#5a6a74"/>' +
        '<rect x="16" y="50" width="68" height="10" fill="#6b7b83"/>' +
        [30, 50, 70].map(function (x) { return '<circle cx="' + x + '" cy="46" r="3.4" fill="#3d4b54"/>'; }).join('') +
        '<circle cx="22" cy="70" r="9" fill="none" stroke="#3d4b54" stroke-width="2.6"/>' +
        '<circle cx="22" cy="70" r="2.6" fill="#3d4b54"/>' +
        '<rect x="16" y="40" width="68" height="42" rx="8" fill="none" stroke="#3d4b54" stroke-width="1.6"/>';
    },
    rocket: function () {
      return partPedestal() +
        '<path d="M60 30 L26 20 L26 80 L60 70 Z" fill="#6b7b83"/>' +
        '<ellipse cx="26" cy="50" rx="6" ry="30" fill="#41525a"/>' +
        '<ellipse cx="30" cy="50" rx="2.6" ry="20" fill="#8d9ca5" opacity=".6"/>' +
        '<path d="M60 38 L82 46 L82 54 L60 62 Z" fill="#ffb54d"/>' +
        '<path d="M60 42 L74 48 L74 52 L60 58 Z" fill="#ff7a2e"/>' +
        '<path d="M60 30 L26 20 L26 80 L60 70 Z" fill="none" stroke="#3d4b54" stroke-width="1.4"/>';
    },
    zenmai: function () {
      return partPedestal() +
        '<circle cx="50" cy="55" r="9" fill="none" stroke="#6b7b83" stroke-width="6"/>' +
        '<rect x="50" y="47" width="34" height="9" rx="4" fill="#6b7b83"/>' +
        '<circle cx="50" cy="51.5" r="7.4" fill="#41525a"/>' +
        '<circle cx="50" cy="51.5" r="2.6" fill="#8d9ca5"/>';
    },
    entotsu: function () {
      return partPedestal() +
        '<rect x="42" y="28" width="16" height="52" rx="3" fill="#41525a"/>' +
        '<rect x="36" y="20" width="28" height="10" rx="4" fill="#6b7b83"/>' +
        '<g fill="#d8dee1" opacity=".85">' +
        '<circle cx="50" cy="14" r="5"/><circle cx="58" cy="6" r="4"/><circle cx="43" cy="6" r="3.4"/></g>';
    }
  };

  var SEAT_ICONS = {
    two: function () {
      return partPedestal() +
        '<path d="M28 84 L28 40 Q28 18 50 18 Q72 18 72 40 L72 84 L60 84 L60 46 Q60 30 50 30 Q40 30 40 46 L40 84 Z" fill="#7d5342"/>' +
        '<rect x="46" y="22" width="8" height="34" rx="4" fill="#e8dcc8" opacity=".9"/>' +
        '<rect x="26" y="78" width="48" height="8" rx="3" fill="#5f4030"/>';
    },
    four: function () {
      function seat(x) {
        return '<path d="M' + x + ' 84 L' + x + ' 46 Q' + x + ' 26 ' + (x + 16) + ' 26' +
          ' Q' + (x + 32) + ' 26 ' + (x + 32) + ' 46 L' + (x + 32) + ' 84 Z" fill="#7d5342"/>';
      }
      return partPedestal() + seat(14) + seat(54) +
        '<rect x="10" y="78" width="80" height="8" rx="3" fill="#5f4030"/>';
    },
    bench: function () {
      return partPedestal() +
        '<rect x="14" y="30" width="72" height="34" rx="8" fill="#63705a"/>' +
        '<rect x="14" y="60" width="72" height="24" rx="6" fill="#54604a"/>' +
        [30, 50, 70].map(function (x) { return '<path d="M' + x + ' 32 L' + x + ' 62" stroke="#4c5843" stroke-width="1.6"/>'; }).join('');
    },
    sofa: function () {
      return partPedestal() +
        '<rect x="18" y="36" width="64" height="44" rx="14" fill="#98505f"/>' +
        '<circle cx="24" cy="58" r="12" fill="#8a4855"/><circle cx="76" cy="58" r="12" fill="#8a4855"/>' +
        [34, 50, 66].map(function (x) { return '<circle cx="' + x + '" cy="48" r="2" fill="#6f3844"/>'; }).join('');
    },
    tatami: function () {
      return partPedestal() +
        '<rect x="14" y="38" width="72" height="40" rx="3" fill="#c3b878"/>' +
        '<rect x="14" y="38" width="72" height="6" fill="#3f6b4a"/>' +
        [24, 38, 52, 66, 80].map(function (x) { return '<path d="M' + x + ' 44 L' + x + ' 78" stroke="#a9a05f" stroke-width="1.4"/>'; }).join('');
    }
  };

  // key: 'engine' | 'seat'　kind: そのパーツの種類キー
  function partIcon(key, kind) {
    var set = key === 'engine' ? ENGINE_ICONS : SEAT_ICONS;
    var draw = set[kind] || set[Object.keys(set)[0]];
    return '<svg viewBox="0 0 100 100" overflow="visible">' + draw() + '</svg>';
  }

  // ============================================================
  // エンジン（後ろに付くもの／ボンネットに載るもの）
  // ============================================================
  function engineRear(g, kind) {
    if (kind !== 'rocket' && kind !== 'zenmai') return '';
    var y = g.fy(0.42), x = g.rear;
    if (kind === 'rocket') {
      return '<path d="M' + x + ' ' + (y - 7) + ' L' + (x - 17) + ' ' + (y - 11.5) +
        ' L' + (x - 17) + ' ' + (y + 11.5) + ' L' + x + ' ' + (y + 7) + ' Z" fill="#6b7b83"/>' +
        '<ellipse cx="' + (x - 17) + '" cy="' + y + '" rx="2.6" ry="11.5" fill="#41525a"/>' +
        '<ellipse cx="' + (x - 15) + '" cy="' + y + '" rx="1.2" ry="8" fill="#8d9ca5" opacity=".6"/>';
    }
    var kx = x - 12;
    return '<g class="zenmai-key" style="transform-origin:' + kx + 'px ' + y + 'px">' +
      '<rect x="' + kx + '" y="' + (y - 1.8) + '" width="13" height="3.6" rx="1.6" fill="#6b7b83"/>' +
      '<circle cx="' + kx + '" cy="' + y + '" r="3.6" fill="#41525a"/>' +
      '<path d="M' + (kx - 9.5) + ' ' + (y - 7.5) + ' a7.5 7.5 0 1 0 0 15 a7.5 7.5 0 1 0 0 -15 Z" fill="none" stroke="#6b7b83" stroke-width="2.8"/>' +
      '</g>';
  }

  function engineFront(g, kind, color) {
    if (kind === 'ookii') {
      var hl = g.cabR, hr = g.front - 10;
      var hx = (hl + hr) / 2, hw = Math.min(30, (hr - hl) * 0.66);
      return '<path d="M' + (hx - hw / 2) + ' ' + (g.belt + 0.4) + ' q' + (hw / 2) + ' -11 ' + hw + ' 0 Z" fill="' + color + '"/>' +
        '<path d="M' + (hx - hw / 2) + ' ' + (g.belt + 0.4) + ' q' + (hw / 2) + ' -11 ' + hw + ' 0" fill="none" stroke="' + lt(color, 0.4) + '" stroke-width="0.8"/>' +
        '<rect x="' + (hx - 5.5) + '" y="' + (g.belt - 11.6) + '" width="11" height="5" rx="2" fill="#6b7b83"/>';
    }
    if (kind === 'entotsu') {
      var ex = (g.cabR + g.front - 10) / 2;
      return '<rect x="' + (ex - 4.2) + '" y="' + (g.belt - 16) + '" width="8.4" height="16.4" rx="1.6" fill="#41525a"/>' +
        '<rect x="' + (ex - 7) + '" y="' + (g.belt - 19.4) + '" width="14" height="4.2" rx="1.8" fill="#6b7b83"/>';
    }
    return '';
  }

  // ============================================================
  // タイヤ
  // ============================================================
  function wheelArt(id, g, cx, spinClass) {
    var T = g.T, cy = g.axY, R = T.r, rim = T.rim;
    var s = '<g' + (spinClass ? ' class="' + spinClass + '" style="transform-origin:' + cx + 'px ' + cy + 'px"' : '') + '>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="url(#' + id + '-tyre)"/>';
    // トレッド
    var n = T.tread ? 16 : 28;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      if (T.tread) {
        s += '<rect x="' + (cx + Math.cos(a) * (R - 1.6) - 2.4) + '" y="' + (cy + Math.sin(a) * (R - 1.6) - 2.4) +
             '" width="4.8" height="4.8" rx="1.3" fill="#16222a"/>';
      } else {
        s += '<line x1="' + (cx + Math.cos(a) * (R - 0.3)).toFixed(2) + '" y1="' + (cy + Math.sin(a) * (R - 0.3)).toFixed(2) +
             '" x2="' + (cx + Math.cos(a) * (R - 2.1)).toFixed(2) + '" y2="' + (cy + Math.sin(a) * (R - 2.1)).toFixed(2) +
             '" stroke="#0a1013" stroke-width="0.66" opacity=".6"/>';
      }
    }
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R - 2.2) + '" fill="none" stroke="#0c1317" stroke-width="1.1" opacity=".8"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (rim + 1.2) + '" fill="#323d44"/>';
    // ブレーキとキャリパー
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (rim - 1.4) + '" fill="#5b6870"/>';
    s += '<path d="M' + (cx - rim + 0.6) + ' ' + (cy - 3.2) + ' a' + rim + ' ' + rim + ' 0 0 0 0 6.4 l2.2 0 a' + (rim - 2.2) + ' ' + (rim - 2.2) + ' 0 0 1 0 -6.4 z" fill="#c0392b"/>';
    // リム
    var rimFill = T.shiny ? '#ffffff' : 'url(#' + id + '-rim)';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + rim + '" fill="none" stroke="url(#' + id + '-rim)" stroke-width="1.6"/>';
    var spokes = T.shiny ? 12 : 10;
    for (var k = 0; k < spokes; k++) {
      var ang = (k / spokes) * 360;
      s += '<path d="M' + (cx - 1.25) + ' ' + (cy - 1.7) + ' L' + (cx + 1.25) + ' ' + (cy - 1.7) +
           ' L' + (cx + 0.6) + ' ' + (cy - rim + 0.6) + ' L' + (cx - 0.6) + ' ' + (cy - rim + 0.6) + ' Z" ' +
           'fill="' + rimFill + '" transform="rotate(' + ang + ' ' + cx + ' ' + cy + ')"/>';
      s += '<path d="M' + (cx + 0.6) + ' ' + (cy - rim + 0.6) + ' L' + (cx + 1.25) + ' ' + (cy - 1.7) + ' L' + (cx + 0.65) + ' ' + (cy - 1.8) + ' Z" ' +
           'fill="#5d6b74" opacity=".7" transform="rotate(' + ang + ' ' + cx + ' ' + cy + ')"/>';
    }
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="url(#' + id + '-rim)"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="1.7" fill="#8f9ea7"/>';
    for (var j = 0; j < 5; j++) {
      var aa = (j / 5) * Math.PI * 2 - Math.PI / 2;
      s += '<circle cx="' + (cx + Math.cos(aa) * 2.1).toFixed(2) + '" cy="' + (cy + Math.sin(aa) * 2.1).toFixed(2) + '" r="0.45" fill="#5f6d76"/>';
    }
    s += '<path d="M' + (cx - rim * 0.75) + ' ' + (cy - rim * 0.66) + ' A' + rim + ' ' + rim + ' 0 0 1 ' + (cx - 0.5) + ' ' + (cy - rim) +
         '" fill="none" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" opacity="' + (T.shiny ? '1' : '.9') + '"/>';
    if (T.shiny) {
      s += '<path d="M' + (cx + rim * 0.6) + ' ' + (cy + rim * 0.78) + ' A' + rim + ' ' + rim + ' 0 0 1 ' + (cx + rim * 0.95) + ' ' + (cy + rim * 0.3) +
           '" fill="none" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity=".8"/>';
      [[-0.9, -0.75, 3.2], [0.85, -0.5, 2.2]].forEach(function (p) {
        var sx = cx + R * p[0], sy = cy + R * p[1], q = p[2];
        s += '<path d="M' + sx + ' ' + (sy - q) + ' L' + (sx + q * 0.28) + ' ' + (sy - q * 0.28) + ' L' + (sx + q) + ' ' + sy +
             ' L' + (sx + q * 0.28) + ' ' + (sy + q * 0.28) + ' L' + sx + ' ' + (sy + q) + ' L' + (sx - q * 0.28) + ' ' + (sy + q * 0.28) +
             ' L' + (sx - q) + ' ' + sy + ' L' + (sx - q * 0.28) + ' ' + (sy - q * 0.28) + ' Z" fill="#fffdf2"/>';
      });
    }
    s += '</g>';
    return s;
  }

  function trackArt(id, g) {
    var T = g.T, y = g.axY, R = T.r;
    var s = '<g>';
    s += '<path d="M' + g.axR + ' ' + (y - R) + ' H' + g.axF + ' a' + R + ' ' + R + ' 0 0 1 0 ' + (2 * R) +
         ' H' + g.axR + ' a' + R + ' ' + R + ' 0 0 1 0 ' + (-2 * R) + ' Z" fill="url(#' + id + '-tyre)"/>';
    var span = g.axF - g.axR, n = Math.max(5, Math.round(span / 9));
    for (var i = 0; i <= n; i++) {
      var x = g.axR + span * (i / n);
      s += '<rect x="' + (x - 2.2) + '" y="' + (y + R - 4.4) + '" width="4.4" height="4.4" rx="1.2" fill="#16222a"/>';
      s += '<rect x="' + (x - 2.2) + '" y="' + (y - R) + '" width="4.4" height="3.4" rx="1.2" fill="#1c282f"/>';
    }
    [g.axR, g.axF].forEach(function (cx) {
      s += '<circle cx="' + cx + '" cy="' + y + '" r="' + T.rim + '" fill="url(#' + id + '-rim)"/>';
      s += '<circle cx="' + cx + '" cy="' + y + '" r="' + (T.rim * 0.45) + '" fill="#5f6d76"/>';
    });
    // 転輪
    for (var k = 1; k < 4; k++) {
      s += '<circle cx="' + (g.axR + span * k / 4) + '" cy="' + (y + R * 0.45) + '" r="' + (R * 0.26) + '" fill="#48555c"/>';
    }
    s += '</g>';
    return s;
  }

  // ============================================================
  // 細部（すべて fx/fy の相対位置で置く）
  // ============================================================
  function detailArt(id, g, C, built) {
    var color = C;
    var gap = dk(color, 0.62), edge = lt(color, 0.42);
    var s = '';
    // ドアの合わせ目
    [g.cabL + (g.cabR - g.cabL) * 0.10, g.cabL + (g.cabR - g.cabL) * 0.55].forEach(function (x) {
      s += '<path d="M' + x + ' ' + g.belt + ' L' + x + ' ' + g.fy(0.86) + '" stroke="' + gap + '" stroke-width="0.85" opacity=".8"/>';
      s += '<path d="M' + (x + 0.85) + ' ' + g.belt + ' L' + (x + 0.85) + ' ' + g.fy(0.86) + '" stroke="' + edge + '" stroke-width="0.45" opacity=".45"/>';
    });
    s += '<path d="M' + (g.cabR + 0.5) + ' ' + (g.belt - 0.4) + ' L' + (g.cabR + 0.5) + ' ' + g.fy(0.14) + '" stroke="' + gap + '" stroke-width="0.8" opacity=".6"/>';
    s += '<path d="M' + (g.cabL - 0.5) + ' ' + g.belt + ' L' + (g.cabL - 0.5) + ' ' + g.fy(0.14) + '" stroke="' + gap + '" stroke-width="0.8" opacity=".5"/>';
    // ドアハンドル
    [0.25, 0.48].forEach(function (t) {
      var x = g.cabL + (g.cabR - g.cabL) * t, y = g.fy(0.24);
      s += '<rect x="' + x + '" y="' + y + '" width="10.5" height="3.2" rx="1.6" fill="' + gap + '" opacity=".92"/>';
      s += '<rect x="' + (x + 0.7) + '" y="' + (y + 0.4) + '" width="9.1" height="1.3" rx="0.65" fill="' + edge + '" opacity=".9"/>';
    });
    // サイドミラー
    var mx = g.cabR - 5;
    s += '<path d="M' + mx + ' ' + (g.belt - 3.2) + ' l9 -1.4 q2.4 -0.4 2.4 1.8 l0 1.5 q0 1.8 -2.4 1.8 l-9 0 z" fill="' + dk(color, 0.12) + '"/>';
    s += '<path d="M' + (mx + 0.6) + ' ' + (g.belt - 4.2) + ' l7.4 -1.1 q1.6 -0.2 1.6 1.2 l0 0.9 l-9 0.6 z" fill="' + lt(color, 0.30) + '"/>';
    s += '<path d="M' + (mx + 9) + ' ' + (g.belt - 4.2) + ' q2.4 -0.3 2.4 1.9 l0 1.3 l-2.4 0 z" fill="#37444d"/>';
    // ヘッドライト
    var f = g.front;
    s += '<path d="M' + (f - 14) + ' ' + g.fy(0.07) + ' L' + (f - 1.5) + ' ' + g.fy(0.12) + ' Q' + f + ' ' + g.fy(0.15) + ' ' + f + ' ' + g.fy(0.19) +
         ' L' + f + ' ' + g.fy(0.30) + ' L' + (f - 14) + ' ' + g.fy(0.26) + ' Z" fill="url(#' + id + '-lens)"/>';
    s += '<circle cx="' + (f - 5.4) + '" cy="' + g.fy(0.19) + '" r="2.2" fill="#3d5563"/>';
    s += '<circle cx="' + (f - 5.4) + '" cy="' + g.fy(0.19) + '" r="1.6" fill="#e8f4fb"/>';
    s += '<circle cx="' + (f - 5.4) + '" cy="' + g.fy(0.19) + '" r="0.65" fill="#ffffff"/>';
    s += '<path d="M' + (f - 13) + ' ' + g.fy(0.10) + ' L' + (f - 2.6) + ' ' + g.fy(0.15) + '" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" opacity=".95"/>';
    // テールランプ
    var r0 = g.rear;
    s += '<path d="M' + r0 + ' ' + g.fy(0.08) + ' L' + (r0 + 9) + ' ' + g.fy(0.10) + ' L' + (r0 + 9) + ' ' + g.fy(0.29) + ' L' + r0 + ' ' + g.fy(0.29) + ' Z" fill="url(#' + id + '-tail)"/>';
    s += '<path d="M' + (r0 + 0.6) + ' ' + g.fy(0.14) + ' L' + (r0 + 8.2) + ' ' + g.fy(0.155) +
         ' M' + (r0 + 0.6) + ' ' + g.fy(0.21) + ' L' + (r0 + 8.2) + ' ' + g.fy(0.222) + '" stroke="#ffd9cf" stroke-width="0.8" opacity=".85"/>';
    // バンパー
    s += '<path d="M' + (f - 17) + ' ' + g.fy(0.60) + ' L' + f + ' ' + g.fy(0.58) + ' L' + f + ' ' + g.rocker + ' L' + (f - 17) + ' ' + g.rocker + ' Z" fill="' + dk(color, 0.30) + '" opacity=".5"/>';
    s += '<path d="M' + r0 + ' ' + g.fy(0.60) + ' L' + (r0 + 17) + ' ' + g.fy(0.62) + ' L' + (r0 + 17) + ' ' + g.rocker + ' L' + r0 + ' ' + g.rocker + ' Z" fill="' + dk(color, 0.30) + '" opacity=".5"/>';
    // グリルとフォグ
    s += '<path d="M' + (f - 14) + ' ' + g.fy(0.70) + ' L' + (f - 1.5) + ' ' + g.fy(0.68) + ' L' + (f - 2) + ' ' + g.fy(0.86) + ' L' + (f - 14) + ' ' + g.fy(0.88) + ' Z" fill="#141c21"/>';
    for (var i = 0; i < 5; i++) {
      var gx = f - 13 + i * 2.4;
      s += '<path d="M' + gx + ' ' + g.fy(0.71) + ' L' + gx + ' ' + g.fy(0.86) + '" stroke="#2b363d" stroke-width="0.7"/>';
    }
    s += '<circle cx="' + (f - 16) + '" cy="' + g.fy(0.77) + '" r="1.5" fill="#cfe0ea"/>';
    s += '<circle cx="' + (f - 16) + '" cy="' + g.fy(0.77) + '" r="0.7" fill="#ffffff"/>';
    // ロッカーパネル
    s += '<path d="M' + g.fx(0.11) + ' ' + g.fy(0.85) + ' L' + g.fx(0.9) + ' ' + g.fy(0.84) + '" stroke="' + lt(color, 0.25) + '" stroke-width="0.5" opacity=".45"/>';
    s += '<path d="M' + g.fx(0.11) + ' ' + g.fy(0.86) + ' L' + g.fx(0.9) + ' ' + g.fy(0.85) + ' L' + g.fx(0.9) + ' ' + g.rocker + ' L' + g.fx(0.11) + ' ' + g.rocker + ' Z" fill="' + dk(color, 0.5) + '" opacity=".75"/>';
    // 給油口
    s += '<circle cx="' + g.fx(0.10) + '" cy="' + g.fy(0.30) + '" r="2.5" fill="none" stroke="' + gap + '" stroke-width="0.65" opacity=".65"/>';
    // アーチのふち
    [g.axR, g.axF].forEach(function (cx) {
      s += '<path d="M' + (cx - g.adx).toFixed(2) + ' ' + g.rocker.toFixed(2) + ' A' + g.archR + ' ' + g.archR + ' 0 ' + g.big + ' 1 ' + (cx + g.adx).toFixed(2) + ' ' + g.rocker.toFixed(2) +
           '" fill="none" stroke="' + dk(color, 0.55) + '" stroke-width="1.4"/>';
    });
    return s;
  }

  // ============================================================
  // 1台ぶん
  // ============================================================
  function carSvg(cfg, built, opt) {
    built = built || { body: true, color: true, tire: true };
    opt = opt || {};
    var id = opt.id || ('c' + (carSvg._n = (carSvg._n || 0) + 1));
    var g = geometry(cfg);
    // **塗装が済むまでは地の鉄の色**。ここで1回だけ決める。
    // 以前は defs() に選んだ色をそのまま渡していたので、車体の面だけ
    // built.color を無視して色が付いていた。
    var C = built.color ? COLORS[cfg.color].hex : BARE;
    var s = '';

    if (!built.body) {
      s = '<rect x="46" y="' + (GROUND - 17) + '" width="140" height="9" rx="2" fill="' + BARE + '"/>' +
          '<rect x="46" y="' + (GROUND - 9) + '" width="140" height="4" rx="2" fill="#75838b"/>';
      return wrap(s, id, C, opt);
    }

    s += engineRear(g, cfg.engine);
    s += addonArt(g, C);
    s += paintArt(id, g, C, built);
    s += glassArt(id, g, cfg.window, cfg.seat, built);
    s += engineFront(g, cfg.engine, C);
    s += detailArt(id, g, C, built);
    if (built.tire) {
      s += (g.T.track) ? trackArt(id, g) : (wheelArt(id, g, g.axR, opt.spin) + wheelArt(id, g, g.axF, opt.spin));
    } else {
      s += '<rect x="' + (g.axR - 10) + '" y="' + (GROUND - 8) + '" width="20" height="8" rx="1" fill="#5c6f79"/>';
      s += '<rect x="' + (g.axF - 10) + '" y="' + (GROUND - 8) + '" width="20" height="8" rx="1" fill="#5c6f79"/>';
    }
    return wrap(s, id, C, opt);
  }

  function wrap(inner, id, C, opt) {
    return '<svg viewBox="' + (opt.viewBox || ('0 0 ' + VIEW.w + ' ' + VIEW.h)) + '" xmlns="http://www.w3.org/2000/svg"' +
      (opt.svgId ? ' id="' + opt.svgId + '"' : '') + '><defs>' + defs(id, C) + '</defs>' + inner + '</svg>';
  }

  // ============================================================
  // 座標の決まりごと（自動チェック）
  // パーツを増やしたら、まずここに規則を足してから絵を描く。
  // ============================================================
  var RULES = [
    { name: 'タイヤが地面にぴったり接する',
      test: function (g) { return Math.abs((g.axY + g.T.r) - GROUND) < 0.001; } },
    { name: 'タイヤが車体の前後からはみ出さない',
      test: function (g) { return (g.axR - g.T.r) > g.rear && (g.axF + g.T.r) < g.front; } },
    { name: 'ホイールアーチが車体の前後に収まる',
      test: function (g) { return (g.axR - g.adx) > g.rear - 1 && (g.axF + g.adx) < g.front + 1; } },
    { name: '前後のタイヤが重ならない',
      test: function (g) { return g.T.track || (g.axF - g.axR) > g.T.r * 2 + 2; } },
    { name: '車体が横方向にviewBoxへ収まる',
      test: function (g) { return g.rear >= 0 && g.front <= VIEW.w; } },
    { name: '車の全高（やねの飾りを含む）がviewBoxへ収まる',
      test: function (g) { return g.addonTop >= 0; } },
    { name: '後ろに付くエンジンがviewBoxからはみ出さない',
      test: function (g, c) {
        if (c.engine === 'rocket') return (g.rear - 20) >= 0;
        if (c.engine === 'zenmai') return (g.rear - 22) >= 0;
        return true;
      } },
    { name: 'ボンネットに載るエンジンが収まる',
      test: function (g, c) {
        if (c.engine !== 'ookii' && c.engine !== 'entotsu') return true;
        return ((g.front - 10) - g.cabR) >= 20;
      } },
    { name: 'えんとつが上に伸びすぎない',
      test: function (g, c) { return c.engine !== 'entotsu' || (g.belt - 19.4) >= 0; } },
    { name: 'シートがキャビンの幅に収まる',
      test: function (g) { return (g.cabR - g.cabL) >= 40; } },
    { name: 'まどがキャビン枠の内側に収まる',
      test: function (g) {
        if (g.cabH <= 0.5) return true;
        var l = g.cabL + (g.roofL - g.cabL) * 0.62 + 2;
        var r = g.cabR - (g.cabR - g.roofR) * 0.62 - 2;
        return (r - l) >= 14 && (g.belt - 1.4) - (g.roofY + g.cabH * 0.10) >= 5;
      } },
    { name: 'プロペラが車体の幅に収まる',
      test: function (g) {
        if (g.R.addon !== 'propeller') return true;
        var cx = (g.roofL + g.roofR) / 2;
        var half = Math.min(30, (g.cabR - g.cabL) * 0.42);
        return (cx - half) >= 0 && (cx + half) <= VIEW.w;
      } },
    { name: '地上高が実車の範囲（タイヤ径の0.22〜0.34）',
      test: function (g) { var c = (GROUND - g.rocker) / (g.T.r * 2); return c >= 0.22 && c <= 0.34; } },
    { name: 'ホイールベースが全長の0.55〜0.66',
      test: function (g) { var t = (g.axF - g.axR) / g.len; return t >= 0.55 && t <= 0.66; } },
    // 全長とタイヤ径の比はボディの性格ごとに目安が違う（小さい車ほど小さい）。
    // 全ボディを1つの帯で見ると誤検出になるので、標準タイヤのときだけボディ固有の帯で見る。
    { name: '全長とタイヤ径の比がボディごとの目安に収まる',
      test: function (g, c) {
        if (c.tire !== 'futsu' || !g.B.lenRatio) return true;
        var t = g.len / (g.T.r * 2);
        return t >= g.B.lenRatio[0] && t <= g.B.lenRatio[1];
      } }
  ];

  function eachCombo(fn) {
    Object.keys(BODIES).forEach(function (body) {
    Object.keys(ROOFS).forEach(function (roof) {
    Object.keys(WINDOWS).forEach(function (win) {
    Object.keys(ENGINES).forEach(function (engine) {
    Object.keys(SEATS).forEach(function (seat) {
    Object.keys(TIRES).forEach(function (tire) {
      fn({ body: body, roof: roof, color: 0, window: win, engine: engine, seat: seat, tire: tire });
    }); }); }); }); }); });
  }

  function checkAll() {
    var fails = {}, total = 0, ng = 0;
    RULES.forEach(function (r) { fails[r.name] = []; });
    eachCombo(function (c) {
      var g = geometry(c);
      total++;
      RULES.forEach(function (r) {
        if (!r.test(g, c)) fails[r.name].push(c.body + '/' + c.roof + '/' + c.window + '/' + c.engine + '/' + c.seat + '/' + c.tire);
      });
    });
    RULES.forEach(function (r) { if (fails[r.name].length) ng++; });
    return { total: total, ngRules: ng, fails: fails, rules: RULES };
  }

  // ------------------------------------------------------------
  // 称号（車のタイプ）
  //
  // 各パーツが持つ tag（s=スポーツ度 / w=はたらく度 / x=へんてこ度）を
  // 6工程ぶん足して、いちばん高いタグを称号にする。
  // **計算式ではなく表から導出する**ので、パーツを増やすときは tag を
  // 書き足すだけでよい（ここの式を直さなくてよい）。
  // ------------------------------------------------------------
  var DEFAULT_PARTS = { body: 'futsu', roof: 'futsu', window: 'futsu', engine: 'futsu', seat: 'two', tire: 'futsu' };

  var TITLES = {
    futsu:  { name: 'ふつうの くるま', icon: '🚗' },
    sports: { name: 'スポーツカー',    icon: '🏁' },
    work:   { name: 'はたらく くるま', icon: '🚧' },
    hen:    { name: 'へんてこカー',    icon: '✨' }
  };

  function titleOf(cfg) {
    var axes = [
      ['body', BODIES], ['roof', ROOFS], ['window', WINDOWS],
      ['engine', ENGINES], ['seat', SEATS], ['tire', TIRES]
    ];
    var sum = { s: 0, w: 0, x: 0 }, custom = true;
    axes.forEach(function (a) {
      var key = cfg[a[0]] || DEFAULT_PARTS[a[0]];
      var p = a[1][key] || a[1][DEFAULT_PARTS[a[0]]];
      var t = (p && p.tag) || { s: 0, w: 0, x: 0 };
      sum.s += t.s; sum.w += t.w; sum.x += t.x;
      if (key === DEFAULT_PARTS[a[0]]) custom = false;
    });
    var k;
    if (sum.s === 0 && sum.w === 0 && sum.x === 0) k = 'futsu';
    // 同点は スポーツ → はたらく → へんてこ の順で優先する。
    // 仕様4.2では「意外性のため へんてこ を優先」としていたが、実際に数えると
    // へんてこカーが全組み合わせの2/3を占めた。3回に2回出るものは意外ではなく既定値で、
    // 狙いが裏返る。へんてこは「振り切った選択をしたときのごほうび」に戻す。
    else if (sum.s >= sum.w && sum.s >= sum.x) k = 'sports';
    else if (sum.w >= sum.x) k = 'work';
    else k = 'hen';
    return { key: k, name: TITLES[k].name, icon: TITLES[k].icon, custom: custom, score: sum };
  }

  // 称号が特定のものに偏っていないかを数える（検証ページ用）。
  // 4.2 の重みは暫定なので、遊ぶ前にまず分布で当たりを付ける。
  function titleStats() {
    var n = { futsu: 0, sports: 0, work: 0, hen: 0 }, total = 0, custom = 0;
    eachCombo(function (c) {
      var t = titleOf(c); n[t.key]++; total++; if (t.custom) custom++;
    });
    return { counts: n, total: total, custom: custom };
  }

  root.CarParts = {
    VIEW: VIEW, GROUND: GROUND, BARE: BARE,
    BODIES: BODIES, ROOFS: ROOFS, WINDOWS: WINDOWS, ENGINES: ENGINES, SEATS: SEATS, TIRES: TIRES,
    COLORS: COLORS,
    geometry: geometry, carSvg: carSvg, defs: defs,
    RULES: RULES, eachCombo: eachCombo, checkAll: checkAll,
    DEFAULT_PARTS: DEFAULT_PARTS, TITLES: TITLES, titleOf: titleOf, titleStats: titleStats,
    partIcon: partIcon
  };
})(typeof window !== 'undefined' ? window : globalThis);
