'use client';

import { useEffect, useState } from 'react';

type Track = {
  playing: boolean;
  title: string;
  artist: string;
  cover: string;
  progress: number;
  duration: number;
};

export default function Home() {
  const [track, setTrack] = useState<Track | null>(null);

  async function loadTrack() {
    try {
      const r = await fetch('/api/now-playing', { cache: 'no-store' });
      const j = await r.json();
      if (!j.playing) {
        setTrack(null);
      } else {
        setTrack(j);
      }
    } catch {
      setTrack(null);
    }
  }

  useEffect(() => {
    loadTrack();
    const i = setInterval(loadTrack, 15000);
    return () => clearInterval(i);
  }, []);

  return (
    <main className="page">
      <section className="block">
        <h1># welcome!</h1>
        <p className="lead">
          hello! my name is <b>alex</b>.  
          i create websites, bots and small tools that simplify life.
        </p>
      </section>

      <section className="block">
        <h2>## currently playing</h2>

        {!track ? (
          <div className="spotify-card muted">
            nothing is playing right now.
          </div>
        ) : (
          <div className="spotify-card">
            <img src={track.cover} className="cover" alt="album" />
            <div className="track-info">
              <div className="track-title">{track.title}</div>
              <div className="track-artist">{track.artist}</div>
              <div className="progress">
                <div
                  className="progress-fill"
                  style={{
                    width:
                      Math.min(
                        100,
                        (track.progress / track.duration) * 100
                      ) + '%',
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="block widgets">
        <a
          className="widget"
          href="https://github.com/chillead-dev"
          target="_blank"
        >
          <div className="widget-left">
            <div className="gh">🐱</div>
            <div>
              <div className="widget-title">chillead-dev</div>
              <div className="widget-sub">this is where i post</div>
            </div>
          </div>
        </a>

        <a className="widget" href="https://t.me/rizzdev" target="_blank">
          <div className="widget-left">
            <div className="gh">✉️</div>
            <div>
              <div className="widget-title">links</div>
              <div className="widget-sub">telegram & contacts</div>
            </div>
          </div>
        </a>
      </section>

      <footer className="footer">
        dm me telegram — <a href="https://t.me/rizzdev">@rizzdev</a>
      </footer>
    </main>
  );
}
