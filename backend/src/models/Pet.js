//src/models/Pet.js

const mongoose = require("mongoose");

const PetSchema = new mongoose.Schema(
  {
    // numero de registro
    registroSeq: { type: Number },
    registro: { type: String, unique: true, index: true },
    // básicos (busca)
    nomePet: { type: String, default: "", index: true },
    raca: { type: String, default: "", index: true },

    // tutores
    tutor1: { type: String, default: "", index: true },
    tutor2: { type: String, default: "" },

    // telefones
    tel1: { type: String, default: "", index: true },
    tel2: { type: String, default: "" },

    // demais campos
    especie: { type: String, default: "" },
    pelagemCor: { type: String, default: "" },
    dataNascimento: { type: String, default: "" }, // dd/mm/aaaa
    sexo: { type: String, default: "" },
    porte: { type: String, default: "" },
    castrado: { type: String, default: "" },
    cidade: { type: String, default: "" },
    estado: { type: String, default: "" },
    microchip: { type: String, default: "" },
    instagramPet: { type: String, default: "" },
    observacoes: { type: String, default: "" },
    email: { type: String, default: "" },

    // novos
    corDocumento: { type: String, enum: ["Azul", "Rosa"], default: "Azul" },
    pedigree: { type: String, default: "" },

    //status
    status: { type: String, enum: ["Pendente", "Pronto"], default: "Pendente", index: true },
    


    // foto salva em arquivo
    photoUrl: { type: String, default: "" }, // ex: /uploads/abc.jpg
    photoPublicId: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Pet", PetSchema);
