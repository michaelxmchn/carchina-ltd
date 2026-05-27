/**
 * Contact Form API — saves inquiries to Resend Audience
 *
 * POST /api/contact
 *   { name, email, phone, message }
 *
 * Environment: RESEND_API_KEY, RESEND_AUDIENCE_ID
 */
const RESEND_API = "https://api.resend.com";
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || "fe2186a4-c5f9-40f5-becb-d847cb351fbf";

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "RESEND_API_KEY not configured" });
    return;
  }

  const { name, email, phone, message } = req.body || {};
  if (!email || !name) {
    res.status(400).json({ error: "Missing required fields: name, email" });
    return;
  }

  const errors = [];

  // 1) Add to Resend audience
  try {
    const r = await fetch(`${RESEND_API}/audiences/${AUDIENCE_ID}/contacts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        first_name: name.split(" ").slice(0, -1).join(" ") || name,
        last_name: name.split(" ").slice(-1).join(" ") || "",
        unsubscribed: false,
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      errors.push(`audience: ${err}`);
    }
  } catch (e) {
    errors.push(`audience: ${e.message}`);
  }

  // 2) Send notification email
  try {
    const bodyHtml = `
      <h2>New Contact Inquiry</h2>
      <table style="border-collapse:collapse;width:100%;max-width:600px">
        <tr><td style="padding:8px;font-weight:bold">Name</td><td style="padding:8px">${name}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Email</td><td style="padding:8px">${email}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Phone</td><td style="padding:8px">${phone || "-"}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Message</td><td style="padding:8px">${message || "-"}</td></tr>
      </table>
    `;
    await fetch(`${RESEND_API}/emails`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CARCHINA Contact <michael@carchina.ltd>",
        to: ["michael@carchina.ltd"],
        reply_to: [email],
        subject: `New Inquiry from ${name}`,
        html: bodyHtml,
      }),
    });
  } catch (e) {
    errors.push(`email: ${e.message}`);
  }

  if (errors.length) {
    console.error("Contact API errors:", errors.join("; "));
  }

  res.json({ success: true, errors: errors.length ? errors : undefined });
};
