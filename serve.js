// このアプリを手元で開くための簡易サーバー。
//
//   node serve.js          … http://localhost:8791 で開く
//   node serve.js 3000     … ポートを変えたいとき
//
// ビルドは要らないので index.html を直接ダブルクリックしても動くが、
// file:// で開くとサービスワーカーが登録できず、オフライン動作や
// 音声ファイルの読み込みが確かめられない。実機で試す前はこちらを使う。
//
// iPad から見るには、PCと同じWi-Fiにつないだうえで
//   http://（PCのIPアドレス）:8791
// を Safari で開く。IPアドレスは PowerShell の ipconfig か、
// 起動時に下に表示されるものを使う。

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = __dirname;
const port = Number(process.argv[2] || 8791);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
};

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';

  // ルートより上には出さない（.. を使ったアクセスを防ぐ）
  const filePath = path.join(root, rel);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not found: ' + rel);
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      // サービスワーカーの更新を確かめたいので、ブラウザ側のキャッシュは使わせない
      // （アプリ自身のキャッシュ＝sw.js の挙動は、これとは別に本番どおり効く）
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`ポート ${port} はすでに使われています。`);
    console.error(`別のポートで起動するには:  node serve.js ${port + 1}`);
  } else {
    console.error(e.message);
  }
  process.exit(1);
});

server.listen(port, () => {
  console.log(`\n  のりものづくり を配信中\n`);
  console.log(`  このPC   : http://localhost:${port}`);

  // 同じWi-Fi内の iPad から開くためのアドレス
  const nets = os.networkInterfaces();
  const addrs = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) addrs.push({ name, address: net.address });
    }
  }
  if (addrs.length) {
    console.log('');
    for (const a of addrs) {
      console.log(`  iPad から : http://${a.address}:${port}   (${a.name})`);
    }
    console.log('\n  ※ iPad は同じWi-Fiにつないでおくこと');
  }

  console.log('\n  止めるときは Ctrl+C\n');
});
