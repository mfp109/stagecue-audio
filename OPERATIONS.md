# StageCue Audio 運用メモ

## 基本情報

- アプリ名: StageCue Audio
- repo: https://github.com/mfp109/stagecue-audio
- 初期対象: Mac
- appId: `tech.shalomworks.stagecueaudio`
- 保存形式: `.stagecue`
- 公開方針: Mac版を先に実用化し、GitHubで一般公開する

## ローカル作業

```bash
npm install
npm run check
npm start
```

## Macアプリ作成

```bash
npm run build:mac:dir
```

成果物:

```text
dist/mac/StageCueAudio.app
```

## 確認項目

1. `npm run check` が通る。
2. `npm run build:mac:dir` が通る。
3. 曲を追加できる。
4. ステージごとに曲を分けられる。
5. GOで選択曲を再生できる。
6. 一時停止後、同じ位置から再開できる。
7. 停止で再生が止まる。
8. 開始位置とゲイン設定が保存される。

## 初期版で扱わないもの

- MIDI / OSC
- Stream Deck
- 照明制御
- 映像送出
- タイムコード同期

