export default async function handler(req, res) {
  try {
    // 1. Получаем access_token
    const basic = Buffer.from(
      process.env.SPOTIFY_CLIENT_ID +
        ":" +
        process.env.SPOTIFY_CLIENT_SECRET
    ).toString("base64");

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
      }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. ИСПОЛЬЗУЕМ /me/player (НЕ currently-playing)
    const nowRes = await fetch(
      "https://api.spotify.com/v1/me/player",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (nowRes.status === 204) {
      return res.status(200).json({ playing: false });
    }

    const data = await nowRes.json();

    if (!data.is_playing || !data.item) {
      return res.status(200).json({ playing: false });
    }

    res.status(200).json({
      playing: true,
      title: data.item.name,
      artist: data.item.artists.map(a => a.name).join(", "),
      cover: data.item.album.images[0]?.url,
      url: data.item.external_urls.spotify,
      duration: data.item.duration_ms,
      progress: data.progress_ms,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ playing: false });
  }
}
