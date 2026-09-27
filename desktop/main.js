const { app, BrowserWindow, dialog, protocol, net, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const url = require('url');
const portConfig = require('./port-config');

// アプリ起動時点で固定する。設定画面から変更した値は次回起動から反映される
// （実行中のバックエンドを別ポートへ移し替えることはしない）。
const KV_PORT = portConfig.getPort(app.getPath('userData'));
const FRONTEND_SCHEME = 'app';
// 終了時にバックエンドへ穏当な停止を要求するための、起動ごとの使い捨てトークン。
const SHUTDOWN_TOKEN = crypto.randomBytes(24).toString('hex');
const GRACEFUL_STOP_TIMEOUT_MS = 8000;
const MIN_SPLASH_MS = 600;
let backendProcess = null;
let backendReady = false;
let fatalErrorShown = false;
let splashWindow = null;
let mainWindow = null;
let quitInProgress = false;
let readyToQuit = false;

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
  closeSplash();
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

function backendRunning() {
  return Boolean(backendProcess) && backendProcess.exitCode === null && backendProcess.signalCode === null;
}

function showSplash(mode) {
  closeSplash();
  splashWindow = new BrowserWindow({
    width: 360,
    height: 240,
    frame: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    center: true,
    show: false,
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  splashWindow.once('ready-to-show', () => splashWindow && splashWindow.show());
  splashWindow.loadFile(path.join(__dirname, 'splash.html'), { query: { mode } });
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.destroy();
  splashWindow = null;
}

function requestBackendShutdown() {
  return new Promise((resolve) => {
    const req = http.request({
      host: '127.0.0.1',
      port: KV_PORT,
      path: '/api/desktop/shutdown',
      method: 'POST',
      headers: { 'X-KV-Shutdown-Token': SHUTDOWN_TOKEN, 'Content-Length': 0 },
      timeout: 3000,
    }, (res) => { res.resume(); resolve(res.statusCode === 200); });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

// 処理中の保存を完了させてからバックエンドを止める。一定時間内に止まらなければ
// 従来どおり強制終了にフォールバックする（終了できないままアプリが残るのを防ぐ）。
async function stopBackendGracefully() {
  if (!backendRunning()) return;
  const exited = new Promise((resolve) => backendProcess.once('exit', resolve));
  const accepted = await requestBackendShutdown();
  if (accepted) {
    const timedOut = await Promise.race([
      exited.then(() => false),
      new Promise((resolve) => setTimeout(() => resolve(true), GRACEFUL_STOP_TIMEOUT_MS)),
    ]);
    if (!timedOut) return;
  }
  killBackend();
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
      KV_SHUTDOWN_TOKEN: SHUTDOWN_TOKEN,
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

async function startApp() {
  showSplash('starting');
  const splashShownAt = Date.now();

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

  // 起動が一瞬で終わった場合でも、スプラッシュが点滅して見えないよう最低限表示する
  const elapsed = Date.now() - splashShownAt;
  if (elapsed < MIN_SPLASH_MS) await new Promise((r) => setTimeout(r, MIN_SPLASH_MS - elapsed));
  if (quitInProgress) return;
  createMainWindow();
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: false,
      // preloadは`app`モジュールを使えないため、現在有効なポートを
      // コマンドライン引数経由で渡す（preload.jsがprocess.argvから読む）。
      additionalArguments: [`--kv-port=${KV_PORT}`],
    },
  });
  mainWindow = win;
  win.once('ready-to-show', () => {
    win.show();
    closeSplash();
  });
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('画面の読み込みに失敗しました:', errorCode, errorDescription);
    showFatalError(`画面の読み込みに失敗しました (${errorCode}: ${errorDescription})`);
  });
  win.loadURL(`${FRONTEND_SCHEME}://app/index.html`);
}

ipcMain.handle('kv:set-port', (_event, port) => {
  portConfig.setPort(app.getPath('userData'), port);
  return true;
});

ipcMain.handle('kv:relaunch', () => {
  // app.exit() だと before-quit を経由せずバックエンドが取り残されるため、
  // 通常の終了処理（穏当な停止）を通してから再起動する。
  app.relaunch();
  app.quit();
});

ipcMain.handle('kv:pick-folder', async () => {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

app.whenReady().then(() => {
  registerFrontendProtocol();
  startApp();
  app.on('activate', () => {
    // macOSでウィンドウだけ閉じた後の再表示。バックエンドは動き続けているので再起動しない。
    if (backendReady && !quitInProgress && BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', (event) => {
  if (readyToQuit) return;
  event.preventDefault();
  if (quitInProgress) return;
  quitInProgress = true;

  (async () => {
    if (backendRunning()) {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
      if (!fatalErrorShown) showSplash('stopping');
      const startedAt = Date.now();
      await stopBackendGracefully();
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_SPLASH_MS) await new Promise((r) => setTimeout(r, MIN_SPLASH_MS - elapsed));
    }
    closeSplash();
    readyToQuit = true;
    app.quit();
  })();
});
