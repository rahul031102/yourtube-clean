import users from "../Modals/Auth.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { onlineUsers } from "../lib/presence.js";

export const listUsers = async (req, res) => {
  try {
    let excludeId = req.query.excludeId;
    // try to derive from auth header
    const auth = req.headers.authorization;
    if (!excludeId && auth && auth.startsWith("Bearer ")) {
      try {
        const token = auth.split(" ")[1];
        const payload = jwt.verify(token, process.env.JWT_SECRET || "secret");
        if (payload && payload.id) excludeId = payload.id;
      } catch (e) {
        // ignore
      }
    }

    const isValid = excludeId && mongoose.Types.ObjectId.isValid(excludeId);
    const currentUser = isValid ? await users.findById(excludeId).lean() : null;
    const nicknames = currentUser?.nicknames || {};

    const q = isValid ? { _id: { $ne: excludeId } } : {};
    const list = await users.find(q).select("_id name image channelname").lean();
    const enriched = list.map((u) => {
      const uIdStr = String(u._id);
      let displayName = u.name || u.channelname || "Unknown";
      if (nicknames instanceof Map) {
        if (nicknames.has(uIdStr)) displayName = nicknames.get(uIdStr);
      } else if (nicknames[uIdStr]) {
        displayName = nicknames[uIdStr];
      }
      return {
        _id: u._id,
        name: displayName,
        channelname: u.channelname || u.name || "",
        image: u.image || null,
        online: onlineUsers.has(uIdStr),
      };
    });
    return res.status(200).json(enriched);
  } catch (e) {
    console.error("listUsers error", e);
    return res.status(500).json({ message: "Unable to fetch users" });
  }
};

export const saveNickname = async (req, res) => {
  try {
    const { userId, nickname, friendId } = req.body;
    if (!userId || !friendId) {
      return res.status(400).json({ message: "userId and friendId are required" });
    }
    const userObj = await users.findById(userId);
    if (!userObj) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!userObj.nicknames) {
      userObj.nicknames = new Map();
    }
    if (nickname) {
      userObj.nicknames.set(String(friendId), nickname);
    } else {
      userObj.nicknames.delete(String(friendId));
    }
    await userObj.save();
    return res.status(200).json({ message: "Nickname saved successfully" });
  } catch (e) {
    console.error("saveNickname error", e);
    return res.status(500).json({ message: "Internal server error" });
  }
};
