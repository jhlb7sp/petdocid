// backend/src/middleware/auth.js
const jwt = require("jsonwebtoken");

function requireAdmin(req, res, next) {
  try {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7).trim() : "";

    if (!token) return res.status(401).json({ error: "Não autenticado." });

    const JWT_SECRET = String(process.env.JWT_SECRET || "").trim();
    if (!JWT_SECRET) return res.status(500).json({ error: "JWT_SECRET ausente no servidor." });

    const payload = jwt.verify(token, JWT_SECRET);

    if (payload?.role !== "admin") {
      return res.status(403).json({ error: "Sem permissão." });
    }

    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

module.exports = { requireAdmin };
