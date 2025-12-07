import { useEffect, useState } from "react";

export default function Home() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/spotify");
        const j = await r.json();
        setData(j);
      } catch (e) {
        setErr(String(e));
      }
    }

    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: "monospace" }}>
      <h1>Spotify debug</h1>

      {err && <pre>{err}</pre>}

      {!data && <p>loading…</p>}

      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
