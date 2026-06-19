const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiters");

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/refresh", authController.refresh);    // Renueva el access token con el refresh cookie
router.post("/logout", authController.logout);      // Limpia el refresh cookie
router.get("/me", authMiddleware, authController.getMe);

module.exports = router;
