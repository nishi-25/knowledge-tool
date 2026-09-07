const { ipcRenderer } = require('electron');

// Electronのpreloadはデフォルトでsandbox化されており、'electron'以外の
// ローカルファイルをrequireできない（読み込めても例外になり、preload
// スクリプト全体が動かなくなる）。そのためport-config.jsを直接requireせず、
// メインプロセスがBrowserWindow作成時にwebPreferences.additionalArgumentsで
// 渡した現在有効なポート番号をprocess.argvから読み取る。
const DEFAULT_PORT = 8765;
const portArg = process.argv.find((a) => a.startsWith('--kv-port='));
const currentPort = portArg ? parseInt(portArg.split('=')[1], 10) : DEFAULT_PORT;

// contextIsolation: false でロードされるため、ここで設定した値はそのままレンダラーの
// window オブジェクトに載る。api.js はこれを見てローカルの同梱バックエンドへリクエストする。
window.__KV_API_BASE__ = `http://127.0.0.1:${currentPort}/api`;

// 保存先フォルダをOS純正のダイアログで選ばせるための橋渡し。
// null を返した場合はユーザーがキャンセルしたことを表す。
window.__KV_PICK_FOLDER__ = () => ipcRenderer.invoke('kv:pick-folder');

// 設定画面のポート変更用。今使用中のポート番号（同期・起動時に確定済み）と、
// 変更用のAPIを公開する。変更内容は次回起動から反映される。
window.__KV_GET_ACTIVE_PORT__ = () => currentPort;
window.__KV_SET_PORT__ = (port) => ipcRenderer.invoke('kv:set-port', port);
window.__KV_RELAUNCH__ = () => ipcRenderer.invoke('kv:relaunch');
