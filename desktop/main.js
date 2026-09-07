const { app, BrowserWindow, dialog, protocol, net } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const url = require('url');

const KV_PORT = 8765;
const FRONTEND_SCHEME = 'app';
let backendProcess = null;
let backendReady = false;
let fatalErrorShown = false;

// Chromium blocks cross-origin fetches for <script type="module"> (which is
// how Vite's production build always emits its entry script) when the page
// is loaded from a plain file:// URL, leaving the window blank with no
// visible error. Serving the built frontend through a registered "standard"
// custom scheme instead gives it a real origin, avoiding that restriction.
// This must run before app is ready.
protocol.registerSchemesAsPrivileged([
  {
    scheme: FRONTEND_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);

function showFatalError(message) {
  if (fatalErrorShown) return;
  fatalErrorShown = true;
  dialog.showErrorBox('Knowledge View の起動に失敗しました', message);
  app.quit();
}

function killBackend() {
  if (!backendProcess || backendProcess.killed) return;
  if (process.platform === 'win32' && backendProcess.pid) {
    // 子プロセスだけでなくプロセスツリー全体を強制終了する。取り残された
    // プロセスがインストールフォルダのファイルをロックしたままになると、
    // 次回起動時の失敗やアンインストールが完了しない不具合につながるため。
    spawn('taskkill', ['/pid', String(backendProcess.pid), '/t', '/f']);
  } else {
    backendProcess.kill();
  }
}

function backendExecutablePath() {
  const name = process.platform === 'win32' ? 'knowledge-view-backend.exe' : 'knowledge-view-backend';
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend', name);
  }
  // PyInstaller onedir 出力: dist/knowledge-view-backend/knowledge-view-backend(.exe)
  return path.join(__dirname, 'dist', 'knowledge-view-backend', name);
}

function frontendDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'frontend');
  }
  return path.join(__dirname, '..', 'frontend', 'dist');
}

function registerFrontendProtocol() {
  protocol.handle(FRONTEND_SCHEME, (request) => {
    const requestUrl = new URL(request.url);
    let pathname = decodeURIComponent(requestUrl.pathname);
    if (pathname === '' || pathname === '/') pathname = '/index.html';
    const filePath = path.join(frontendDir(), pathname);
    return net.fetch(url.pathToFileURL(filePath).toString());
  });
}

function startBackend() {
  const dataDir = path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  const execPath = backendExecutablePath();
  if (!fs.existsSync(execPath)) {
    throw new Error(`バックエンドの実行ファイルが見つかりません: ${execPath}`);
  }

  backendProcess = spawn(execPath, [], {
    env: {
      ...process.env,
      KV_MODE: 'desktop',
      KV_DATA_DIR_LOCAL: dataDir,
      KV_PORT: String(KV_PORT),
    },
    stdio: 'ignore',
  });

  backendProcess.on('error', (err) => {
    console.error('バックエンドの起動に失敗しました:', err);
    showFatalError(`バックエンドの起動に失敗しました。\n\n${err.message}`);
  });

  backendProcess.on('exit', (code, signal) => {
    if (backendProcess && !backendReady) {
      console.error(`バックエンドが予期せず終了しました (code=${code}, signal=${signal})`);
      showFatalError(
        `バックエンドが起動直後に終了しました (code=${code}, signal=${signal})。\n\n`
        + 'セキュリティソフト（ウイルス対策ソフト）がブロックしている可能性があります。'
        + '除外設定を確認するか、インストーラーを再実行してみてください。',
      );
    }
  });
}

function waitForBackend(timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(`http://127.0.0.1:${KV_PORT}/api/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) resolve();
        else retry();
      });
      req.on('error', retry);
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error('バックエンドの起動がタイムアウトしました'));
        return;
      }
      setTimeout(tryOnce, 300);
    };
    tryOnce();
  });
}

async function createWindow() {
  try {
    startBackend();
  } catch (e) {
    console.error(e);
    showFatalError(e.message);
    return;
  }

  try {
    await waitForBackend();
    backendReady = true;
  } catch (e) {
    console.error(e);
    showFatalError(
      `バックエンドの起動がタイムアウトしました。\n\n`
      + 'セキュリティソフト（ウイルス対策ソフト）がブロックしている可能性があります。'
      + '除外設定を確認するか、インストーラーを再実行してみてください。',
    );
    return;
  }

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: false,
    },
  });
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('画面の読み込みに失敗しました:', errorCode, errorDescription);
    showFatalError(`画面の読み込みに失敗しました (${errorCode}: ${errorDescription})`);
  });
  win.loadURL(`${FRONTEND_SCHEME}://app/index.html`);
}

app.whenReady().then(() => {
  registerFrontendProtocol();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  killBackend();
});
