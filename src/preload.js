const { contextBridge, ipcRenderer, webUtils } = require('electron');

function filePathFromDropFile(file) {
  if (!file) return '';
  if (webUtils?.getPathForFile) return webUtils.getPathForFile(file);
  return file.path || '';
}

contextBridge.exposeInMainWorld('stagecueAudio', {
  selectAudioFiles: () => ipcRenderer.invoke('audio:select-files'),
  droppedFilesToCues: (files) => {
    const filePaths = Array.from(files || []).map(filePathFromDropFile).filter(Boolean);
    return ipcRenderer.invoke('audio:from-paths', filePaths);
  },
  openProject: () => ipcRenderer.invoke('project:open'),
  saveProject: (payload) => ipcRenderer.invoke('project:save', payload)
});

