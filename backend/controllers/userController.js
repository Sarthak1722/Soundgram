import mongoose from "mongoose";
import { User } from "../models/userModel.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { broadcastPresenceSnapshots } from "../socket/socket.js";
import { notifyFriendAdded } from "../services/notificationService.js";

dotenv.config({ quiet: true });

function toObjectId(value) {
  return new mongoose.Types.ObjectId(String(value));
}

function normalizeId(value) {
  return value != null ? String(value) : "";
}

function serializeDirectoryUser(user, friendIds = new Set()) {
  return {
    _id: normalizeId(user?._id),
    fullName: user?.fullName || "",
    userName: user?.userName || "",
    profilePhoto: user?.profilePhoto || "",
    gender: user?.gender || "",
    isFriend: friendIds.has(normalizeId(user?._id)),
  };
}

function serializeFriendUser(user) {
  return {
    _id: normalizeId(user?._id),
    fullName: user?.fullName || "",
    userName: user?.userName || "",
    profilePhoto: user?.profilePhoto || "",
  };
}

function serializeAuthUser(user) {
  const friends = Array.isArray(user?.friends) ? user.friends.map(serializeFriendUser) : [];
  return {
    _id: normalizeId(user?._id),
    fullName: user?.fullName || "",
    userName: user?.userName || "",
    profilePhoto: user?.profilePhoto || "",
    gender: user?.gender || "",
    friends,
    friendIds: friends.map((friend) => normalizeId(friend._id)),
    friendCount: friends.length,
  };
}

function serializeProfileUser(user, viewerId, viewerFriendIds = new Set()) {
  const friends = Array.isArray(user?.friends) ? user.friends.map(serializeFriendUser) : [];
  const profileId = normalizeId(user?._id);
  return {
    _id: profileId,
    fullName: user?.fullName || "",
    userName: user?.userName || "",
    profilePhoto: user?.profilePhoto || "",
    gender: user?.gender || "",
    friends,
    friendCount: friends.length,
    isSelf: normalizeId(viewerId) === profileId,
    isFriend: viewerFriendIds.has(profileId),
  };
}

async function loadSerializedAuthUser(userId) {
  const user = await User.findById(userId)
    .select("-password")
    .populate("friends", "fullName userName profilePhoto")
    .lean();

  if (!user) {
    return null;
  }

  return serializeAuthUser(user);
}

async function loadFriendIdSet(userId) {
  const user = await User.findById(userId).select("friends").lean();
  return new Set((user?.friends || []).map((friendId) => normalizeId(friendId)));
}

function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const register = async (req, res) => {
  try {
    const { fullName, userName, password, confirmPassword, gender } = req.body;
    if (!fullName || !userName || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    const user = await User.findOne({ userName });
    if (user) {
      return res.status(400).json({ message: "Username already exists." });
    }
    // const hashedPassword = bcrypt.hash(password, 10);
    const avatarSeeds = [
      "Emery",
      "Jade",
      "Ryan",
      "Riley",
      "Valentina",
      "Eliza",
      "Jessica",
      "Sophia",
      "Kimberly",
      "Christopher",
      "Kingston",
      "Alexander",
      "Liliana",
      "Avery",
      "Luis",
      "Jameson",
      "Andrea",
      "Ryker",
      "Robert",
      "Sawyer",
    ];
    function getRandomSeed() {
      const randomIndex = Math.floor(Math.random() * avatarSeeds.length);
      return avatarSeeds[randomIndex];
    }
    function getRandomAvatar() {
      const seed = getRandomSeed();
      return `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}`;
    }
    const profilePhoto = getRandomAvatar();
    await User.create({
      fullName: fullName,
      userName: userName,
      password: password,
      profilePhoto: profilePhoto,
      gender: gender,
    });
    void broadcastPresenceSnapshots().catch((broadcastError) => {
      console.error("presence broadcast failed", broadcastError);
    });
    return res
      .status(201)
      .json({ message: "Account Created Successfully", success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to create account." });
  }
};

export const login = async (req, res) => {
  try {
    const { userName, password } = req.body;
    if (!userName || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const user = await User.findOne({ userName });
    if (!user || password !== user.password) {
      return res
        .status(400)
        .json({ message: "Incorrect username or password", success: false });
    }

    const tokenData = {
      userID: user._id,
    };
    const token = jwt.sign(tokenData, process.env.JWT_SECRET_KEY, {
      expiresIn: "1d",
    });

    const authUser = await loadSerializedAuthUser(user._id);

    return res
      .status(200)
      .cookie("token", token, {
        maxAge: 1 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      })
      .json({
        _id: authUser?._id || normalizeId(user._id),
        userName: authUser?.userName || user.userName,
        fullName: authUser?.fullName || user.fullName,
        profilePhoto: authUser?.profilePhoto || user.profilePhoto,
        user: authUser,
        success: true,
        message: `Logged in to ${user.userName}`,
      });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to login.", success: false });
  }
};

export const logout = (req, res) => {
  try {
    res.status(200).cookie("token", "", {
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    }).json({
      message: "Logged-Out Successfully",
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to logout.", success: false });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    if (!req.id || !mongoose.Types.ObjectId.isValid(String(req.id))) {
      return res.status(401).json({ message: "User not authenticated.", success: false });
    }

    const user = await loadSerializedAuthUser(req.id);
    if (!user) {
      return res.status(404).json({ message: "User not found.", success: false });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to fetch session.", success: false });
  }
};

export const getOtherUsers = async (req, res) => {
  try {
    if (!req.id || !mongoose.Types.ObjectId.isValid(String(req.id))) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const loggedInUserId = toObjectId(req.id);
    const friendIds = await loadFriendIdSet(req.id);
    const query = String(req.query.q || "").trim();
    const filter = {
      _id: { $ne: loggedInUserId },
    };

    if (query) {
      const safePattern = escapeRegex(query);
      filter.$or = [
        { userName: { $regex: safePattern, $options: "i" } },
        { fullName: { $regex: safePattern, $options: "i" } },
      ];
    }

    const otherUsers = await User.find(filter)
      .select("fullName userName profilePhoto gender")
      .sort({ userName: 1 })
      .lean();

    // Do not broadcast third-party filtered lists. Return only to caller.
    return res.status(200).json(otherUsers.map((user) => serializeDirectoryUser(user, friendIds)));
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to load users" });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const viewerId = String(req.id);
    const profileId = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(viewerId) || !mongoose.Types.ObjectId.isValid(profileId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const [viewerFriendIds, user] = await Promise.all([
      loadFriendIdSet(viewerId),
      User.findById(profileId)
        .select("-password")
        .populate("friends", "fullName userName profilePhoto")
        .lean(),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      user: serializeProfileUser(user, viewerId, viewerFriendIds),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to load profile", success: false });
  }
};

export const addFriend = async (req, res) => {
  try {
    const currentUserId = String(req.id);
    const targetUserId = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(currentUserId) || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (currentUserId === targetUserId) {
      return res.status(400).json({ message: "You cannot add yourself as a friend" });
    }

    const targetUser = await User.findById(targetUserId).select("_id");
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    await Promise.all([
      User.updateOne({ _id: currentUserId }, { $addToSet: { friends: targetUserId } }),
      User.updateOne({ _id: targetUserId }, { $addToSet: { friends: currentUserId } }),
    ]);
    await notifyFriendAdded({ actorId: currentUserId, recipientId: targetUserId });

    const authUser = await loadSerializedAuthUser(currentUserId);
    void broadcastPresenceSnapshots().catch((broadcastError) => {
      console.error("presence broadcast failed", broadcastError);
    });

    return res.status(200).json({
      success: true,
      message: "Friend added",
      user: authUser,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to add friend", success: false });
  }
};

export const removeFriend = async (req, res) => {
  try {
    const currentUserId = String(req.id);
    const targetUserId = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(currentUserId) || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (currentUserId === targetUserId) {
      return res.status(400).json({ message: "You cannot remove yourself" });
    }

    await Promise.all([
      User.updateOne({ _id: currentUserId }, { $pull: { friends: targetUserId } }),
      User.updateOne({ _id: targetUserId }, { $pull: { friends: currentUserId } }),
    ]);

    const authUser = await loadSerializedAuthUser(currentUserId);
    void broadcastPresenceSnapshots().catch((broadcastError) => {
      console.error("presence broadcast failed", broadcastError);
    });

    return res.status(200).json({
      success: true,
      message: "Friend removed",
      user: authUser,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Failed to remove friend", success: false });
  }
};
