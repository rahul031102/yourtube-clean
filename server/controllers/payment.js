import Razorpay from "razorpay";
import crypto from "crypto";
import users from "../Modals/Auth.js";
import paymentModel from "../Modals/payment.js";
import { sendMail } from "../utils/mailer.js";

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLAN_CONFIG = {
  bronze: { amount: 1000, name: "Bronze", description: "7 minutes watch limit" },
  silver: { amount: 5000, name: "Silver", description: "10 minutes watch limit" },
  gold: { amount: 10000, name: "Gold", description: "Unlimited watch time" },
};

const sendInvoiceEmail = async ({
  to,
  invoiceNumber,
  planName,
  amount,
  paymentDate,
  orderId,
  paymentId,
}) => {
  const subject = `YourTube Invoice ${invoiceNumber}`;
  const html = `<div style="font-family: sans-serif;">
    <h2>YourTube Invoice</h2>
    <p>Invoice Number: <strong>${invoiceNumber}</strong></p>
    <p>Plan: <strong>${planName}</strong></p>
    <p>Amount: <strong>₹${(amount / 100).toFixed(2)}</strong></p>
    <p>Payment Date: <strong>${paymentDate}</strong></p>
    <p>Razorpay Order ID: <strong>${orderId}</strong></p>
    <p>Razorpay Payment ID: <strong>${paymentId}</strong></p>
    <p>Thank you for upgrading your YourTube plan.</p>
  </div>`;

  await sendMail({ to, subject, html });
};

export const createOrder = async (req, res) => {
  const { userId, plan } = req.body;

  if (!userId || !plan) {
    return res.status(400).json({ message: "User id and plan are required." });
  }

  const planConfig = PLAN_CONFIG[plan];
  if (!planConfig) {
    return res.status(400).json({ message: "Invalid plan selected." });
  }

  try {
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const options = {
      amount: planConfig.amount,
      currency: "INR",
      receipt: `rcpt_${plan}_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpayInstance.orders.create(options);

    return res.status(201).json({
      order,
      message: "Order created successfully.",
      plan,
      amount: planConfig.amount,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({ message: "Unable to create order." });
  }
};

export const verifyPayment = async (req, res) => {
  const {
    userId,
    plan,
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
  } = req.body;

  if (!userId || !plan || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({ message: "Missing payment verification fields." });
  }

  const planConfig = PLAN_CONFIG[plan];
  if (!planConfig) {
    return res.status(400).json({ message: "Invalid plan selected." });
  }

  try {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error("RAZORPAY_KEY_SECRET is not configured on the server.");
      return res.status(500).json({ message: "Payment gateway misconfigured." });
    }

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed." });
    }

    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const paymentDate = new Date().toISOString();

    const paymentRecord = await paymentModel.create({
      viewer: userId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount: planConfig.amount,
      currency: "INR",
      status: "paid",
      plan,
      invoiceNumber,
      paymentDate,
    });

    user.plan = plan;
    await user.save();

    await sendInvoiceEmail({
      to: user.email,
      invoiceNumber,
      planName: planConfig.name,
      amount: planConfig.amount,
      paymentDate,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    }).catch((emailError) => {
      console.warn("Invoice email failed", emailError);
    });

    return res.status(200).json({
      message: "Payment verified and account upgraded.",
      payment: paymentRecord,
      user,
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).json({ message: "Unable to verify payment." });
  }
};
