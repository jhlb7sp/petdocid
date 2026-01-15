// pdf-export.js
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





export function canvasesToSinglePdf(items, filename = "PetDoc_ID.pdf") {
  if (!Array.isArray(items) || !items.length) {
    throw new Error("Sem páginas para gerar PDF");
  }

  const jsPDF = getJsPDF();
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.deletePage(1);

  for (const it of items) {
    if (!it?.canvas) continue;
    addCanvasAsPage(pdf, it.canvas, it.preset);
  }

  pdf.save(filename);
}
