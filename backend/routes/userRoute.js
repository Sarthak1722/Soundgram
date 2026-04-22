import express from  "express";
import {
  register,
  login,
  logout,
  getCurrentUser,
  getOtherUsers,
  getUserProfile,
  addFriend,
  removeFriend,
} from "../controllers/userController.js";
import isAuthenticated from "../middleware/isAuthenticated.js";

const router = express.Router();
router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/me").get(isAuthenticated, getCurrentUser);
router.route("/profile/:id").get(isAuthenticated, getUserProfile);
router.route("/friends/:id").post(isAuthenticated, addFriend).delete(isAuthenticated, removeFriend);
router.route("/").get(isAuthenticated, getOtherUsers);

export default router;
