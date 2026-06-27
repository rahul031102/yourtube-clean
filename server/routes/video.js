import express from "express";
import { getallvideo, uploadvideo, deletevideo, updatevideo, getVideoQualities } from "../controllers/video.js";
import upload from "../filehelper/filehelper.js";

const routes = express.Router();

routes.post("/upload", upload.single("file"), uploadvideo);
routes.get("/getall", getallvideo);
routes.delete("/delete/:videoId", deletevideo);
routes.patch("/update/:videoId", updatevideo);
routes.get("/qualities/:videoId", getVideoQualities);

export default routes;
