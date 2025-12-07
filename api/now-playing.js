const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REFRESH_TOKEN
} = process.env;

// простая in-memory история
let HISTORY = [];
let LAST_TRACK_ID = null;

async function getAccessToken() {
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(
        SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET
      ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: SPOTIFY_REFRESH_TOKEN
    })
  });

  const d = await r.json();
  return d.access_token;
}

export default async function handler(req, res) {
  try {
    const token = await getAccessToken();

    const r = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (r.status === 204) {
      return res.status(200).json({ playing: false });
    }

    const d = await r.json();
    if (!d || !d.item) {
      return res.status(200).json({ playing: false });
    }

    const track = d.item;

    // ✅ логируем трек, если он новый
    if (track.id && track.id !== LAST_TRACK_ID) {
      LAST_TRACK_ID = track.id;

      HISTORY.unshift({
        id: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(", "),
        cover: track.album.images[0]?.url,
        played_at: Date.now()
      });

      HISTORY = HISTORY.slice(0, 12); // лимит
    }

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      playing: d.is_playing === true,
      title: track.name,
      artist: track.artists.map(a => a.name).join(", "),
      cover: track.album.images[0]?.url,
      progress: d.progress_ms || 0,
      duration: track.duration_ms || 1
    });

  } catch {
    res.status(200).json({ playing: false });
  }
}

// экспорт истории для другого api
export { HISTORY };
