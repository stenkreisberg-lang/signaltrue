import express from "express";
import { v4 as uuidv4 } from "uuid";
import Invite from "../models/invite.js";


const router = express.Router();

// POST /api/invites/send
router.post("/send", async (req, res) => {
  try {
    const { email, role, inviterName, companyName } = req.body;
    if (!email || !role) return res.status(400).json({ message: "Email and role required" });
    const token = uuidv4();
    const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
    const invite = await Invite.create({ email, role, token, expiry, inviterName, companyName });
    // TODO: Send email via provider (SendGrid/Mailgun)
    // For now, just return the invite
    res.json({ email, role, token, expiry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/invites/pending
router.get("/pending", async (req, res) => {
  const invites = await Invite.find({ status: "pending" });
  res.json(invites);
});

// GET /api/invites/accept/:token
router.get("/accept/:token", async (req, res) => {
  const { token } = req.params;
  const invite = await Invite.findOne({ token });
  if (!invite) return res.status(404).json({ message: "Invite not found" });
  if (invite.expiry < new Date()) {
    invite.status = "expired";
    await invite.save();
    return res.status(400).json({ message: "Invite expired" });
  }
  invite.status = "accepted";
  await invite.save();
  // Redirect to onboarding with token
  res.redirect(`/onboarding?token=${token}`);
});

export default router;
