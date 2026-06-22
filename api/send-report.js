// api/send-report.js  — Vercel serverless function (Node runtime)
// Sends the student's test report to the fixed admin email using Resend.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }
  try {
    const { to, subject, html } = req.body || {};
    if (!to || !html) {
      return res.status(400).json({ error: { message: "Missing 'to' or 'html'." } });
    }
    const apiResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: process.env.REPORT_FROM_EMAIL || "onboarding@resend.dev",
        to: [to],
        subject: subject || "Test Report",
        html,
      }),
    });
    const data = await apiResp.json();
    return res.status(apiResp.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
