/**
 * VK OAuth — Login & Status
 *
 * GET  /api/vk           → redirect to VK authorization
 * GET  /api/vk?status=1  → check if token is configured
 */
export default async function handler(req, res) {
  if (req.query.status) {
    const hasToken = !!process.env.VK_ACCESS_TOKEN;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json({ configured: hasToken, client_id: process.env.VK_CLIENT_ID || "" });
    return;
  }

  const id = process.env.VK_CLIENT_ID;
  if (!id) {
    res.status(500).send("VK_CLIENT_ID not configured");
    return;
  }

  const redirect = process.env.VK_REDIRECT_URI || "https://carchina.ltd/api/vk/callback";
  const scope = "wall,photos,groups,offline";
  const url =
    `https://oauth.vk.com/authorize?client_id=${id}` +
    `&display=page&redirect_uri=${encodeURIComponent(redirect)}` +
    `&scope=${scope}&response_type=code&v=5.199`;

  res.redirect(301, url);
}
