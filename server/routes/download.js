import express from "express";
import { addDownload, getDownloads } from "../controllers/download.js";
const routes = express.Router();

routes.post("/:videoId", addDownload);
routes.get("/:userId", getDownloads);

export default routes;
