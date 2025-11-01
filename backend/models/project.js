import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    favorite: { type: Boolean, default: false }, // ⭐ NEW FIELD
    // Additional fields for Project Details view
    status: { type: String, enum: ["open", "in-progress", "done"], default: "open" },
    notes: { type: [String], default: [] },
    // Higher-level fields
    goals: { type: [String], default: [] },
    dueDate: { type: Date },
    links: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    subtasks: {
      type: [
        {
          title: { type: String, required: true },
          done: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    // Signals/tasks embedded in project for simplicity
    signals: {
      type: [
        {
          title: { type: String, required: true },
          description: { type: String },
          status: { type: String, enum: ["new", "in-progress", "completed"], default: "new" },
          priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    // Attachments stored on server; store metadata here
    attachments: {
      type: [
        {
          filename: String,
          originalname: String,
          mimetype: String,
          size: Number,
          path: String,
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    // History of changes (simple audit trail)
    history: {
      type: [
        {
          changedBy: { type: String, default: null },
          changes: { type: Object },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Project", projectSchema);
