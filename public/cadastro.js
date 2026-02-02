// public/cadastro.js
import { generateRg } from "./admin/rg-generator.js";
import { generateCertNascimento } from "./admin/cert-generator.js";
import { generateVac } from "./admin/vac-generator.js";
import { canvasesToSinglePdf } from "./pdf-export.js";


const $ = (id) => document.getElementById(id);

$("year").textContent = new Date().getFullYear();

const form = $("formCadastro");
const statusEl = $("cadStatus");
const btnLimpar = $("btnLimparCad");

const fotoInput = $("cFoto");
const fileName = $("fileName");

// ===== Cropper state =====
let cropper = null;
let croppedFile = null;
let lastObjectUrl = null;

// ===== Modal (vamos criar via JS para não mexer no HTML agora) =====
function ensureCropModal() {
  let modal = $("cropModalPublic");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "cropModalPublic";
  modal.className = "cropModal hidden";
  modal.innerHTML = `
    <div class="cropCard">
      <div class="cropHeader">
        <strong>Centralizar foto</strong>
        <button type="button" id="cropClosePublic" aria-label="Fechar">✕</button>
      </div>
      <div class="cropBody">
        <div class="cropStage">
          <img id="cropImagePublic" alt="Foto para recorte" />
        </div>

        <div class="cropTools">
          <button type="button" id="zoomInPublic">Zoom +</button>
          <button type="button" id="zoomOutPublic">Zoom -</button>
          <button type="button" id="rotateLeftPublic">Girar</button>
          <button type="button" id="resetCropPublic">Reset</button>
        </div>
        <div class="cropHint">Arraste para centralizar. Use zoom e girar se precisar.</div>
      </div>
      <div class="cropFooter">
        <button type="button" class="btnSoft" id="cropCancelPublic">Cancelar</button>
        <button type="button" class="btn" id="cropConfirmPublic">Usar foto</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // estilos mínimos (reaproveitando o que você já tem no admin)
  const style = document.createElement("style");
  style.textContent = `
    .cropModal{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999}
    .cropModal.hidden{display:none}
    .cropCard{width:min(900px,92vw);background:#fff;border-radius:12px;overflow:hidden}
    .cropHeader{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid #e5e7eb}
    .cropHeader button{border:0;background:transparent;font-size:18px;cursor:pointer}
    .cropBody{padding:12px}
    .cropStage{width:350px;height:400px;margin:0 auto;background:#f3f4f6;border:2px dashed #cbd5e1;border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center}
    .cropStage img{max-width:100%;display:block}
    .cropTools{display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap}
    .cropTools button{padding:8px 12px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer}
    .cropHint{text-align:center;margin-top:8px;font-size:12px;color:#6b7280}
    .cropFooter{padding:12px 14px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:8px}
  `;
  document.head.appendChild(style);

  return modal;
}

function setStatus(msg, type = "") {
  statusEl.className = "status" + (type ? " " + type : "");
  statusEl.textContent = msg || "";
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

function openCropModal() {
  const modal = ensureCropModal();
  modal.classList.remove("hidden");
}

function closeCropModal() {
  const modal = ensureCropModal();
  modal.classList.add("hidden");
  destroyCropper();
}

function initCropper(imgEl) {
  if (!window.Cropper) {
    alert("CropperJS não carregou. Confere se adicionou o script/CSS.");
    return;
  }
  destroyCropper();
  cropper = new Cropper(imgEl, {
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

// ===== Foto: ao selecionar, abre crop =====
fotoInput.addEventListener("change", () => {
  const file = fotoInput.files?.[0];
  if (!file) return;

  croppedFile = null;
  fileName.textContent = file.name;

  revokeLastUrl();
  lastObjectUrl = URL.createObjectURL(file);

  const modal = ensureCropModal();
  const imgEl = $("cropImagePublic");
  imgEl.src = lastObjectUrl;

  openCropModal();

  imgEl.onload = () => initCropper(imgEl);
  imgEl.onerror = () => {
    alert("Não consegui abrir essa imagem. Tenta outra foto.");
    closeCropModal();
  };
});

// ===== Botões do modal =====
document.addEventListener("click", async (e) => {
  const id = e.target?.id;

  if (id === "cropClosePublic" || id === "cropCancelPublic") {
    closeCropModal();
    return;
  }

  if (id === "zoomInPublic") cropper?.zoom(0.1);
  if (id === "zoomOutPublic") cropper?.zoom(-0.1);
  if (id === "rotateLeftPublic") cropper?.rotate(-90);
  if (id === "resetCropPublic") cropper?.reset();

  if (id === "cropConfirmPublic") {
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
      fileName.textContent = "Foto centralizada (350x400) ✅";
      // limpa input (pra não mandar a original)
      fotoInput.value = "";
      closeCropModal();
    }, "image/png", 0.95);
  }
});

// ===== Limpar =====
btnLimpar.addEventListener("click", () => {
  form.reset();
  fileName.textContent = "Nenhuma foto selecionada";
  croppedFile = null;
  revokeLastUrl();
  destroyCropper();
  setStatus("");
  $("cNomePet").focus();
});

// ===== Helpers API =====
async function apiCreatePublicWithPhoto(data, photoFile) {
  const fd = new FormData();

  // campos do form (como strings)
  Object.entries(data).forEach(([k, v]) => {
    if (v === undefined || v === null) v = "";
    fd.append(k, String(v));
  });

  // foto
  fd.append("photo", photoFile);

  const res = await fetch("/api/pets/public", {
    method: "POST",
    body: fd, // ⚠️ sem headers!
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || json?.message || "Erro ao enviar cadastro");

  return json;
}
function getTemplatesByColor(color) {
  const isRosa = String(color || "").toLowerCase().startsWith("r");
  return {
    rg: isRosa ? "./admin/img/rgRosa.png" : "./admin/img/rgAzul.png",
    vacinaFront: isRosa ? "./admin/img/vacinaRosa.png" : "./admin/img/vacinaAzul.png",
    vacinaBack: isRosa ? "./admin/img/vacinaVsRosa.png" : "./admin/img/vacinaVsAzul.png",
  };
}

async function generateAndDownloadPdf(pet) {
  const templates = getTemplatesByColor(pet.corDocumento);

  // gera canvases
  const rgCanvas = await generateRg(pet, templates.rg);
  const certCanvas = await generateCertNascimento(pet, "./admin/img/certNasc.png");
  const vacina = await generateVac(pet, templates.vacinaFront, templates.vacinaBack);

  const pages = [];
  if (rgCanvas) pages.push({ canvas: rgCanvas, preset: "rg" });
  if (certCanvas) pages.push({ canvas: certCanvas, preset: "a4-portrait" });
  if (vacina?.frente) pages.push({ canvas: vacina.frente, preset: "a4-landscape" });
  if (vacina?.verso) pages.push({ canvas: vacina.verso, preset: "a4-landscape" });

  const safeName = String(pet?.nomePet || "Pet").replace(/[^\w\-]+/g, "_");

  canvasesToSinglePdf(pages, `PetDoc_${safeName}.pdf`, {
    registro: pet.registro,
    qrUrl: `https://petdocid.onrender.com/${encodeURIComponent(pet.registro || "")}`,
  });
}

// ===== Submit =====
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  try {
    // 1) validação mínima
    const required = ["cNomePet", "cEspecie", "cTutor1", "cTel1", "cCidade", "cEstado"];
    for (const id of required) {
      const el = $(id);
      if (!String(el.value || "").trim()) {
        setStatus("Preencha os campos obrigatórios antes de enviar.", "error");
        el.focus();
        return; // sai do submit, e o finally vai reabilitar o botão
      }
    }

    // 2) foto (cropped ou original)
    const photoFile = croppedFile || fotoInput.files?.[0];
    if (!photoFile) {
      setStatus("Selecione uma foto do pet (e centralize).", "error");
      fotoInput.focus();
      return;
    }

    // 3) monta payload
    const data = {
      nomePet: $("cNomePet").value.trim(),
      especie: $("cEspecie").value,
      raca: $("cRaca").value.trim(),
      pelagemCor: $("cPelagemCor").value.trim(),
      dataNascimento: $("cDataNascimento").value.trim(),
      sexo: $("cSexo").value,
      porte: $("cPorte").value,
      castrado: $("cCastrado").value,
      pedigree: $("cPedigree").value,
      cidade: $("cCidade").value.trim(),
      estado: $("cEstado").value.trim().toUpperCase(),
      tutor1: $("cTutor1").value.trim(),
      tutor2: $("cTutor2").value.trim(),
      tel1: $("cTel1").value.trim(),
      tel2: $("cTel2").value.trim(),
      microchip: $("cMicrochip").value.trim(),
      instagramPet: $("cInstagram").value.trim(),
      observacoes: $("cObservacoes").value.trim(),
      email: $("cEmail").value.trim(),
      corDocumento: $("cCor").value,
      status: "Pendente",
    };

    // 4) envia cadastro + foto
    setStatus("Enviando cadastro...", "");
    const created = await apiCreatePublicWithPhoto(data, photoFile);

    // 5) monta dados p/ gerar docs
    const registro = created?.registro || created?.pet?.registro || "";
    const photoUrl =
      created?.photoUrl || created?.pet?.photoUrl || created?.data?.photoUrl || "";

    const petForDocs = {
      ...data,
      ...created,
      registro,
      expedicao: new Date().toLocaleDateString("pt-BR"),
      photoUrl,
      fotoUrl: photoUrl,
    };

    if (!petForDocs.registro) {
      throw new Error("Cadastro criado, mas não veio o registro para gerar o QR.");
    }

    // 6) gera e baixa PDF (sem preview)
    setStatus("✅ Cadastro enviado! Gerando seu PDF agora...", "ok");
    await generateAndDownloadPdf(petForDocs);

    // 7) final
    setStatus(`✅ Tudo certo! Seu PDF foi baixado.\nRegistro: ${petForDocs.registro}`, "ok");

    // 8) limpa
    form.reset();
    fileName.textContent = "Nenhuma foto selecionada";
    croppedFile = null;

  } catch (err) {
    console.error(err);
    setStatus(err.message || "Erro ao enviar cadastro.", "error");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});
