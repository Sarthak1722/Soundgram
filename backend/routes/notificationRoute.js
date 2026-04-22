import express from "express";
import isAuthenticated from "../middleware/isAuthenticated.js";
import { getNotifications } from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", isAuthenticated, getNotifications);

export default router;
