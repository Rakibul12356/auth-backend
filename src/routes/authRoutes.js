const express = require("express");
const {
  register,
  login,
  getProfile,
  logout,
  getAllUsers,
  updateUserRole,
  verifyEmail,
} = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminmiddleware = require("../middlewares/adminmiddleware");
const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", authMiddleware, getProfile);
router.post("/logout", authMiddleware, logout);
// Sob user-der list dekha (Admin only)
router.get("/all-users", authMiddleware, adminmiddleware, getAllUsers);

// User role change kora (Admin only)
router.put("/update-role", authMiddleware, adminmiddleware, updateUserRole);
router.post('/verify-email', verifyEmail);
module.exports = router;

