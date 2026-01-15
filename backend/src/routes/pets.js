//src/routes/pets.js
const express = require("express");
const router = express.Router();
const Pet = require("../models/Pet");
const Counter = require("../models/Counter");
const { requireAdmin } = require("../middleware/auth");

const multer = require("multer");
const cloudinary = require("../config/cloudinary");

// memória (não cria pasta uploads)
const upload = multer({ storage: multer.memoryStorage() });

// helper: buffer -> cloudinary
function uploadBufferToCloudinary(buffer, folder = "petdoc/photos") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        format: "jpg",
        quality: "auto",
        fetch_format: "auto",
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}


function pad(n, len) {
  return String(n).padStart(len, "0");
}

function formatRegistro(uf, seq) {
  const lote = Math.floor((seq - 1) / 999) + 1;   // 1..∞
  const item = ((seq - 1) % 999) + 1;             // 1..999
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


// Helper: regex "contém" sem quebrar em caracteres especiais
function safeRegexContains(value) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
}

/**
 * GET /api/pets?nomePet=&tutor=&raca=
 * - Se não enviar nada: retorna tudo (limit 200)
 * - Se enviar algum: filtra por "contém"
 */
router.get("/", requireAdmin, async (req, res) => {
  try {
    const { nomePet = "", tutor = "", raca = "" } = req.query;

    const filter = {};
    if (nomePet.trim()) filter.nomePet = safeRegexContains(nomePet.trim());
    if (raca.trim()) filter.raca = safeRegexContains(raca.trim());

    if (tutor.trim()) {
      const t = safeRegexContains(tutor.trim());
      filter.$or = [{ tutor1: t }, { tutor2: t }];
    }

    const items = await Pet.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao listar pets" });
  }
});

router.get("/:id", requireAdmin, async (req, res) => {
  try {
    const item = await Pet.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Pet não encontrado" });
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao buscar pet" });
  }
});

router.post("/", async (req, res) => {
  try {
    // normaliza UF
    const uf = (req.body.estado || "").trim().toUpperCase();

    if (!uf) {
      return res.status(400).json({ error: "estado (UF) é obrigatório para gerar número de registro" });
    }

    // se o registro não vier no body, gera
    if (!req.body.registro) {
      const { registroSeq, registro } = await nextRegistroForUF(uf);
      req.body.registroSeq = registroSeq;
      req.body.registro = registro;
    }

    //status
    if (!req.body.status) req.body.status = "Pendente";

    const created = await Pet.create(req.body);
    res.status(201).json(created);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Erro ao criar pet" });
  }
});


router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const updated = await Pet.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updated) return res.status(404).json({ error: "Pet não encontrado" });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Erro ao atualizar pet" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) return res.status(404).json({ error: "Pet não encontrado" });

    // 🧹 apaga imagem no Cloudinary
    if (pet.photoPublicId) {
      try {
        await cloudinary.uploader.destroy(pet.photoPublicId);
      } catch (e) {
        console.warn("Não consegui apagar imagem no Cloudinary:", e.message);
      }
    }

    await pet.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao excluir pet" });
  }
});


// POST /api/pets/:id/photo  (ADMIN) - sobe para Cloudinary e salva URL no Mongo
router.post("/:id/photo", requireAdmin, upload.single("photo"), async (req, res) => {
  try {
    const petId = req.params.id;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "Foto (photo) é obrigatória" });

    const pet = await Pet.findById(petId);
    if (!pet) return res.status(404).json({ error: "Pet não encontrado" });

    // upload cloudinary
    const result = await uploadBufferToCloudinary(file.buffer, "petdoc/photos");

    const optimizedUrl = cloudinary.url(result.public_id, {
      width: 800,
      crop: "fill",
      gravity: "auto",
      fetch_format: "auto",
      quality: "auto",
    });

    pet.photoUrl = optimizedUrl;
    pet.photoPublicId = result.public_id;


    await pet.save();

    res.json(pet);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao enviar foto" });
  }
});


module.exports = router;
