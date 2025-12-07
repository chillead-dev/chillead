const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REFRESH_TOKEN
} = process.env;

async function getToken() {
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET
        ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: SPOTIFY_REFRESH_TOKEN
    })
  });

  const t = await r.json();
  return t.access_token;
}

export default async function handler(req, res) {
  try {
    const token = await getToken();

    const r = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (r.status === 204) {
      return res.status(200).json({ ok: true, playing: false });
    }

    const data = await r.json();

    if (!data.item) {
      return res.status(200).json({ ok: true, playing: false });
    }

    res.status(200).json({
      ok: true,
      playing: true,
      title: data.item.name,
      artist: data.item.artists.map(a => a.name).join(", "),
      cover: data.item.album.images[0]?.url ?? ""
    });

  } catch (e) {
    res.status(500).json({
      ok: false,
      error: String(e)
    });
  }
}
