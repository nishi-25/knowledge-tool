// contextIsolation: false でロードされるため、ここで設定した値はそのままレンダラーの
// window オブジェクトに載る。api.js はこれを見てローカルの同梱バックエンドへリクエストする。
window.__KV_API_BASE__ = 'http://127.0.0.1:8765/api';
