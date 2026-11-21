const { app, BrowserWindow, shell, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

function normalizeHttpUrl(candidate) {
  if (!candidate || typeof candidate !== 'string') return '';
  const trimmed = candidate.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
  } catch {
    // abaikan format tidak valid
  }
  return '';
}

function loadTargetUrl() {
  // 1. Argumen CLI (--url=https://...) atau env YPTI_SERVER_URL
  const urlArg = process.argv.find((arg) => arg.startsWith('--url='));
  const argUrl = normalizeHttpUrl(urlArg ? urlArg.slice('--url='.length) : '');
  if (argUrl) return argUrl;

  const envUrl = normalizeHttpUrl(process.env.YPTI_SERVER_URL);
  if (envUrl) return envUrl;

  // 2. Berkas override runtime opsional (server-url.txt) di userData atau direktori exe
  const overrideCandidates = [];
  try {
    overrideCandidates.push(path.join(app.getPath('userData'), 'server-url.txt'));
  } catch {
    // abaikan jika userData belum tersedia
  }
  if (app.isPackaged) {
    overrideCandidates.push(path.join(path.dirname(process.execPath), 'server-url.txt'));
  }

  for (const filePath of overrideCandidates) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const valid = normalizeHttpUrl(content);
      if (valid) return valid;
    } catch {
      // file opsional belum ada
    }
  }

  // 3. Konfigurasi bawaan hasil build (app-config.json)
  const configPath = path.join(__dirname, 'app-config.json');
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    const valid = normalizeHttpUrl(parsed?.targetUrl);
    if (valid) return valid;
  } catch {
    // Gunakan fallback lokal hanya jika konfigurasi belum dibangkitkan saat pengembangan
  }
  return 'http://localhost:3000';
}

const TARGET_URL = loadTargetUrl();
const TARGET_ORIGIN = (() => {
  try {
    return new URL(TARGET_URL).origin;
  } catch {
    return '';
  }
})();

function isSameTargetOrigin(candidateUrl) {
  if (!TARGET_ORIGIN || !candidateUrl) return false;
  try {
    return new URL(candidateUrl).origin === TARGET_ORIGIN;
  } catch {
    return false;
  }
}

let mainWindow = null;

const singleLock = app.requestSingleInstanceLock();
if (!singleLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: 'PT YPTI Tool Room & Inventory ERP',
    backgroundColor: '#F8FAFC',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      if (isSameTargetOrigin(url)) {
        return { action: 'allow' };
      }
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) return;
    if (TARGET_ORIGIN && !isSameTargetOrigin(url)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, _errorDesc, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return;
    if (validatedURL.startsWith('file://')) return;
    mainWindow.loadFile(path.join(__dirname, 'offline.html'), {
      query: {
        url: TARGET_URL,
        code: String(errorCode),
      },
    });
  });

  mainWindow.loadURL(TARGET_URL);
}

ipcMain.on('ypti:retry-connection', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(TARGET_URL);
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
