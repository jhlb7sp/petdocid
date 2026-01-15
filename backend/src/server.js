require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const rateLimit = require("express-rate-limit");

const Pet = require("./models/Pet");
const petsRoutes = require("./routes/pets");
const { requireAdmin } = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const Counter = require("./models/Counter");

const app = express();

/* =========================
   Middlewares (primeiro)
========================= */
app.use(cors());
app.use(express.json({ limit: "2mb" }));

/* =========================
   Rate limit (só no POST público)
========================= */
const publicCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

// ⚠️ limita SOMENTE criação pública
app.post("/api/pets", publicCreateLimiter, (req, res, next) => next());

/* =========================
   Static / Pastas
========================= */
const publicDir = path.join(__dirname, "..", "..", "public");

app.use(express.static(publicDir));

/* =========================
   API routes
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/pets", petsRoutes);

/* =========================
   Multer (upload)
========================= */
/* =========================
   Cloudinary
========================= */
const cloudinary = require("./config/cloudinary");

/* =========================
   Multer (upload em memória)
========================= */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

app.post("/api/pets/public", publicCreateLimiter, upload.single("photo"), async (req, res) => {
  try {
    // validações mínimas
    const uf = (req.body.estado || "").trim().toUpperCase();
    if (!uf) return res.status(400).json({ error: "estado (UF) é obrigatório" });

    if (!req.file) return res.status(400).json({ error: "Foto do pet é obrigatória" });

    // 1) sobe foto no Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "petdoc/photos", resource_type: "image" },
        (err, uploaded) => (err ? reject(err) : resolve(uploaded))
      );
      stream.end(req.file.buffer);
    });

    // 2) gera registro
    const { registroSeq, registro } = await nextRegistroForUF(uf);

    // 3) monta payload e cria no mongo
    const payload = {
      ...req.body,
      estado: uf,
      registroSeq,
      registro,
      status: "Pendente",
      photoUrl: result.secure_url,
      photoPublicId: result.public_id,
    };

    const created = await Pet.create(payload);
    return res.status(201).json(created);
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: "Erro ao criar pet" });
  }
});


/* =========================
   Upload foto -> Cloudinary
========================= */
app.post("/api/pets/:id/photo", requireAdmin, upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Arquivo photo é obrigatório" });

    // ✅ sobe pro Cloudinary a partir do buffer
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "petdoc/photos",
          resource_type: "image",
        },
        (err, uploaded) => (err ? reject(err) : resolve(uploaded))
      );

      stream.end(req.file.buffer);
    });

    const photoUrl = result.secure_url;
    const photoPublicId = result.public_id; // útil p/ deletar depois

    const updated = await Pet.findByIdAndUpdate(
      req.params.id,
      { photoUrl, photoPublicId },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ error: "Pet não encontrado" });

    return res.json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro no upload" });
  }
});



// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, uploadsDir),
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
//     const safe = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
//     cb(null, safe);
//   },
// });

// const upload = multer({
//   storage,
//   limits: { fileSize: 8 * 1024 * 1024 },
// });

// app.post("/api/pets/:id/photo", requireAdmin, upload.single("photo"), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ error: "Arquivo photo é obrigatório" });

//     const photoUrl = `/uploads/${req.file.filename}`;
//     const updated = await Pet.findByIdAndUpdate(
//       req.params.id,
//       { photoUrl },
//       { new: true, runValidators: true }
//     );

//     if (!updated) return res.status(404).json({ error: "Pet não encontrado" });
//     return res.json(updated);
//   } catch (e) {
//     console.error(e);
//     return res.status(500).json({ error: "Erro no upload" });
//   }
// });

function pad(n, len) {
  return String(n).padStart(len, "0");
}

function formatRegistro(uf, seq) {
  const lote = Math.floor((seq - 1) / 999) + 1;
  const item = ((seq - 1) % 999) + 1;
  return `${uf}-${pad(lote, 4)}-${pad(item, 3)}`;
}

async function nextRegistroForUF(uf) {
  const c = await Counter.findOneAndUpdate(
    { uf },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const registroSeq = c.seq;
  const registro = formatRegistro(uf, registroSeq);
  return { registroSeq, registro };
}

/* =========================
   LOOKUP público
========================= */
app.get("/api/lookup", async (req, res) => {
  const registro = (req.query.registro || "").toString().trim().toUpperCase();
  if (!registro) return res.status(400).json({ message: "Informe o número do registro." });

  try {
    const pet = await Pet.findOne({ registro })
      .select("registro nomePet photoUrl tutor1 tel1")
      .lean();

    if (!pet) return res.status(404).json({ message: "Registro não encontrado." });

    return res.json({
      registro: pet.registro,
      petNome: pet.nomePet,
      photoUrl: pet.photoUrl,
      tutorNome: pet.tutor1,
      tutorTelefone: pet.tel1,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Erro ao consultar registro." });
  }
});

app.get("/r/:registro", (req, res) => {
  const reg = (req.params.registro || "").toUpperCase();
  return res.redirect(`/?registro=${encodeURIComponent(reg)}`);
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

/* =========================
   Start
========================= */
async function start() {
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI não definido no .env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Mongo conectado");

  const port = process.env.PORT || 3003;
  app.listen(port, () => console.log(`✅ Rodando: http://localhost:${port}`));
}

start().catch((e) => {
  console.error("❌ Falha ao iniciar:", e);
  process.exit(1);
});
