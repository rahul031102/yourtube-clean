import comment from "../Modals/comment.js";
import mongoose from "mongoose";

const sanitizeComment = (text) => {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 2000) return false;

  // Allow Unicode letters, numbers, spaces and a small set of common punctuation.
  // Disallow other special characters (e.g. @#$%^&*<>/{}[]|~` etc.).
  // Uses Unicode property escapes for letters and numbers.
  const allowedPattern = /^[\p{L}\p{N}\s.,?!'"():;+\-]+$/u;
  if (!allowedPattern.test(trimmed)) return false;

  return true;
};

export const postcomment = async (req, res) => {
  const { commentbody, userid, videoid, usercommented, city } = req.body;
  if (!sanitizeComment(commentbody)) {
    return res.status(400).json({ message: "Comment must be non-empty, under 2000 characters, and contain no special characters." });
  }

  const commentdata = {
    usercommented,
    commentbody,
    userid,
    videoid,
    city: city || "Unknown city",
  };

  const postcomment = new comment(commentdata);
  try {
    const savedComment = await postcomment.save();
    return res.status(200).json({ comment: savedComment });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment.find({ videoid: videoid });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  if (!sanitizeComment(commentbody)) {
    return res.status(400).json({ message: "Comment must be non-empty, under 2000 characters, and contain no special characters." });
  }
  try {
    const updatecomment = await comment.findByIdAndUpdate(
      _id,
      {
        $set: { commentbody: commentbody },
      },
      { new: true }
    );
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const reactcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { action, userid } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  if (!userid || !["like", "dislike"].includes(action)) {
    return res.status(400).json({ message: "Invalid reaction." });
  }

  try {
    const commentdoc = await comment.findById(_id);
    if (!commentdoc) {
      return res.status(404).send("comment unavailable");
    }

    let userIdObject;
    try {
      userIdObject =
        userid instanceof mongoose.Types.ObjectId
          ? userid
          : new mongoose.Types.ObjectId(userid);
    } catch (error) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const liked = commentdoc.likedBy.some((id) => id.equals(userIdObject));
    const disliked = commentdoc.dislikedBy.some((id) => id.equals(userIdObject));

    if (action === "like") {
      if (liked) {
        commentdoc.likedBy = commentdoc.likedBy.filter((id) => !id.equals(userIdObject));
      } else {
        commentdoc.likedBy.push(userIdObject);
        commentdoc.dislikedBy = commentdoc.dislikedBy.filter((id) => !id.equals(userIdObject));
      }
    } else {
      if (disliked) {
        commentdoc.dislikedBy = commentdoc.dislikedBy.filter((id) => !id.equals(userIdObject));
      } else {
        commentdoc.dislikedBy.push(userIdObject);
        commentdoc.likedBy = commentdoc.likedBy.filter((id) => !id.equals(userIdObject));
      }
    }

    commentdoc.likes = commentdoc.likedBy.length;
    commentdoc.dislikes = commentdoc.dislikedBy.length;

    if (commentdoc.dislikes >= 2) {
      await commentdoc.deleteOne();
      return res.status(200).json({ deleted: true });
    }

    await commentdoc.save();
    return res.status(200).json({
      updated: true,
      likes: commentdoc.likes,
      dislikes: commentdoc.dislikes,
      liked: commentdoc.likedBy.some((id) => id.equals(userIdObject)),
      disliked: commentdoc.dislikedBy.some((id) => id.equals(userIdObject)),
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const translatecomment = async (req, res) => {
  const { text, targetLang } = req.body;
  if (!text || !targetLang) {
    return res.status(400).json({ message: "Invalid translation request." });
  }

  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
        targetLang
      )}&dt=t&q=${encodeURIComponent(text)}`
    );

    const data = await response.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      console.error("Unexpected translation response", data);
      return res.status(500).json({ message: "Translation service returned invalid data." });
    }

    const translatedText = data[0].map((segment) => segment[0]).join("");
    const sourceLang = typeof data[2] === "string" ? data[2] : "original";
    return res.status(200).json({ translatedText, sourceLang });
  } catch (error) {
    console.error("Translation error:", error);
    return res.status(500).json({ message: "Translation failed." });
  }
};
