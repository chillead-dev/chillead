import { useEffect, useState } from "react";
import "../styles/globals.css";

export default function Home() {
  const [now, setNow] = useState(null);
  const [history, setHistory] = useState([]);

  // alive counter
  const [alive, setAlive] = useState("");

  useEffect(() => {
    const born = new Date("2010-08-05T00:00:00Z");
    const i = setInterval(() => {
      const d = Math.floor((Date.now() - born) / 1000);
      setAlive(
        `${Math.floor(d / 86400)}d ${Math.floor(d % 86400 / 3600)}h ${Math.floor(d % 3600 / 60)}m ${d % 60}s`
      );
    }, 1000);
    return () => clearInterval(i);
  }, []);

  // spotify
  useEffect(() => {
    async function load() {
      const r = await fetch("/api/now-playing");
      const d = await r.json();

      if (d.playing) {
        setNow(d);

        setHistory(h => {
          if (h[0]?.id === d.id) return h;
          return [{ ...d, time: Date.now() }, ...h].slice(0, 12);
        });
      }
    }

    load();
    const i = setInterval(load, 15000);
    return () => clearInterval(i);
  }, []);

  return (
    <main className="page">
      <section className="hero">
        <div>
          <h1>alex</h1>
          <p className="subtitle">chillead</p>
        </div>
        <img
          src="https://media.tenor.com/HErQk1qA0MoAAAAC/anime-cat-girl-dancing.gif"
          className="gif"
        />
      </section>

      <section className="block">
        <p>alive for: {alive}</p>
        <p>languages: EN, RU</p>
        <p>location: Ekaterinburg, RU</p>
      </section>

      <section className="block">
        <h2>currently playing</h2>

        {!now && <p>not listening now</p>}

        {now && (
          <div className="player">
            <div
              className="bg"
              style={{ backgroundImage: `url(${now.cover})` }}
            />
            <img src={now.cover} />
            <div>
              <b>{now.title}</b>
              <div>{now.artist}</div>
              <div className="bar">
                <div
                  className="fill"
                  style={{ width: `${now.progress / now.duration * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="block">
        <h2>recently played</h2>
        <div className="history">
          {history.map(t => (
            <div key={t.time}>
              <img src={t.cover} />
              <div>{t.title}</div>
              <div className="muted">{t.artist}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        <a href="https://github.com/chillead-dev">GitHub</a> ·{" "}
        <a href="https://t.me/rizzdev">Telegram</a>
      </footer>
    </main>
  );
}
