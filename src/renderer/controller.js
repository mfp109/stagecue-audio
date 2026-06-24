const api = window.stagecueAudio;
const audio = document.getElementById('audioPlayer');

const state = {
  filePath: null,
  stages: [
    { id: makeId(), name: '第1部', cues: [] }
  ],
  selectedStageId: null,
  selectedCueId: null,
  playingCueId: null,
  fadeTimer: null
};

state.selectedStageId = state.stages[0].id;

const els = {
  projectTitle: document.getElementById('projectTitle'),
  openProjectBtn: document.getElementById('openProjectBtn'),
  saveProjectBtn: document.getElementById('saveProjectBtn'),
  addStageBtn: document.getElementById('addStageBtn'),
  addAudioBtn: document.getElementById('addAudioBtn'),
  stageList: document.getElementById('stageList'),
  currentStageName: document.getElementById('currentStageName'),
  cueList: document.getElementById('cueList'),
  dropZone: document.getElementById('dropZone'),
  moveUpBtn: document.getElementById('moveUpBtn'),
  moveDownBtn: document.getElementById('moveDownBtn'),
  deleteCueBtn: document.getElementById('deleteCueBtn'),
  emptyDetail: document.getElementById('emptyDetail'),
  cueForm: document.getElementById('cueForm'),
  cueName: document.getElementById('cueName'),
  startTime: document.getElementById('startTime'),
  endTime: document.getElementById('endTime'),
  volume: document.getElementById('volume'),
  gainDb: document.getElementById('gainDb'),
  fadeIn: document.getElementById('fadeIn'),
  fadeOut: document.getElementById('fadeOut'),
  loop: document.getElementById('loop'),
  afterAction: document.getElementById('afterAction'),
  memo: document.getElementById('memo'),
  goBtn: document.getElementById('goBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  resumeBtn: document.getElementById('resumeBtn'),
  stopBtn: document.getElementById('stopBtn'),
  fadeStopBtn: document.getElementById('fadeStopBtn'),
  nowPlaying: document.getElementById('nowPlaying'),
  timeStatus: document.getElementById('timeStatus'),
  nextCue: document.getElementById('nextCue')
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function selectedStage() {
  return state.stages.find((stageItem) => stageItem.id === state.selectedStageId) || state.stages[0];
}

function selectedCue() {
  return selectedStage()?.cues.find((cue) => cue.id === state.selectedCueId) || null;
}

function nextCue() {
  const stageItem = selectedStage();
  if (!stageItem || stageItem.cues.length === 0) return null;
  if (!state.selectedCueId) return stageItem.cues[0];
  const index = stageItem.cues.findIndex((cue) => cue.id === state.selectedCueId);
  return stageItem.cues[index >= 0 ? index : 0] || null;
}

function render() {
  renderStages();
  renderCues();
  renderDetail();
  renderTransport();
}

function renderStages() {
  els.stageList.innerHTML = '';
  state.stages.forEach((stageItem) => {
    const button = document.createElement('button');
    button.className = `stage-item${stageItem.id === state.selectedStageId ? ' active' : ''}`;
    button.textContent = `${stageItem.name} (${stageItem.cues.length})`;
    button.addEventListener('click', () => {
      state.selectedStageId = stageItem.id;
      state.selectedCueId = stageItem.cues[0]?.id || null;
      render();
    });
    button.addEventListener('dblclick', () => renameStage(stageItem));
    els.stageList.appendChild(button);
  });
}

function renderCues() {
  const stageItem = selectedStage();
  els.currentStageName.textContent = stageItem?.name || 'ステージ';
  els.cueList.innerHTML = '';

  if (!stageItem || stageItem.cues.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-detail';
    empty.textContent = '曲がありません。曲を追加してください。';
    els.cueList.appendChild(empty);
    return;
  }

  stageItem.cues.forEach((cue, index) => {
    const button = document.createElement('button');
    button.className = `cue-item${cue.id === state.selectedCueId ? ' active' : ''}`;
    button.draggable = true;
    button.innerHTML = `
      <div class="cue-number">${index + 1}</div>
      <div>
        <div class="cue-name"></div>
        <div class="cue-meta">${formatSeconds(cue.startTime)} から / ${Math.round(cue.volume * 100)}% / ${cue.gainDb} dB</div>
      </div>
      <div class="cue-badge">${cue.afterAction === 'next' ? '自動次へ' : '待機'}</div>
    `;
    button.querySelector('.cue-name').textContent = cue.name;
    button.addEventListener('click', () => {
      state.selectedCueId = cue.id;
      render();
    });
    button.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', cue.id);
    });
    button.addEventListener('dragover', (event) => event.preventDefault());
    button.addEventListener('drop', (event) => {
      event.preventDefault();
      reorderCue(event.dataTransfer.getData('text/plain'), cue.id);
    });
    els.cueList.appendChild(button);
  });
}

function renderDetail() {
  const cue = selectedCue();
  els.emptyDetail.classList.toggle('hidden', Boolean(cue));
  els.cueForm.classList.toggle('hidden', !cue);
  if (!cue) return;

  els.cueName.value = cue.name;
  els.startTime.value = cue.startTime;
  els.endTime.value = cue.endTime ?? '';
  els.volume.value = Math.round(cue.volume * 100);
  els.gainDb.value = cue.gainDb;
  els.fadeIn.value = cue.fadeIn;
  els.fadeOut.value = cue.fadeOut;
  els.loop.checked = cue.loop;
  els.afterAction.value = cue.afterAction;
  els.memo.value = cue.memo;
}

function renderTransport() {
  const cue = selectedCue();
  const playing = findCueById(state.playingCueId);
  els.nowPlaying.textContent = playing ? playing.name : '未再生';
  els.nextCue.textContent = cue ? cue.name : 'なし';
}

function findCueById(cueId) {
  for (const stageItem of state.stages) {
    const cue = stageItem.cues.find((item) => item.id === cueId);
    if (cue) return cue;
  }
  return null;
}

function updateSelectedCue(updates) {
  const cue = selectedCue();
  if (!cue) return;
  Object.assign(cue, updates);
  renderCues();
  renderTransport();
}

function addCuesToSelectedStage(cues) {
  const stageItem = selectedStage();
  if (!stageItem) return;
  stageItem.cues.push(...cues);
  if (!state.selectedCueId && stageItem.cues[0]) {
    state.selectedCueId = stageItem.cues[0].id;
  }
  render();
}

function renameStage(stageItem) {
  const name = window.prompt('ステージ名', stageItem.name);
  if (!name) return;
  stageItem.name = name.trim();
  render();
}

function reorderCue(sourceId, targetId) {
  const stageItem = selectedStage();
  const from = stageItem.cues.findIndex((cue) => cue.id === sourceId);
  const to = stageItem.cues.findIndex((cue) => cue.id === targetId);
  if (from < 0 || to < 0 || from === to) return;
  const [cue] = stageItem.cues.splice(from, 1);
  stageItem.cues.splice(to, 0, cue);
  render();
}

function moveSelectedCue(direction) {
  const stageItem = selectedStage();
  const index = stageItem.cues.findIndex((cue) => cue.id === state.selectedCueId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= stageItem.cues.length) return;
  const [cue] = stageItem.cues.splice(index, 1);
  stageItem.cues.splice(nextIndex, 0, cue);
  render();
}

function deleteSelectedCue() {
  const stageItem = selectedStage();
  const index = stageItem.cues.findIndex((cue) => cue.id === state.selectedCueId);
  if (index < 0) return;
  stageItem.cues.splice(index, 1);
  state.selectedCueId = stageItem.cues[Math.min(index, stageItem.cues.length - 1)]?.id || null;
  render();
}

async function playCue(cue) {
  if (!cue) return;
  clearFadeTimer();
  state.playingCueId = cue.id;
  audio.src = cue.url;
  audio.currentTime = Math.max(0, Number(cue.startTime || 0));
  audio.loop = cue.loop;
  audio.volume = effectiveVolume(cue);
  await audio.play();
  render();
}

function effectiveVolume(cue) {
  const gain = Math.pow(10, Number(cue.gainDb || 0) / 20);
  return clamp(Number(cue.volume || 1) * gain, 0, 1);
}

function stopAudio(resetPlaying = true) {
  clearFadeTimer();
  audio.pause();
  audio.currentTime = 0;
  if (resetPlaying) state.playingCueId = null;
  render();
}

function fadeOutStop() {
  const cue = findCueById(state.playingCueId);
  if (!cue) {
    stopAudio();
    return;
  }

  clearFadeTimer();
  const seconds = Math.max(0, Number(cue.fadeOut || 0));
  if (seconds === 0) {
    stopAudio();
    return;
  }

  const startVolume = audio.volume;
  const startedAt = Date.now();
  state.fadeTimer = window.setInterval(() => {
    const elapsed = (Date.now() - startedAt) / 1000;
    const ratio = clamp(1 - elapsed / seconds, 0, 1);
    audio.volume = startVolume * ratio;
    if (ratio <= 0) stopAudio();
  }, 50);
}

function clearFadeTimer() {
  if (!state.fadeTimer) return;
  window.clearInterval(state.fadeTimer);
  state.fadeTimer = null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatSeconds(value) {
  const total = Math.max(0, Math.floor(Number(value || 0)));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function advanceSelection() {
  const stageItem = selectedStage();
  const index = stageItem.cues.findIndex((cue) => cue.id === state.selectedCueId);
  const next = stageItem.cues[index + 1];
  if (next) state.selectedCueId = next.id;
  render();
}

els.addStageBtn.addEventListener('click', () => {
  const stageItem = { id: makeId(), name: `ステージ ${state.stages.length + 1}`, cues: [] };
  state.stages.push(stageItem);
  state.selectedStageId = stageItem.id;
  state.selectedCueId = null;
  render();
});

els.addAudioBtn.addEventListener('click', async () => {
  addCuesToSelectedStage(await api.selectAudioFiles());
});

els.openProjectBtn.addEventListener('click', async () => {
  const project = await api.openProject();
  if (!project) return;
  els.projectTitle.value = project.title;
  state.filePath = project.filePath;
  state.stages = project.stages.length ? project.stages : [{ id: makeId(), name: '第1部', cues: [] }];
  state.selectedStageId = state.stages[0].id;
  state.selectedCueId = state.stages[0].cues[0]?.id || null;
  state.playingCueId = null;
  stopAudio(false);
  render();
});

els.saveProjectBtn.addEventListener('click', async () => {
  await api.saveProject({
    title: els.projectTitle.value,
    stages: state.stages
  });
});

els.dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  els.dropZone.classList.add('dragging');
});

els.dropZone.addEventListener('dragleave', () => {
  els.dropZone.classList.remove('dragging');
});

els.dropZone.addEventListener('drop', async (event) => {
  event.preventDefault();
  els.dropZone.classList.remove('dragging');
  addCuesToSelectedStage(await api.droppedFilesToCues(event.dataTransfer.files));
});

els.moveUpBtn.addEventListener('click', () => moveSelectedCue(-1));
els.moveDownBtn.addEventListener('click', () => moveSelectedCue(1));
els.deleteCueBtn.addEventListener('click', deleteSelectedCue);

els.cueName.addEventListener('input', () => updateSelectedCue({ name: els.cueName.value }));
els.startTime.addEventListener('input', () => updateSelectedCue({ startTime: Math.max(0, Number(els.startTime.value || 0)) }));
els.endTime.addEventListener('input', () => updateSelectedCue({ endTime: els.endTime.value === '' ? null : Math.max(0, Number(els.endTime.value || 0)) }));
els.volume.addEventListener('input', () => updateSelectedCue({ volume: clamp(Number(els.volume.value || 0) / 100, 0, 1) }));
els.gainDb.addEventListener('input', () => updateSelectedCue({ gainDb: clamp(Number(els.gainDb.value || 0), -24, 12) }));
els.fadeIn.addEventListener('input', () => updateSelectedCue({ fadeIn: Math.max(0, Number(els.fadeIn.value || 0)) }));
els.fadeOut.addEventListener('input', () => updateSelectedCue({ fadeOut: Math.max(0, Number(els.fadeOut.value || 0)) }));
els.loop.addEventListener('change', () => updateSelectedCue({ loop: els.loop.checked }));
els.afterAction.addEventListener('change', () => updateSelectedCue({ afterAction: els.afterAction.value }));
els.memo.addEventListener('input', () => updateSelectedCue({ memo: els.memo.value }));

els.goBtn.addEventListener('click', () => playCue(nextCue()));
els.pauseBtn.addEventListener('click', () => audio.pause());
els.resumeBtn.addEventListener('click', () => audio.play());
els.stopBtn.addEventListener('click', () => stopAudio());
els.fadeStopBtn.addEventListener('click', fadeOutStop);

document.addEventListener('keydown', (event) => {
  if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
  if (event.code === 'Space') {
    event.preventDefault();
    playCue(nextCue());
  }
});

audio.addEventListener('timeupdate', () => {
  const cue = findCueById(state.playingCueId);
  const endTime = cue?.endTime;
  if (cue && endTime && audio.currentTime >= endTime) {
    stopAudio();
    if (cue.afterAction === 'next') advanceSelection();
    return;
  }
  els.timeStatus.textContent = `${formatSeconds(audio.currentTime)} / ${formatSeconds(audio.duration || 0)}`;
});

audio.addEventListener('ended', () => {
  const cue = findCueById(state.playingCueId);
  stopAudio();
  if (cue?.afterAction === 'next') advanceSelection();
});

render();

