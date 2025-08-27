# YouTube代替サイト

このプロジェクトは、YouTubeの動画を検索・視聴できるWebアプリです。
- 検索機能：YouTube動画をキーワードで検索
- 視聴機能：yt-dlpで取得した動画URLをvideoタグで再生
- iframeは使用しません
- サーバー：Node.js（Express）
- フロントエンド：React

## セットアップ
1. Node.jsをインストールしてください。
2. `npm install` で依存パッケージをインストールします。
3. サーバー側でyt-dlpが必要です（Pythonが必要）。

## 起動方法
```
npm run dev
```

## 注意
- yt-dlpの利用にはYouTubeの利用規約を遵守してください。
- 本アプリは学習・個人利用目的です。
