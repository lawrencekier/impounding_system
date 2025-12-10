export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Debug: Check if API key exists
  console.log("API Key exists:", !!process.env.BREVO_API_KEY);
  console.log(
    "API Key first 10 chars:",
    process.env.BREVO_API_KEY?.substring(0, 10)
  );

  const { type, email, name, plate, qrBase64, receiptData } = req.body;

  console.log("Received request:", { type, email, name, plate });

  let subject = "";
  let htmlContent = "";
  let attachments = [];

  // ===================== QR EMAIL =====================
  if (type === "qr") {
    const cleanBase64 = qrBase64.split(",")[1];

    subject = `Vehicle Impound QR - ${plate}`;
    htmlContent = `
      <h2>Your QR Code</h2>
      <p>Hello ${name},</p>
      <p>Your vehicle (${plate}) has been recorded. QR attached.</p>
    `;

    attachments = [{ name: "qr.png", content: cleanBase64 }];
  }

  // ===================== PARTIAL PAYMENT EMAIL =====================
  else if (type === "partial") {
    subject = `Partial Payment - ${receiptData.receiptNo}`;
    htmlContent = `
      <div style="font-family:Arial;padding:20px;border:1px solid #ddd;">
          <h2 style="color:#f59e0b;text-align:center;">Partial Payment Receipt</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>We received your partial payment.</p>
          <p><strong>Receipt No:</strong> ${receiptData.receiptNo}</p>
          <p><strong>Date:</strong> ${receiptData.date}</p>
          <p><strong>Plate:</strong> ${receiptData.plate}</p>
          <p><strong>Paid:</strong> ${receiptData.paid}</p>
          <p><strong>Remaining:</strong> ${receiptData.newBalance}</p>
          <p><strong>Next Due:</strong> ${receiptData.nextDueDate}</p>
      </div>
    `;
  }

  // ===================== FULL PAYMENT EMAIL =====================
  else if (type === "full") {
    subject = `Payment Receipt - ${receiptData.receiptNo}`;
    htmlContent = `
      <div style="font-family:Arial;padding:20px;border:1px solid #ddd;">
          <h2 style="color:#2563eb;text-align:center;">Official Receipt</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your payment is fully settled.</p>
          <p><strong>Receipt No:</strong> ${receiptData.receiptNo}</p>
          <p><strong>Date:</strong> ${receiptData.date}</p>
          <p><strong>Plate:</strong> ${receiptData.plate}</p>
          <p><strong>Total Paid:</strong> ${receiptData.paid}</p>
          <p><strong>Change:</strong> ${receiptData.change}</p>
          <p style="color:green;font-weight:bold;text-align:center;">FULLY PAID</p>
      </div>
    `;
  }

  // ===================== RELEASE EMAIL =====================
  else if (type === "release") {
    subject = `Vehicle Released - ${plate}`;
    htmlContent = `
      <div style="font-family:Arial;padding:20px;border:1px solid #ddd;">
          <h2 style="color:#2563eb;">Vehicle Release Confirmation</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your vehicle (${plate}) has been officially released.</p>
      </div>
    `;
  } else {
    return res.status(400).json({ error: "Invalid email type" });
  }

  // Check if API key is available
  if (!process.env.BREVO_API_KEY) {
    console.error("BREVO_API_KEY is not set!");
    return res.status(500).json({
      error: "Server configuration error",
      details: "API key not configured",
    });
  }

  // ===================== SEND EMAIL USING BREVO =====================
  try {
    console.log("Sending to Brevo API...");

    const apiRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "VIMS LTO", email: "lawrencekier14@gmail.com" },
        to: [{ email, name }],
        subject,
        htmlContent,
        attachment: attachments,
      }),
    });

    const responseData = await apiRes.json();
    console.log("Brevo response:", responseData);

    if (!apiRes.ok) {
      console.error("Brevo API error:", responseData);
      return res.status(500).json({
        error: "Email sending failed",
        details: responseData,
      });
    }

    return res.status(200).json({ success: true, data: responseData });
  } catch (err) {
    console.error("Email sending error:", err);
    return res.status(500).json({
      error: "Email sending failed",
      message: err.message,
      stack: err.stack,
    });
  }
}
