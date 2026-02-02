//admin/app.js
import { generateRg } from "./rg-generator.js";
import { generateCertNascimento } from "./cert-generator.js";
import { generateVac } from "./vac-generator.js";
import { generateInstaPost } from "./insta-generator.js";
import { canvasesToSinglePdf } from "../pdf-export.js";




/*token*/
function getToken() {
  return sessionStorage.getItem("admToken") || "";
}

function authHeaders(extra = {}) {
  const t = getToken();
  return t ? { ...extra, Authorization: `Bearer ${t}` } : { ...extra };
}


/* =========================================================
   Tabs (Consulta / Cadastro)
========================================================= */
const tabs = document.querySelectorAll(".tab");
const panels = {
  consulta: document.getElementById("panel-consulta"),
  cadastro: document.getElementById("panel-cadastro"),
};

tabs.forEach((btn) =>
  btn.addEventListener("click", () => {
    tabs.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    Object.values(panels).forEach((p) => p.classList.remove("active"));
    panels[btn.dataset.tab]?.classList.add("active");
  })
);


/* =========================================================
   Subtabs (JSON / FORM)
========================================================= */
const subtabs = document.querySelectorAll(".subtab");
const subpanels = {
  form: document.getElementById("subtab-form"),
  json: document.getElementById("subtab-json"),
};

subtabs.forEach((btn) =>
  btn.addEventListener("click", () => {
    subtabs.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    Object.values(subpanels).forEach((p) => p.classList.remove("active"));
    subpanels[btn.dataset.subtab]?.classList.add("active");
  })
);

function getActiveCadastroMode() {
  return document.querySelector(".subtab.active")?.dataset.subtab || "json";
}

/* =========================================================
   API helpers
========================================================= */
async function apiGet(url) {
  const res = await fetch(url, {
    headers: authHeaders({ Accept: "application/json" }),
  });

  const json = await res.json().catch(() => ({}));
  if (res.status === 401) {
    sessionStorage.removeItem("admToken");
    window.location.href = "/";
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  if (!res.ok) throw new Error(json?.error || json?.message || "Erro API GET");
  return json;
}

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (res.status === 401) {
    sessionStorage.removeItem("admToken");
    window.location.href = "/";
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (!res.ok) throw new Error(json?.error || json?.message || "Erro API POST");
  return json;
}

async function apiPut(url, body) {
  const res = await fetch(url, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (res.status === 401) {
    sessionStorage.removeItem("admToken");
    window.location.href = "/";
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (!res.ok) throw new Error(json?.error || json?.message || "Erro API PUT");
  return json;
}

async function apiDelete(url) {
  const res = await fetch(url, {
    method: "DELETE",
    headers: authHeaders({ Accept: "application/json" }),
  });

  const json = await res.json().catch(() => ({}));
  if (res.status === 401) {
    sessionStorage.removeItem("admToken");
    window.location.href = "/";
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (!res.ok) throw new Error(json?.error || json?.message || "Erro API DELETE");
  return json;
}

async function apiUploadPhoto(petId, file) {
  const fd = new FormData();
  fd.append("photo", file);

  // ⚠️ NÃO coloque Content-Type aqui (o browser define boundary)
  const res = await fetch(`/api/pets/${petId}/photo`, {
    method: "POST",
    headers: authHeaders(), // ✅ só Authorization
    body: fd,
  });

  const json = await res.json().catch(() => ({}));
  if (res.status === 401) {
    sessionStorage.removeItem("admToken");
    window.location.href = "/";
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (!res.ok) throw new Error(json?.error || json?.message || "Erro upload");
  return json;
}
/* =========================================================
   Preview helpers
========================================================= */
function ensurePreviewBox() {
  const host = document.getElementById("panel-cadastro");
  if (!host) return null;

  let box = document.getElementById("previewBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "previewBox";
    box.style.marginTop = "12px";
    host.appendChild(box);
  }
  return box;
}

function clearPreview() {
  const box = document.getElementById("previewBox");
  if (box) box.remove();
}

function showPreview(dataUrl, title = "Documento") {
  const box = ensurePreviewBox();
  if (!box) return;

  const card = document.createElement("div");
  card.style.marginBottom = "16px";
  card.innerHTML = `
    <div style="font-weight:700; margin-bottom:6px;">${escapeHtml(title)}</div>
    <img src="${dataUrl}" style="max-width:100%; border:1px solid #ddd; border-radius:8px;" />
  `;
  box.appendChild(card);
}

function canvasToPngDataUrl(c) {
  if (!c) return "";
  if (typeof c === "string") return c; // se já vier dataUrl
  if (c instanceof HTMLCanvasElement) return c.toDataURL("image/png", 1.0);
  return "";
}


/* =========================================================
   Templates por cor
========================================================= */
function getTemplatesByColor(color) {
  const isRosa = String(color || "").toLowerCase().startsWith("r");

  return {
    rg: isRosa ? "./img/rgRosa.png" : "./img/rgAzul.png",
    vacinaFront: isRosa ? "./img/vacinaRosa.png" : "./img/vacinaAzul.png",
    vacinaBack: isRosa ? "./img/vacinaVsRosa.png" : "./img/vacinaVsAzul.png",
  };
}

/* =========================================================
   Gerar TODOS os docs (RG + Cert + Vacina)
========================================================= */
async function generateAllDocs(pet) {
  const templates = getTemplatesByColor(pet.corDocumento);

  // RG -> agora precisa retornar canvas (ajuste no generator do RG)
  const rgCanvas = await generateRg(pet, templates.rg);

  // Certidão -> você já ajustou pra retornar canvas ✅
  const certCanvas = await generateCertNascimento(pet, "./img/certNasc.png");

  // Vacina -> ideal retornar canvas (ou {frenteCanvas, versoCanvas})
  let vacinaResult = null;
  try {
    vacinaResult = await generateVac(pet, templates.vacinaFront, templates.vacinaBack);
  } catch {
    vacinaResult = await generateVac(pet, templates.vacinaFront);
  }

  return { rgCanvas, certCanvas, vacinaResult };
}

function buildDocsPreview(docs) {
  // docs: { rgCanvas, certCanvas, vacinaResult }
  return {
    rgPng: canvasToPngDataUrl(docs.rgCanvas),
    certPng: canvasToPngDataUrl(docs.certCanvas),
    vacinaResult: (() => {
      const v = docs.vacinaResult;
      if (!v) return null;

      // se vier {frente, verso}
      if (typeof v === "object" && (v.frente || v.verso)) {
        return {
          frente: canvasToPngDataUrl(v.frente),
          verso: canvasToPngDataUrl(v.verso),
        };
      }

      // se vier canvas ou dataUrl único
      return canvasToPngDataUrl(v);
    })(),
  };
}


async function downloadDocsPdfs(docs, petForDocs) {
  const safeName = String(petForDocs?.nomePet || "Pet").replace(/[^\w\-]+/g, "_");

  const pages = [];

  if (docs.rgCanvas instanceof HTMLCanvasElement) pages.push({ canvas: docs.rgCanvas, preset: "rg" });
  if (docs.certCanvas instanceof HTMLCanvasElement) pages.push({ canvas: docs.certCanvas, preset: "a4-portrait" });

  const v = docs.vacinaResult;
  if (v?.frente instanceof HTMLCanvasElement) pages.push({ canvas: v.frente, preset: "a4-landscape" });
  if (v?.verso instanceof HTMLCanvasElement) pages.push({ canvas: v.verso, preset: "a4-landscape" });

  if (!pages.length) {
    console.warn("Nenhuma página válida para gerar PDF único.");
    return;
  }

  await canvasesToSinglePdf(pages, `PetDoc_${safeName}.pdf`, {
    registro: petForDocs?.registro,
    qrUrl: `https://petdocid.onrender.com/${encodeURIComponent(petForDocs?.registro || "")}`,
  });
}


function generateQRCodeDataUrl(text, size = 180) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // qrcode-generator expõe a função global "qrcode"
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();

  const count = qr.getModuleCount();
  const scale = size / count;

  canvas.width = canvas.height = size;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#000";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        ctx.fillRect(c * scale, r * scale, scale, scale);
      }
    }
  }

  return canvas.toDataURL("image/png");
}



async function handleGenerateFlow(petForDocs, { updateStatusId = null } = {}) {
  // 1) gera canvases
  const docs = await generateAllDocs(petForDocs);

  // 2) baixa PDFs (se tiver canvas)
  downloadDocsPdfs(docs, petForDocs);

  // 3) gera PNGs para preview/insta
  const docsPreview = buildDocsPreview(docs);

  // 4) valida principais (para status/continuação)
  if (!docsPreview.rgPng || !docsPreview.certPng) {
    throw new Error("Falha ao gerar RG ou Certidão.");
  }

  // 5) Instagram continua PNG
  const instaPng = await generateInstaPost({
    pet: petForDocs,
    rgPng: docsPreview.rgPng,
    certPng: docsPreview.certPng,
    vacinaResult: docsPreview.vacinaResult,
  });
  // 5.1 QR (pra mostrar no preview)
  const registro = (petForDocs?.registro || "").toString().trim().toUpperCase();
  const qrUrl = `https://petdocid.onrender.com/?registro=${encodeURIComponent(registro)}`;
  const qrPng = generateQRCodeDataUrl(qrUrl, 220);

  // 5.2 abre preview com QR
  openPreviewTab(docsPreview, instaPng, { qrPng, qrUrl, registro });

  // 6) preview   openPreviewTab(docsPreview, instaPng);

  // 7) status pronto (somente quando veio da consulta)
  if (updateStatusId) {
    await apiPut(`/api/pets/${updateStatusId}`, { status: "Pronto" });
  }

  return { docs, docsPreview, instaPng };
}


/* =========================================================
   Tela 1: Consulta
========================================================= */
function firstName(fullName) {
  if (!fullName) return "";
  return fullName.trim().split(/\s+/)[0];
}

const grid = document.getElementById("grid");
const fNome = document.getElementById("fNome");
const fTutor = document.getElementById("fTutor");
const fRaca = document.getElementById("fRaca");

document.getElementById("btnBuscar")?.addEventListener("click", loadGrid);

document.getElementById("btnLimpar")?.addEventListener("click", () => {
  fNome.value = "";
  fTutor.value = "";
  fRaca.value = "";
  loadGrid();
});

function rowHtml(p) {
  const tutor1 = firstName(p.tutor1);
  const tutor2 = firstName(p.tutor2);
  const tutores = tutor2 ? `${tutor1} / ${tutor2}` : tutor1;

  const cor = p.corDocumento || "";
  const corBadge =
    cor === "Azul"
      ? '<span class="badge azul">Azul</span>'
      : cor === "Rosa"
        ? '<span class="badge rosa">Rosa</span>'
        : "—";

  const especie = p.especie || "—";
  const registro = p.registro || "—";

  const status = p.status || "Pendente";
  const statusBadge =
    status === "Pronto"
      ? `<span class="badge azul">Pronto</span>`
      : `<span class="badge rosa">Pendente</span>`;

  const tel = p.tel1 || "";
  const wa = waLinkFromTel(tel);

  const waCell = wa
    ? `<a class="waBtn" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>`
    : `<span class="waBtn disabled">WhatsApp</span>`;


  return `
    <tr>
      <td><strong>${escapeHtml(registro)}</strong></td>
      <td>${escapeHtml(p.nomePet || "")}</td>
      <td>${escapeHtml(tutores)}</td>
      <td>${escapeHtml(p.raca || "")}</td>
      <td>${escapeHtml(especie)}</td>
      <td>${statusBadge}</td>
      <td>${waCell}</td>
      <td>${corBadge}</td>
      <td class="actionsCell">
        <button class="iconBtn" data-act="edit" data-id="${p._id}" title="Alterar / Gerar Docs">✏️</button>
        <button class="iconBtn" data-act="del" data-id="${p._id}" title="Excluir">🗑️</button>
        <button class="iconBtn" data-act="gen" data-id="${p._id}" title="Gerar Docs">📄</button>
      </td>
    </tr>
  `;
}

function onlyDigits(v = "") {
  return String(v).replace(/\D/g, "");
}

function waLinkFromTel(tel) {
  let d = onlyDigits(tel);
  if (!d) return "";

  // se já vier com 55 na frente, não duplica
  if (d.startsWith("55")) d = d.slice(2);

  return `https://wa.me/55${d}`;
}



grid?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const id = btn.dataset.id;
  const act = btn.dataset.act;

  if (act === "del") {
    const ok = confirm("Tem certeza que deseja excluir este pet?");
    if (!ok) return;
    await apiDelete(`/api/pets/${id}`);
    await loadGrid();
    return;
  }

  if (act === "edit") {
    const pet = await apiGet(`/api/pets/${id}`);

    fillFormFromObj(pet);
    jsonArea.value = JSON.stringify(pet, null, 2);

    // ✅ entra no modo edição
    window.__editingPetId = pet._id;
    window.__editingPhotoUrl = pet.photoUrl || "";
    window.__hasExistingPhoto = !!pet.photoUrl;

    // ✅ UI: vai pro cadastro + FORM
    document.querySelector('.tab[data-tab="cadastro"]')?.click();
    document.querySelector('.subtab[data-subtab="form"]')?.click();

    // ✅ mostra que já tem foto cadastrada (sem precisar selecionar)
    if (fileName) fileName.textContent = pet.photoUrl ? "Foto já cadastrada ✅" : "Nenhuma foto cadastrada";

    statusJson.textContent = "Editando cadastro. Ajuste e clique em Gerar Docs.";
    return;
  }


  if (act === "gen") {
    try {
      statusJson.textContent = "Gerando documentos...";
      clearPreview();

      const pet = await apiGet(`/api/pets/${id}`);

      const petForDocs = {
        ...pet,
        registro: pet.registro || `PD-${pet._id.slice(-6)}`,
        expedicao: new Date().toLocaleDateString("pt-BR"),
        photoUrl: pet.photoUrl || pet.fotoUrl || "",
        fotoUrl: pet.photoUrl || pet.fotoUrl || "",
        tel1:
          pet.tel1 ||
          pet.tel ||
          pet.telefone ||
          pet.telefone1 ||
          pet.phone ||
          (Array.isArray(pet.telefones) ? pet.telefones[0] : "") ||
          (pet.contato?.tel1 || pet.contato?.telefone || "") ||
          "",
        tel2:
          pet.tel2 ||
          pet.telefone2 ||
          (Array.isArray(pet.telefones) ? pet.telefones[1] : "") ||
          (pet.contato?.tel2 || "") ||
          "",
      };

      await handleGenerateFlow(petForDocs, { updateStatusId: id });

      statusJson.textContent = "✅ Documentos gerados e status atualizado para PRONTO!";
      await loadGrid();
    } catch (err) {
      console.error(err);
      alert(err.message || "Erro ao gerar documentos");
    }
    return;
  }

});

async function loadGrid() {
  const qs = new URLSearchParams({
    nomePet: fNome.value.trim(),
    tutor: fTutor.value.trim(),
    raca: fRaca.value.trim(),
  });

  const list = await apiGet(`/api/pets?${qs.toString()}`);
  grid.innerHTML = list.map(rowHtml).join("") || `<tr><td colspan="9">Sem resultados</td></tr>`;

}

/* =========================================================
   Tela 2: Cadastro
========================================================= */
const cNomePet = document.getElementById("cNomePet");
const cEspecie = document.getElementById("cEspecie");
const cRaca = document.getElementById("cRaca");
const cPelagemCor = document.getElementById("cPelagemCor");
const cDataNascimento = document.getElementById("cDataNascimento");
const cSexo = document.getElementById("cSexo");
const cPorte = document.getElementById("cPorte");
const cCastrado = document.getElementById("cCastrado");
const cPedigree = document.getElementById("cPedigree");
const cCidade = document.getElementById("cCidade");
const cEstado = document.getElementById("cEstado");
const cCor = document.getElementById("cCor");

const cTutor1 = document.getElementById("cTutor1");
const cTutor2 = document.getElementById("cTutor2");

const cTel1 = document.getElementById("cTel1");
const cTel2 = document.getElementById("cTel2");

const cMicrochip = document.getElementById("cMicrochip");
const cInstagram = document.getElementById("cInstagram");
const cObservacoes = document.getElementById("cObservacoes");
const cEmail = document.getElementById("cEmail");

const cFoto = document.getElementById("cFoto");
const fileName = document.getElementById("fileName");

const statusCad = document.getElementById("statusCad");
const jsonArea = document.getElementById("jsonArea");
const statusJson = document.getElementById("statusJson");
const msgArea = document.getElementById("msgArea");
const statusMsg = document.getElementById("statusMsg");

/* =========================================================
   Cropper (Recorte + Zoom + Rotate)
========================================================= */
let cropper = null;
let croppedFile = null;
let lastObjectUrl = null;

const cropModal = document.getElementById("cropModal");
const cropImage = document.getElementById("cropImage");
const cropClose = document.getElementById("cropClose");
const cropConfirm = document.getElementById("cropConfirm");

const btnZoomIn = document.getElementById("zoomIn");
const btnZoomOut = document.getElementById("zoomOut");
const btnRotateLeft = document.getElementById("rotateLeft");
const btnResetCrop = document.getElementById("resetCrop");

function openCropModal() {
  cropModal?.classList.remove("hidden");
}
function revokeLastUrl() {
  if (lastObjectUrl) {
    URL.revokeObjectURL(lastObjectUrl);
    lastObjectUrl = null;
  }
}
function destroyCropper() {
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
}
function closeCropModal() {
  cropModal?.classList.add("hidden");
  destroyCropper();
}

function initCropperOrWarn() {
  if (!window.Cropper) {
    alert("CropperJS não carregou. Confere se incluiu o script e o CSS do Cropper no index.html.");
    return;
  }
  destroyCropper();

  cropper = new Cropper(cropImage, {
    viewMode: 1,
    dragMode: "move",
    aspectRatio: 350 / 400,
    autoCropArea: 1,
    background: false,
    movable: true,
    zoomable: true,
    zoomOnWheel: true,
    wheelZoomRatio: 0.08,
    cropBoxMovable: false,
    cropBoxResizable: false,
    toggleDragModeOnDblclick: false,
    rotatable: true,
  });
}

cFoto?.addEventListener("change", () => {
  const file = cFoto.files?.[0];
  if (!file) return;

  croppedFile = null;
  if (fileName) fileName.textContent = file.name;

  revokeLastUrl();
  lastObjectUrl = URL.createObjectURL(file);
  cropImage.src = lastObjectUrl;

  openCropModal();

  cropImage.onload = () => initCropperOrWarn();
  cropImage.onerror = () => {
    alert("Não consegui abrir essa imagem. Tenta outra foto.");
    closeCropModal();
  };
});

btnZoomIn?.addEventListener("click", () => cropper?.zoom(0.1));
btnZoomOut?.addEventListener("click", () => cropper?.zoom(-0.1));
btnResetCrop?.addEventListener("click", () => cropper?.reset());
btnRotateLeft?.addEventListener("click", () => cropper?.rotate(-90));
cropClose?.addEventListener("click", closeCropModal);

cropConfirm?.addEventListener("click", () => {
  if (!cropper) return;

  const canvas = cropper.getCroppedCanvas({
    width: 350,
    height: 400,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
  });

  canvas.toBlob((blob) => {
    if (!blob) return;

    croppedFile = new File([blob], "petdoc_foto.png", { type: "image/png" });
    if (fileName) fileName.textContent = "Foto recortada (350x400) ✅";

    if (cFoto) cFoto.value = "";
    closeCropModal();
  }, "image/png", 0.95);
});

/* =========================================================
   Cadastro helpers
========================================================= */
function fillFormFromObj(obj) {
  cNomePet.value = obj.nomePet || "";
  cEspecie.value = obj.especie || "";
  cRaca.value = obj.raca || "";
  cPelagemCor.value = obj.pelagemCor || "";
  cDataNascimento.value = obj.dataNascimento || "";
  cSexo.value = obj.sexo || "";
  cPorte.value = obj.porte || "";
  cCastrado.value = obj.castrado || "";
  cPedigree.value = obj.pedigree || "";
  cCidade.value = obj.cidade || "";
  cEstado.value = obj.estado || "";
  cCor.value = obj.corDocumento || "Azul";

  cTutor1.value = obj.tutor1 || "";
  cTutor2.value = obj.tutor2 || "";

  cTel1.value = obj.tel1 || "";
  cTel2.value = obj.tel2 || "";

  cMicrochip.value = obj.microchip || "";
  cInstagram.value = obj.instagramPet || "";
  cObservacoes.value = obj.observacoes || "";
  cEmail.value = obj.email || "";

  statusCad && (statusCad.textContent = "");
}

function clearCadastroAll() {
  // reset modo edição/foto antiga
  window.__editingPetId = null;
  window.__editingPhotoUrl = "";
  window.__hasExistingPhoto = false;

  cNomePet.value = "";
  cEspecie.value = "";
  cRaca.value = "";
  cPelagemCor.value = "";
  cDataNascimento.value = "";
  cSexo.value = "";
  cPorte.value = "";
  cCastrado.value = "";
  cPedigree.value = "";
  cCidade.value = "";
  cEstado.value = "";
  cCor.value = "Azul";

  cTutor1.value = "";
  cTutor2.value = "";

  cTel1.value = "";
  cTel2.value = "";

  cMicrochip.value = "";
  cInstagram.value = "";
  cObservacoes.value = "";
  cEmail.value = "";

  msgArea.value = "";
  jsonArea.value = "";

  if (cFoto) cFoto.value = "";
  if (fileName) fileName.textContent = "Nenhuma foto selecionada";

  statusMsg.textContent = "";
  statusJson.textContent = "";
  statusCad && (statusCad.textContent = "");

  croppedFile = null;
  revokeLastUrl();
  destroyCropper();
  cropModal?.classList.add("hidden");

  clearPreview(); // ✅ limpa tudo
}

function getDataForDocs() {
  const mode = getActiveCadastroMode();

  if (mode === "json") {
    try {
      return JSON.parse(jsonArea.value || "{}");
    } catch {
      throw new Error("JSON inválido");
    }
  }

  return {
    nomePet: cNomePet.value.trim(),
    especie: cEspecie.value,
    raca: cRaca.value.trim(),
    pelagemCor: cPelagemCor.value.trim(),
    dataNascimento: cDataNascimento.value.trim(),
    sexo: cSexo.value,
    porte: cPorte.value,
    castrado: cCastrado.value,
    pedigree: cPedigree.value,
    cidade: cCidade.value.trim(),
    estado: cEstado.value.trim(),
    tutor1: cTutor1.value.trim(),
    tutor2: cTutor2.value.trim(),
    tel1: cTel1.value.trim(),
    tel2: cTel2.value.trim(),
    microchip: cMicrochip.value.trim(),
    instagramPet: cInstagram.value.trim(),
    observacoes: cObservacoes.value.trim(),
    email: cEmail.value.trim(),
    corDocumento: cCor.value,
  };
}

function validateBeforeGenerate(data) {
  const required = ["nomePet", "especie", "raca", "cidade", "estado", "tutor1", "corDocumento"];
  const missing = required.filter((k) => !data[k] || !String(data[k]).trim());

  const isEditing = !!window.__editingPetId;

  // foto atual (recortada ou selecionada)
  const hasPhotoNow = !!(croppedFile || cFoto?.files?.[0]);

  // foto já existente no registro (quando edita)
  const hasPhotoExisting = !!window.__hasExistingPhoto;

  // ✅ Regra: foto é obrigatória
  // - novo cadastro: tem que ter foto agora
  // - edição: pode não ter foto agora, DESDE que já exista uma salva
  if (!isEditing && !hasPhotoNow) missing.push("foto do pet");
  if (isEditing && !hasPhotoNow && !hasPhotoExisting) missing.push("foto do pet");

  if (missing.length) {
    alert("Campos obrigatórios faltando:\n- " + missing.join("\n- "));
    return false;
  }

  return true;
}

function openImagePreview(dataUrl) {
  const w = window.open("", "_blank");
  w.document.write(`
    <html>
      <head>
        <title>Post Instagram</title>
        <style>
          body{margin:0;display:flex;justify-content:center;align-items:center;background:#111;}
          img{max-width:100%;height:auto;}
        </style>
      </head>
      <body>
        <img src="${dataUrl}" />
      </body>
    </html>
  `);
  w.document.close();
}




/* =========================================================
   Botões (Cadastro)
========================================================= */
document.getElementById("btnLimparCadastro")?.addEventListener("click", clearCadastroAll);

document.getElementById("btnGerarDocs")?.addEventListener("click", async () => {
  try {
    const data = getDataForDocs();
    if (!validateBeforeGenerate(data)) return;

    const isEditing = !!window.__editingPetId;
    let petId = window.__editingPetId;

    statusJson.textContent = isEditing ? "Atualizando cadastro..." : "Salvando no banco...";

    let saved = null;

    if (isEditing) {
      saved = await apiPut(`/api/pets/${petId}`, data);
    } else {
      saved = await apiPost("/api/pets", data);
      petId = saved._id;
    }

    // foto: só sobe se selecionou/recortou agora
    const newPhotoFile = croppedFile || cFoto?.files?.[0];
    let updated = saved;

    if (newPhotoFile) {
      statusJson.textContent = "Enviando foto...";
      updated = await apiUploadPhoto(petId, newPhotoFile);
      window.__hasExistingPhoto = true;
      window.__editingPhotoUrl = updated.photoUrl || window.__editingPhotoUrl;
    }

    statusJson.textContent = "Gerando documentos...";
    const petForDocs = {
      ...updated,
      ...data, // garante campos do form
      _id: petId,
      registro: updated.registro || `PD-${petId.slice(-6)}`,
      expedicao: new Date().toLocaleDateString("pt-BR"),
      photoUrl: updated.photoUrl || window.__editingPhotoUrl || "",
      fotoUrl: updated.photoUrl || window.__editingPhotoUrl || "",

    };

    await handleGenerateFlow(petForDocs);

    statusJson.textContent = isEditing ? "✅ Atualizado e documentos gerados!" : "✅ Documentos gerados com sucesso!";
    await loadGrid();
  } catch (e) {
    console.error(e);
    alert(e.message || "Erro ao gerar documentos");
  }
});


/* =========================================================
   Mensagem → JSON
========================================================= */
document.getElementById("btnMsgToJson")?.addEventListener("click", () => {
  const { data, warnings } = parseMsgToJsonWithWarnings(msgArea.value || "");
  jsonArea.value = JSON.stringify(data, null, 2);
  fillFormFromObj(data);

  if (warnings.length) {
    statusMsg.innerHTML = "⚠️ Avisos antes de gerar docs:<br>- " + warnings.join("<br>- ");
  } else {
    statusMsg.textContent = "✅ JSON gerado sem avisos.";
  }
});

/* =========================================================
   Parser mensagem → JSON
========================================================= */
function normalizeLabel(label) {
  return (label || "")
    .replace(/\(.*?\)/g, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const map = [
  { keys: ["nome do pet", "nome pet"], f: "nomePet" },
  { keys: ["especie"], f: "especie" },
  { keys: ["raca"], f: "raca" },
  { keys: ["pelagem", "pelagem cor", "pelagem  cor"], f: "pelagemCor" },
  { keys: ["data de nascimento", "nascimento"], f: "dataNascimento" },
  { keys: ["sexo"], f: "sexo" },
  { keys: ["porte"], f: "porte" },
  { keys: ["castrado", "castrada", "castradoa"], f: "castrado" },
  { keys: ["pedigree"], f: "pedigree" },
  { keys: ["cidade"], f: "cidade" },
  { keys: ["estado", "uf"], f: "estado" },
  { keys: ["tutora 1", "tutor 1", "tutora1", "tutor1"], f: "tutor1" },
  { keys: ["tutora 2", "tutor 2", "tutora2", "tutor2"], f: "tutor2" },
  { keys: ["microchip"], f: "microchip" },
  { keys: ["telefone 1", "telefone1", "tel 1", "tel1", "celular 1", "celular1"], f: "tel1" },
  { keys: ["telefone 2", "telefone2", "tel 2", "tel2", "celular 2", "celular2"], f: "tel2" },
  { keys: ["telefone", "tel", "celular", "whatsapp", "zap"], f: "tel1" },
  { keys: ["instagram do pet", "instagram pet", "instagram"], f: "instagramPet" },

  // ✅ pega "SINAIS CARACTERÍSTICOS / OBSERVAÇÕES (ex: ...)" também
  { keys: ["sinais caracteristicos", "sinais caracteristicos observacoes", "observacoes", "observacao"], f: "observacoes" },

  { keys: ["email", "e mail"], f: "email" },
  { keys: ["cor dos documentos", "cor do documento", "cor documentos", "cor"], f: "corDocumento" },
];

function normalizeYesNo(v) {
  const s = (v || "").trim().toLowerCase();
  if (!s) return "";
  if (["sim", "s", "yes", "y"].includes(s)) return "Sim";
  if (["nao", "não", "n", "no"].includes(s)) return "Não";
  return v.trim();
}
function normalizeColor(v) {
  const s = (v || "").trim().toLowerCase();
  if (!s) return "Azul";
  if (s.startsWith("a")) return "Azul";
  if (s.startsWith("r")) return "Rosa";
  return v.trim();
}
function normalizeUF(v) {
  const s = (v || "").trim();
  if (!s) return "";
  if (s.length === 2) return s.toUpperCase();

  const mapUF = {
    "sao paulo": "SP",
    "rio de janeiro": "RJ",
    "minas gerais": "MG",
    "parana": "PR",
    "santa catarina": "SC",
    "rio grande do sul": "RS",
    "bahia": "BA",
  };

  const key = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return mapUF[key] || s;
}

function parseMsgToJsonWithWarnings(text) {
  const out = { corDocumento: "Azul" };
  const warnings = [];

  const lines = (text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (!line.includes(":")) continue;

    const idx = line.lastIndexOf(":");
    const raw = line.slice(0, idx);
    const val = line.slice(idx + 1).trim();

    const label = normalizeLabel(raw);
    if (["dados do pet", "tutores", "outras informacoes"].includes(label)) continue;

    const m = map.find((x) => x.keys.includes(label) || x.keys.some((k) => label.startsWith(k)));
    if (m) out[m.f] = val;
    else warnings.push(`Campo não reconhecido: "${raw.trim()}"`);
  }

  out.castrado = normalizeYesNo(out.castrado);
  out.pedigree = normalizeYesNo(out.pedigree);
  out.corDocumento = normalizeColor(out.corDocumento);

  if (out.instagramPet && out.instagramPet.trim() && !out.instagramPet.trim().startsWith("@")) {
    out.instagramPet = "@" + out.instagramPet.trim();
    warnings.push(`Instagram não tinha "@". Ajustei para: ${out.instagramPet}`);
  }

  if (out.estado) {
    const before = out.estado;
    out.estado = normalizeUF(out.estado);
    if (before !== out.estado) warnings.push(`Estado normalizado: "${before}" → "${out.estado}"`);
    if (out.estado.length > 2) warnings.push(`Estado parece estar por extenso ("${out.estado}"). Recomendo usar UF (ex: SP).`);
  }

  const required = ["nomePet", "especie", "raca", "pelagemCor", "dataNascimento", "sexo", "porte", "castrado", "cidade", "estado", "tutor1", "corDocumento"];
  required.forEach((k) => {
    if (!out[k] || !String(out[k]).trim()) warnings.push(`Campo obrigatório vazio: ${k}`);
  });

  if (!["Azul", "Rosa"].includes(out.corDocumento)) {
    warnings.push(`Cor do documento inválida: "${out.corDocumento}". Use "Azul" ou "Rosa".`);
  }

  return { data: out, warnings };
}
// function openPreviewTab(docs, instaPng) {
//   const w = window.open("", "_blank");
//   if (!w) {
//     alert("Seu navegador bloqueou o pop-up. Permita pop-ups para este site.");
//     return;
//   }

//   const html = `
// <!doctype html>
// <html lang="pt-BR">
// <head>
//   <meta charset="utf-8" />
//   <meta name="viewport" content="width=device-width,initial-scale=1" />
//   <title>Preview - PetDoc ID</title>
//   <style>
//     body{margin:0;font-family:Arial;background:#f4f5f7;color:#111;}
//     header{position:sticky;top:0;background:#fff;border-bottom:1px solid #ddd;padding:12px 16px;display:flex;gap:8px;align-items:center;z-index:10}
//     .btn{border:1px solid #ccc;background:#fff;padding:8px 10px;border-radius:10px;cursor:pointer}
//     .btn.primary{background:#2b5bff;color:#fff;border-color:#2b5bff}
//     .wrap{max-width:980px;margin:16px auto;padding:0 16px}
//     .card{background:#fff;border:1px solid #ddd;border-radius:14px;padding:12px;margin:14px 0}
//     .title{font-weight:800;margin:0 0 10px}
//     img{width:100%;height:auto;border:1px solid #eee;border-radius:12px}
//     .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
//   </style>
// </head>
// <body>
// <header>
//   <button class="btn" onclick="window.close()">Fechar</button>
//   <button class="btn primary" onclick="window.print()">Imprimir</button>
// </header>

// <div class="wrap">
//   ${renderDocsHtml(docs, instaPng)}
// </div>

// </body>
// </html>`;

//   w.document.open();
//   w.document.write(html);
//   w.document.close();
// }

function openPreviewTab(docs, instaPng, qr = null) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Seu navegador bloqueou o pop-up. Permita pop-ups para este site.");
    return;
  }

  const html = `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Preview - PetDoc ID</title>
  <style>
    body{margin:0;font-family:Arial;background:#f4f5f7;color:#111;}
    header{position:sticky;top:0;background:#fff;border-bottom:1px solid #ddd;padding:12px 16px;display:flex;gap:8px;align-items:center;z-index:10}
    .btn{border:1px solid #ccc;background:#fff;padding:8px 10px;border-radius:10px;cursor:pointer}
    .btn.primary{background:#2b5bff;color:#fff;border-color:#2b5bff}
    .wrap{max-width:980px;margin:16px auto;padding:0 16px}
    .card{background:#fff;border:1px solid #ddd;border-radius:14px;padding:12px;margin:14px 0}
    .title{font-weight:800;margin:0 0 10px}
    img{width:100%;height:auto;border:1px solid #eee;border-radius:12px}
    .qrBox{display:flex;justify-content:center;align-items:center;padding:10px 0}
    .qrImg{width:220px;height:220px;border-radius:12px}
    .qrText{font-size:12px;color:#555;text-align:center;margin-top:8px;word-break:break-all}
  </style>
</head>
<body>
<header>
  <button class="btn" onclick="window.close()">Fechar</button>
  <button class="btn primary" onclick="window.print()">Imprimir</button>
</header>

<div class="wrap">
  ${renderDocsHtml(docs, instaPng, qr)}
</div>

</body>
</html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}


// function renderDocsHtml({ rgPng, certPng, vacinaResult }, instaPng) {
//   let out = "";

//   if (rgPng) out += docCard("RG do Pet", rgPng);
//   if (certPng) out += docCard("Certidão de Nascimento", certPng);

//   if (vacinaResult) {
//     if (typeof vacinaResult === "object") {
//       if (vacinaResult.frente) out += docCard("Carteira de Vacinação (Frente)", vacinaResult.frente);
//       if (vacinaResult.verso) out += docCard("Carteira de Vacinação (Verso)", vacinaResult.verso);
//     } else if (typeof vacinaResult === "string") {
//       out += docCard("Carteira de Vacinação", vacinaResult);
//     }
//   }
//   if (instaPng) out += docCard("Post para Instagram", instaPng);

//   return out || `<div class="card"><p class="title">Nada para exibir</p></div>`;
// }
function renderDocsHtml({ rgPng, certPng, vacinaResult }, instaPng, qr) {
  let out = "";

  // ✅ QR primeiro
  if (qr?.qrPng) {
    out += `
      <div class="card">
        <p class="title">QR Code do Registro ${qr.registro ? `(${qr.registro})` : ""}</p>
        <div class="qrBox">
          <img class="qrImg" src="${qr.qrPng}" alt="QR Code" />
        </div>
        ${qr.qrUrl ? `<div class="qrText">${qr.qrUrl}</div>` : ""}
      </div>
    `;
  }

  if (rgPng) out += docCard("RG do Pet", rgPng);
  if (certPng) out += docCard("Certidão de Nascimento", certPng);

  if (vacinaResult) {
    if (typeof vacinaResult === "object") {
      if (vacinaResult.frente) out += docCard("Carteira de Vacinação (Frente)", vacinaResult.frente);
      if (vacinaResult.verso) out += docCard("Carteira de Vacinação (Verso)", vacinaResult.verso);
    } else if (typeof vacinaResult === "string") {
      out += docCard("Carteira de Vacinação", vacinaResult);
    }
  }

  if (instaPng) out += docCard("Post para Instagram", instaPng);

  return out || `<div class="card"><p class="title">Nada para exibir</p></div>`;
}


function docCard(title, dataUrl) {
  const safeTitle = String(title).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[m]));
  return `
  <div class="card">
    <p class="title">${safeTitle}</p>
    <img src="${dataUrl}" alt="${safeTitle}" />
  </div>`;
}



/* =========================================================
   Utils
========================================================= */
function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[m]));
}

/* =========================================================
   Boot
========================================================= */
if (!getToken()) {
  window.location.href = "/";
  throw new Error("Sem token"); // ou: return;
}
loadGrid();
