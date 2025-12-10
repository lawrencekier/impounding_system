// api/send-email.js

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { email, name, plate, qrBase64 } = req.body;

  const cleanBase64 = qrBase64.split(",")[1];

  try {
    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "VIMS LTO", email: "lawrencekier14@gmail.com" },
        to: [{ email, name: name || "Vehicle Owner" }],
        subject: `Vehicle Impound QR Code - ${plate}`,
        htmlContent: `
          <h2>Vehicle Impound Notification</h2>
          <p>Hello ${name}, your vehicle (${plate}) has been recorded.</p>
        `,
        attachment: [
          {
            name: "qr-code.png",
            content: cleanBase64,
          },
        ],
      }),
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Email error:", error);
    return res.status(500).json({ error: "Email sending failed" });
  }
}
