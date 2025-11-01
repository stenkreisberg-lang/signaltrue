import express from "express";
import Project from "../models/project.js";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import apiKeyAuth from "../middleware/apiKey.js";
import { scanFile } from "../utils/virusScan.js";
import { saveFileLocal, saveFileS3 } from "../utils/storage.js";

// Define allowed file types
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "application/pdf",
  "text/plain",
  // Allow generic binary uploads (curl may send this for small files)
  "application/octet-stream",
  "text/csv",
];

// Configure multer v3
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

const router = express.Router();

// POST - Create a new project
router.post("/", async (req, res) => {
  try {
    const { name, description, favorite } = req.body;
    // Basic validation: name and description are required and must be non-empty strings
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({ message: "'name' is required" });
    }
    if (!description || typeof description !== "string" || description.trim() === "") {
      return res.status(400).json({ message: "'description' is required" });
    }

    // allow creation with optional extra fields
    const { status, notes, tags, subtasks } = req.body;

    // Basic validation for optional fields
    const safeNotes = Array.isArray(notes) ? notes.map((n) => String(n)) : [];
    const safeTags = Array.isArray(tags) ? tags.map((t) => String(t)) : [];
    const safeSubtasks = Array.isArray(subtasks)
      ? subtasks
          .filter((s) => s && s.title)
          .map((s) => ({ title: String(s.title), done: !!s.done }))
      : [];

    const safeStatus = typeof status === "string" && ["open", "in-progress", "done"].includes(status) ? status : "open";

    const project = new Project({
      name: name.trim(),
      description: description.trim(),
      favorite: !!favorite,
      status: safeStatus,
      notes: safeNotes,
      tags: safeTags,
      subtasks: safeSubtasks,
    });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET - List all projects
router.get("/", async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 }); // newest first
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT - Update project (edit name, description, or favorite)
router.put("/:id", async (req, res) => {
  try {
    // Only update fields that were actually provided in the request body.
    // This prevents accidental overwrites with `undefined` when the client
    // only wants to toggle `favorite`.
    const updates = {};
    const { name, description, favorite, status, notes, tags, subtasks } = req.body;
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return res.status(400).json({ message: "'name' must be a non-empty string" });
      }
      updates.name = name.trim();
    }
    if (description !== undefined) {
      if (typeof description !== "string" || description.trim() === "") {
        return res.status(400).json({ message: "'description' must be a non-empty string" });
      }
      updates.description = description.trim();
    }
    if (favorite !== undefined) updates.favorite = !!favorite;
    if (status !== undefined) {
      if (typeof status !== "string" || !["open", "in-progress", "done"].includes(status)) {
        return res.status(400).json({ message: "'status' must be 'open', 'in-progress' or 'done'" });
      }
      updates.status = status;
    }
    if (notes !== undefined) {
      if (!Array.isArray(notes)) return res.status(400).json({ message: "'notes' must be an array" });
      updates.notes = notes.map((n) => String(n));
    }
    if (tags !== undefined) {
      if (!Array.isArray(tags)) return res.status(400).json({ message: "'tags' must be an array" });
      updates.tags = tags.map((t) => String(t));
    }
    if (subtasks !== undefined) {
      if (!Array.isArray(subtasks)) return res.status(400).json({ message: "'subtasks' must be an array" });
      updates.subtasks = subtasks
        .filter((s) => s && s.title)
        .map((s) => ({ title: String(s.title), done: !!s.done }));
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE - Remove project
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Project.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json({ message: "Project deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST - Upload attachment for a project
// Protect attachment endpoints with API key auth (optional via API_KEY env)
router.post("/:id/attachments", apiKeyAuth, async (req, res) => {
  try {
    // Handle file upload with proper error catching
    await new Promise((resolve, reject) => {
      upload.single("file")(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Strict mimetype validation: only accept known allowed mimetypes.
    // Clients must supply a valid Content-Type. This prevents accidental
    // acceptance of arbitrary binaries.
    const mimetype = file.mimetype;
    if (!mimetype || !ALLOWED_TYPES.includes(mimetype)) {
      return res.status(400).json({
        message: "Invalid file type. Allowed types: images (png,jpeg,gif), PDFs, and text files (plain/csv). Please set a valid Content-Type."
      });
    }

  // Resolve uploads directory relative to this routes file to avoid
  // depending on the process CWD. That ensures we always write to
  // backend/uploads.
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const uploadsDir = path.join(__dirname, "..", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

    // Determine original filename and a safe filename
    const originalname = file.originalname || file.originalName || file.clientReportedFileName || `upload-${Date.now()}.bin`;
    const safeBase = originalname.replace(/[^a-zA-Z0-9.\-]/g, "_");
    const filename = Date.now() + "-" + safeBase;
    const filePath = path.join(uploadsDir, filename);

    // Save file to configured storage backend
    const USE_S3 = !!process.env.USE_S3;
    if (!USE_S3) {
      // Local save
      if (file.buffer) {
        await saveFileLocal(uploadsDir, filename, file.buffer);
      } else if (file.stream) {
        // stream to a temp file then move
        const tmpPath = filePath + ".tmp";
        const stream = file.stream;
        const writable = (await import("fs")).createWriteStream(tmpPath);
        await new Promise((resolve, reject) => {
          stream.pipe(writable);
          stream.on("error", reject);
          writable.on("finish", resolve);
          writable.on("error", reject);
        });
        await fs.rename(tmpPath, filePath);
      } else if (file.path) {
        // some middleware might save to a temp path
        await fs.copyFile(file.path, filePath);
      } else {
        throw new Error("Unsupported upload payload");
      }
    } else {
      // S3 save: get body and content type
      const key = filename;
      const contentType = file.mimetype || "application/octet-stream";
      if (file.buffer) {
        await saveFileS3(key, file.buffer, contentType);
      } else if (file.stream) {
        await saveFileS3(key, file.stream, contentType);
      } else if (file.path) {
        // read file and upload
        const data = await fs.readFile(file.path);
        await saveFileS3(key, data, contentType);
      } else {
        throw new Error("Unsupported upload payload for S3");
      }
    }

    // Optionally scan the saved file; if infected, remove and reject upload
    const scan = await scanFile(filePath);
    if (!scan.ok) {
      await fs.unlink(filePath).catch(() => {});
      return res.status(400).json({ message: "File failed virus scan" });
    }

    const attachment = {
      filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: `/uploads/${filename}`,
      uploadedAt: new Date(),
    };

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $push: { attachments: attachment } },
      { new: true }
    );

    if (!project) {
      // Clean up file if project not found
      await fs.unlink(filePath).catch(console.error);
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(201).json({ attachment, project });
  } catch (err) {
    console.error("File upload error:", err);
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File too large (max: 5MB)" });
    }
    res.status(500).json({ message: err.message || "Error uploading file" });
  }
});

// DELETE - Remove an attachment from a project and delete the file
router.delete("/:id/attachments/:filename", apiKeyAuth, async (req, res) => {
  try {
  const { id, filename } = req.params;
  const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const att = project.attachments.find((a) => a.filename === filename);
    if (!att) return res.status(404).json({ message: "Attachment not found" });

    // remove file from disk (use same uploads dir as upload handler)
    const { fileURLToPath: _f } = await import("url");
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const filePath = path.join(__dirname, "..", "uploads", filename);
    try {
      await fs.unlink(filePath).catch((e) => {
        if (e && e.code !== "ENOENT") console.error("Error deleting file", e);
      });
    } catch (e) {
      // ignore
    }

    // remove attachment metadata
    project.attachments = project.attachments.filter((a) => a.filename !== filename);
    await project.save();

    res.json({ message: "Attachment deleted", project });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;