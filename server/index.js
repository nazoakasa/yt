const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const ytsearch = require('youtube-sr').default;
const app = express();
const port = 5000;


app.use(cors());
app.use(express.json());
// 静的ファイル配信（clientディレクトリ）
const path = require('path');
app.use(express.static(path.join(__dirname, '../client')));

// ルートアクセスでindex.html返す
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// 動画検索API（youtube-sr使用）
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'No query' });

    try {
        const searchResults = await ytsearch.search(query, { limit: 10, type: 'video' });
        const results = searchResults.map(video => ({
            id: video.id,
            title: video.title,
            thumbnail: video.thumbnail?.url || `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`,
            uploader: video.channel?.name || 'Unknown'
        }));
        res.json(results);
    } catch (error) {
        console.error('YouTube search error:', error);
        // フォールバック：モックデータ
        const mockResults = [
            {
                id: 'dQw4w9WgXcQ',
                title: `テスト動画 - ${query}`,
                thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
                uploader: 'テストチャンネル'
            },
            {
                id: 'jNQXAC9IVRw',
                title: `サンプル動画2 - ${query}`,
                thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/mqdefault.jpg',
                uploader: 'サンプルチャンネル2'
            }
        ];
        res.json(mockResults);
    }
});

// 動画URL取得API（ytdl-core使用、複数品質対応、安定性重視）
app.get('/api/video', async (req, res) => {
    const id = req.query.id;
    const quality = req.query.quality || 'low'; // デフォルトを低画質に変更
    if (!id) return res.status(400).json({ error: 'No id' });

    const url = `https://www.youtube.com/watch?v=${id}`;
    try {
        const info = await ytdl.getInfo(url);

        // 安定性重視のフォーマット選択
        let format;
        const formats = info.formats.filter(f => f.hasAudio && f.hasVideo);

        if (quality === 'low') {
            // 最も安定した低画質（360p以下）
            format = formats.find(f => f.height && f.height <= 360) ||
                ytdl.chooseFormat(formats, { quality: 'lowest' });
        } else if (quality === 'medium') {
            // 中画質（480p-720p）
            format = formats.find(f => f.height && f.height <= 720 && f.height >= 480) ||
                formats.find(f => f.height && f.height <= 480) ||
                ytdl.chooseFormat(formats, { quality: 'lowest' });
        } else if (quality === 'high') {
            // 高画質（1080p以下、ファイルサイズ制限）
            format = formats.find(f => f.height && f.height <= 1080 && f.contentLength && parseInt(f.contentLength) < 100000000) ||
                formats.find(f => f.height && f.height <= 720) ||
                ytdl.chooseFormat(formats, { quality: 'lowest' });
        } else if (quality === '4k') {
            // 4K画質（2160p以下、ファイルサイズ制限緩和）
            format = formats.find(f => f.height && f.height <= 2160 && f.contentLength && parseInt(f.contentLength) < 500000000) ||
                formats.find(f => f.height && f.height <= 1440) ||
                formats.find(f => f.height && f.height <= 1080) ||
                ytdl.chooseFormat(formats, { quality: 'lowest' });
        } else {
            // 最高画質（制限なし、注意が必要）
            format = ytdl.chooseFormat(formats, { quality: 'highest' }) ||
                formats.find(f => f.height && f.height <= 2160) ||
                ytdl.chooseFormat(formats, { quality: 'lowest' });
        }

        // フォーマットが見つからない場合の段階的フォールバック
        if (!format) {
            // 音声付き動画を優先
            format = ytdl.chooseFormat(info.formats, { filter: 'audioandvideo' }) ||
                ytdl.chooseFormat(info.formats, { filter: 'video' }) ||
                info.formats[0];
        }

        if (format && format.url) {
            res.json({
                videoUrl: format.url,
                quality: format.qualityLabel || format.height + 'p' || 'unknown',
                container: format.container || 'unknown',
                hasAudio: format.hasAudio || false
            });
        } else {
            // フォールバック：YouTubeリンク
            res.json({ videoUrl: url, fallback: true });
        }
    } catch (error) {
        console.error('ytdl-core error:', error);
        // フォールバック：YouTubeリンク
        res.json({ videoUrl: url, fallback: true });
    }
});

// 動画ダウンロードAPI
app.get('/api/download', async (req, res) => {
    const id = req.query.id;
    const quality = req.query.quality || 'medium';
    const type = req.query.type || 'video'; // video, audio
    if (!id) return res.status(400).json({ error: 'No id' });

    const url = `https://www.youtube.com/watch?v=${id}`;
    try {
        const info = await ytdl.getInfo(url);
        let format;

        if (type === 'audio') {
            // 音声のみダウンロード
            format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
        } else {
            // 動画ダウンロード（品質選択）
            if (quality === 'low') {
                format = ytdl.chooseFormat(info.formats, { quality: 'lowest', filter: 'audioandvideo' });
            } else if (quality === 'medium') {
                format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioandvideo' });
            } else {
                format = ytdl.chooseFormat(info.formats, { quality: 'highest', filter: 'audioandvideo' });
            }
        }

        if (!format) {
            return res.status(404).json({ error: 'No suitable format found' });
        }

        // ファイル名を安全にする
        const safeTitle = info.videoDetails.title.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
        const ext = type === 'audio' ? 'mp3' : 'mp4';
        const filename = `${safeTitle}.${ext}`;

        // ダウンロード用ヘッダー設定
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', type === 'audio' ? 'audio/mpeg' : 'video/mp4');

        // ytdlストリームをレスポンスにパイプ
        const stream = ytdl(url, { format });
        stream.pipe(res);

        stream.on('error', (error) => {
            console.error('Download stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Download failed' });
            }
        });

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
