import express from "express";
import { addDownload, getDownloads, streamVideoFile, deleteDownloadEntry, checkDownloadStatus } from "../controllers/download.js";
const routes = express.Router();

routes.post("/:videoId", addDownload);
routes.get("/:userId", getDownloads);
routes.get("/stream/:videoId", streamVideoFile);
routes.delete("/entry/:downloadId", deleteDownloadEntry);
routes.get("/check/:videoId/:userId", checkDownloadStatus);

export default routes;
