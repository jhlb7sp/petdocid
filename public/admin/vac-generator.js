// public/vac-generator.js
let __weatherSundayLoaded = false;

async function loadCanvasFontOnce() {
  if (__weatherSundayLoaded) return;
  const font = new FontFace("WeatherSunday", "url(/fonts/WeatherSunday-PersonalUse.otf)");
  await font.load();
  document.fonts.add(font);
  __weatherSundayLoaded = true;
}

export async function generateVac(pet, frontTemplate, backTemplate) {
  await loadCanvasFontOnce();
  await document.fonts.load('72px "WeatherSunday"');

  const color = pet?.corDocumento || "Azul";

  const front =
    frontTemplate || (color === "Rosa" ? "./img/vacinaRosa.png" : "./img/vacinaAzul.png");

  const back =
    backTemplate || (color === "Rosa" ? "./img/vacinaVsRosa.png" : "./img/vacinaVsAzul.png");

  const frente = await generateVacFront(pet, front);
  const verso = await generateVacBack(back);

  // ✅ retorna CANVAS (igual RG)
  return { frente, verso };
}

/* =========================
   FRENTE – Identidade
========================= */

async function generateVacFront(pet, templateUrl) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const template = await loadImage(templateUrl);
  canvas.width = template.width;
  canvas.height = template.height;

  // 1) Fundo
  ctx.drawImage(template, 0, 0);

  // 2) Foto (ARREDONDADA)
  const fotoUrl = getPhotoUrl(pet);
  if (fotoUrl) {
    try {
      const foto = await loadImage(fotoUrl);
      drawRoundedImage(ctx, foto, 1127, 477, 274, 329, 28);
    } catch (e) {
      console.warn("Vacina: não consegui carregar a foto:", fotoUrl, e);
    }
  }

  // 3) Textos
  setTextStyle(ctx);

  let y = 207;
  const gap = 70;

  drawValue(ctx, pet?.nomePet, 25, y, 40);

  y += gap;
  drawValue(ctx, pet?.especie, 25, y, 16);
  drawValue(ctx, pet?.raca, 234, y, 24);

  y += gap;
  drawValue(ctx, pet?.pelagemCor, 25, y, 30);
  drawValue(ctx, pet?.sexo, 380, y, 10);

  y += gap;
  drawValue(ctx, pet?.microchip, 25, y, 25);

  y += gap;
  drawValue(ctx, pet?.estado, 25, y, 6);
  drawValue(ctx, pet?.cidade, 270, y, 20);

  y += gap;
  const tutores = buildTutores(pet);
  drawValue(ctx, tutores, 25, y, 40);

  y += gap + 16;
  const telefones = [pet?.tel1, pet?.tel2].filter(Boolean).join(" / ");
  drawValue(ctx, telefones, 25, y, 40);

  // 4) ✍️ Assinatura por último
  await drawVacSignature(ctx, pet);

  // ✅ retorna CANVAS
  return canvas;
}

/* =========================
   VERSO – Apenas template
========================= */

async function generateVacBack(templateUrl) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const template = await loadImage(templateUrl);
  canvas.width = template.width;
  canvas.height = template.height;

  ctx.drawImage(template, 0, 0);

  // ✅ retorna CANVAS
  return canvas;
}

/* =========================
   Assinatura (mesma fonte do RG)
========================= */
async function drawVacSignature(ctx, pet) {
  const nome = getFirstName(pet?.nomePet);
  if (!nome) return;

  const boxX = 1000;
  const boxY = 838;
  const boxW = 500;
  const boxH = 120;

  const x = boxX + boxW / 2;
  const y = boxY + boxH * 0.72;

  ctx.save();

  // ✅ fonte já está carregada pelo generateVac
  ctx.font = '72px "WeatherSunday", Verdana';
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // contorno branco (fica bonito em qualquer fundo)
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 10;
  ctx.strokeText(nome, x, y);

  ctx.fillStyle = "#000";
  ctx.fillText(nome, x, y);

  ctx.restore();
}


/* =========================
   Helpers
========================= */

function getFirstName(nomeCompleto = "") {
  return nomeCompleto.toString().trim().split(/\s+/)[0] || "";
}

function buildTutores(pet) {
  const t1 = (pet?.tutor1 || "").toString().trim();
  const t2 = (pet?.tutor2 || "").toString().trim();
  if (t1 && t2) return `${t1} / ${t2}`;
  return t1 || t2 || "";
}

function getPhotoUrl(pet) {
  return (pet?.photoUrl || pet?.fotoUrl || "").toString().trim();
}

function setTextStyle(ctx) {
  ctx.font = "bold 20px Verdana";
  ctx.fillStyle = "#000";
}

function drawValue(ctx, value, x, y, maxChars = 999) {
  let t = (value ?? "").toString().trim().toUpperCase();
  if (!t) return;
  if (t.length > maxChars) t = t.slice(0, maxChars - 1) + "…";
  ctx.fillText(t, x, y);
}

function drawRoundedImage(ctx, img, x, y, w, h, r) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // ✅ mantém padrão igual RG
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem: " + src));
    img.src = src;
  });
}

async function ensureFontLoaded(fontCss) {
  try {
    if (document.fonts?.load) {
      await document.fonts.load(fontCss);
    }
  } catch {
    // silencioso
  }
}
