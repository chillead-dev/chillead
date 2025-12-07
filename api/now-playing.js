const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REFRESH_TOKEN
} = process.env;

async function getAccessToken() {
  const res = await fetch("https://accounts.spotify.com/api/token", {
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

  const data = await res.json();
  return data.access_token;
}

export default async function handler(req, res) {
  try {
    const accessToken = await getAccessToken();

    const r = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    // 204 = ничего не играет
    if (r.status === 204) {
      res.status(200).json({ playing: false });
      return;
    }

    if (!r.ok) {
      res.status(200).json({ playing: false });
      return;
    }

    const data = await r.json();

    if (!data || !data.item) {
      res.status(200).json({ playing: false });
      return;
    }

    const track = data.item;

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      playing: data.is_playing === true,
      title: track.name,
      artist: track.artists.map(a => a.name).join(", "),
      cover: track.album.images[0]?.url,
      progress: data.progress_ms || 0,
      duration: track.duration_ms || 1
    });
  } catch (e) {
    res.status(200).json({ playing: false });
  }
}
