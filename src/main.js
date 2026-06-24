const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;

function rendererPath(fileName) {
  return path.join(__dirname, 'renderer', fileName);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 780,
    minWidth: 1020,
    minHeight: 680,
    title: 'StageCue Audio',
    backgroundColor: '#101318',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenu(null);
  mainWindow.loadFile(rendererPath('controller.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function audioCueFromPath(filePath) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'audio',
    name: path.basename(filePath, path.extname(filePath)),
    filePath,
    url: pathToFileURL(filePath).toString(),
    volume: 1,
    gainDb: 0,
    startTime: 0,
    endTime: null,
    fadeIn: 0,
    fadeOut: 3,
    loop: false,
    afterAction: 'wait',
    memo: ''
  };
}

function hydrateCue(savedCue) {
  if (!savedCue?.filePath) return null;
  return {
    id: savedCue.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type: 'audio',
    name: savedCue.name || path.basename(savedCue.filePath, path.extname(savedCue.filePath)),
    filePath: savedCue.filePath,
    url: pathToFileURL(savedCue.filePath).toString(),
    volume: clampNumber(savedCue.volume, 0, 1, 1),
    gainDb: clampNumber(savedCue.gainDb, -24, 12, 0),
    startTime: Math.max(0, Number(savedCue.startTime || 0)),
    endTime: savedCue.endTime === null || savedCue.endTime === undefined ? null : Math.max(0, Number(savedCue.endTime || 0)),
    fadeIn: Math.max(0, Number(savedCue.fadeIn || 0)),
    fadeOut: Math.max(0, Number(savedCue.fadeOut ?? 3)),
    loop: Boolean(savedCue.loop),
    afterAction: savedCue.afterAction === 'next' ? 'next' : 'wait',
    memo: savedCue.memo || ''
  };
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

ipcMain.handle('audio:select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '音声ファイルを追加',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '音声ファイル', extensions: ['mp3', 'wav', 'aiff', 'aif', 'm4a', 'aac', 'flac', 'ogg'] },
      { name: 'すべてのファイル', extensions: ['*'] }
    ]
  });

  if (result.canceled) return [];
  return result.filePaths.map(audioCueFromPath);
});

ipcMain.handle('audio:from-paths', (_event, filePaths) => {
  return (filePaths || []).map(audioCueFromPath);
});

ipcMain.handle('project:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'セットリストを開く',
    properties: ['openFile'],
    filters: [
      { name: 'StageCue Audio セットリスト', extensions: ['stagecue'] },
      { name: 'すべてのファイル', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePaths[0]) return null;

  const filePath = result.filePaths[0];
  const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
  const stages = Array.isArray(data.stages) ? data.stages : [];

  return {
    filePath,
    title: data.title || path.basename(filePath, path.extname(filePath)),
    stages: stages.map((stageItem) => ({
      id: stageItem.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: stageItem.name || 'ステージ',
      cues: (stageItem.cues || []).map(hydrateCue).filter(Boolean)
    }))
  };
});

ipcMain.handle('project:save', async (_event, payload) => {
  const title = payload?.title || 'StageCue Audio セットリスト';
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'セットリストを保存',
    defaultPath: `${title}.stagecue`,
    filters: [
      { name: 'StageCue Audio セットリスト', extensions: ['stagecue'] }
    ]
  });

  if (result.canceled || !result.filePath) return null;

  const data = {
    app: 'StageCue Audio',
    formatVersion: 1,
    savedAt: new Date().toISOString(),
    title,
    stages: (payload?.stages || []).map((stageItem) => ({
      id: stageItem.id,
      name: stageItem.name,
      cues: (stageItem.cues || []).map((cue) => ({
        id: cue.id,
        type: cue.type || 'audio',
        name: cue.name,
        filePath: cue.filePath,
        volume: clampNumber(cue.volume, 0, 1, 1),
        gainDb: clampNumber(cue.gainDb, -24, 12, 0),
        startTime: Math.max(0, Number(cue.startTime || 0)),
        endTime: cue.endTime === null || cue.endTime === undefined || cue.endTime === '' ? null : Math.max(0, Number(cue.endTime || 0)),
        fadeIn: Math.max(0, Number(cue.fadeIn || 0)),
        fadeOut: Math.max(0, Number(cue.fadeOut ?? 3)),
        loop: Boolean(cue.loop),
        afterAction: cue.afterAction === 'next' ? 'next' : 'wait',
        memo: cue.memo || ''
      }))
    }))
  };

  await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf8');
  return { filePath: result.filePath };
});

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});

