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
  if (app.isPackaged) {
    if (process.platform === 'darwin') {
      return path.join(process.resourcesPath, '..', 'Resources');
    }
    return process.resourcesPath;
  }
  return path.join(__dirname, 'resources');
}

function binPath(file) {
  return path.join(resourcesBase(), 'bin', platformDir(), file);
}

function resolveYtDlp() {
  const name = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  const full = binPath(name);
  
  if (fs.existsSync(full)) {
    try {
      fs.accessSync(full, fs.constants.F_OK | fs.constants.X_OK);
      return full;
    } catch (e) {
      if (process.platform !== 'win32') {
        try {
          fs.chmodSync(full, 0o755);
          return full;
        } catch (chmodErr) {
          console.warn('Could not set executable permissions:', chmodErr);
        }
      }
    }
  }
  
  return name;
}

function resolveFfmpeg() {
  const name = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const full = binPath(name);
  
  if (fs.existsSync(full)) {
    try {
      fs.accessSync(full, fs.constants.F_OK | fs.constants.X_OK);
      return full;
    } catch (e) {
      if (process.platform !== 'win32') {
        try {
          fs.chmodSync(full, 0o755);
          return full;
        } catch (chmodErr) {
          console.warn('Could not set executable permissions:', chmodErr);
        }
      }
    }
  }
  
  return name;
}

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 620,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev
    }
  });

  win.loadFile('index.html');
  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
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

      proc.on('error', (err) => {
        if (err.code === 'ENOENT') {
          reject(new Error(`Executável não encontrado: ${ytdlp}. Verifique se o yt-dlp está instalado e no PATH do sistema.`));
        } else {
          reject(err);
        }
      });

      proc.stdout.setEncoding('utf8');
      proc.stderr.setEncoding('utf8');

      proc.stdout.on('data', (data) => {
        event.sender.send('download-log', data);
        
        const progressMatch = data.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
        if (progressMatch) {
          event.sender.send('download-progress', Number(progressMatch[1]));
        } else if (data.includes('[youtube]') && data.includes('Extracting URL')) {
          event.sender.send('download-progress', 5);
        } else if (data.includes('[youtube]') && data.includes('Downloading webpage')) {
          event.sender.send('download-progress', 10);
        } else if (data.includes('[youtube]') && data.includes('Downloading player')) {
          event.sender.send('download-progress', 15);
        } else if (data.includes('[info]') && data.includes('Downloading')) {
          event.sender.send('download-progress', 20);
        } else if (data.includes('[download] Destination:')) {
          event.sender.send('download-progress', 25);
        } else if (data.includes('[download] Download completed')) {
          event.sender.send('download-progress', 85);
        } else if (data.includes('[Merger]')) {
          event.sender.send('download-progress', 90);
        }
      });

      proc.stderr.on('data', (data) => {
        event.sender.send('download-log', data);
        
        if (data.includes('WARNING:') && data.includes('Signature extraction failed')) {
          event.sender.send('download-progress', 18);
        }
      });

      proc.on('close', (code) => {
        if (code === 0) {
          event.sender.send('download-progress', 100);
          resolve({ ok: true });
        } else {
          reject(new Error('yt-dlp saiu com código ' + code));
        }
      });

    } catch (err) {
      reject(err);
    }
  });
});
