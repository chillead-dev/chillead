export default async function handler(req, res) {
  try {
    const basic = Buffer.from(
      process.env.SPOTIFY_CLIENT_ID +
        ":" +
        process.env.SPOTIFY_CLIENT_SECRET
    ).toString("base64");

    // получаем access_token через refresh_token
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

    // спрашиваем, что сейчас играет
    const nowRes = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing",
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

    if (!data || !data.item) {
      return res.status(200).json({ playing: false });
    }

    res.status(200).json({
      playing: data.is_playing,
      title: data.item.name,
      artist: data.item.artists.map((a) => a.name).join(", "),
      url: data.item.external_urls.spotify,
      duration: data.item.duration_ms,
      progress: data.progress_ms,
    });
  } catch (e) {
    return res.status(500).json({ playing: false });
  }
}
