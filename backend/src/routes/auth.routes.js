import express from "express";
import { login, logout, resetPassword } from "../controller/auth.controller.js";

const router = express.Router();

router.post("/login", login);

// Logout route
router.post('/logout', logout);

// Reset password route
router.post('/reset-password', resetPassword);

export default router;