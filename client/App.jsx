import React, { useState } from 'react';

function App() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selected, setSelected] = useState(null);
    const [videoUrl, setVideoUrl] = useState('');

    const handleSearch = async () => {
        setSelected(null);
        setVideoUrl('');
        const res = await fetch(`http://localhost:5000/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
    };

    const handleSelect = async (video) => {
        setSelected(video);
        setVideoUrl('');
        const res = await fetch(`http://localhost:5000/api/video?id=${encodeURIComponent(video.id)}`);
        const data = await res.json();
        setVideoUrl(data.videoUrl);
    };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
            <h1>YouTube代替サイト</h1>
            <div style={{ display: 'flex', gap: 8 }}>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="動画を検索" style={{ flex: 1 }} />
                <button onClick={handleSearch}>検索</button>
            </div>
            <div style={{ marginTop: 24 }}>
                {results.map(video => (
                    <div key={video.id} style={{ marginBottom: 12, border: '1px solid #ccc', padding: 8, borderRadius: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <img src={video.thumbnail} alt="thumb" width={120} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold' }}>{video.title}</div>
                                <div>{video.uploader}</div>
                                <button onClick={() => handleSelect(video)}>視聴</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {selected && videoUrl && (
                <div style={{ marginTop: 32 }}>
                    <h2>{selected.title}</h2>
                    <a href={videoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 20, color: '#1976d2' }}>
                        YouTubeで視聴する
                    </a>
                </div>
            )}
        </div>
    );
}

export default App;
