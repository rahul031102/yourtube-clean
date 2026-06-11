import mongoose from "mongoose";
const paymentschema = mongoose.Schema(
  {
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    razorpay_order_id: { type: String, required: true },
    razorpay_payment_id: { type: String, required: true },
    razorpay_signature: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, default: "paid" },
    plan: { type: String, enum: ["bronze", "silver", "gold"], required: true },
    invoiceNumber: { type: String, required: true },
    paymentDate: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("payment", paymentschema);
