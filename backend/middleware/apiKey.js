// ...existing code...

// ...existing code...

export default function apiKeyAuth(req, res, next) {
  const expected = process.env.API_KEY;
  if (!expected) return next(); // no API_KEY set -> allow open access (dev)

  const provided = req.header("x-api-key");
  if (!provided || provided !== expected) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}
