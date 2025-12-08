// ...existing code...
import { execFile } from "node:child_process";
import { promisify } from "util";

// ...existing code...

const execFileAsync = promisify(execFile);

export async function scanFile(filePath) {
  // No-op unless VIRUS_SCAN is truthy and SCAN_COMMAND is set.
  // For tests, allow forcing a failure via FAKE_VIRUS_FAIL
  if (process.env.FAKE_VIRUS_FAIL === "true") return { ok: false, error: "FAKE_VIRUS" };
  if (!process.env.VIRUS_SCAN || !process.env.SCAN_COMMAND) return { ok: true };

  try {
    // SCAN_COMMAND should be the executable and SCAN_ARGS optional (space-separated)
    const cmd = process.env.SCAN_COMMAND;
    const args = process.env.SCAN_ARGS ? process.env.SCAN_ARGS.split(" ") : [];
    // Append the file path as the last argument
    const { stdout, stderr } = await execFileAsync(cmd, [...args, filePath]);
    // Interpret the exit as success if code 0; otherwise treat as infected.
    return { ok: true, stdout, stderr };
  } catch (err) {
    // If the scanner exits non-zero, bubble up as infected.
    return { ok: false, error: err.message || String(err) };
  }
}
