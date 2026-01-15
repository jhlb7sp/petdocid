// backend/src/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const user = String(req.body?.user || "").trim();
    const pass = String(req.body?.pass || "").trim();

    const ADMIN_USER = String(process.env.ADMIN_USER || "").trim();
    const ADMIN_PASS_HASH = String(process.env.ADMIN_PASS_HASH || "").trim();
    const JWT_SECRET = String(process.env.JWT_SECRET || "").trim();

    if (!ADMIN_USER || !ADMIN_PASS_HASH || !JWT_SECRET) {
      return res.status(500).json({ error: "Config admin ausente no servidor (.env)" });
    }

    if (!user || !pass) {
      return res.status(400).json({ error: "Informe usuário e senha." });
    }

    if (user !== ADMIN_USER) {
      return res.status(401).json({ error: "Login ou senha inválidos." });
    }

    const ok = await bcrypt.compare(pass, ADMIN_PASS_HASH);
    if (!ok) {
      return res.status(401).json({ error: "Login ou senha inválidos." });
    }

    const token = jwt.sign(
      { role: "admin", user },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.json({ token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro no login." });
  }
});

module.exports = router;
