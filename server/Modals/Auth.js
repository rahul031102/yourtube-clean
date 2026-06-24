import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  phone: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  plan: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    default: "free",
  },
  joinedon: { type: Date, default: Date.now },
  nicknames: {
    type: Map,
    of: String,
    default: {},
  },
});

export default mongoose.model("user", userschema);
