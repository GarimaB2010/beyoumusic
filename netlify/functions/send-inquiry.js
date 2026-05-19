const json = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8"
  },
  body: JSON.stringify(body)
});

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return json(500, {
      ok: false,
      error: "Missing RESEND_API_KEY"
    });
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid request body" });
  }

  const parentName = data.parentName || "";
  const email = data.email || "";
  const phone = data.phone || "";
  const studentName = data.studentName || data.student || "";
  const program = data.program || "";
  const message = data.message || "";
  const acceptedPolicy = data.acceptedPolicy ? "Yes" : "No";

  if (!parentName || !email || !studentName || !program || !data.acceptedPolicy) {
    return json(400, {
      ok: false,
      error: "Please complete all required fields."
    });
  }

  const html = `
    <h2>New Lesson Inquiry</h2>
    <p><b>Parent:</b> ${escapeHtml(parentName)}</p>
    <p><b>Email:</b> ${escapeHtml(email)}</p>
    <p><b>Phone:</b> ${escapeHtml(phone)}</p>
    <p><b>Student:</b> ${escapeHtml(studentName)}</p>
    <p><b>Program:</b> ${escapeHtml(program)}</p>
    <p><b>Accepted studio policies:</b> ${acceptedPolicy}</p>
    <p><b>Message:</b><br>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "be-you-music-website/1.0"
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Be You Music <onboarding@resend.dev>",
      to: [process.env.INQUIRY_TO_EMAIL || "beyoumusic.info@gmail.com"],
      reply_to: email,
      subject: "New Lesson Inquiry - Be You Music",
      html
    })
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    return json(response.status, {
      ok: false,
      error: result.message || result.name || result.error || `Resend error ${response.status}`
    });
  }

  return json(200, { ok: true });
};
