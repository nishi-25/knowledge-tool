const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const KV_PORT = 8765;
let backendProcess = null;

function backendExecutablePath() {
  const name = process.platform === 'win32' ? 'knowledge-view-backend.exe' : 'knowledge-view-backend';
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend', name);
  }
  return path.join(__dirname, 'dist', name);
}

function frontendIndexPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'frontend', 'index.html');
  }
  return path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
}

function startBackend() {
  const dataDir = path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  backendProcess = spawn(backendExecutablePath(), [], {
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
  startBackend();
  try {
    await waitForBackend();
  } catch (e) {
    console.error(e);
  }

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: false,
    },
  });
  win.loadFile(frontendIndexPath());
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill();
});
