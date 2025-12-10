export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    type, // qr, partial, full, release
    email,
    name,
    plate,
    qrBase64,
    receiptData,
  } = req.body;

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
  }

  // If no type matches
  else {
    return res.status(400).json({ error: "Invalid email type" });
  }

  // ===================== SEND EMAIL USING BREVO =====================
  try {
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

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Email sending failed", err });
  }
}
