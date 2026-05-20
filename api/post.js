/**
 * VK Wall Post API
 *
 * POST /api/post
 *
 * Headers:
 *   Content-Type: application/json
 *   x-vk-token:   <vk_access_token>        (optional — falls back to env VK_ACCESS_TOKEN)
 *
 * Body:
 *   {
 *     "group_id": 123456789,               (required — negative means group)
 *     "message":  "Hello from AI!",         (required)
 *     "attachments": ["photo123_456", ...]  (optional)
 *   }
 */
const https = require("https");

function vkApi(method, params, token) {
  const body = new URLSearchParams({
    ...params,
    access_token: token,
    v: "5.199",
  }).toString();

  return new Promise((resolve, reject) => {
    const u = new URL("https://api.vk.com/method/" + method);
    const req = https.request(
      u,
      { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(data));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-vk-token");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const token = req.headers["x-vk-token"] || process.env.VK_ACCESS_TOKEN;
  if (!token) {
    res.status(401).json({ error: "No VK token — set VK_ACCESS_TOKEN env or pass x-vk-token header" });
    return;
  }

  const { group_id, message, attachments } = req.body || {};
  if (!group_id || !message) {
    res.status(400).json({ error: "Missing required fields: group_id, message" });
    return;
  }

  // group_id is positive in the config; VK wants negative for groups
  const ownerId = -Math.abs(group_id);

  try {
    const params = { owner_id: ownerId, message, from_group: 1 };
    if (attachments && attachments.length) {
      params.attachments = attachments.join(",");
    }

    const result = await vkApi("wall.post", params, token);

    if (result.error) {
      res.status(200).json({ error: result.error.error_msg, code: result.error.error_code });
    } else {
      res.json({ ok: true, post_id: result.response?.post_id, post_url: `https://vk.com/wall${ownerId}_${result.response?.post_id}` });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
