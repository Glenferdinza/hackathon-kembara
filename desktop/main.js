const { app, BrowserWindow, shell, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

function loadTargetUrl() {
  const configPath = path.join(__dirname, 'app-config.json');
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.targetUrl === 'string' && parsed.targetUrl.trim()) {
      return parsed.targetUrl.trim();
    }
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
      if (TARGET_ORIGIN && url.startsWith(TARGET_ORIGIN)) {
        return { action: 'allow' };
      }
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) return;
    if (TARGET_ORIGIN && !url.startsWith(TARGET_ORIGIN)) {
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
