export const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8080";

async function request(method, path, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, opts);
  return res;
}

export async function get(path) {
  const res = await request("GET", path);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function post(path, body) {
  return request("POST", path, body);
}

export async function put(path, body) {
  return request("PUT", path, body);
}

export async function del(path) {
  return request("DELETE", path);
}

export default { API_BASE, get, post, put, del };
