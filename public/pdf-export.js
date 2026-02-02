// pdf-export.js

//função para gerar QRcode
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
//logo
function loadImageAsDataUrl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = src;
  });
}


//escrever linhas + links no MESMO lugar

function writeLinesWithLinks(doc, x, y, lines, lineHeight = 6) {
  let cy = y;

  for (const item of lines) {
    // item pode ser string normal ou { text, url }
    if (typeof item === "string") {
      doc.setTextColor(0, 0, 0);
      doc.text(item, x, cy);
    } else if (item && item.text) {
      const url = item.url || item.text;
      // visual de link (azul)
      doc.setTextColor(0, 0, 255);
      doc.textWithLink(item.text, x, cy, { url });
      const w = doc.getTextWidth(item.text);
      doc.setDrawColor(0, 0, 255);
      doc.line(x, cy + 1, x + w, cy + 1);
      doc.setDrawColor(220);
      doc.setTextColor(0, 0, 0);
    }
    cy += lineHeight;
  }

  return cy; // retorna o Y final se você quiser continuar abaixo
}


//funçao para desenhar a primeira pagina
async function addIntroPageWithQR(doc, { registro, qrUrl }) {
  doc.setPage(1);
  const pageWidth = doc.internal.pageSize.getWidth();

  const url =
    (qrUrl || "").toString().trim() ||
    `https://petdocid.onrender.com/${encodeURIComponent(registro)}`;

  const qrImg = generateQRCodeDataUrl(url);
  doc.addImage(qrImg, "PNG", pageWidth - 135, 15, 60, 60);

  // 🔥 LOGO
  const logoDataUrl = await loadImageAsDataUrl("/img/logo2.png");

  const logoW = 80;
  const logoH = 70;
  const logoX = pageWidth - logoW - 20;
  const logoY = 160;

  doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoW, logoH);

  doc.setFontSize(12);

  const x = 20;
  const y = 100;

  const lines = [
    "Oi, Aumigo!",
    "",
    "Obrigado por cadastrar seu pet no PetDocId",
    "Seguem os documentos do seu pet.",
    "",
    "Caso queira consultar no portal, basta ler o QR Code com seu celular",
    "ou informar o número de registro no nosso portal.",
    "",
    "Nosso serviço é gratuito, mas se quiser colaborar com qualquer valor:",
    "Pix: 11915882378",
    "",
    "Siga nosso Instagram:",
    { text: "https://www.instagram.com/petdocid/", url: "https://www.instagram.com/petdocid/" },
    "",
    "Plaquinha de identificação recomendada:",
    { text: "https://mercadolivre.com/sec/24eXDKP", url: "https://mercadolivre.com/sec/24eXDKP" },
    "",
    "Visite também a nossa loja online:",
    { text: "https://mercadolivre.com/sec/23SLwXP", url: "https://mercadolivre.com/sec/23SLwXP" },
    "",
    "Qualquer dúvida, estamos por aqui",
  ];

  writeLinesWithLinks(doc, x, y, lines, 6);

  doc.setDrawColor(220);
  doc.line(20, 265, pageWidth - 20, 265);
}



// Requer: jsPDF UMD carregado no HTML (window.jspdf)

function getJsPDF() {
  const lib = window.jspdf;
  if (!lib?.jsPDF) {
    throw new Error('jsPDF não carregou. Verifique se incluiu o script UMD do jsPDF no HTML.');
  }
  return lib.jsPDF;
}

function canvasToImageData(canvas) {
  return canvas.toDataURL("image/png", 1.0);
}

function getPresetMm(preset, canvas) {
  const A4_P = { w: 210, h: 297, o: "p" };
  const A4_L = { w: 297, h: 210, o: "l" };
  const RG = { w: 350.0, h: 222.19, o: "p" }; // CR80

  if (preset === "a4-portrait") return A4_P;
  if (preset === "a4-landscape") return A4_L;
  if (preset === "rg") return RG;

  if (canvas) {
    const mmPerPx = 25.4 / 96; // fallback
    const w = canvas.width * mmPerPx;
    const h = canvas.height * mmPerPx;
    return { w, h, o: w > h ? "l" : "p" };
  }

  return A4_P;
}

function rotateCanvas90(canvas, clockwise = true) {
  const out = document.createElement("canvas");
  out.width = canvas.height;
  out.height = canvas.width;

  const ctx = out.getContext("2d");
  ctx.save();

  if (clockwise) {
    ctx.translate(out.width, 0);
    ctx.rotate(Math.PI / 2);
  } else {
    ctx.translate(0, out.height);
    ctx.rotate(-Math.PI / 2);
  }

  ctx.drawImage(canvas, 0, 0);
  ctx.restore();

  return out;
}

function addCanvasAsPage(pdf, canvas, preset) {
  const useCanvas = (preset === "rg") ? rotateCanvas90(canvas, true) : canvas;
  const imgData = useCanvas.toDataURL("image/png", 1.0);

  // ✅ RG: página A4 + RG centralizado com suas medidas calibradas
  if (preset === "rg") {
    const A4 = { w: 210, h: 297, o: "p" };
    pdf.addPage([A4.w, A4.h], A4.o);

    // 🔥 mantém suas medidas calibradas
    const rgH = 210.0;
    const rgW = 102.22;

    // ✅ centraliza
    const x = (A4.w - rgW) / 2;
    const y = (A4.h - rgH) / 2;

    pdf.addImage(imgData, "PNG", x, y, rgW, rgH);
    return;
  }

  // === restante (certidão/vacina) mantém como está ===
  const { w: pageW, h: pageH, o } = getPresetMm(preset, useCanvas);
  pdf.addPage([pageW, pageH], o);

  const pad =
    preset === "a4-portrait" ? 8 :
      preset === "a4-landscape" ? 15 : 5;

  const maxW = pageW - pad * 2;
  const maxH = pageH - pad * 2;

  const imgW = useCanvas.width;
  const imgH = useCanvas.height;
  const imgRatio = imgW / imgH;

  let drawW = maxW;
  let drawH = drawW / imgRatio;

  if (drawH > maxH) {
    drawH = maxH;
    drawW = drawH * imgRatio;
  }

  const x = (pageW - drawW) / 2;
  const y = (pageH - drawH) / 2;

  pdf.addImage(imgData, "PNG", x, y, drawW, drawH);
}

export async function canvasesToSinglePdf(items, filename = "PetDoc_ID.pdf", opts = {}) {
  const registro = (opts.registro || "").toString().trim().toUpperCase();

  const qrUrl =
    (opts.qrUrl || "").toString().trim() ||
    `https://petdocid.onrender.com/${encodeURIComponent(registro)}`;

  if (!Array.isArray(items) || !items.length) throw new Error("Sem páginas para gerar PDF");
  if (!registro) throw new Error("Registro do pet não informado para gerar o QR Code");

  const jsPDF = getJsPDF();
  const pdf = new jsPDF({ unit: "mm", format: "a4" });

  // ✅ AGORA SIM: espera desenhar QR + logo + texto
  await addIntroPageWithQR(pdf, { registro, qrUrl });

  for (const it of items) {
    if (!it?.canvas) continue;
    addCanvasAsPage(pdf, it.canvas, it.preset);
  }


  pdf.save(filename);
}
