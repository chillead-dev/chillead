import fetch from "node-fetch";

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

  return res.json();
}

export default async function handler(req, res) {
  try {
    const { access_token } = await getAccessToken();

    const r = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=12",
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    );

    if (!r.ok) {
      return res.status(200).json([]);
    }

    const data = await r.json();

    const tracks = data.items.map(i => ({
      title: i.track.name,
      artist: i.track.artists.map(a => a.name).join(", "),
      cover: i.track.album.images[0]?.url,
      played_at: new Date(i.played_at).getTime()
    }));

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(tracks);
  } catch (e) {
    res.status(200).json([]);
  }
}
