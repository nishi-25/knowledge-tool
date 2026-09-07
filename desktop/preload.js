const { ipcRenderer } = require('electron');

// contextIsolation: false でロードされるため、ここで設定した値はそのままレンダラーの
// window オブジェクトに載る。api.js はこれを見てローカルの同梱バックエンドへリクエストする。
window.__KV_API_BASE__ = 'http://127.0.0.1:8765/api';

// 保存先フォルダをOS純正のダイアログで選ばせるための橋渡し。
// null を返した場合はユーザーがキャンセルしたことを表す。
window.__KV_PICK_FOLDER__ = () => ipcRenderer.invoke('kv:pick-folder');
