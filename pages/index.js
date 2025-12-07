import Head from "next/head";
import { useEffect, useState } from "react";

const HISTORY_KEY = "__chillead_spotify_history__";

function safeLoadHistory() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeSaveHistory(list) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function timeAgo(ts) {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const h = Math.floor(diffMin / 60);
  return `${h}h ago`;
}

export default function Home() {
  const [alive, setAlive] = useState("");
  const [localTime, setLocalTime] = useState("");
  const [now, setNow] = useState(null);
  const [history, setHistory] = useState([]);

  // alive
  useEffect(() => {
    const born = new Date("2010-08-05T00:00:00Z");
    function tick() {
      let d = Math.floor((Date.now() - born.getTime()) / 1000);
      const days = Math.floor(d / 86400);
      d %= 86400;
      const h = Math.floor(d / 3600);
      d %= 3600;
      const m = Math.floor(d / 60);
      const s = d % 60;
      setAlive(`${days}d ${h}h ${m}m ${s}s`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // local time
  useEffect(() => {
    function update() {
      const t = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Yekaterinburg",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).format(new Date());
      setLocalTime(t);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // history initial load
  useEffect(() => {
    setHistory(safeLoadHistory());
  }, []);

  // spotify polling
  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/spotify", { cache: "no-store" });
        const d = await r.json();

        if (!d.ok || !d.playing) {
          setNow(null);
          return;
        }

        const track = {
          id: d.id || `${d.title}-${d.artist}`,
          title: d.title,
          artist: d.artist,
          cover: d.cover,
          progress: d.progress,
          duration: d.duration
        };

        setNow(track);

        setHistory(prev => {
          if (prev[0] && prev[0].id === track.id) {
            return prev;
          }
          const next = [{ ...track, played_at: Date.now() }, ...prev].slice(
            0,
            12
          );
          safeSaveHistory(next);
          return next;
        });
      } catch (e) {
        console.error("fetch /api/spotify failed", e);
      }
    }

    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const progressPercent =
    now && now.duration
      ? Math.max(
          0,
          Math.min(100, (now.progress / now.duration) * 100)
        )
      : 0;

  return (
    <>
      <Head>
        <title>alex / chillead</title>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <meta
          name="description"
          content="alex (chillead) — websites, telegram bots, parsers."
        />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <link
          rel="icon"
          href="https://telegifter.ru/wp-content/themes/gifts/assets/img/gifts/sakuraflower/Meower.webp"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </Head>

      <main className="page">
        {/* HERO */}
        <header className="hero">
          <div>
            <h1># alex</h1>
            <p className="subtitle">## chillead</p>
          </div>
          <img
            src="https://media.tenor.com/HErQk1qA0MoAAAAC/anime-cat-girl-dancing.gif"
            alt="gif"
            className="hero-gif"
          />
        </header>

        {/* ABOUT */}
        <section className="block">
          <h2># about</h2>
          <p className="muted">
            my name is alex. i like building small tools, websites and telegram
            bots that make life easier and save time.
          </p>
        </section>

        {/* META */}
        <section className="block">
          <h2># info</h2>
          <ul className="meta">
            <li>
              <span>name:</span> alex
            </li>
            <li>
              <span>nickname:</span> chillead
            </li>
            <li>
              <span>alive for:</span> {alive} (15y)
            </li>
            <li>
              <span>languages:</span> EN, RU
            </li>
            <li>
              <span>location:</span> Ekaterinburg, RU ({localTime})
            </li>
            <li>
              <span>occupation:</span> websites · telegram bots · parsers
            </li>
          </ul>
        </section>

        {/* SKILLS */}
        <section className="block">
          <h2># skills</h2>
          <ul className="list">
            <li>c++</li>
            <li>javascript</li>
            <li>telegram bots</li>
            <li>web & backend</li>
            <li>parsers / checkers</li>
          </ul>
        </section>

        {/* NOW PLAYING */}
        <section className="block">
          <h2># currently playing</h2>

          <div className={`now-widget ${!now ? "now-widget--idle" : ""}`}>
            <div
              className="now-bg"
              style={
                now?.cover
                  ? { backgroundImage: `url(${now.cover})` }
                  : undefined
              }
            />
            <div className="now-content">
              <img
                className="now-cover"
                src={now?.cover || ""}
                alt="cover"
              />
              <div className="now-text">
                <div className="now-title">
                  {now ? now.title : "not listening right now"}
                </div>
                <div className="now-artist">
                  {now ? now.artist : ""}
                </div>
              </div>
            </div>
            <div className="now-bar">
              <div
                className="now-bar-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </section>

        {/* HISTORY */}
        <section className="block">
          <h2># recently played (local)</h2>
          <p className="muted small">
            history is stored only in your browser and updates while this page
            is open.
          </p>
          <div className="recent-list">
            {history.length === 0 && (
              <span className="muted">no history yet</span>
            )}
            {history.map(t => (
              <div className="recent-item" key={t.played_at}>
                <img
                  src={t.cover}
                  alt="cover"
                  className="recent-cover"
                />
                <div className="recent-title">{t.title}</div>
                <div className="recent-artist">{t.artist}</div>
                <div className="recent-time">
                  {timeAgo(t.played_at)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="footer">
          <a
            href="https://github.com/chillead-dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            github
          </a>{" "}
          ·{" "}
          <a
            href="https://t.me/rizzdev"
            target="_blank"
            rel="noopener noreferrer"
          >
            telegram
          </a>
        </footer>
      </main>
    </>
  );
}
