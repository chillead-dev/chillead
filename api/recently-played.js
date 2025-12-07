export default async function handler(req, res) {
  const {
    SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET,
    SPOTIFY_REFRESH_TOKEN
  } = process.env;

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
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

  const { access_token } = await tokenRes.json();

  const r = await fetch(
    "https://api.spotify.com/v1/me/player/recently-played?limit=5",
    {
      headers: { Authorization: `Bearer ${access_token}` }
    }
  );

  const text = await r.text();

  res.setHeader("Content-Type", "application/json");
  res.status(200).send(text);
}
