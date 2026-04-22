import express from "express";
import dotenv from "dotenv";
import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import connectDB from "./config/database.js";
import userRoute from "./routes/userRoute.js";
import messageRoute from "./routes/messageRoute.js";
import playbackRoute from "./routes/playbackRoute.js";
import roomRoute from "./routes/roomRoute.js";
import playlistRoute from "./routes/playlistRoute.js";
import postRoute from "./routes/postRoute.js";
import notificationRoute from "./routes/notificationRoute.js";
import { server, app } from "./socket/socket.js";

dotenv.config({ quiet: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDistPath = path.join(__dirname, "../frontend/dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");
const songsPath = path.join(__dirname, "public", "songs");
const PORT = Number(process.env.PORT) || 5000;
const hasFrontendBuild = existsSync(frontendIndexPath);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/songs", express.static(songsPath));

app.use("/api/v1/user", userRoute);
app.use("/api/v1/message", messageRoute);
app.use("/api/v1/playback", playbackRoute);
app.use("/api/v1/rooms", roomRoute);
app.use("/api/v1/playlists", playlistRoute);
app.use("/api/v1/posts", postRoute);
app.use("/api/v1/notifications", notificationRoute);

app.use("/api", (_req, res) => {
  res.status(404).json({ message: "API route not found" });
});

if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath));

  app.get("/{*path}", (req, res, next) => {
    if (req.path.startsWith("/songs")) {
      return next();
    }

    return res.sendFile(frontendIndexPath);
  });
}

server.listen(PORT, "0.0.0.0", () => {
  connectDB();
  console.log(`Server listening on port ${PORT}`);
});
