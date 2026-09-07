// main.js（メインプロセス）とpreload.js（プリロード）の両方から使う、
// 内蔵バックエンドの待受ポート設定。preloadはElectronの`app`モジュールに
// アクセスできないため、userDataパスは呼び出し側から渡してもらう。
const fs = require('fs');
const path = require('path');

const DEFAULT_PORT = 8765;

function configPath(userDataDir) {
  return path.join(userDataDir, 'port-config.json');
}

function getPort(userDataDir) {
  try {
    const raw = fs.readFileSync(configPath(userDataDir), 'utf-8');
    const port = JSON.parse(raw).port;
    if (Number.isInteger(port) && port >= 1024 && port <= 65535) return port;
  } catch {
    // 未設定 or 壊れている場合は既定値
  }
  return DEFAULT_PORT;
}

function setPort(userDataDir, port) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('ポート番号は1024〜65535の範囲で指定してください');
  }
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.writeFileSync(configPath(userDataDir), JSON.stringify({ port }), 'utf-8');
}

module.exports = { DEFAULT_PORT, getPort, setPort };
