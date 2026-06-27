// import video from "../Modals/video.js";
// import { exec } from "child_process";
// import path from "path";
// import { unlink } from "fs/promises";
// // import ffmpeg from "fluent-ffmpeg";
import video from "../Modals/video.js";
import cloudinary from "../config/cloudinary.js";
import like from "../Modals/like.js";
import watchlater from "../Modals/watchlater.js";
import history from "../Modals/history.js";
import download from "../Modals/download.js";
import { Readable } from "stream";


const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "video", folder: "yourtube/videos" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    Readable.from(buffer).pipe(stream);
  });
};

const buildQualityOptions = (publicId) => {
  const getUrlForQuality = (width, height) => {
    return cloudinary.url(publicId, {
      resource_type: "video",
      transformation: [
        { width, height, crop: "scale" }
      ],
      secure: true
    });
  };
  
  return {
    "1080p": getUrlForQuality(1920, 1080),
    "720p": getUrlForQuality(1280, 720),
    "480p": getUrlForQuality(854, 480),
    "360p": getUrlForQuality(640, 360),
  };
};

// ffmpeg.setFfmpegPath("C:\\Users\\RAHUL\\AppData\\Local\\Microsoft\\WinGet\\Links\\ffmpeg.exe");

// export const uploadvideo = async (req, res) => {
//   if (req.file === undefined) {
//     return res
//       .status(404)
//       .json({ message: "plz upload a mp4 video file only" });
//   } else {
//     try {
//       const file = new video({
//         videotitle: req.body.videotitle,
//         filename: req.file.originalname,
//         filepath: req.file.path,
//         filetype: req.file.mimetype,
//         filesize: req.file.size,
//         videochanel: req.body.videochanel,
//         uploader: req.body.uploader,
//       });
//       await file.save();

//       // generate thumbnail using ffmpeg (requires ffmpeg binary on the system)
//       try {
//         // Use the path provided by multer directly instead of reconstructing with process.cwd()
//         const videoPath = req.file.path;
//         const thumbName = `thumb_${Date.now()}.jpg`;
//         const thumbPath = path.join(path.dirname(videoPath), thumbName);
        
//         const cmd = `ffmpeg -i "${videoPath}" -ss 00:00:01.000 -vframes 1 "${thumbPath}"`;
        
//         console.log("[THUMB] Generating thumbnail...");
//         console.log("[THUMB] Video path:", videoPath);
//         console.log("[THUMB] Thumb path:", thumbPath);
//         console.log("[THUMB] Command:", cmd);
        
//         exec(cmd, (err, stdout, stderr) => {
//           if (!err) {
//             try {
//               file.thumbnail = thumbName;
//               file.save().catch((e) => {
//                 console.error("[THUMB] Error saving thumbnail to DB:", e.message);
//               });
//               console.log("[THUMB] Thumbnail generated successfully:", thumbName);
//             } catch (e) {
//               console.error("[THUMB] Failed to save thumbnail to DB:", e.message);
//             }
//           } else {
//             console.error("[THUMB] FFmpeg execution failed!");
//             console.error("[THUMB] Error message:", err.message);
//             console.error("[THUMB] stderr output:", stderr);
//             console.error("[THUMB] stdout output:", stdout);
//           }
//         });

//       } catch (e) {
//         console.error("[THUMB] Thumbnail generation try-catch failed:", e.message);
//       }

//       return res.status(201).json("file uploaded successfully");
//     } catch (error) {
//       console.error(" error:", error);
//       return res.status(500).json({ message: "Something went wrong" });
//     }
//   }
// };

export const uploadvideo = async (req, res) => {
  if (!req.file) {
    return res.status(404).json({ message: "plz upload a mp4 video file only" });
  }
  try {
    const result = await uploadToCloudinary(req.file.buffer);

    const file = new video({
      videotitle: req.body.videotitle,
      description: req.body.description || "",
      filename: req.file.originalname,
      filepath: result.secure_url,         // cloudinary URL, not local path
      filetype: req.file.mimetype,
      filesize: req.file.size,
      videochanel: req.body.videochanel,
      uploader: req.body.uploader,
      cloudinary_id: result.public_id,     // needed for delete
      thumbnail: result.secure_url.replace("/upload/", "/upload/so_1/").replace(/\.[^/.]+$/, ".jpg"),
      sourceHeight: result.height || null, // real resolution, used to filter out fake upscaled options
    });

    await file.save();
    return res.status(201).json("file uploaded successfully");
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
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

export const deletevideo = async (req, res) => {
  const { videoId } = req.params;
  const { userId } = req.body;

  try {
    // Validate inputs
    if (!videoId) {
      return res.status(400).json({ message: "Video ID is required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "User authentication required" });
    }

    // Find the video
    const videoDoc = await video.findById(videoId);

    if (!videoDoc) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Check if user is the owner/uploader
    if (videoDoc.uploader !== userId) {
      return res.status(403).json({ message: "You are not authorized to delete this video" });
    }

    console.log("[DELETE] Starting video deletion...");
    console.log("[DELETE] Video ID:", videoId);
    console.log("[DELETE] Uploader:", videoDoc.uploader);
    console.log("[DELETE] Video path:", videoDoc.filepath);
    console.log("[DELETE] Thumbnail:", videoDoc.thumbnail);

    // Delete video file from uploads folder
    // if (videoDoc.filepath) {
    //   try {
    //     await unlink(videoDoc.filepath);
    //     console.log("[DELETE] Video file deleted:", videoDoc.filepath);
    //   } catch (e) {
    //     console.warn("[DELETE] Video file not found or already deleted:", videoDoc.filepath);
    //   }
    // }

    // // Delete thumbnail file if exists
    // if (videoDoc.thumbnail) {
    //   try {
    //     const thumbPath = path.join(path.dirname(videoDoc.filepath), videoDoc.thumbnail);
    //     await unlink(thumbPath);
    //     console.log("[DELETE] Thumbnail file deleted:", thumbPath);
    //   } catch (e) {
    //     console.warn("[DELETE] Thumbnail file not found or already deleted:", videoDoc.thumbnail);
    //   }
    // }

    // Delete from Cloudinary
if (videoDoc.cloudinary_id) {
  try {
    await cloudinary.uploader.destroy(videoDoc.cloudinary_id, { resource_type: "video" });
    console.log("[DELETE] Cloudinary file deleted:", videoDoc.cloudinary_id);
  } catch (e) {
    console.warn("[DELETE] Cloudinary delete failed:", e.message);
  }
}

    // Delete video document from MongoDB
    await video.findByIdAndDelete(videoId);
    console.log("[DELETE] Video document deleted from database");

    // Clean up references in like/watchlater/history so other pages don't
    // crash trying to render a video that no longer exists.
    await Promise.all([
      like.deleteMany({ videoid: videoId }),
      watchlater.deleteMany({ videoid: videoId }),
      history.deleteMany({ videoid: videoId }),
      download.deleteMany({ videoid: videoId }),
    ]);

    return res.status(200).json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("[DELETE] Error deleting video:", error.message);
    return res.status(500).json({ message: "Failed to delete video" });
  }
};

export const updatevideo = async (req, res) => {
  const { videoId } = req.params;
  const { userId, description, videotitle } = req.body;
  try {
    const videoDoc = await video.findById(videoId);
    if (!videoDoc) return res.status(404).json({ message: "Video not found" });
    if (String(videoDoc.uploader) !== String(userId))
      return res.status(403).json({ message: "Not authorized" });
    if (description !== undefined) videoDoc.description = description;
    if (videotitle !== undefined) videoDoc.videotitle = videotitle;
    await videoDoc.save();
    return res.status(200).json({ message: "Video updated", video: videoDoc });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getVideoQualities = async (req, res) => {
  const { videoId } = req.params;
  try {
    const videoDoc = await video.findById(videoId);
    if (!videoDoc || !videoDoc.cloudinary_id) {
      return res.status(404).json({ message: "Video not found." });
    }

    const allOptions = buildQualityOptions(videoDoc.cloudinary_id);
    const sourceHeight = videoDoc.sourceHeight || 1080;

    // Only offer resolutions that don't exceed the real source resolution —
    // anything higher would just be the same file upscaled, not genuinely
    // higher quality.
    const heightMap = { "1080p": 1080, "720p": 720, "480p": 480, "360p": 360 };
    const available = Object.fromEntries(
      Object.entries(allOptions).filter(([label]) => heightMap[label] <= sourceHeight + 20)
    );

    return res.status(200).json({
      qualities: available,
      original: videoDoc.filepath,
    });
  } catch (error) {
    console.error("Get video qualities error:", error);
    return res.status(500).json({ message: "Something went wrong." });
  }
};