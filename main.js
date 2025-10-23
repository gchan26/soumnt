const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const isDev = require('electron-is-dev');

let win;

function platformDir() {
  if (process.platform === 'win32') return 'win';
  if (process.platform === 'darwin') return 'mac';
  return 'linux'; // Ainda não há suporte para Linux
}

function resourcesBase() {
  return app.isPackaged
    ? process.resourcesPath
    : path.join(__dirname, 'resources');
}

function binPath(file) {
  return path.join(resourcesBase(), 'bin', platformDir(), file);
}

function resolveYtDlp() {
  const name = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const full = binPath(name);
  return fs.existsSync(full) ? full : name;
}

function resolveFfmpeg() {
  const name = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const full = binPath(name);
  return fs.existsSync(full) ? full : name;
}

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

ipcMain.handle('choose-folder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'createDirectory']
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle('start-download', async (event, payload) => {
  const { url, outDir, format } = payload;

  const ytdlp = resolveYtDlp();
  const ffmpeg = resolveFfmpeg();
  const ffmpegDir = path.dirname(ffmpeg);

  return new Promise((resolve, reject) => {
    try {
      const outputTemplate = '%(title)s - %(id)s.%(ext)s';

      const args = [
        url,
        '--newline',
        '-o', path.join(outDir, outputTemplate),
        '--merge-output-format', 'mp4',
        '--no-progress',
        '--ffmpeg-location', ffmpegDir
      ];
      if (format && format.trim()) args.push('-f', format.trim());

      const proc = spawn(ytdlp, args, {
        windowsHide: true,
        env: {
          ...process.env,
          PATH: `${ffmpegDir}${path.delimiter}${process.env.PATH || ''}`
        }
      });

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
