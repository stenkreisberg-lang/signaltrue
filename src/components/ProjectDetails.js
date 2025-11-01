import React, { useEffect, useState, useRef } from "react";
import api from "../utils/api";

// Simple debounce
function useDebouncedCallback(cb, delay) {
  const timer = useRef(null);
  return (...args) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => cb(...args), delay);
  };
}

export default function ProjectDetails({ project, onClose, onSave }) {
  const [local, setLocal] = useState(project || {});
  useEffect(() => setLocal(project || {}), [project]);

  // Auto-save with debounce
  const saveToServer = async (patched) => {
    try {
      const res = await api.put(`/api/projects/${patched._id}`, patched);
      if (res.ok) {
        const updated = await res.json();
        onSave && onSave(updated);
      }
    } catch (e) {
      console.error("Failed to save project details", e);
    }
  };

  const debouncedSave = useDebouncedCallback(saveToServer, 700);

  const updateField = (field, value) => {
    const patched = { ...local, [field]: value };
    setLocal(patched);
    debouncedSave({ [field]: value, _id: patched._id });
  };

  const addNote = () => {
    const notes = [...(local.notes || []), ""];
    updateField("notes", notes);
  };

  const updateNote = (idx, value) => {
    const notes = [...(local.notes || [])];
    notes[idx] = value;
    updateField("notes", notes);
  };

  const addSubtask = () => {
    const subtasks = [...(local.subtasks || []), { title: "", done: false }];
    updateField("subtasks", subtasks);
  };

  const updateSubtask = (idx, patch) => {
    const subtasks = [...(local.subtasks || [])];
    subtasks[idx] = { ...subtasks[idx], ...patch };
    updateField("subtasks", subtasks);
  };

  const addTag = (tag) => {
    if (!tag) return;
    const tags = Array.from(new Set([...(local.tags || []), tag]));
    updateField("tags", tags);
  };

  const uploadAttachment = async (file) => {
    if (!file) return;
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${api.API_BASE}/api/projects/${local._id}/attachments`, {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        const data = await res.json();
        // data.project contains updated project
        onSave && onSave(data.project);
      } else {
        console.error("Upload failed", await res.text());
        alert("Attachment upload failed.");
      }
    } catch (e) {
      console.error("Upload error", e);
      alert("Attachment upload failed.");
    }
  };

  const deleteAttachment = async (attachment) => {
    if (!attachment || !attachment.filename) return;
    if (!confirm(`Delete attachment ${attachment.originalname || attachment.filename}?`)) return;
    try {
      const res = await fetch(`${api.API_BASE}/api/projects/${local._id}/attachments/${attachment.filename}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        onSave && onSave(data.project);
      } else {
        console.error('Delete failed', await res.text());
        alert('Could not delete attachment');
      }
    } catch (e) {
      console.error('Delete error', e);
      alert('Could not delete attachment');
    }
  };

  if (!project) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ width: "800px", maxHeight: "90vh", overflow: "auto", background: "white", padding: 20, borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Project Details</h2>
          <div>
            <button onClick={onClose} style={{ marginRight: 8 }}>Close</button>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Title</label>
          <input value={local.name || ""} onChange={(e) => updateField("name", e.target.value)} style={{ width: "100%" }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Description</label>
          <textarea value={local.description || ""} onChange={(e) => updateField("description", e.target.value)} style={{ width: "100%" }} />
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <div>
            <label>Status</label>
            <select value={local.status || "open"} onChange={(e) => updateField("status", e.target.value)}>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div>
            <label>Favorite</label>
            <input type="checkbox" checked={!!local.favorite} onChange={(e) => updateField("favorite", e.target.checked)} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <h4>Notes</h4>
          {(local.notes || []).map((n, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <input value={n} onChange={(e) => updateNote(i, e.target.value)} style={{ width: "100%" }} />
            </div>
          ))}
          <button onClick={addNote}>Add Note</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <h4>Subtasks</h4>
          {(local.subtasks || []).map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <input type="checkbox" checked={!!s.done} onChange={(e) => updateSubtask(i, { done: e.target.checked })} />
              <input value={s.title} onChange={(e) => updateSubtask(i, { title: e.target.value })} style={{ flex: 1 }} />
            </div>
          ))}
          <button onClick={addSubtask}>Add Subtask</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <h4>Tags</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {(local.tags || []).map((t, i) => (
              <span key={i} style={{ background: "#eee", padding: "4px 8px", borderRadius: 6 }}>{t}</span>
            ))}
          </div>
          <TagInput onAdd={addTag} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <h4>Attachments</h4>
          <div style={{ marginBottom: 8 }}>
            {(local.attachments || []).map((a, i) => (
              <div key={i} style={{ marginBottom: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                <a href={`${api.API_BASE}${a.path}`} target="_blank" rel="noreferrer">{a.originalname || a.filename}</a>
                <button onClick={() => deleteAttachment(a)} style={{ marginLeft: 8 }}>Delete</button>
              </div>
            ))}
          </div>
          <input type="file" onChange={(e) => uploadAttachment(e.target.files[0])} />
        </div>

      </div>
    </div>
  );
}

function TagInput({ onAdd }) {
  const [val, setVal] = useState("");
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Add tag" />
      <button onClick={() => { onAdd(val.trim()); setVal(""); }}>Add</button>
    </div>
  );
}
