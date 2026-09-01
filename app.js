(function () {
  'use strict';

  // ============================================================
  // くるまこうじょう（第3段階）
  //
  //   工場に入る → ①プレス → ②組み立て → ③塗装 → ④まど → ⑤エンジン
  //   → ⑥シート → ⑦タイヤ → 検査（お披露目）→ 納車 → 入荷 → ガレージ
  //
  // 第3段階で入れたもの
  //   ① 各工程を「指を動かす操作」にした（選ぶだけ → 自分で作る）
  //   ② ガレージ（作った車が自分のものとして残る）
  //   ③ パーツの入荷（遊ぶほど選択肢が増える）
  //   ④ まえのくるまと くらべる（2台同時に走らせる）
  //   ⑤ 工場のライン音と読み上げの枠
  //   ⑥ 検査（お披露目）の場面
  //   ⑦ つづきから（作りかけを保存）
  //
  // 5歳児向けの絶対条件：**操作で詰まらせない**。
  // どの操作も、一定時間さわらなければ自動で進む。操作は達成感のためにあり、
  // 関門ではない。ここを間違えると、できない子がアプリごと嫌いになる。
  // ============================================================

  var CP = window.CarParts;

  var STEPS = [
    // 順番の意味：**やねは後半**に置く。先に屋根をかぶせると、シートを入れても
    // 中が見えず「入った」ことが分からない（実機で指摘を受けた）。
    // 車体 → 色 → エンジン → シート（屋根なしで丸見え）→ やね → まど → タイヤ。
    { key: 'body',   icon: '🔧', title: 'かたちを つくろう', axis: CP.BODIES,  task: 'lever' },
    { key: 'color',  icon: '🎨', title: 'いろを ぬろう',     axis: null,       task: 'rub' },
    { key: 'engine', icon: '⚙️', title: 'エンジンを つもう', axis: CP.ENGINES, task: 'crane' },
    { key: 'seat',   icon: '💺', title: 'シートを いれよう', axis: CP.SEATS,   task: 'fit' },
    { key: 'roof',   icon: '🏗', title: 'やねを つけよう',   axis: CP.ROOFS,   task: 'trace' },
    { key: 'window', icon: '🪟', title: 'まどを はめよう',   axis: CP.WINDOWS, task: 'fit' },
    { key: 'tire',   icon: '◎',  title: 'タイヤを つけよう', axis: CP.TIRES,   task: 'bolts' }
  ];

  // ③ 入荷の順番。最初の2つは「ふつう」＋いちばん違いが分かるもの。
  var UNLOCK_ORDER = {
    body:   ['futsu', 'marui', 'nagai', 'chiisai', 'shikaku'],
    roof:   ['futsu', 'nashi', 'hikui', 'nimotsu', 'puropera', 'ouchi'],
    window: ['futsu', 'marumado', 'ookii', 'renzoku', 'chiisai'],
    engine: ['futsu', 'ookii', 'rocket', 'zenmai', 'entotsu'],
    seat:   ['two', 'four', 'sofa', 'bench', 'tatami'],
    tire:   ['futsu', 'dekoboko', 'futoi', 'pikapika', 'catapira']
  };
  var START_CHOICES = 2;

  var BASE_RUN_MS = 2600;

  var state = {
    screen: 'title',
    stepIndex: 0,
    car:   { body: 'futsu', roof: 'futsu', color: 0, window: 'futsu', engine: 'futsu', seat: 'two', tire: 'futsu' },
    built: { body: false, roof: false, color: false, window: false, engine: false, seat: false, tire: false },
    made: 0,          // 作った台数。これで解放数が決まる
    newParts: [],     // 直前に増えたパーツ（入荷画面で見せる）
    mishap: null,     // 今回の納車で起きたハプニング（'gas'|'flat'|'cat'|null）
    mishapRolled: false, // 抽選済みか。画面を作り直しても結果を変えないための札
    comparePair: null,   // くらべる2台。null なら「まえの車 vs いまの車」
    detail: null         // ガレージで大きく見ている車
  };

  var screenEl = document.getElementById('screen');
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ============================================================
  // 保存（端末のlocalStorageのみ。外部通信はしない）
  // ============================================================
  // last = いちばん最近つくった車 / prev = その1台前（くらべる相手）
  var KEY = { garage: 'kuruma-garage', made: 'kuruma-made', wip: 'kuruma-wip',
              last: 'kuruma-last', prev: 'kuruma-prev' };
  function load(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function drop(k) { try { localStorage.removeItem(k); } catch (e) {} }

  function garage() { var g = load(KEY.garage, []); return Array.isArray(g) ? g : []; }
  function carKey(c) { return [c.body, c.roof, c.color, c.window, c.engine, c.seat, c.tire].join('-'); }
  // 称号は tag から導けるので保存しない（あとで重みを直せば記録側も直る）。
  // ハプニングは導けないので、起きた種類をそのまま残す（4.7）。
  function addToGarage(c, mishap) {
    var g = garage(), k = carKey(c);
    if (!g.some(function (x) { return carKey(x) === k; })) {
      g.unshift(Object.assign({ at: Date.now(), mishap: mishap || null }, c));
      if (g.length > 60) g.length = 60;
      save(KEY.garage, g);
    }
  }
  // ⑦ つづきから
  function saveWip() { save(KEY.wip, { car: state.car, built: state.built, stepIndex: state.stepIndex }); }
  function hasWip() { var w = load(KEY.wip, null); return !!(w && w.built && !w.built.tire); }

  // ③ いま選べる数
  function unlockedCount(axisKey) {
    var max = UNLOCK_ORDER[axisKey].length;
    return Math.min(max, START_CHOICES + state.made);
  }
  function unlockedKeys(axisKey) { return UNLOCK_ORDER[axisKey].slice(0, unlockedCount(axisKey)); }

  // ============================================================
  // 描画用の設定
  // ============================================================
  function carCfg(overrides) {
    var c = {
      body: state.car.body,
      roof: state.built.roof ? state.car.roof : 'nashi',
      color: state.car.color,
      window: state.car.window,
      engine: state.built.engine ? state.car.engine : 'futsu',
      seat: state.car.seat,
      tire: state.built.tire ? state.car.tire : 'futsu'
    };
    if (overrides) for (var k in overrides) c[k] = overrides[k];
    return c;
  }
  function builtNow(o) {
    var b = {};
    for (var k in state.built) b[k] = state.built[k];
    if (o) for (var j in o) b[j] = o[j];
    return b;
  }
  var FULL_BUILT = { body: true, color: true, window: true, seat: true, tire: true };

  // ============================================================
  // デバッグ用URLパラメータ
  //   ?debug=1&to=deliver&fast=1&made=5&step=3
  //   &force=gas|flat|cat|none  ハプニングを確定させる（確率を無視する）
  //   &freeze=1                 ハプニングの見せ場で止める（撮影・確認用）
  // ============================================================
  var Debug = (function () {
    var q = {};
    location.search.replace(/^\?/, '').split('&').forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf('=');
      q[decodeURIComponent(i < 0 ? kv : kv.slice(0, i))] = i < 0 ? '1' : decodeURIComponent(kv.slice(i + 1));
    });
    var api = { on: q.debug === '1', fast: false, noTask: false, force: '', freeze: false };
    if (!api.on) return api;
    api.fast = q.fast === '1';
    api.noTask = q.notask === '1';     // 操作を飛ばして流れだけ見る
    api.force = q.force || '';         // ハプニングを確定させる
    api.freeze = q.freeze === '1';     // ハプニングの見せ場で止める
    if (q.made != null) state.made = Number(q.made) || 0;
    ['body', 'roof', 'window', 'engine', 'seat', 'tire'].forEach(function (k) {
      var set = { body: CP.BODIES, roof: CP.ROOFS, window: CP.WINDOWS, engine: CP.ENGINES, seat: CP.SEATS, tire: CP.TIRES }[k];
      if (q[k] && set[q[k]]) state.car[k] = q[k];
      else if (q[k]) console.warn('[debug] ' + k + '=' + q[k] + ' は不正。使える値: ' + Object.keys(set).join(' / '));
    });
    if (q.color != null && CP.COLORS[Number(q.color)]) state.car.color = Number(q.color);
    if (q.to) {
      Object.keys(state.built).forEach(function (k) { state.built[k] = true; });
      state.screen = q.to;             // 'deliver' | 'inspect' | 'garage' | 'compare' | 'restock'
      console.warn('[debug] to=' + q.to + '：人の操作を伴わないため音は鳴らない（絵の検証専用）');
    } else if (q.step != null) {
      var n = Math.max(0, Math.min(STEPS.length - 1, Number(q.step)));
      for (var i = 0; i < n; i++) state.built[STEPS[i].key] = true;
      state.stepIndex = n; state.screen = 'step';
    }
    if (document.hidden) console.warn('[debug] タブが裏にあるためタイマーが間引かれ、演出の時刻が崩れる');
    return api;
  })();
  function ms(v) { return Debug.fast ? Math.round(v * 0.25) : v; }

  // ============================================================
  // タイマー管理
  // ============================================================
  var timeoutIds = [], intervalIds = [], rafIds = [];
  function later(fn, t) { var id = setTimeout(fn, t); timeoutIds.push(id); return id; }
  function every(fn, t) { var id = setInterval(fn, t); intervalIds.push(id); return id; }
  function frame(fn) { var id = requestAnimationFrame(fn); rafIds.push(id); return id; }
  function nextPaint(fn) {
    var done = false;
    function run() { if (done) return; done = true; fn(); }
    frame(function () { frame(run); });
    later(run, 90);
  }
  function clearAllTimers() {
    timeoutIds.forEach(clearTimeout); intervalIds.forEach(clearInterval); rafIds.forEach(cancelAnimationFrame);
    timeoutIds = []; intervalIds = []; rafIds = [];
  }

  // ============================================================
  // 音
  // ============================================================
  var Sound = (function () {
    var ctx = null, master = null, noiseBuf = null;
    var muted = false, loops = {}, buffers = {}, bgmWanted = false;
    var MASTER_VOL = 0.42, VOICE_VOL = 1.3;

    try { muted = localStorage.getItem('kuruma-mute') === '1'; } catch (e) {}

    // ⑤ 読み上げ。sounds/ にファイルがあれば使い、無ければ黙って合成音だけで進む。
    // 文字が読めない5歳向けなので、録音が入ると効きが大きい。
    // セリフの台本は 車の工場-録音台本.md にある。キー名はそこと1対1。
    // ファイルが無いものは fetch が失敗し、黙って合成音だけで進む（loadVoices 参照）。
    var VOICE = {
      // 選ぶ画面に入ったとき（「どんな○○にする？」）。屋根（roof）は録音しない決定なので無し。
      'step-body': 'sounds/step-body.mp3', 'step-color': 'sounds/step-color.mp3',
      'step-engine': 'sounds/step-engine.mp3', 'step-seat': 'sounds/step-seat.mp3',
      'step-window': 'sounds/step-window.mp3', 'step-tire': 'sounds/step-tire.mp3',
      // 短い合いの手（複数の場面で使い回す）
      'dekita': 'sounds/dekita.mp3', 'arigatou': 'sounds/arigatou.mp3'
    };

    function ensure() {
      try {
        if (!ctx) {
          var C = window.AudioContext || window.webkitAudioContext;
          if (!C) return false;
          ctx = new C();
          master = ctx.createGain();
          master.gain.value = muted ? 0 : MASTER_VOL;
          master.connect(ctx.destination);
          loadVoices();
        }
        if (ctx.state === 'suspended') ctx.resume();
        return true;
      } catch (e) { return false; }
    }
    function loadVoices() {
      Object.keys(VOICE).forEach(function (k) {
        fetch(VOICE[k]).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
          .then(function (ab) { return ctx.decodeAudioData(ab); })
          .then(function (b) { buffers[k] = b; })
          .catch(function () { /* 素材が無ければ黙って進む */ });
      });
    }
    // resume() は非同期。解けてから BGM を鳴らしはじめる。
    function unlock() {
      if (!ensure()) return;
      if (ctx.state === 'running') { if (bgmWanted) startBgm(); return; }
      try { ctx.resume().then(function () { if (bgmWanted) startBgm(); }).catch(function () {}); } catch (e) {}
    }
    function setMuted(m) {
      muted = !!m;
      try { localStorage.setItem('kuruma-mute', muted ? '1' : '0'); } catch (e) {}
      if (master) master.gain.setTargetAtTime(muted ? 0 : MASTER_VOL, ctx.currentTime, 0.02);
      if (muted) { allOff(0.05); stopLoop('bgm', 0.05); }
    }
    function toggleMuted() { setMuted(!muted); return muted; }
    function isMuted() { return muted; }

    function getNoise() {
      if (noiseBuf) return noiseBuf;
      var len = ctx.sampleRate * 2;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return noiseBuf;
    }
    function tone(o) {
      if (!ensure() || muted) return;
      var t = ctx.currentTime + (o.at || 0);
      var osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.freq, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.vol == null ? 0.18 : o.vol, t + (o.attack == null ? 0.008 : o.attack));
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + o.dur + 0.05);
    }
    function noiseHit(o) {
      if (!ensure() || muted) return;
      var t = ctx.currentTime + (o.at || 0);
      var src = ctx.createBufferSource(); src.buffer = getNoise();
      var f = ctx.createBiquadFilter();
      f.type = o.filter || 'lowpass';
      f.frequency.setValueAtTime(o.freq || 800, t);
      if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t + o.dur);
      f.Q.value = o.Q || 0.7;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.vol == null ? 0.14 : o.vol, t + (o.attack || 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t); src.stop(t + o.dur + 0.05);
    }
    function startLoop(name, build) { if (ensure() && !muted && !loops[name]) loops[name] = build(); }
    function stopLoop(name, fade) {
      var n = loops[name]; if (!n) return;
      delete loops[name];
      var f = fade == null ? 0.25 : fade;
      try {
        if (n.extra) n.extra();
        n.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, f / 3);
        n.nodes.forEach(function (s) { try { s.stop(ctx.currentTime + f + 0.1); } catch (e) {} });
      } catch (e) {}
    }
    // 画面遷移のたびに呼ぶ。BGMだけは対象外にして、工程をまたいで切れないようにする。
    function allOff(fade) { Object.keys(loops).forEach(function (k) { if (k !== 'bgm') stopLoop(k, fade); }); }
    function noiseLoop(name, freq, q, vol) {
      startLoop(name, function () {
        var src = ctx.createBufferSource(); src.buffer = getNoise(); src.loop = true;
        var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.12);
        src.connect(f); f.connect(g); g.connect(master); src.start();
        return { gain: g, nodes: [src] };
      });
    }
    function say(key) {
      if (!ensure() || muted || !buffers[key]) return false;
      var src = ctx.createBufferSource(); src.buffer = buffers[key];
      var g = ctx.createGain(); g.gain.value = VOICE_VOL;
      src.connect(g); g.connect(master); src.start();
      return true;
    }

    // ⑤ 工場のBGM。
    //
    // 低いうなり（工場の地の音）＋ 跳ねるメロディ＋ベース。
    // うなりだけだと「作業BGM」で、5歳児には楽しく聞こえなかった。
    // 音階は **ペンタトニック** に限る。外れた音が出ないので、
    // 適当に鳴らしても不協和にならず、ずっと流していても耳に痛くない。
    var SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19];   // ド レ ミ ソ ラ …
    var MELODY = [                                  // SCALE の添字。-1 は休み
      0, 2, 3, 2, 4, 3, 2, -1,
      1, 3, 4, 3, 5, 4, 3, -1,
      2, 4, 5, 4, 6, 5, 4, -1,
      3, 2, 1, 2, 0, -1, -1, -1
    ];
    var BASSLINE = [0, -1, 3, -1, 4, -1, 2, -1];
    function noteHz(semi) { return 261.63 * Math.pow(2, semi / 12); }

    function startBgm() {
      startLoop('bgm', function () {
        // --- 地の音（工場のうなり） ---
        var o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
        o1.type = 'sawtooth'; o1.frequency.value = 41;
        o2.type = 'sine'; o2.frequency.value = 62;
        var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 190;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + 1.2);
        o1.connect(f); o2.connect(f); f.connect(g); g.connect(master);
        o1.start(); o2.start();

        // --- メロディ ---
        // setInterval で1音ずつ鳴らすとリズムが揺れる。**少し先まで
        // まとめて予約する**（先読み）ことで、拍がそろう。
        var BPM = 116, spb = 30 / BPM;      // 8分音符ぶんの秒数
        var nextAt = ctx.currentTime + 0.2, step = 0;
        var seq = setInterval(function () {
          var horizon = ctx.currentTime + 0.5;
          while (nextAt < horizon) {
            // tone の at は「いまから何秒後か」なので、絶対時刻から引き直す。
            var rel = Math.max(0, nextAt - ctx.currentTime);
            var m = MELODY[step % MELODY.length];
            if (m >= 0) {
              tone({ at: rel, freq: noteHz(SCALE[m] + 12), dur: spb * 1.6, vol: 0.05, type: 'triangle' });
            }
            if (step % 4 === 0) {
              var b = BASSLINE[(step / 4) % BASSLINE.length];
              if (b >= 0) tone({ at: rel, freq: noteHz(SCALE[b] - 12), dur: spb * 3, vol: 0.06, type: 'sine' });
            }
            // 裏拍の軽い刻み。工場らしさを残しつつ、拍が分かるようにする。
            if (step % 4 === 2) noiseHit({ at: rel, freq: 5200, freqTo: 3400, dur: 0.05, vol: 0.018, filter: 'highpass' });
            nextAt += spb; step++;
          }
        }, 120);

        // ラインが動くカシャン。等間隔だと機械的すぎるので少し揺らす。
        var t = setInterval(function () {
          if (muted) return;
          noiseHit({ freq: 320, freqTo: 110, dur: 0.22, vol: 0.03 });
        }, 3400 + Math.random() * 1200);
        return { gain: g, nodes: [o1, o2],
                 extra: function () { clearInterval(t); clearInterval(seq); } };
      });
    }

    return {
      unlock: unlock, setMuted: setMuted, toggleMuted: toggleMuted, isMuted: isMuted, allOff: allOff, say: say,
      bgmOn: function () { bgmWanted = true; startBgm(); },
      bgmOff: function () { bgmWanted = false; stopLoop('bgm', 0.6); },

      // 切り替えの音。1音だと素っ気ないので、上に軽く重ねる。
      tap: function () {
        tone({ freq: 784, to: 988, dur: 0.08, vol: 0.11, type: 'triangle' });
        tone({ at: 0.03, freq: 1568, dur: 0.06, vol: 0.045, type: 'sine' });
      },
      done: function () { tone({ freq: 880, to: 1320, dur: 0.18, vol: 0.15, type: 'triangle' }); },
      // 「これに する！」を押したときの決定音。上がる3音でうれしくする。
      confirm: function () {
        [659, 880, 1319].forEach(function (fz, i) {
          tone({ at: i * 0.07, freq: fz, dur: 0.24, vol: 0.14, type: 'triangle' });
        });
        noiseHit({ at: 0.02, freq: 6000, freqTo: 2600, dur: 0.18, vol: 0.05, filter: 'highpass' });
      },
      // 検査でひとつ確認できたときの合図。
      checkOk: function () {
        tone({ freq: 1046, dur: 0.1, vol: 0.13, type: 'triangle' });
        tone({ at: 0.08, freq: 1568, dur: 0.16, vol: 0.11, type: 'triangle' });
      },
      // 操作中の手ごたえ。少し動かすたびに小さく鳴らす。
      tick: function (p) { tone({ freq: 500 + p * 700, dur: 0.05, vol: 0.06, type: 'square' }); },
      // 次の工程の「どんな○○にする？」と被らないよう、鳴らした音の長さぶん
      // 待ってから進められるように、必要な待ち時間（ms）を返す。
      cheer: function () {
        if (say('dekita')) {
          var b = buffers['dekita'];
          return (b ? Math.ceil(b.duration * 1000) : 1400) + 300;
        }
        [660, 880, 1175].forEach(function (f, i) { tone({ at: i * 0.09, freq: f, dur: 0.22, vol: 0.15, type: 'triangle' }); });
        return 500;
      },

      pressDown: function () { tone({ freq: 90, to: 55, dur: 1.0, vol: 0.1, type: 'sawtooth' }); },
      pressHit: function () {
        noiseHit({ freq: 420, freqTo: 90, dur: 0.5, vol: 0.3, attack: 0.002 });
        tone({ freq: 150, to: 60, dur: 0.45, vol: 0.22, type: 'square' });
        noiseHit({ at: 0.28, freq: 5200, freqTo: 1800, dur: 0.9, vol: 0.07, filter: 'highpass' });
      },
      weldOn: function () { noiseLoop('weld', 2400, 1.6, 0.075); },
      weldOff: function () { stopLoop('weld', 0.15); },
      weldPop: function () { noiseHit({ freq: 3600, freqTo: 1200, dur: 0.14, vol: 0.1, filter: 'highpass' }); },
      sprayOn: function () { noiseLoop('spray', 3200, 0.9, 0.09); },
      sprayOff: function () { stopLoop('spray', 0.2); },
      click: function () {
        tone({ freq: 2200, to: 1400, dur: 0.06, vol: 0.13, type: 'square' });
        tone({ at: 0.05, freq: 1600, to: 2400, dur: 0.08, vol: 0.09, type: 'triangle' });
      },
      drop: function () {
        noiseHit({ freq: 260, freqTo: 70, dur: 0.55, vol: 0.26, attack: 0.002 });
        tone({ freq: 110, to: 48, dur: 0.5, vol: 0.18, type: 'square' });
      },
      pof: function () { noiseHit({ freq: 900, freqTo: 220, dur: 0.28, vol: 0.13 }); },
      bolt: function () { tone({ freq: 1500, to: 900, dur: 0.09, vol: 0.12, type: 'square' }); },
      engineStart: function () {
        tone({ freq: 70, to: 160, dur: 0.7, vol: 0.16, type: 'sawtooth' });
        noiseHit({ freq: 700, freqTo: 300, dur: 0.6, vol: 0.1 });
      },
      engineLoop: function () {
        startLoop('engine', function () {
          var o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
          o.type = 'sawtooth'; o.frequency.value = 88;
          o2.type = 'square'; o2.frequency.value = 44;
          var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
          g.gain.setValueAtTime(0.0001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.25);
          o.connect(f); o2.connect(f); f.connect(g); g.connect(master);
          o.start(); o2.start();
          return { gain: g, nodes: [o, o2] };
        });
      },
      shutter: function () { noiseHit({ freq: 900, freqTo: 200, dur: 1.1, vol: 0.12 }); },
      // ベルトで運ばれてくる音。低くごろごろ鳴らす。
      rollIn: function () {
        noiseHit({ freq: 300, freqTo: 130, dur: 0.85, vol: 0.09 });
        tone({ freq: 58, to: 76, dur: 0.8, vol: 0.09, type: 'sawtooth' });
        tone({ at: 0.55, freq: 76, to: 52, dur: 0.35, vol: 0.07, type: 'sawtooth' });
      },

      // ハプニングの音。**こわい音は使わない**（破裂・衝突・サイレン）。
      // ガス欠はエンジンが力なく止まる音、パンクは空気がぬける音、ねこは鳴き声。
      sputter: function () {
        [150, 118, 92, 72].forEach(function (f, i) {
          tone({ at: i * 0.17, freq: f, to: f * 0.68, dur: 0.15, vol: 0.15, type: 'sawtooth' });
        });
      },
      hiss: function () { noiseHit({ freq: 2600, freqTo: 420, dur: 1.0, vol: 0.09, filter: 'highpass' }); },
      meow: function () {
        tone({ freq: 620, to: 920, dur: 0.2, vol: 0.13, type: 'triangle' });
        tone({ at: 0.19, freq: 900, to: 540, dur: 0.36, vol: 0.12, type: 'triangle' });
      },
      // 直ったときの合図。上がる2音で「よかった」を伝える。
      fixed: function () {
        [784, 1047].forEach(function (f, i) { tone({ at: i * 0.12, freq: f, dur: 0.3, vol: 0.15, type: 'triangle' }); });
      },
      arrive: function () {
        if (say('arigatou')) return;
        [523, 659, 784, 1047].forEach(function (f, i) { tone({ at: i * 0.13, freq: f, dur: 0.42, vol: 0.16, type: 'triangle' }); });
      },
      restock: function () {
        [392, 523, 659, 784, 1047].forEach(function (f, i) { tone({ at: i * 0.11, freq: f, dur: 0.3, vol: 0.15, type: 'triangle' }); });
      }
    };
  })();

  // ============================================================
  // 粒子レイヤー
  // ============================================================
  var FX = (function () {
    var cv = null, c2 = null, running = false, rafId = 0;
    var parts = [], MAX = 260, w = 0, h = 0, dpr = 1;
    function attach(canvas) { cv = canvas; c2 = cv.getContext('2d'); resize(); running = true; loop(); }
    function resize() {
      if (!cv) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      c2.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0; parts.length = 0; cv = null; c2 = null; }
    function add(p) { if (c2 && parts.length < MAX) parts.push(p); }
    function spark(x, y, n, spread) {
      for (var i = 0; i < n; i++) add({ kind: 'spark', x: x, y: y,
        vx: (Math.random() - 0.5) * spread * 0.34, vy: -(Math.random() * spread * 0.24),
        r: 1.2 + Math.random() * 1.8, grow: -0.02, life: 0, max: 22 + Math.random() * 18,
        hue: 38 + Math.random() * 14, lum: 66 + Math.random() * 20 });
    }
    function mist(x, y, n, spread, hue) {
      for (var i = 0; i < n; i++) add({ kind: 'mist', x: x + (Math.random() - 0.5) * spread, y: y + (Math.random() - 0.5) * spread,
        vx: (Math.random() - 0.5) * 0.5, vy: 0.2 + Math.random() * 0.5,
        r: 2 + Math.random() * 3.5, grow: 0.22, life: 0, max: 24 + Math.random() * 14, hue: hue, lum: 62 + Math.random() * 14 });
    }
    function steam(x, y, n, spread) {
      for (var i = 0; i < n; i++) add({ kind: 'steam', x: x + (Math.random() - 0.5) * spread, y: y,
        vx: (Math.random() - 0.5) * 1.1, vy: -(0.4 + Math.random() * 0.9),
        r: 3 + Math.random() * 5, grow: 0.3, life: 0, max: 34 + Math.random() * 20, hue: 205, lum: 88 });
    }
    function dust(x, y, n, spread) {
      for (var i = 0; i < n; i++) add({ kind: 'dust', x: x + (Math.random() - 0.5) * spread, y: y,
        vx: (Math.random() - 0.5) * 2.2, vy: -(0.2 + Math.random() * 0.7),
        r: 2 + Math.random() * 3.5, grow: 0.22, life: 0, max: 26 + Math.random() * 16, hue: 36, lum: 66 });
    }
    function star(x, y, n) {
      for (var i = 0; i < n; i++) add({ kind: 'spark', x: x, y: y,
        vx: (Math.random() - 0.5) * 5, vy: -(1 + Math.random() * 3),
        r: 1.6 + Math.random() * 2.2, grow: -0.01, life: 0, max: 36 + Math.random() * 22,
        hue: 45 + Math.random() * 25, lum: 74 + Math.random() * 18 });
    }
    function loop() {
      if (!running || !c2) return;
      c2.clearRect(0, 0, w, h);
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i]; p.life++;
        if (p.life > p.max) { parts.splice(i, 1); continue; }
        var t = p.life / p.max;
        p.x += p.vx; p.y += p.vy;
        if (p.kind === 'spark') p.vy += 0.09; else { p.vx *= 0.98; p.vy *= 0.985; }
        p.r += p.grow;
        var alpha = p.kind === 'spark' ? (1 - t) * 0.95 : p.kind === 'mist' ? (1 - t) * 0.5
          : p.kind === 'steam' ? (1 - t) * 0.34 : (1 - t) * 0.45;
        if (alpha <= 0.01 || p.r <= 0) continue;
        c2.globalAlpha = alpha;
        c2.fillStyle = 'hsl(' + p.hue + ',' + (p.kind === 'steam' ? 10 : p.kind === 'mist' ? 70 : 62) + '%,' + p.lum + '%)';
        c2.beginPath(); c2.arc(p.x, p.y, p.r, 0, 6.284); c2.fill();
      }
      c2.globalAlpha = 1;
      rafId = requestAnimationFrame(loop);
    }
    return { attach: attach, stop: stop, resize: resize, spark: spark, mist: mist, steam: steam, dust: dust, star: star };
  })();

  // ============================================================
  // 車の絵
  // ============================================================
  var svgSeq = 0;
  function carSvg(cfg, built, opt) {
    opt = opt || {};
    // グラデーションの id は描画ごとに採番する。選択肢を横に並べる画面では、
    // 固定 id にすると隣の車と衝突して色が壊れる。
    opt.id = 'k' + (svgSeq++);
    return CP.carSvg(cfg, built, opt);
  }
  // その工程で選べるもの一覧。色だけ値が数字なので、ここで形をそろえる。
  function optionsFor(st) {
    if (st.key === 'color') {
      return CP.COLORS.map(function (c, i) { return { value: i, label: c.label, hex: c.hex }; });
    }
    return unlockedKeys(st.key).map(function (k) { return { value: k, label: st.axis[k].label }; });
  }

  // 塗装のスプレー缶。色の工程は「缶を選ぶ」形にする。
  // 車の色見本だけだと何をする工程か伝わらないが、缶なら
  // 「これで塗るんだ」が一目で分かる。塗るときも同じ缶が指についてくる。
  function sprayCan(hex, cls) {
    return '<svg class="spray-can' + (cls ? ' ' + cls : '') + '" viewBox="0 0 44 104">' +
      '<defs><linearGradient id="sc' + (svgSeq) + '" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0" stop-color="#ffffff" stop-opacity=".55"/>' +
        '<stop offset=".35" stop-color="#ffffff" stop-opacity="0"/>' +
        '<stop offset=".8" stop-color="#000000" stop-opacity=".22"/></linearGradient></defs>' +
      // ノズルとキャップ
      '<rect x="16" y="2" width="12" height="7" rx="2" fill="#8f9ba2"/>' +
      '<rect x="13" y="8" width="18" height="7" rx="3.5" fill="#b9c4ca"/>' +
      '<rect x="17" y="14" width="10" height="6" fill="#7e8a91"/>' +
      // 胴（選んだ色）
      '<rect x="6" y="19" width="32" height="78" rx="7" fill="' + hex + '"/>' +
      '<rect x="6" y="19" width="32" height="78" rx="7" fill="url(#sc' + (svgSeq++) + ')"/>' +
      // ラベル
      '<rect x="6" y="44" width="32" height="22" fill="#fffdf6" opacity=".93"/>' +
      '<circle cx="22" cy="55" r="7" fill="' + hex + '"/>' +
      // 底
      '<rect x="6" y="90" width="32" height="7" rx="3" fill="#6f7b82" opacity=".5"/>' +
      '</svg>';
  }

  // 候補を1台ぶん描く。**その工程まで作り終えた姿**で見せる。
  // 「これを選ぶとどうなるか」をそのまま見せるのが選択の目的なので、
  // 完成形でも作りかけでもなく「選んだ直後の姿」にする。
  function pickSvg(st, o) {
    if (st.key === 'engine' || st.key === 'seat') {
      // 組み込んだ姿ではなく、パーツそのものを見せる。
      // 車の中に埋もれると違いが伝わらない（エンジンは外から見えにくく、
      // シートは屋根の陰に隠れがち）。単体で見せてから「はめ込む」演出につなぐ。
      return '<div class="part-pick">' + CP.partIcon(st.key, o.value) + '</div>';
    }
    var over = {}, built = {};
    if (st.key === 'color') over.color = o.value; else over[st.key] = o.value;
    built[st.key] = true;      // まだ built でなくても、選んだ結果は見せる
    var car = carSvg(carCfg(over), builtNow(built), {});
    if (st.key !== 'color') return car;
    // 色の工程だけ、缶を手前に立てる。缶が主役で、後ろの車は「こうなるよ」の見本。
    return '<div class="paint-pick">' + car + sprayCan(o.hex) + '</div>';
  }
  // ============================================================
  // ハプニング（走る場面だけで起きる）
  //
  // 工程の途中では何も失敗させない（4.4）。走る場面でだけ25%で起きる。
  // **必ず解決して、必ず届く。距離も称号も減らさない。**
  // 前作で「ごほうびが減ると落ち込むだけで、やり直す気にならない」と分かったため。
  // 走る時間（runMs）は2区間に割るだけで合計は変えない。止まっている時間は別で足す。
  // ============================================================
  var MISHAP_RATE = 0.25;
  var MISHAPS = {
    gas:  { icon: '⛽', say: 'あっ ガソリンが なくなった！', fix: 'きゅうゆしゃが きたよ！', sound: 'sputter', actor: '🚛' },
    flat: { icon: '🔧', say: 'タイヤが パンクしちゃった！',   fix: 'なおったよ！',           sound: 'hiss',    actor: '👷' },
    cat:  { icon: '🐈', say: 'ねこが よこぎった！',           fix: 'ねこ、いっちゃった',     sound: 'meow',    actor: '🐈' }
  };
  function rollMishap() {
    // デバッグの force は **確率を無視して必ず出す**。
    // 「25%だから今回は出ない」で検証が空振りするのを防ぐ（前作でこれを踏んだ）。
    if (Debug.force) return MISHAPS[Debug.force] ? Debug.force : null;
    if (Math.random() >= MISHAP_RATE) return null;
    var k = Object.keys(MISHAPS);
    return k[Math.floor(Math.random() * k.length)];
  }

  function runMsOf(c) {
    var m = CP.BODIES[c.body].w * CP.ENGINES[c.engine].w * CP.TIRES[c.tire].w;
    return Math.round(BASE_RUN_MS * m);
  }

  // ============================================================
  // ① 操作（Task）
  //
  // 5歳の指でできる5種だけに絞る：引く／なぞる／こする／はめる／たたく。
  // **どれも一定時間さわらなければ自動で完了する。**
  // 操作は達成感のためにあり、関門ではない。ここで詰まらせない。
  // ============================================================
  var Task = (function () {
    var layer = null, cleanup = null;
    // これだけ進まなければ自動で完了する。5歳児の集中は短いので、
    // 工程1つは「やった」と思えるだけの手数で切り上げる。
    var AUTO_MS = 4500;

    function end() {
      if (cleanup) { cleanup(); cleanup = null; }
      var n = document.getElementById('nudge'); if (n) n.remove();
      if (layer) { layer.remove(); layer = null; }
    }

    function begin(kind, opt, onProgress, onDone) {
      end();
      layer = document.createElement('div');
      layer.className = 'task-layer';
      screenEl.appendChild(layer);

      var done = false, progress = 0, lastProgressAt = Date.now();
      function finish() { if (done) return; done = true; nudge(false); end(); onDone(); }

      // ④ 途中で止まったら、合図をもう一度出してやり切れるようにする。
      // 5歳児は「あと少し」で手が止まることがある。黙って自動完了させると、
      // 自分でやり切った感じが残らない。まず声をかけ、それでも動かなければ助ける。
      var STALL_MS = 1500, stalled = false;
      function cueShow(on) {
        Array.prototype.forEach.call(
          screenEl.querySelectorAll('.cue, .cue-start, .cue-sweep, .cue-tap'),
          function (c) { c.classList.toggle('off', !on); });
      }
      function nudge(on) {
        var n = document.getElementById('nudge');
        if (on) {
          if (!n) {
            n = document.createElement('div');
            n.id = 'nudge'; n.className = 'nudge';
            screenEl.appendChild(n);
            nextPaint(function () { n.classList.add('show'); });
          }
          n.textContent = progress > 0.55 ? 'あと ちょっと！' :
                          progress > 0.05 ? 'そのまま つづけて！' : 'ゆびで やってみよう！';
        } else if (n) { n.remove(); }
      }

      function bump(p) {
        p = Math.max(0, Math.min(1, p));
        if (p > progress + 0.02) {
          lastProgressAt = Date.now(); Sound.tick(p);
          if (stalled) { stalled = false; nudge(false); }
        }
        progress = Math.max(progress, p);
        onProgress(progress);
        if (progress >= 1) finish();
      }
      var watch = every(function () {
        if (done) return;
        var idle = Date.now() - lastProgressAt;
        if (idle > STALL_MS && !stalled) {
          stalled = true; cueShow(true); nudge(true);
        }
        // それでも動かなければ、関門にしないため自動で進める
        if (idle > AUTO_MS) { bump(1); }
      }, 400);
      var hardStop = later(function () { bump(1); }, AUTO_MS * 2.2);

      var origCleanup = function () { clearInterval(watch); clearTimeout(hardStop); };

      // ---- 共通のポインタ処理 ----
      var down = false, lastX = 0, lastY = 0, acc = 0, startY = 0;
      function pos(e) {
        var r = layer.getBoundingClientRect();
        var t = e.touches ? e.touches[0] : e;
        return { x: t.clientX - r.left, y: t.clientY - r.top };
      }
      function onDown(e) { down = true; var p = pos(e); lastX = p.x; lastY = p.y; startY = p.y; if (kind === 'bolts') hitBolt(p); e.preventDefault(); }
      function onMove(e) {
        if (!down) return;
        var p = pos(e);
        var dx = p.x - lastX, dy = p.y - lastY;
        if (kind === 'lever' || kind === 'crane' || kind === 'fit') {
          bump((p.y - startY) / opt.dist);
          if (opt.handle) opt.handle.style.transform = 'translate(-50%, ' + Math.max(0, Math.min(opt.dist, p.y - startY)) + 'px)';
        } else if (kind === 'trace' || kind === 'rub') {
          acc += Math.sqrt(dx * dx + dy * dy);
          bump(acc / opt.dist);
          if (opt.onPoint) opt.onPoint(p);
        }
        lastX = p.x; lastY = p.y;
        e.preventDefault();
      }
      function onUp() { down = false; }
      function hitBolt(p) {
        if (!opt.bolts) return;
        for (var i = 0; i < opt.bolts.length; i++) {
          var b = opt.bolts[i];
          if (b.hit) continue;
          var r = layer.getBoundingClientRect();
          var bx = b.el.getBoundingClientRect();
          var cx = bx.left - r.left + bx.width / 2, cy = bx.top - r.top + bx.height / 2;
          if (Math.abs(p.x - cx) < 42 && Math.abs(p.y - cy) < 42) {
            b.hit = true; b.el.classList.add('hit'); Sound.bolt();
            if (opt.onPoint) opt.onPoint({ x: cx, y: cy });
            var n = opt.bolts.filter(function (x) { return x.hit; }).length;
            bump(n / opt.bolts.length);
            return;
          }
        }
      }
      layer.addEventListener('pointerdown', onDown);
      layer.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      cleanup = function () {
        origCleanup();
        layer && layer.removeEventListener('pointerdown', onDown);
        layer && layer.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      // デバッグや「視差効果を減らす」設定では、操作を待たずに進める
      if (Debug.noTask || reduceMQ.matches) later(function () { bump(1); }, 200);
      return { layer: layer, finish: finish };
    }
    return { begin: begin, end: end };
  })();

  // ============================================================
  // 画面
  // ============================================================
  function render() {
    clearAllTimers(); Task.end(); FX.stop(); Sound.allOff(0.15);
    if (state.screen === 'title') renderTitle();
    else if (state.screen === 'inspect') renderInspect();
    else if (state.screen === 'deliver') renderDeliver();
    else if (state.screen === 'compare') renderCompare();
    else if (state.screen === 'garage') renderGarage();
    else if (state.screen === 'detail') renderDetail();
    else if (state.screen === 'restock') renderRestock();
    else renderStep();
    // BGMは工場の中だけ。街や結果では止める。
    if (state.screen === 'step' || state.screen === 'title' || state.screen === 'restock' || state.screen === 'garage') Sound.bgmOn();
    else Sound.bgmOff();
  }
  function muteBtn() {
    return '<button class="mute-btn" data-action="mute" aria-label="おと">' + (Sound.isMuted() ? '🔇' : '🔊') + '</button>';
  }
  // 明るい工場。5歳児が「入りたい」と思える場所にする。
  // 車が主役なので、**車がいる帯（画面の中ほど）には模様を置かない**。
  // 装飾は天井・まど・床と、画面の端の歯車にとどめる。
  function factoryBg() {
    var rep = function (n, fn) { var o = ''; for (var i = 0; i < n; i++) o += fn(i); return o; };
    var s = '<svg class="factory-bg" viewBox="0 0 400 240" preserveAspectRatio="none">';
    s += '<defs>' +
      '<linearGradient id="bgWall" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#fff8ea"/><stop offset=".55" stop-color="#ffeed6"/>' +
        '<stop offset="1" stop-color="#ffe2bd"/></linearGradient>' +
      '<linearGradient id="bgSky" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#7ecff2"/><stop offset="1" stop-color="#c4ecff"/></linearGradient>' +
      '<linearGradient id="bgFloor" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#d5e4ea"/><stop offset="1" stop-color="#b4c8d2"/></linearGradient>' +
      '<radialGradient id="bgLamp" cx="0.5" cy="0" r="1">' +
        '<stop offset="0" stop-color="#fff3cf" stop-opacity=".8"/>' +
        '<stop offset="1" stop-color="#fff3cf" stop-opacity="0"/></radialGradient>' +
      '</defs>';
    s += '<rect width="400" height="240" fill="url(#bgWall)"/>';
    // 天井のはり
    s += '<rect y="0" width="400" height="14" fill="#ffdca8"/>';
    s += '<g fill="#ffd096">' + rep(7, function (i) {
      return '<rect x="' + (14 + i * 58) + '" y="0" width="9" height="20" rx="3"/>';
    }) + '</g>';
    // パイプは天井ぎわに通す。壁の高さに通すと車の真後ろを横切って主役の邪魔になる。
    // 色を分けてあるのは、子どもが1本ずつ目で追えるようにするため。
    s += '<g stroke-linecap="round" fill="none">' +
      '<path d="M0 17 H400" stroke="#ff9b6b" stroke-width="5"/>' +
      '<path d="M0 22 H400" stroke="#6fc7ec" stroke-width="3.5"/>' +
      '<path d="M0 26 H400" stroke="#ffd24d" stroke-width="2.5"/></g>';
    s += '<g fill="#f0b98a">' + [30, 120, 250, 340].map(function (x) {
      return '<rect x="' + x + '" y="13" width="6" height="16" rx="2.5"/>';
    }).join('') + '</g>';
    // 天井のあかり
    [80, 200, 320].forEach(function (x) {
      s += '<rect x="' + (x - 2) + '" y="12" width="4" height="13" fill="#e8b877"/>';
      s += '<ellipse cx="' + x + '" cy="28" rx="17" ry="7" fill="#f2c98a"/>' +
        '<ellipse cx="' + x + '" cy="26" rx="17" ry="7" fill="#fff6da"/>' +
        '<path d="M' + (x - 30) + ' 33 L' + (x + 30) + ' 33 L' + (x + 54) + ' 116 L' + (x - 54) + ' 116 Z" fill="url(#bgLamp)"/>';
    });
    // 大きなまど（外は晴れ）
    [46, 154, 262, 354].forEach(function (x) {
      s += '<rect x="' + (x - 5) + '" y="26" width="74" height="53" rx="27" fill="#ffffff"/>' +
        '<path d="M' + x + ' 74 L' + x + ' 52 a32 26 0 0 1 64 0 L' + (x + 64) + ' 74 Z" fill="url(#bgSky)"/>' +
        '<g fill="#ffffff" opacity=".9">' +
          '<ellipse cx="' + (x + 20) + '" cy="56" rx="11" ry="6"/>' +
          '<ellipse cx="' + (x + 30) + '" cy="53" rx="8" ry="5"/>' +
          '<ellipse cx="' + (x + 46) + '" cy="64" rx="9" ry="5"/></g>' +
        '<path d="M' + (x + 32) + ' 28 L' + (x + 32) + ' 74 M' + x + ' 57 L' + (x + 64) + ' 57" stroke="#ffffff" stroke-width="4"/>' +
        '<rect x="' + (x - 7) + '" y="74" width="78" height="5" rx="2.5" fill="#ffd096"/>';
    });
    // 歯車は画面の端だけ。車の後ろには置かない。
    [[20, 132, 24], [380, 128, 20]].forEach(function (g) {
      s += '<g opacity=".5"><circle cx="' + g[0] + '" cy="' + g[1] + '" r="' + g[2] + '" fill="#ffcf9a"/>' +
        '<circle cx="' + g[0] + '" cy="' + g[1] + '" r="' + (g[2] * 0.42) + '" fill="#ffe6c6"/>' +
        rep(8, function (i) {
          return '<rect x="' + (g[0] - 4) + '" y="' + (g[1] - g[2] - 5) + '" width="8" height="10" rx="2" fill="#ffcf9a" ' +
            'transform="rotate(' + (i * 45) + ' ' + g[0] + ' ' + g[1] + ')"/>';
        }) + '</g>';
    });
    // 床
    s += '<rect y="149" width="400" height="91" fill="url(#bgFloor)"/>';
    s += '<rect y="149" width="400" height="3" fill="#9fb6c2"/>';
    s += '<rect y="186" width="400" height="5" fill="#ffd24d"/>';   // 安全ライン
    s += '<g stroke="#c3d4dc" stroke-width="1.5">' + rep(6, function (i) {
      return '<path d="M' + (i * 80) + ' 240 L' + (i * 80 + 22) + ' 196"/>';
    }) + '</g>';
    return s + '</svg>';
  }

  function renderTitle() {
    var g = garage().length;
    screenEl.innerHTML = factoryBg() +
      '<div class="topbar"><span></span>' + muteBtn() + '</div>' +
      '<div class="center-stack">' +
      '<div class="title-main">くるま こうじょう</div>' +
      '<div class="title-sub">じぶんだけの くるまを つくろう</div>' +
      (hasWip() ? '<button class="big-btn" data-action="resume">つづきから</button>' : '') +
      '<button class="big-btn' + (hasWip() ? ' secondary' : '') + '" data-action="start">' +
        (hasWip() ? 'さいしょから つくる' : 'こうじょうに はいる') + '</button>' +
      (g ? '<button class="big-btn secondary" data-action="garage">🏠 ガレージ（' + g + 'だい）</button>' : '') +
      '</div>';
  }

  function stepDots() {
    var html = '';
    STEPS.forEach(function (st, i) {
      var cls = i < state.stepIndex ? 'done' : (i === state.stepIndex && state.screen === 'step') ? 'now' : '';
      if (i > 0) html += '<span class="step-arrow' + (i <= state.stepIndex ? ' done' : '') + '">▶</span>';
      html += '<span class="step-dot ' + cls + '">' + st.icon + '</span>';
    });
    var atEnd = state.screen !== 'step';
    html += '<span class="step-arrow' + (atEnd ? ' done' : '') + '">▶</span>' +
            '<span class="step-dot' + (atEnd ? ' now' : '') + '">🏁</span>';
    return '<div class="steps">' + html + '</div>';
  }

  // 選ぶ画面。**中央の大きな車が、いま選んでいる形そのもの**。
  // 下に小さなカードを並べる形だと、選んだ結果がどうなるのか分からなかった。
  // 両脇に前後の候補が薄く覗くので「まだ他にもある」ことも伝わる。
  // ============================================================
  // 選ぶ画面
  //
  // **1本のレールに候補を全部並べ、レールごと横に動かす**。
  // 前は3台だけ描いて差し替えていたが、切り替えの途中で描き直すので
  // 大きさが飛んで見えた。全部並べておけば、動かすのは transform 1つで済み、
  // 大きさ・濃さの変化も同じ transition に乗るのでなめらかになる。
  // ============================================================
  function pickPitch() {
    // 1つぶんの間隔。CSS の .pick-cell と合わせる（画面幅の48%）。
    return (screenEl.clientWidth || 360) * 0.48;
  }
  function trackX(i) { return -(i * pickPitch()); }

  function renderStep() {
    var st = STEPS[state.stepIndex];
    var opts = optionsFor(st);
    // 前に選んだものがあればそこから始める（「もどる」で戻ったとき用）
    var cur = state.car[st.key], at = 0;
    for (var i = 0; i < opts.length; i++) if (opts[i].value === cur) at = i;
    state.pickIdx = at;

    var cells = opts.map(function (o, k) {
      return '<div class="pick-cell' + (k === at ? ' on' : '') + '">' + pickSvg(st, o) + '</div>';
    }).join('');

    screenEl.innerHTML = factoryBg() +
      '<div class="topbar">' + stepDots() +
        (state.stepIndex > 0 ? '<button class="back-btn" data-action="back">＜ もどる</button>' : '<span></span>') +
        muteBtn() + '</div>' +
      '<div class="step-title" id="stepTitle">' + st.title + '</div>' +
      '<div class="pick-stage" id="pickStage">' +
        '<div class="pick-track" id="pickTrack">' + cells + '</div></div>' +
      '<div class="bench" id="bench"></div>' +
      '<div class="pick-swipe" id="pickSwipe"></div>' +
      '<div class="pick-name" id="pickName"></div>' +
      '<canvas class="fx-layer" id="fxCanvas"></canvas>' +
      '<div class="flash" id="flash"></div>' +
      '<div class="pick-actions" id="pickActions">' +
        '<button class="big-btn" data-action="pick">これに する！</button></div>';
    FX.attach(document.getElementById('fxCanvas'));
    var tr = document.getElementById('pickTrack');
    tr.style.transition = 'none';
    tr.style.transform = 'translateX(' + trackX(at) + 'px)';
    updateName();
    bindSwipe();
    Sound.say('step-' + st.key);
    saveWip();
  }

  // 名前・矢印・点だけを描き直す。車はレール上に全部あるので触らない。
  function updateName() {
    var st = STEPS[state.stepIndex], opts = optionsFor(st);
    var i = state.pickIdx, n = opts.length;
    var nm = document.getElementById('pickName');
    if (!nm) return;
    var dots = opts.map(function (o, k) {
      return '<span class="pd' + (k === i ? ' on' : '') + '"' +
        (o.hex ? ' style="background:' + o.hex + '"' : '') + '></span>';
    }).join('');
    // 端では矢印を薄くする。輪にせず端で止めるのは、5歳児が
    // 「どこまで見たか」を見失わないようにするため。
    nm.innerHTML = '<div class="pick-row">' +
      (n > 1 ? '<button class="pick-arrow' + (i === 0 ? ' dim' : '') +
        '" data-action="prev" aria-label="まえ">◀</button>' : '') +
      '<span class="pn">' + opts[i].label + '</span>' +
      (n > 1 ? '<button class="pick-arrow' + (i === n - 1 ? ' dim' : '') +
        '" data-action="next" aria-label="つぎ">▶</button>' : '') +
      '</div>' +
      '<span class="pick-dots">' + dots + '</span>';
  }

  function setPick(i, dur) {
    var opts = optionsFor(STEPS[state.stepIndex]);
    i = Math.max(0, Math.min(opts.length - 1, i));
    var tr = document.getElementById('pickTrack');
    if (!tr) return;
    if (i !== state.pickIdx) {
      state.pickIdx = i;
      Sound.tap();
      var cells = tr.children;
      for (var k = 0; k < cells.length; k++) cells[k].classList.toggle('on', k === i);
      updateName();
    }
    tr.style.transition = dur ? 'transform ' + dur + 'ms cubic-bezier(.2,.85,.28,1)' : 'none';
    tr.style.transform = 'translateX(' + trackX(i) + 'px)';
  }
  function movePick(d) { setPick(state.pickIdx + d, 340); }

  // 指で払うと、レールが指についてくる。離すといちばん近い候補で止まる。
  function bindSwipe() {
    var sw = document.getElementById('pickSwipe');
    var tr = document.getElementById('pickTrack');
    if (!sw || !tr) return;
    var x0 = null, dx = 0, base = 0;
    sw.addEventListener('pointerdown', function (e) {
      x0 = e.clientX; dx = 0; base = trackX(state.pickIdx);
      tr.style.transition = 'none';
      try { sw.setPointerCapture(e.pointerId); } catch (err) {}
    });
    sw.addEventListener('pointermove', function (e) {
      if (x0 == null) return;
      dx = e.clientX - x0;
      // 端では引っぱっても伸びにくくする（これ以上は無い、と手で分かる）
      var n = optionsFor(STEPS[state.stepIndex]).length;
      var x = base + dx;
      var min = trackX(n - 1), max = trackX(0);
      if (x > max) x = max + (x - max) * 0.3;
      if (x < min) x = min + (x - min) * 0.3;
      tr.style.transform = 'translateX(' + x + 'px)';
    });
    function release() {
      if (x0 == null) return;
      var moved = dx; x0 = null; dx = 0;
      var pitch = pickPitch();
      // 半分より動かしたか、勢いよく払ったら次へ
      var step = Math.abs(moved) > pitch * 0.5 ? Math.round(-moved / pitch)
               : (Math.abs(moved) > 36 ? (moved < 0 ? 1 : -1) : 0);
      setPick(state.pickIdx + step, 300);
    }
    sw.addEventListener('pointerup', release);
    sw.addEventListener('pointercancel', release);
  }


  // ---- 工程：選んだあと、自分の手で作る ----
  function runStep(stepKey, done) {
    var bench = document.getElementById('bench');
    var flash = document.getElementById('flash');
    var title = document.getElementById('stepTitle');
    // 選ぶための飾りを片づけ、中央の車を元の大きさに戻してから作業に入る。
    Array.prototype.forEach.call(
      screenEl.querySelectorAll('.pick-stage, .pick-name, .pick-actions, .pick-swipe'),
      function (e) { e.remove(); });

    function pt(fx, fy) {
      var b = bench.getBoundingClientRect(), s = screenEl.getBoundingClientRect();
      return { x: b.left - s.left + b.width * fx, y: b.top - s.top + b.height * fy };
    }
    function flashNow() { if (flash) { flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go'); } }
    function redraw() { bench.innerHTML = carSvg(carCfg(), builtNow(), {}); }
    // 選んでいた見本（その工程が済んだ姿）を消して、いまの車に戻す。
    // 見本のまま作業に入ると、できあがった物にプレスをかけることになる。
    redraw();
    function el(cls, html, style) {
      var d = document.createElement('div');
      d.className = cls; d.innerHTML = html || '';
      if (style) d.setAttribute('style', style);
      screenEl.appendChild(d); return d;
    }
    // 「なぞる」「ひく」だけでは、5歳児にはどちらへ動かすか分からない。
    // 取っ手や線のそばに、進む向きへ流れる矢印を出す。
    // 矢印は取っ手から **置き場所まで届く長さ** にする。途中で切れると、
    // どこへ運ぶのか分からず、空中を指しているように見える。
    // 逆に長すぎると置き場所の枠を突き抜けるので、動かす距離に合わせて本数を変える。
    function cueDown(n) {
      return '<div class="cue down">' + new Array((n || 3) + 1).join('<span>▼</span>') + '</div>';
    }
    // 動かし始めたら消す。線の上に残ると、なぞった跡が見えなくなる。
    var cueGone = false;
    function cuesOff(p) {
      if (cueGone || !(p >= 0.03)) return;
      cueGone = true;
      Array.prototype.forEach.call(screenEl.querySelectorAll('.cue, .cue-start, .cue-sweep, .cue-tap'),
        function (c) { c.classList.add('off'); });
    }

    function finishStep(delay) {
      later(function () {
        state.built[stepKey] = true; redraw(); flashNow();
        // 「できたー！」が「どんな○○にする？」と被らないよう、
        // 鳴らした音の長さに合わせて次の工程へ進む間隔を変える。
        var wait = Sound.cheer();
        var p = pt(0.5, 0.5); FX.star(p.x, p.y, 14);
        later(done, ms(wait));
      }, delay || 0);
    }

    var st = STEPS[state.stepIndex];

    // ---------- ① プレス：レバーを下に引く ----------
    if (stepKey === 'body') {
      // 鉄板がベルトで運ばれてきて、プレスで形になる。
      // いきなり車体を置いて押すと、何を作っているのか分からない。
      if (title) title.textContent = 'てっぱんが きたよ！';
      var belt = el('conveyor');
      belt.style.top = (bench.offsetTop + bench.offsetHeight * 0.71) + 'px';
      bench.style.transition = 'none';
      bench.style.transform = 'translateX(-125%)';
      Sound.rollIn();
      nextPaint(function () {
        bench.style.transition = 'transform 720ms cubic-bezier(.2,.7,.3,1)';
        bench.style.transform = 'translateX(0)';
      });
      later(function () { pressReady(); }, ms(780));
      return;
    }

    function pressReady() {
      bench.style.transition = ''; bench.style.transform = '';
      var beltEl = screenEl.querySelector('.conveyor');
      if (beltEl) beltEl.classList.add('stop');
      if (title) title.textContent = 'レバーを ひこう！';
      var rig = el('rig press-rig', '<div class="rail l"></div><div class="rail r"></div><div class="press-head" id="pressHead"></div>');
      rig.style.top = bench.offsetTop + 'px'; rig.style.height = bench.offsetHeight + 'px';
      var lever = el('handle lever', '<div class="knob"></div><div class="stick"></div>' + cueDown(3));
      var head = document.getElementById('pressHead');
      Sound.pressDown();
      Task.begin('lever', { dist: 105, handle: lever }, function (p) {
        cuesOff(p);
        if (head) head.style.transform = 'translateY(' + (-72 + p * 127) + '%)';
      }, function () {
        Sound.pressHit(); lever.remove();
        var q = pt(0.5, 0.72);
        FX.spark(q.x, q.y, 26, 34); FX.steam(q.x, q.y, 10, 90);
        var n = 0, t = every(function () { var z = pt(0.5, 0.7); FX.steam(z.x, z.y, 3, 110); if (++n > 6) clearInterval(t); }, 90);
        later(function () { rig.remove(); var b2 = screenEl.querySelector('.conveyor'); if (b2) b2.remove(); }, ms(600));
        finishStep(ms(350));
      });
    }

    // ---------- ② 組み立て：溶接の線を指でなぞる ----------
    if (stepKey === 'roof') {
      if (title) title.textContent = 'ゆびで なぞって ようせつ！';
      // 線だけ引いても、5歳児には「どこから」「どちらへ」が分からない。
      // 左端に指のしるし、線の上に右向きの矢印を流す。
      var guide = el('weld-guide',
        '<div class="dash"></div>' +
        '<div class="cue-start">👆</div>' +
        '<div class="cue right"><span>▶</span><span>▶</span><span>▶</span><span>▶</span><span>▶</span></div>');
      guide.style.top = (bench.offsetTop + bench.offsetHeight * 0.30) + 'px';
      // 溶接ロボット。天井のレールを走り、腕の先のトーチが指についてくる。
      // 手だけで火花が出るより、工場でやっていることが伝わる。
      var wrail = el('weld-rail');
      wrail.style.top = (bench.offsetTop + bench.offsetHeight * 0.30 - 62) + 'px';
      var wbot = el('weld-bot', '<div class="wb-body"></div><div class="wb-arm"></div><div class="wb-torch"></div>');
      wbot.style.top = (bench.offsetTop + bench.offsetHeight * 0.30 - 58) + 'px';
      wbot.style.left = (screenEl.clientWidth * 0.16) + 'px';
      Sound.weldOn();
      Task.begin('trace', { dist: 300, onPoint: function (p) {
          FX.spark(p.x, p.y, 3, 22); Sound.weldPop();
          // ロボットは横だけ動く。上下に追わせると腕が伸び縮みして見えて不自然。
          wbot.style.left = p.x + 'px';
          wbot.classList.add('on');
        } },
        function (p) { cuesOff(p); guide.style.setProperty('--p', (p * 100) + '%'); },
        function () { Sound.weldOff(); guide.remove(); wbot.remove(); wrail.remove(); finishStep(ms(150)); });
      return;
    }

    // ---------- ③ 塗装：車体をこすると色がつく ----------
    if (stepKey === 'color') {
      if (title) title.textContent = 'ゆびで こすって ぬろう！';
      // こする向きは自由なので、矢印ではなく「左右に往復する手」で見せる。
      var sweep = el('cue-sweep', '👆');
      sweep.style.top = (bench.offsetTop + bench.offsetHeight * 0.52) + 'px';
      // 選んだ缶がそのまま指についてくる。選ぶ絵と使う絵をそろえる。
      var gun = el('spray-cursor', sprayCan(CP.COLORS[state.car.color].hex), 'display:none');
      Sound.sprayOn();
      var hue = CP.COLORS[state.car.color].hue;
      var painted = 0;
      // 一度こすり切ったら完成。900は車体を5往復ぶんで、明らかに長かった。
      Task.begin('rub', { dist: 260, onPoint: function (p) {
          gun.style.display = 'block';
          gun.style.left = p.x + 'px'; gun.style.top = p.y + 'px';
          FX.mist(p.x, p.y, 3, 18, hue);
        } },
        function (p) {
          cuesOff(p);
          // 塗りは段階的に。半分こすったところで色が乗る。
          if (p > 0.35 && !painted) { painted = 1; state.built.color = true; redraw(); }
        },
        function () { Sound.sprayOff(); gun.remove(); sweep.remove(); finishStep(ms(150)); });
      return;
    }

    // ---------- ④ まど：ガラスをドラッグしてはめる ----------
    if (stepKey === 'window') {
      if (title) title.textContent = 'まどを おろして はめよう！';
      var slot = el('slot');
      slot.style.top = (bench.offsetTop + bench.offsetHeight * 0.30) + 'px';
      // まどは吸盤アームで運んでくる。手でつかんで下ろすより工場らしい。
      var grail = el('glass-rail');
      grail.style.top = (bench.offsetTop + 6) + 'px';
      var pane = el('handle pane-handle',
        '<div class="cable"></div><div class="sucker"></div><div class="pane"></div>' + cueDown(3));
      Task.begin('fit', { dist: 100, handle: pane }, cuesOff,
        function () { Sound.click(); pane.remove(); slot.remove(); grail.remove(); finishStep(ms(120)); });
      return;
    }

    // ---------- ⑤ エンジン：クレーンを引き下ろす ----------
    if (stepKey === 'engine') {
      if (title) title.textContent = 'クレーンを おろそう！';
      // エンジンの置き場所を点線で示す。矢印だけでは「どこへ」が分からない。
      var bay = el('slot');
      bay.style.left = '64%';
      bay.style.top = (bench.offsetTop + bench.offsetHeight * 0.34) + 'px';
      // 選んだエンジンの絵そのものを吊り下げる。汎用の箱ではなく、
      // 選ぶ画面で見た実物が運ばれてくるようにする。
      var crane = el('handle crane-handle',
        '<div class="chain"></div><div class="engine-block">' + CP.partIcon('engine', state.car.engine) + '</div>' + cueDown(4));
      crane.style.left = '64%';
      Task.begin('crane', { dist: 115, handle: crane }, cuesOff,
        function () {
          Sound.drop(); crane.remove(); bay.remove();
          var q = pt(0.74, 0.62); FX.dust(q.x, q.y, 12, 40); FX.steam(q.x, q.y, 5, 40);
          later(function () { Sound.engineStart(); }, ms(380));
          finishStep(ms(480));
        });
      return;
    }

    // ---------- ⑥ シート：シートを押し込む ----------
    if (stepKey === 'seat') {
      if (title) title.textContent = 'シートを おしこもう！';
      // シートも同じ。入れる場所を点線で示す。
      var cabin = el('slot narrow');
      cabin.style.left = '48%';
      cabin.style.top = (bench.offsetTop + bench.offsetHeight * 0.30) + 'px';
      // 選んだシートの絵そのものを差し込む。
      var seat = el('handle seat-handle',
        '<div class="seat-block">' + CP.partIcon('seat', state.car.seat) + '</div>' + cueDown(2));
      seat.style.left = '48%';
      Task.begin('fit', { dist: 95, handle: seat }, cuesOff,
        function () { Sound.pof(); seat.remove(); cabin.remove(); finishStep(ms(120)); });
      return;
    }

    // ---------- ⑦ タイヤ：ボルトを4つ たたく ----------
    if (stepKey === 'tire') {
      if (title) title.textContent = 'ボルトを たたいて しめよう！';
      state.built.tire = true; redraw();     // タイヤは先に付け、締める作業を残す
      // ボルトはタイヤの中心に置く。画面上の位置は、車のviewBox内の車軸座標から割り出す。
      // 決め打ちの割合で置くと、ボディを変えたときにタイヤから外れる。
      var gg = CP.geometry(carCfg());
      var sx = screenEl.getBoundingClientRect();
      var svgEl2 = bench.querySelector('svg');
      // SVG内の座標→画面座標は getScreenCTM に任せる。
      // 幅の比で自前計算すると、viewBox のレターボックス（余白）のぶんだけずれる。
      function svgPt(x, y) {
        if (!svgEl2 || !svgEl2.getScreenCTM) return { x: sx.width / 2, y: sx.height / 2 };
        var p = svgEl2.createSVGPoint(); p.x = x; p.y = y;
        var q = p.matrixTransform(svgEl2.getScreenCTM());
        return { x: q.x - sx.left, y: q.y - sx.top };
      }
      var bolts = [];
      [[gg.axR, gg.axY], [gg.axF, gg.axY]].forEach(function (c) {
        var p = svgPt(c[0], c[1]);
        var b = el('bolt', '🔩');
        b.style.left = p.x + 'px';
        b.style.top = p.y + 'px';
        bolts.push({ el: b, hit: false });
        // ここは向きではなく「たたく」なので、矢印ではなく指のしるしを添える。
        var tapCue = el('cue-tap', '👆');
        tapCue.style.left = p.x + 'px';
        tapCue.style.top = (p.y + 30) + 'px';
      });
      Sound.rollIn && Sound.rollIn();
      Task.begin('bolts', { bolts: bolts, onPoint: function (p) { FX.spark(p.x, p.y, 6, 18); } },
        function (p) { cuesOff(p); },
        function () {
          bolts.forEach(function (b) { b.el.remove(); });
          var q = pt(0.5, 0.9); FX.dust(q.x, q.y, 14, 120);
          state.built.tire = true;
          finishStep(ms(120));
        });
      return;
    }
    finishStep(0);
  }

  // ============================================================
  // ⑥ 検査（お披露目）
  // ============================================================
  // 検査は「お披露目」の場面。ここで称号を見せてから走り出す（仕様7章）。
  // 数字の成績は出さない。読めない数字が結果欄にあると採点に見えてしまうため。
  // 検査は「お披露目」の場面。**ここで3か所をたたいて確かめる。**
  // 見るだけだと何もすることが無くてつまらない。ライト・エンジン・タイヤは、
  // 子どもが車の絵の上で指させる部品なので、ここを点検の的にする。
  // 数字の成績は出さない。読めない数字が結果欄にあると採点に見えてしまう。
  function renderInspect() {
    var t = CP.titleOf(state.car);
    screenEl.innerHTML = factoryBg() +
      '<div class="topbar">' + stepDots() + '<span></span>' + muteBtn() + '</div>' +
      '<div class="step-title" id="inspectTitle">けんさ しよう！</div>' +
      '<div class="inspect-stage"><div class="spotlight"></div>' +
        '<div class="inspect-car" id="inspectCar">' + carSvg(carCfg(), builtNow(), {}) + '</div>' +
        '<div class="turntable"></div></div>' +
      titlePlate(t, 'titlePlate') +
      '<canvas class="fx-layer" id="fxCanvas"></canvas>' +
      '<div class="inspect-actions late" id="inspectActions">' +
        '<button class="big-btn" data-action="ship">シャッターを あける</button></div>';
    FX.attach(document.getElementById('fxCanvas'));

    var carEl = document.getElementById('inspectCar');
    var svgEl = carEl.querySelector('svg');
    var g = CP.geometry(carCfg());
    var sx = screenEl.getBoundingClientRect();
    // SVG内の座標→画面座標。幅の比で自前計算すると、viewBox の余白ぶんずれる。
    function svgPt(x, y) {
      if (!svgEl || !svgEl.getScreenCTM) return { x: sx.width / 2, y: sx.height / 2 };
      var p = svgEl.createSVGPoint(); p.x = x; p.y = y;
      var q = p.matrixTransform(svgEl.getScreenCTM());
      return { x: q.x - sx.left, y: q.y - sx.top };
    }

    // 3か所は **車の上で離して** 置く。前まわりに固めると的が重なって
    // 別々の場所に見えない（最初、ライトとエンジンが重なった）。
    // 前上・まん中・後ろ下、と三角に散らす。
    var SPOTS = [
      { icon: '💡', label: 'ライト', at: [g.front - 8, g.belt + 5] },
      { icon: '🚪', label: 'ドア',   at: [g.fx(0.45), g.fy(0.45)] },
      { icon: '🛞', label: 'タイヤ', at: [g.axR, g.axY] }
    ];
    var pts = SPOTS.map(function (sp) {
      var q = svgPt(sp.at[0], sp.at[1]);
      var e = document.createElement('button');
      e.className = 'check-pt';
      e.innerHTML = '<span class="ci">' + sp.icon + '</span>';
      e.style.left = q.x + 'px'; e.style.top = q.y + 'px';
      screenEl.appendChild(e);
      return { el: e, done: false, label: sp.label };
    });

    var left = pts.length;
    function hit(p) {
      if (p.done) return;
      p.done = true; left--;
      p.el.classList.add('ok');
      p.el.querySelector('.ci').textContent = '✓';
      Sound.checkOk();
      var r = p.el.getBoundingClientRect(), s2 = screenEl.getBoundingClientRect();
      FX.star(r.left - s2.left + r.width / 2, r.top - s2.top + r.height / 2, 10);
      var ttl = document.getElementById('inspectTitle');
      if (ttl) ttl.textContent = p.label + ' よし！';
      if (left === 0) allDone();
    }
    pts.forEach(function (p) {
      p.el.addEventListener('click', function () { hit(p); });
    });

    function allDone() {
      var ttl = document.getElementById('inspectTitle');
      if (ttl) ttl.textContent = 'ぜんぶ よし！ できあがり！';
      Sound.say('dekita');
      var el = carEl;
      var r = el.getBoundingClientRect(), s2 = screenEl.getBoundingClientRect();
      FX.star(r.left - s2.left + r.width / 2, r.top - s2.top + r.height / 2, 22);
      later(function () {
        pts.forEach(function (p) { p.el.classList.add('gone'); });
        var pl = document.getElementById('titlePlate');
        if (pl) { pl.classList.add('show'); Sound.done(); }
      }, ms(420));
      // 称号を見てから次へ進めるよう、ボタンは少し遅らせて出す。
      later(function () {
        var ac = document.getElementById('inspectActions');
        if (ac) ac.classList.add('show');
      }, ms(1000));
    }

    // 関門にはしない。さわらなくても進む（工程と同じ考え方）。
    later(function () { pts.forEach(function (p) { hit(p); }); }, ms(8000));
  }


  // 称号の札。検査とガレージで同じ見た目を使う。
  function titlePlate(t, id) {
    return '<div class="title-plate"' + (id ? ' id="' + id + '"' : '') + '>' +
      '<span class="t-icon">' + t.icon + '</span>' +
      '<span class="t-name">' + t.name + '</span>' +
      (t.custom ? '<span class="t-custom">＋ フルカスタムカー！</span>' : '') +
      '</div>';
  }

  // ============================================================
  // 納車
  // ============================================================
  // 納車の街。工場と同じ理由で、灰色の街並みは5歳児に響かない。
  // 建物に色をつけ、空に太陽と雲、道ぎわに木を並べて「おでかけ」に見えるようにする。
  function streetBg() {
    var B = [
      [6, 16, 34, '#ffb3a0', '#ff8f76'], [48, 4, 26, '#a9d8f5', '#7cc0ec'],
      [82, 24, 40, '#ffd98a', '#ffc45c'], [130, 10, 30, '#c6b8f0', '#a998e6'],
      [168, 28, 46, '#a8e2c4', '#7fd0a7'], [222, 8, 28, '#ffc0d4', '#ff9dbd'],
      [258, 22, 36, '#9fd6ef', '#74bfe3']
    ];
    var win = function (x, y, w) {
      var o = '', c;
      for (var r = y + 5; r < 56; r += 9) {
        for (c = x + 4; c < x + w - 5; c += 9) {
          o += '<rect x="' + c + '" y="' + r + '" width="5" height="5" rx="1" fill="#fffaef" opacity=".85"/>';
        }
      }
      return o;
    };
    var s = '<div class="fill street"></div>';
    // 空（太陽と雲）は建物より奥。
    s += '<svg class="sky-deco" viewBox="0 0 300 60" preserveAspectRatio="none">' +
      '<circle cx="258" cy="14" r="11" fill="#fff2b8"/>' +
      '<circle cx="258" cy="14" r="7" fill="#ffe27a"/>' +
      '<g fill="#ffffff" opacity=".92">' +
        '<ellipse cx="52" cy="20" rx="20" ry="9"/><ellipse cx="68" cy="16" rx="14" ry="8"/>' +
        '<ellipse cx="172" cy="14" rx="17" ry="8"/><ellipse cx="186" cy="18" rx="12" ry="6"/></g>' +
      '</svg>';
    s += '<svg class="buildings" viewBox="0 0 300 60" preserveAspectRatio="none">';
    B.forEach(function (b) {
      var x = b[0], y = b[1], w = b[2];
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + (60 - y) + '" rx="2" fill="' + b[3] + '"/>' +
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="4" rx="2" fill="' + b[4] + '"/>' +
        win(x, y, w);
    });
    s += '</svg>';
    // 道ぎわの木。等間隔に並べると、車が走ったときに流れて見える。
    s += '<svg class="treeline" viewBox="0 0 300 30" preserveAspectRatio="none">';
    for (var i = 0; i < 10; i++) {
      var tx = 12 + i * 32;
      s += '<rect x="' + (tx - 2) + '" y="16" width="4" height="14" rx="1.5" fill="#9a6b45"/>' +
        '<circle cx="' + tx + '" cy="13" r="10" fill="#63c07e"/>' +
        '<circle cx="' + (tx - 5) + '" cy="17" r="7" fill="#7ad094"/>' +
        '<circle cx="' + (tx + 5) + '" cy="17" r="7" fill="#54ae70"/>';
    }
    s += '</svg>';
    return s;
  }
  // くらべるの背景。街並みを敷くと、2本のレーンの道が建物を横切って
  // 「どこを走っているのか」が分からなくなる。ここは草原のレース場にする。
  function raceBg() {
    var s = '<div class="fill race-field"></div>';
    s += '<svg class="race-sky" viewBox="0 0 300 60" preserveAspectRatio="none">' +
      '<circle cx="262" cy="12" r="10" fill="#fff2b8"/>' +
      '<circle cx="262" cy="12" r="6.5" fill="#ffe27a"/>' +
      '<g fill="#ffffff" opacity=".92">' +
        '<ellipse cx="48" cy="16" rx="19" ry="8"/><ellipse cx="63" cy="13" rx="13" ry="7"/>' +
        '<ellipse cx="166" cy="11" rx="16" ry="7"/><ellipse cx="179" cy="15" rx="11" ry="6"/></g>' +
      '<g fill="#8ecf9b" opacity=".8">' +
        '<ellipse cx="40" cy="62" rx="70" ry="22"/><ellipse cx="150" cy="64" rx="85" ry="26"/>' +
        '<ellipse cx="270" cy="62" rx="75" ry="22"/></g>' +
      '</svg>';
    return s;
  }

  function customerSvg(id) {
    return '<svg class="customer" id="' + id + '" viewBox="0 0 40 60">' +
      '<circle cx="20" cy="12" r="9" fill="#f2cba8"/><path d="M11 10 a9 9 0 0 1 18 0 z" fill="#4a3a2e"/>' +
      '<rect x="12" y="21" width="16" height="24" rx="5" fill="#e0674a"/>' +
      '<rect x="14" y="44" width="5" height="15" rx="2" fill="#3d4c57"/><rect x="21" y="44" width="5" height="15" rx="2" fill="#3d4c57"/>' +
      '<rect class="arm" x="26" y="22" width="5" height="16" rx="2.5" fill="#f2cba8"/></svg>';
  }

  function renderDeliver() {
    var runMs = ms(runMsOf(state.car));
    // くらべる相手は **1台前** の車。同じ車しか無いときはボタンを出さない。
    var prev = load(KEY.prev, null);
    if (prev && carKey(prev) === carKey(state.car)) prev = null;
    var t = CP.titleOf(state.car);
    // ?to=deliver で直接来たときは「シャッターを あける」を通っていないので、
    // ここで一度だけ抽選する。札を立てておけば画面を作り直しても結果は変わらない。
    if (!state.mishapRolled) { state.mishap = rollMishap(); state.mishapRolled = true; }
    var mk = state.mishap, mi = mk ? MISHAPS[mk] : null;
    // ハプニングで止まる位置。街の真ん中で止める。
    // 車は -150vw から入ってくるので、途中で止めると画面外になってしまい、
    // 何が起きたのか分からない（最初これで空振りした）。
    var STOP_VW = -30;

    screenEl.innerHTML = streetBg() +
      '<div class="topbar">' + stepDots() + '<span></span>' + muteBtn() + '</div>' +
      customerSvg('customer') +
      '<div class="drive-out" id="driveCar">' + carSvg(carCfg(), builtNow(), { spin: 'spin' }) + '</div>' +
      '<div class="mishap-say" id="mishapSay"></div>' +
      '<div class="mishap-stage" id="mishapStage"></div>' +
      '<canvas class="fx-layer" id="fxCanvas"></canvas>' +
      '<div class="result" id="result">' +
        // 結果は称号だけ。星も距離の数字も出さない（4.3）。
        titlePlate(t) +
        '<div class="result-sub">おきゃくさんが よろこんでるよ</div>' +
        '<div class="result-actions">' +
          (prev ? '<button class="big-btn secondary" data-action="compare">まえのくるまと くらべる</button>' : '') +
          '<button class="big-btn" data-action="finish">つぎへ</button>' +
        '</div></div>';

    FX.attach(document.getElementById('fxCanvas'));
    var car = document.getElementById('driveCar'), cust = document.getElementById('customer');
    var stage = document.getElementById('mishapStage'), say = document.getElementById('mishapSay');
    function showResult() { var e = document.getElementById('result'); if (e) e.classList.add('show'); }
    function arrive() {
      dustOff(); Sound.allOff(0.3); Sound.arrive();
      if (cust) cust.classList.add('wave');
      var r = car.getBoundingClientRect(), s = screenEl.getBoundingClientRect();
      FX.star(r.left - s.left + r.width * 0.7, r.top - s.top, 16);
      showResult();
    }

    var dustT = 0;
    function dustOn() {
      if (dustT) return;
      dustT = every(function () {
        var r = car.getBoundingClientRect(), s = screenEl.getBoundingClientRect();
        FX.dust(r.left - s.left + 24, r.bottom - s.top - 6, 2, 26);
      }, 90);
    }
    function dustOff() { if (dustT) { clearInterval(dustT); dustT = 0; } }
    // 1区間ぶん走らせる。終わりの時刻は **transition を張った瞬間から** 数える。
    // nextPaint は最大90ms待つので、先に数え始めると早く着いたことになってしまう。
    function drive(fromVw, toVw, dur, ease, done) {
      car.style.transition = 'none';
      car.style.transform = 'translateX(' + fromVw + 'vw)';
      nextPaint(function () {
        car.style.transition = 'transform ' + dur + 'ms ' + ease;
        car.style.transform = 'translateX(' + toVw + 'vw)';
        later(done, dur + ms(120));
      });
    }

    if (reduceMQ.matches) {
      car.style.transform = 'translateX(0)';
      if (cust) cust.classList.add('wave');
      showResult(); return;
    }

    Sound.shutter();
    Sound.engineStart();
    later(function () { Sound.engineLoop(); }, ms(420));
    dustOn();

    if (!mi) {
      drive(-150, 0, runMs, 'cubic-bezier(.35,.05,.35,1)', arrive);
      return;
    }

    // ---- ハプニングあり ----
    // 走る時間の合計は runMs のまま。止まっている間ぶんだけ全体が長くなる。
    var leg1 = Math.round(runMs * 0.72), leg2 = runMs - leg1;
    drive(-150, STOP_VW, leg1, 'cubic-bezier(.35,.05,.5,1)', function () {
      dustOff(); Sound.allOff(0.25); Sound[mi.sound]();
      stage.className = 'mishap-stage show ' + mk;
      stage.innerHTML = '<div class="mishap-actor">' + mi.actor + '</div>';
      say.textContent = mi.icon + ' ' + mi.say;
      say.className = 'mishap-say show';
      if (Debug.freeze) {
        console.warn('[debug] freeze=1：ハプニングの見せ場で止めた（' + mk + '）');
        return;
      }
      // ひと呼吸おいてから「直った」を見せる。すぐ直すと、何が起きたか読む間がない。
      later(function () {
        say.textContent = '🙌 ' + mi.fix;
        stage.classList.add('fixed');
        Sound.fixed();
        later(function () {
          stage.className = 'mishap-stage';
          stage.innerHTML = '';
          say.className = 'mishap-say';
          Sound.engineStart();
          later(function () { Sound.engineLoop(); }, ms(280));
          dustOn();
          drive(STOP_VW, 0, leg2, 'cubic-bezier(.3,.1,.4,1)', arrive);
        }, ms(1300));
      }, ms(1700));
    });
  }

  // ============================================================
  // ④ まえのくるまと くらべる（2台を同時に走らせる）
  // 記憶で比べるのは5歳には無理。**並べて同時に走らせて初めて**
  // 「こっちが速い」が分かり、因果が体験になる。
  // ============================================================
  // くらべる2台は **必ず外から渡す**。画面の中で load(KEY.last) を読むと、
  // 直前に保存した「今回の車」を相手にしてしまい、同じ車どうしのレースになる。
  function comparePair() {
    if (state.comparePair) return state.comparePair;
    var p = load(KEY.prev, null);
    if (!p || carKey(p) === carKey(state.car)) return null;
    return { a: p, aLabel: 'まえの くるま', b: state.car, bLabel: 'いまの くるま' };
  }

  function renderCompare() {
    var pair = comparePair();
    // 相手がいなければ来ない画面。念のため納車に戻す。
    if (!pair) { state.screen = 'deliver'; render(); return; }
    var aMs = ms(runMsOf(pair.a)), bMs = ms(runMsOf(pair.b));
    screenEl.innerHTML = raceBg() +
      '<div class="topbar"><span></span><span></span>' + muteBtn() + '</div>' +
      '<div class="lane top"><span class="lane-tag">' + pair.aLabel + '</span>' +
        '<div class="race-car" id="carA">' + carSvg(pair.a, FULL_BUILT, { spin: 'spin' }) + '</div>' +
        '<div class="goal"></div></div>' +
      '<div class="lane bottom"><span class="lane-tag">' + pair.bLabel + '</span>' +
        '<div class="race-car" id="carB">' + carSvg(pair.b, FULL_BUILT, { spin: 'spin' }) + '</div>' +
        '<div class="goal"></div></div>' +
      '<div class="result show" id="result">' +
        '<div class="result-sub" id="cmpMsg">よーい、どん！</div>' +
        '<div class="result-actions">' +
          '<button class="big-btn secondary" data-action="compare">もういちど はしる</button>' +
          '<button class="big-btn" data-action="finish">つぎへ</button>' +
        '</div></div>';
    var a = document.getElementById('carA'), b = document.getElementById('carB');
    if (reduceMQ.matches) { a.style.transform = b.style.transform = 'translateX(0)'; return; }
    Sound.engineStart(); later(function () { Sound.engineLoop(); }, ms(300));
    a.style.transform = b.style.transform = 'translateX(-120%)';
    nextPaint(function () {
      a.style.transition = 'transform ' + aMs + 'ms cubic-bezier(.35,.05,.35,1)'; a.style.transform = 'translateX(0)';
      b.style.transition = 'transform ' + bMs + 'ms cubic-bezier(.35,.05,.35,1)'; b.style.transform = 'translateX(0)';
    });
    later(function () {
      Sound.allOff(0.3); Sound.done();
      var msg = document.getElementById('cmpMsg');
      // 「速い」ではなく「よく走る」。競争ではなく性質の違いとして見せる。
      if (msg) msg.textContent = aMs === bMs ? 'おなじくらい よく はしるね'
        : (bMs < aMs ? pair.bLabel + 'の ほうが よく はしったね'
                     : pair.aLabel + 'の ほうが よく はしったね');
    }, Math.max(aMs, bMs) + ms(250));
  }

  // ============================================================
  // ③ 入荷（あたらしいパーツが とどいた）
  // ============================================================
  function renderRestock() {
    var items = state.newParts;
    screenEl.innerHTML = factoryBg() +
      '<div class="topbar"><span></span>' + muteBtn() + '</div>' +
      '<div class="step-title">あたらしい パーツが とどいたよ！</div>' +
      '<div class="truck" id="truck">🚚</div>' +
      '<div class="restock-row">' + items.map(function (it) {
        return '<div class="restock-card">' + it.svg + '<span>' + it.label + '</span></div>';
      }).join('') + '</div>' +
      '<canvas class="fx-layer" id="fxCanvas"></canvas>' +
      '<div class="inspect-actions"><button class="big-btn" data-action="start">つぎの くるまを つくる</button></div>';
    FX.attach(document.getElementById('fxCanvas'));
    later(function () {
      Sound.restock();
      var s = screenEl.getBoundingClientRect();
      FX.star(s.width / 2, s.height * 0.45, 26);
      screenEl.querySelectorAll('.restock-card').forEach(function (c, i) {
        later(function () { c.classList.add('show'); Sound.done(); }, ms(220 * i));
      });
    }, ms(900));
  }

  // ============================================================
  // ② ガレージ
  // ============================================================
  function renderGarage() {
    var g = garage();
    var body = g.length === 0
      ? '<div class="gallery-empty">🏠<br>まだ くるまが ないよ<br><span>つくると ここに ならぶよ</span></div>'
      : '<div class="garage-grid">' + g.map(function (c, i) {
          var t = CP.titleOf(c);
          var m = c.mishap && MISHAPS[c.mishap];
          return '<button class="garage-card" data-action="show" data-value="' + i + '">' +
            carSvg(c, FULL_BUILT, {}) +
            '<span class="garage-title">' + t.icon + ' ' + t.name +
              (t.custom ? '<b>＋フルカスタム</b>' : '') + '</span>' +
            // ハプニングは車の絵からは分からないので、記録した種類を印で残す。
            (m ? '<span class="garage-mishap" title="' + m.say + '">' + m.icon + '</span>' : '') +
            '</button>';
        }).join('') + '</div>';
    screenEl.innerHTML = factoryBg() +
      '<div class="topbar"><button class="back-btn" data-action="home">＜ もどる</button><span></span>' + muteBtn() + '</div>' +
      '<div class="step-title">ガレージ（' + g.length + 'だい）</div>' +
      '<div class="garage-wrap">' + body + '</div>';
  }

  // ガレージの1台を大きく見る。
  function renderDetail() {
    var c = state.detail;
    if (!c) { state.screen = 'garage'; render(); return; }
    var t = CP.titleOf(c);
    var m = c.mishap && MISHAPS[c.mishap];
    screenEl.innerHTML = factoryBg() +
      '<div class="topbar"><button class="back-btn" data-action="garage">＜ もどる</button>' +
        '<span></span>' + muteBtn() + '</div>' +
      '<div class="inspect-stage"><div class="spotlight"></div>' +
        '<div class="inspect-car">' + carSvg(c, FULL_BUILT, {}) + '</div>' +
        '<div class="turntable"></div></div>' +
      // 称号とハプニングの記録は1つの塊にする。別々に置くと、
      // 下のボタンと重なる（実際に重なった）。
      '<div class="detail-info">' + titlePlate(t) +
        (m ? '<div class="detail-note">' + m.icon + ' ' + m.say + '</div>' : '') +
      '</div>' +
      '<div class="inspect-actions"><button class="big-btn" data-action="garage">ガレージに もどる</button></div>';
  }

  // ============================================================
  // 1台できあがったときの後始末
  // ============================================================
  function completeCar() {
    var c = Object.assign({}, state.car);
    // ハプニングはここで1回だけ決める。ガレージへの記録はこの関数で行うので、
    // 走り出してから抽選すると、記録には必ず「なし」が残ってしまう（実際にそうなった）。
    state.mishap = rollMishap(); state.mishapRolled = true;
    addToGarage(c, state.mishap);
    var before = {};
    Object.keys(UNLOCK_ORDER).forEach(function (k) { before[k] = unlockedCount(k); });
    state.made++;
    save(KEY.made, state.made);
    // 「まえの くるま」は **1台前** を指す。last を prev へ送ってから今回の車を last にする。
    // 順番を逆にすると prev と今回が同じ車になり、くらべる画面が同じ車どうしになる
    // （実際にそうなっていた）。作り直しで同じ車が続いたときは、さらに前を残す。
    var lastCar = load(KEY.last, null);
    if (lastCar && carKey(lastCar) !== carKey(c)) save(KEY.prev, lastCar);
    save(KEY.last, c);
    drop(KEY.wip);
    // 増えたパーツを集める
    state.newParts = [];
    Object.keys(UNLOCK_ORDER).forEach(function (k) {
      var after = unlockedCount(k);
      for (var i = before[k]; i < after; i++) {
        var key = UNLOCK_ORDER[k][i];
        var set = { body: CP.BODIES, roof: CP.ROOFS, window: CP.WINDOWS, engine: CP.ENGINES, seat: CP.SEATS, tire: CP.TIRES }[k];
        var cfg = Object.assign({}, c); cfg[k] = key;
        state.newParts.push({ label: set[key].label, svg: carSvg(cfg, FULL_BUILT, {}) });
      }
    });
  }

  function startNew() {
    state.screen = 'step'; state.stepIndex = 0;
    state.mishap = null; state.mishapRolled = false; state.comparePair = null;
    Object.keys(state.built).forEach(function (k) { state.built[k] = false; });
    // 解放されていないパーツが選ばれたままにならないようにする
    Object.keys(UNLOCK_ORDER).forEach(function (k) {
      if (unlockedKeys(k).indexOf(state.car[k]) < 0) state.car[k] = UNLOCK_ORDER[k][0];
    });
    drop(KEY.wip);
    render();
  }

  // ============================================================
  // 操作
  // ============================================================
  screenEl.addEventListener('click', function (e) {
    var t = e.target.closest('[data-action]');
    if (!t) return;
    var action = t.dataset.action, value = t.dataset.value;
    Sound.unlock();

    if (action === 'mute') {
      var m = Sound.toggleMuted();
      t.textContent = m ? '🔇' : '🔊';
      if (!m) { Sound.tap(); if (state.screen === 'step' || state.screen === 'title') Sound.bgmOn(); }
      return;
    }
    Sound.tap();

    if (action === 'start') { startNew(); return; }
    if (action === 'home') { state.screen = 'title'; render(); return; }
    if (action === 'garage') { state.screen = 'garage'; render(); return; }
    if (action === 'ship') { state.screen = 'deliver'; render(); return; }
    if (action === 'compare') {
      // 納車から来たときは「まえの／いまの」。ガレージ用の組は捨てる。
      state.comparePair = null;
      state.screen = 'compare'; render(); return;
    }
    if (action === 'show') {
      // ガレージの車をタップ：大きく見せるだけ。
      // くらべる（レース）はここには要らない。作った車を見返す場所なので、
      // 別の車と競走させると「見に来た車」が主役でなくなる。
      state.detail = garage()[Number(value)] || null;
      if (state.detail) { state.screen = 'detail'; render(); }
      return;
    }
    if (action === 'resume') {
      var w = load(KEY.wip, null);
      if (w) { state.car = w.car; state.built = w.built; state.stepIndex = w.stepIndex; state.screen = 'step'; render(); }
      return;
    }
    if (action === 'finish') {
      state.screen = state.newParts.length ? 'restock' : 'title';
      if (!state.newParts.length) state.screen = 'title';
      render();
      return;
    }
    if (action === 'back') {
      state.stepIndex--;
      for (var i = state.stepIndex; i < STEPS.length; i++) state.built[STEPS[i].key] = false;
      render();
      return;
    }
    if (action === 'prev') { movePick(-1); return; }
    if (action === 'next') { movePick(1); return; }
    if (action === 'pick') {
      Sound.confirm();
      var st = STEPS[state.stepIndex];
      // 押した時点で真ん中に出ている候補が答え。data-value は持たせない
      // （◀▶で変わるものを属性に持たせると、二重管理になってずれる）。
      var opts = optionsFor(st);
      var chosen = opts[state.pickIdx] || opts[0];
      state.car[st.key] = chosen.value;
      runStep(st.key, function () {
        saveWip();
        if (state.stepIndex < STEPS.length - 1) { state.stepIndex++; render(); }
        else { completeCar(); state.screen = 'inspect'; render(); }
      });
    }
  });

  window.addEventListener('resize', function () { FX.resize(); });

  // 起動時に保存を読む
  state.made = load(KEY.made, 0) || 0;
  render();
})();
