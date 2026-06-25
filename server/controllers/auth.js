import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import jwt from "jsonwebtoken";

export const login = async (req, res) => {
  const { email, name, image } = req.body;

  try {
    const existingUser = await users.findOne({ email });

    if (!existingUser) {
      const newUser = await users.create({ email, name, image, plan: "free" });
      // sign token
      const token = jwt.sign({ id: newUser._id, email: newUser.email }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" });
      return res.status(201).json({ result: newUser, token });
    } else {
      if (!existingUser.plan) {
        existingUser.plan = "free";
      } else if (existingUser.plan === "premium") {
        existingUser.plan = "gold";
      }
      if (name && existingUser.name !== name) existingUser.name = name;
      if (image && existingUser.image !== image) existingUser.image = image;
      await existingUser.save();
      const token = jwt.sign({ id: existingUser._id, email: existingUser.email }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" });
      return res.status(200).json({ result: existingUser, token });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description, phone } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const update = {};
    if (channelname !== undefined) update.channelname = channelname;
    if (description !== undefined) update.description = description;
    if (phone !== undefined) update.phone = phone;
    const updatedata = await users.findByIdAndUpdate(
      _id,
      { $set: update },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
