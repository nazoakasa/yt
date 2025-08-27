document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('root');
    root.innerHTML = `
    <h1>YouTube代替サイト</h1>
    <div class="search-container">
      <input id="searchInput" placeholder="動画を検索" />
      <button id="searchBtn">検索</button>
    </div>
    <div id="results"></div>
    <div id="player"></div>
  `;

    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const resultsDiv = document.getElementById('results');
    const playerDiv = document.getElementById('player');

    searchBtn.onclick = async () => {
        const q = searchInput.value.trim();
        if (!q) return;
        resultsDiv.innerHTML = '<div class="loading">検索中...</div>';
        playerDiv.innerHTML = '';

        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            resultsDiv.innerHTML = '';

            data.forEach(video => {
                const box = document.createElement('div');
                box.className = 'video-card';
                box.innerHTML = `
          <img src="${video.thumbnail}" width="160" height="90" />
          <div class="video-info">
            <div class="video-title">${video.title}</div>
            <div class="video-uploader">${video.uploader}</div>
            <div class="video-actions">
              <button class="watch-btn">視聴</button>
              <button class="download-btn" data-video-id="${video.id}" data-video-title="${video.title}">DL</button>
            </div>
          </div>
        `;

                box.querySelector('.watch-btn').onclick = async () => {
                    playerDiv.innerHTML = `
                        <div class="loading">動画読み込み中...</div>
                        <div class="quality-selector">
                            <button class="quality-btn" data-quality="low">低画質（安定）</button>
                            <button class="quality-btn" data-quality="medium">中画質</button>
                            <button class="quality-btn" data-quality="high">高画質</button>
                            <button class="quality-btn" data-quality="4k">4K画質</button>
                            <button class="quality-btn" data-quality="max">最高画質</button>
                        </div>
                    `;

                    const loadVideo = async (quality = 'medium') => {
                        try {
                            playerDiv.querySelector('.loading').textContent = `${quality}画質で読み込み中...`;
                            const res2 = await fetch(`/api/video?id=${encodeURIComponent(video.id)}&quality=${quality}`);
                            const data2 = await res2.json();

                            if (data2.fallback) {
                                playerDiv.innerHTML = `
                                    <h2>${video.title}</h2>
                                    <p>動画の直接再生に失敗しました</p>
                                    <a href="${data2.videoUrl}" target="_blank">YouTubeで視聴する</a>
                                `;
                            } else {
                                playerDiv.innerHTML = `
                                    <h2>${video.title}</h2>
                                    <div class="video-controls">
                                        <span>品質: ${data2.quality || 'unknown'}</span>
                                        <div class="quality-selector">
                                            <button class="quality-btn" data-quality="low">低画質</button>
                                            <button class="quality-btn" data-quality="medium">中画質</button>
                                            <button class="quality-btn" data-quality="high">高画質</button>
                                            <button class="quality-btn" data-quality="4k">4K</button>
                                            <button class="quality-btn" data-quality="max">最高</button>
                                        </div>
                                    </div>
                                    <video controls preload="metadata" src="${data2.videoUrl}">
                                        お使いのブラウザはvideoタグをサポートしていません。
                                    </video>
                                `;

                                // 品質変更ボタンのイベント追加
                                playerDiv.querySelectorAll('.quality-btn').forEach(btn => {
                                    btn.onclick = () => loadVideo(btn.dataset.quality);
                                });
                            }
                        } catch (error) {
                            console.error('Video load error:', error);
                            // 低画質で再試行
                            if (quality !== 'low') {
                                playerDiv.querySelector('.loading').textContent = '低画質で再試行中...';
                                setTimeout(() => loadVideo('low'), 1000);
                            } else {
                                playerDiv.innerHTML = `
                                    <div class="loading">動画の読み込みに失敗しました</div>
                                    <a href="https://www.youtube.com/watch?v=${video.id}" target="_blank">YouTubeで視聴する</a>
                                `;
                            }
                        }
                    };

                    // 品質選択ボタンのイベント
                    playerDiv.querySelectorAll('.quality-btn').forEach(btn => {
                        btn.onclick = () => loadVideo(btn.dataset.quality);
                    });

                    // デフォルトで中画質で読み込み
                    loadVideo('medium');
                };

                // ダウンロードボタンのイベント
                box.querySelector('.download-btn').onclick = () => {
                    showDownloadModal(video.id, video.title);
                }; resultsDiv.appendChild(box);
            });
        } catch (error) {
            resultsDiv.innerHTML = '<div class="loading">検索に失敗しました</div>';
        }
    };

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchBtn.click();
        }
    });

    // ダウンロードモーダル表示関数
    window.showDownloadModal = (videoId, videoTitle) => {
        const modal = document.createElement('div');
        modal.className = 'download-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>ダウンロード: ${videoTitle}</h3>
                <div class="download-options">
                    <button class="dl-btn" onclick="downloadVideo('${videoId}', '4k', 'video')">4K動画</button>
                    <button class="dl-btn" onclick="downloadVideo('${videoId}', 'high', 'video')">高画質動画</button>
                    <button class="dl-btn" onclick="downloadVideo('${videoId}', 'medium', 'video')">中画質動画</button>
                    <button class="dl-btn" onclick="downloadVideo('${videoId}', 'low', 'video')">低画質動画</button>
                    <button class="dl-btn" onclick="downloadVideo('${videoId}', 'high', 'audio')">音声のみ</button>
                </div>
                <button class="close-btn" onclick="closeDownloadModal()">閉じる</button>
            </div>
        `;
        document.body.appendChild(modal);
    };

    // ダウンロード実行関数
    window.downloadVideo = (videoId, quality, type) => {
        const url = `/api/download?id=${encodeURIComponent(videoId)}&quality=${quality}&type=${type}`;
        const a = document.createElement('a');
        a.href = url;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        closeDownloadModal();
    };

    // モーダル閉じる関数
    window.closeDownloadModal = () => {
        const modal = document.querySelector('.download-modal');
        if (modal) {
            document.body.removeChild(modal);
        }
    };
});
