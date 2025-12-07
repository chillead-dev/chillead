import fetch from "node-fetch";

const TOKEN = process.env.SPOTIFY_ACCESS_TOKEN;

export default async function handler(req, res) {
  try {
    const r = await fetch(
      "https://api.spotify.com/v1/me/player/recently-played?limit=10",
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`
        }
      }
    );

    const data = await r.json();

    const tracks = data.items.map(i => ({
      title: i.track.name,
      artist: i.track.artists.map(a => a.name).join(", "),
      cover: i.track.album.images[0].url,
      played_at: new Date(i.played_at).getTime()
    }));

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(tracks);
  } catch {
    res.status(500).json([]);
  }
}
