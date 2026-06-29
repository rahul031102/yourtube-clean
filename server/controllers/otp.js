import crypto from "crypto";
import users from "../Modals/Auth.js";
import otps from "../Modals/otp.js";
import { sendMail } from "../utils/mailer.js";
import { sendSms, verifySmsOtp } from "../utils/sms.js";

const OTP_TTL_MINUTES = 10;

const NORTH_INDIAN_STATES = [
  "delhi",
  "national capital territory of delhi",
  "punjab",
  "haryana",
  "himachal pradesh",
  "jammu and kashmir",
  "jammu & kashmir",
  "uttarakhand",
  "uttar pradesh",
  "rajasthan",
  "ladakh",
  "chandigarh",
];

const normalize = (value) => (value || "").trim().toLowerCase();

const isNorthIndia = ({ region, country, countryCode }) => {
  const india =
    normalize(country) === "india" || normalize(countryCode) === "in";
  return india && NORTH_INDIAN_STATES.includes(normalize(region));
};

const generateOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

const maskEmail = (email = "") => {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(name.length - 2, 1))}@${domain}`;
};

const maskPhone = (phone = "") => {
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return trimmed;
  return `${"*".repeat(trimmed.length - 4)}${trimmed.slice(-4)}`;
};

export const requestOtp = async (req, res) => {
  const { userId, region, country, countryCode, forceEmail } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User id is required." });
  }

  try {
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const northIndia = isNorthIndia({ region, country, countryCode });
    // North India -> SMS OTP. Everywhere else (including South India & other countries) -> email OTP.
    let channel = northIndia && !forceEmail ? "sms" : "email";

    if (channel === "sms" && !user.phone) {
      return res.status(400).json({
        code: "PHONE_REQUIRED",
        message:
          "No registered mobile number. Add a phone number or use email instead.",
      });
    }

    const destination = channel === "email" ? user.email : user.phone;
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    // Invalidate any previous unused codes for this user.
    await otps.deleteMany({ userId: user._id, used: false });

    let delivered = false;
    let devOtp;

    if (channel === "email") {
      // We generate and store our own OTP for the email channel.
      const otp = generateOtp();
      await otps.create({ userId: user._id, otp, channel, destination, expiresAt });

      delivered = await sendMail({
        to: destination,
        subject: "Your YourTube verification code",
        html: `<div style="font-family: sans-serif;">
          <h2>YourTube Login Verification</h2>
          <p>Your verification code is:</p>
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
          <p>This code expires in ${OTP_TTL_MINUTES} minutes.</p>
        </div>`,
      });

      if (process.env.OTP_DEBUG === "true") {
        devOtp = otp;
      }
    } else {
      // Message Central generates and sends the OTP itself; we only get
      // back a verificationId, which we store to validate against later.
      const result = await sendSms({ to: destination });
      delivered = result.delivered;

      await otps.create({
        userId: user._id,
        otp: "", // not used for the SMS channel
        verificationId: result.verificationId,
        channel,
        destination,
        expiresAt,
      });
    }

    const response = {
      channel,
      destination:
        channel === "email" ? maskEmail(destination) : maskPhone(destination),
      delivered,
    };

    if (devOtp) {
      response.devOtp = devOtp;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Request OTP error:", error);
    return res.status(500).json({ message: "Unable to send OTP." });
  }
};

export const verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;

  if (!userId || !otp) {
    return res.status(400).json({ message: "User id and OTP are required." });
  }

  try {
    const record = await otps
      .findOne({ userId, used: false })
      .sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({ message: "No active OTP. Please request a new one." });
    }

    if (record.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if (record.channel === "sms") {
      // SMS codes are validated directly against Message Central, since we
      // never generated or stored the actual code ourselves.
      const result = await verifySmsOtp({
        verificationId: record.verificationId,
        code: String(otp).trim(),
      });
      if (!result.success) {
        return res.status(400).json({ message: result.message || "Invalid OTP." });
      }
    } else {
      if (record.otp !== String(otp).trim()) {
        return res.status(400).json({ message: "Invalid OTP." });
      }
    }

    record.used = true;
    await record.save();

    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({ message: "OTP verified.", user });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ message: "Unable to verify OTP." });
  }
};