"use strict";
import multer from "multer";

const storage = multer.memoryStorage();

const filefilter = (req, file, cb) => {
  if (file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: filefilter,
});

export default upload;
