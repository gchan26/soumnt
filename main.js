const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 620,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');
  if (isDev) win.webContents.openDevTools({ mode: 'detach' });
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

function ytDlpBin() {
  return process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
}

ipcMain.handle('choose-folder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory']
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('start-download', async (event, payload) => {
  const { url, outDir, format } = payload;
  const ytdlp = ytDlpBin();

  return new Promise((resolve, reject) => {
    try {
      const outputTemplate = '%(title)s - %(id)s.%(ext)s';
      const args = [
        url,
        '--newline',
        '-o', path.join(outDir, outputTemplate),
        '--merge-output-format', 'mp4',
        '--no-progress'
      ];
      if (format && format.trim()) args.push('-f', format.trim());

      const proc = spawn(ytdlp, args, { windowsHide: true });

      proc.stdout.setEncoding('utf8');
      proc.stderr.setEncoding('utf8');

      proc.stdout.on('data', (data) => {
        event.sender.send('download-log', data);
        const m = data.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
        if (m) event.sender.send('download-progress', Number(m[1]));
      });

      proc.stderr.on('data', (data) => {
        event.sender.send('download-log', data);
      });

      proc.on('close', (code) => {
        if (code === 0) resolve({ ok: true });
        else reject(new Error('yt-dlp saiu com código ' + code));
      });

      proc.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
});
