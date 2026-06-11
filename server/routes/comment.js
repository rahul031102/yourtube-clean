import express from "express";
import {
  deletecomment,
  getallcomment,
  postcomment,
  editcomment,
  reactcomment,
  translatecomment,
} from "../controllers/comment.js";

const routes = express.Router();
routes.get("/:videoid", getallcomment);
routes.post("/postcomment", postcomment);
routes.post("/reactcomment/:id", reactcomment);
routes.post("/translate", translatecomment);
routes.delete("/deletecomment/:id", deletecomment);
routes.post("/editcomment/:id", editcomment);
export default routes;
