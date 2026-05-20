/**
 * VK OAuth — Callback
 *
 * VK redirects here after user authorises the app.
 * Exchanges `?code=` for an access_token and displays it.
 */
const https = require("https");

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(data));
        }
      });
    }).on("error", reject);
  });
}

export default async function handler(req, res) {
  const { code, error: err, error_description } = req.query;

  if (err) {
    return sendPage(res, `❌ VK 授权失败: ${err} — ${error_description || ""}`);
  }
  if (!code) {
    return sendPage(res, "❌ 缺少授权 code 参数");
  }

  const id = process.env.VK_CLIENT_ID;
  const secret = process.env.VK_CLIENT_SECRET;
  if (!id || !secret) {
    return sendPage(res, "❌ 服务端未配置 VK_CLIENT_ID / VK_CLIENT_SECRET");
  }

  const redirect = process.env.VK_REDIRECT_URI || "https://carchina.ltd/api/vk/callback";
  const tokenUrl =
    `https://oauth.vk.com/access_token?client_id=${id}` +
    `&client_secret=${secret}&redirect_uri=${encodeURIComponent(redirect)}` +
    `&code=${code}`;

  try {
    const data = await fetchUrl(tokenUrl);

    if (data.error) {
      return sendPage(res, `❌ Token 换取失败: ${data.error} — ${data.error_description || ""}`);
    }

    const token = data.access_token;
    const userId = data.user_id;
    const expiresIn = data.expires_in || "永久 (offline)";

    /* Also try to get group token if a group_id was returned */
    let groupToken = "";
    if (data.groups && data.groups.length > 0) {
      groupToken = data.groups[0].access_token || "";
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(`
<!DOCTYPE html><html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VK 授权成功 — CARCHINA.LTD</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px}
.card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:40px;max-width:640px;width:100%}
h1{font-size:24px;margin:0 0 8px}
.badge{display:inline-block;background:#22c55e;color:#fff;font-size:12px;padding:2px 10px;border-radius:20px;margin-bottom:16px}
.field{margin:16px 0;font-size:14px}
.field label{display:block;color:#94a3b8;margin-bottom:4px}
code{display:block;background:#0f172a;padding:12px;border-radius:8px;font-size:12px;word-break:break-all;color:#22d3ee;border:1px solid #334155}
.btn{display:inline-block;margin-top:20px;padding:10px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-size:14px}
.btn:hover{background:#1d4ed8}
.warn{background:#f59e0b20;border:1px solid #f59e0b40;border-radius:8px;padding:12px;margin-top:20px;font-size:13px;color:#fbbf24}
</style></head><body>
<div class="card">
<span class="badge">✅ 授权成功</span>
<h1>VK 授权已完成</h1>
<p style="color:#94a3b8;font-size:14px;margin:4px 0 20px">
请将以下 Token 配置到本地系统中
</p>
<div class="field"><label>User ID</label><code>${userId}</code></div>
<div class="field"><label>Access Token${groupToken ? "" : ""}</label>
<code id="token">${token}</code>
<button onclick="navigator.clipboard.writeText(document.getElementById('token').textContent)" style="margin-top:6px;padding:4px 12px;background:#334155;color:#e2e8f0;border:1px solid #475569;border-radius:6px;cursor:pointer;font-size:12px">📋 复制</button>
</div>
<div class="field"><label>有效期</label><code>${expiresIn}</code></div>
${groupToken ? `<div class="field"><label>Group Token</label><code>${groupToken}</code></div>` : ""}
<div class="warn">
💡 将这个 Token 填入 <code style="display:inline;padding:2px 6px;font-size:12px">usedcar/config.json</code> 的 <code style="display:inline;padding:2px 6px;font-size:12px">vk.access_token</code> 字段
</div>
<a class="btn" href="/">← 返回首页</a>
</div></body></html>
    `);
  } catch (e) {
    return sendPage(res, `❌ 网络错误: ${e.message}`);
  }
}

function sendPage(res, message) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px">${message}<br><a href="/">返回首页</a></body></html>`);
}
