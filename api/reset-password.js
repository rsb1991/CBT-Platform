// api/reset-password.js
// Vercel serverless function — resets a Supabase user's password by email.
// Uses SUPABASE_SERVICE_ROLE_KEY (set in Vercel environment variables).
// The service role key MUST stay server-side only — never in frontend code.

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const SUPABASE_URL         = process.env.SUPABASE_URL         || process.env.VITE_SUPABASE_URL;
  const SERVICE_ROLE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: "Server not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables."
    });
  }

  try {
    // Step 1: Look up the user by email using the admin API
    const listResp = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          "apikey":        SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }
    );
    const listData = await listResp.json();

    if (!listResp.ok) {
      return res.status(400).json({ error: listData.message || "Failed to find user" });
    }

    // Find exact email match
    const users = listData.users || listData;
    const user  = Array.isArray(users)
      ? users.find(u => u.email?.toLowerCase() === email.toLowerCase())
      : null;

    if (!user) {
      return res.status(404).json({ error: "No account found for: " + email });
    }

    // Step 2: Update the password using the admin API
    const updateResp = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${user.id}`,
      {
        method: "PUT",
        headers: {
          "apikey":        SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({ password }),
      }
    );
    const updateData = await updateResp.json();

    if (!updateResp.ok) {
      return res.status(400).json({ error: updateData.message || "Failed to update password" });
    }

    return res.status(200).json({ success: true, message: "Password updated for " + email });

  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
