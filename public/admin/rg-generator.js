// public/rg-generator.js
export async function generateRg(pet, templateUrl = "./img/rgAzul.png") {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const template = await loadImage(templateUrl);
  canvas.width = template.width;
  canvas.height = template.height;

  // 1) Fundo
  ctx.drawImage(template, 0, 0);

  // 2) Foto (frente)
  await drawPetPhoto(ctx, pet);

  // 3) Assinatura (frente) - 1º nome
  await drawFrontSignature(ctx, pet);

  // 4) Verso (valores)
  drawBackValues(ctx, pet);

  return canvas;
}

/* =========================================================
   FOTO (Frente)
========================================================= */
async function drawPetPhoto(ctx, pet) {
  const fotoUrl = getPhotoUrl(pet);
  if (!fotoUrl) return;

  try {
    const foto = await loadImage(fotoUrl);

    // área da foto no template (ajuste se precisar)
    const x = 352, y = 302, w = 272, h = 311;
    const cx = x + w / 2;
    const cy = y + h / 2;

    ctx.save();
    ctx.translate(cx, cy);

    // rotação -90° (como você já usava)
    ctx.rotate(-Math.PI / 2);

    // desenha centralizado
    ctx.drawImage(foto, -w / 2, -h / 2, w, h);
    ctx.restore();
  } catch (e) {
    console.warn("RG: não consegui carregar a foto:", fotoUrl, e);
  }
}

function getPhotoUrl(pet) {
  return (pet?.photoUrl || pet?.fotoUrl || "").toString().trim();
}

/* =========================================================
   ASSINATURA (Frente) - 1º nome
========================================================= */
async function drawFrontSignature(ctx, pet) {
  const fullName = (pet?.nomePet || "").toString().trim();
  const assinatura = firstName(fullName);
  if (!assinatura) return;

  // Ajuste fino de posição
  const centerX = 645;
  const y = 680;

  // tenta carregar a fonte (precisa estar registrada via @font-face)
  await ensureFontLoaded('90px "Weather Sunday - Personal Use"');

  ctx.save();
  ctx.fillStyle = "#000";
  ctx.font = '90px "Weather Sunday - Personal Use", Verdana';
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillText(assinatura, centerX, y);
  ctx.restore();
}

function firstName(fullName) {
  if (!fullName) return "";
  return fullName.trim().split(/\s+/)[0] || "";
}

/* =========================================================
   VERSO (Somente valores)
========================================================= */
function drawBackValues(ctx, pet) {
  setValueStyle(ctx);

  // Layout base (ajuste fino aqui)
  const startXLeft = 1200;
  const startXRight = 1745;
  let y = 255;
  const gap = 75;

  const tutores = buildTutores(pet);
  const naturalidade = [pet?.cidade, pet?.estado].filter(Boolean).join(" / ");

  // Linha 1
  drawValue(ctx, pet?.nomePet, startXLeft, y, 26);
  drawValue(ctx, pet?.registro, startXRight, y, 18);

  // Linha 2
  y += gap;
  drawValue(ctx, pet?.dataNascimento, startXLeft, y, 14);
  drawValue(ctx, pet?.expedicao, startXRight, y, 14);

  // Linha 3
  y += gap;
  drawValue(ctx, tutores, startXLeft, y, 30);
  drawValue(ctx, pet?.especie, startXRight, y, 16);

  // Linha 4
  y += gap + 15;
  drawValue(ctx, naturalidade, startXLeft, y, 18);
  drawValue(ctx, pet?.raca, startXRight, y, 22);

  // Linha 5
  y += gap - 5;
  drawValue(ctx, pet?.sexo, startXLeft, y, 10);
  drawValue(ctx, pet?.porte, startXRight, y, 12);

  // Linha 6
  y += gap;
  drawValue(ctx, pet?.castrado, startXLeft, y, 6);
  drawValue(ctx, pet?.pelagemCor, startXRight, y, 18);

  // Linha 7
  y += gap - 10;
  drawValue(ctx, pet?.pedigree, startXLeft, y, 6);
  drawValue(ctx, pet?.instagramPet, startXRight, y, 18);
}

function buildTutores(pet) {
  const t1 = (pet?.tutor1 || "").toString().trim();
  const t2 = (pet?.tutor2 || "").toString().trim();
  if (t1 && t2) return `${t1} / ${t2}`;
  return t1 || t2 || "";
}

/* =========================================================
   Texto helpers (Verso)
========================================================= */
function setValueStyle(ctx) {
  ctx.font = "bold 21px Verdana";
  ctx.fillStyle = "#000";
  ctx.textBaseline = "alphabetic";
}

function drawValue(ctx, value, x, y, maxChars = 999) {
  let t = (value ?? "").toString().trim();
  if (!t) return;

  t = t.toUpperCase();

  if (t.length > maxChars) {
    t = t.slice(0, Math.max(0, maxChars - 1)) + "…";
  }

  ctx.fillText(t, x, y);
}

/* =========================================================
   Font loader (Canvas)
========================================================= */
async function ensureFontLoaded(fontCss) {
  try {
    if (document.fonts?.load) {
      await document.fonts.load(fontCss);
    }
  } catch {
    // fallback silencioso
  }
}

/* =========================================================
   Loader de imagens
========================================================= */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem: " + src));
    img.src = src;
  });
}
