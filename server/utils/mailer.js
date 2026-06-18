// import nodemailer from "nodemailer";
// import dns from "dns";

// dns.setDefaultResultOrder("ipv4first");
// export const createTransporter = () => {
//   const host = process.env.EMAIL_HOST;
//   const port = Number(process.env.EMAIL_PORT || 587);
//   const user = process.env.EMAIL_USER;
//   const pass = process.env.EMAIL_PASS;
//   const secure = process.env.EMAIL_SECURE === "true";

//   if (!host || !user || !pass) {
//     return null;
//   }

//   return nodemailer.createTransport({
//     host,
//     port,
//     secure,
//      family: 4,
//     auth: {
//       user,
//       pass,
//     },
//   });
// };

// export const sendMail = async ({ to, subject, html }) => {
//   const transporter = createTransporter();
//   if (!transporter) {
//     console.warn("Email not sent: mail transporter not configured.");
//     return false;
//   }

//   await transporter.sendMail({
//     from:
//       process.env.EMAIL_FROM || process.env.EMAIL_USER || "no-reply@yourtube.com",
//     to,
//     subject,
//     html,
//   });
//   return true;
// };

import { Resend } from "resend";

let cachedClient;

const getClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) {
    cachedClient = new Resend(apiKey);
  }
  return cachedClient;
};

export const sendMail = async ({ to, subject, html }) => {
  const client = getClient();
  if (!client) {
    console.warn("Email not sent: RESEND_API_KEY not configured.");
    return false;
  }

  try {
    const { error } = await client.emails.send({
      from: process.env.EMAIL_FROM || "YourTube <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
    if (error) {
      console.error("Resend error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend send failed:", err);
    return false;
  }
};