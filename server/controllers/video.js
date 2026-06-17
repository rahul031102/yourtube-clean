import video from "../Modals/video.js";
import { exec } from "child_process";
import path from "path";

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  } else {
    try {
      const file = new video({
        videotitle: req.body.videotitle,
        filename: req.file.originalname,
        filepath: req.file.path,
        filetype: req.file.mimetype,
        filesize: req.file.size,
        videochanel: req.body.videochanel,
        uploader: req.body.uploader,
      });
      await file.save();

      // generate thumbnail using ffmpeg (requires ffmpeg binary on the system)
      try {
        const videoPath = path.join(process.cwd(), "uploads", req.file.filename);
        const thumbName = `thumb_${Date.now()}.jpg`;
        const thumbPath = path.join(process.cwd(), "uploads", thumbName);
        const cmd = `ffmpeg -i "${videoPath}" -ss 00:00:01.000 -vframes 1 "${thumbPath}"`;
        exec(cmd, (err) => {
          if (!err) {
            try {
              file.thumbnail = thumbName;
              file.save().catch((e) => console.error("thumb save error:", e));
            } catch (e) {
              console.error("saving thumbnail to db failed:", e);
            }
          } else {
            console.error("ffmpeg exec error:", err);
          }
        });

      } catch (e) {
        console.error("thumbnail generation failed:", e);
      }

      return res.status(201).json("file uploaded successfully");
    } catch (error) {
      console.error(" error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
};
export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
