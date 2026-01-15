// public/insta-generator.js

function degToRad(deg) {
    return (deg * Math.PI) / 180;
}

function drawImageRotated(ctx, img, cx, cy, w, h, deg) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(degToRad(deg));
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
}

function drawTextRotatedWithStroke(ctx, text, x, y, deg, strokeWidth = 16) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(degToRad(deg));

    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = strokeWidth;
    ctx.strokeText(text, 0, 0);

    ctx.fillStyle = "#111";
    ctx.fillText(text, 0, 0);

    ctx.restore();
}

export async function generateInstaPost({ pet, rgPng, certPng, vacinaResult, bgTemplate }) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = 1536;
    canvas.height = 1536;

    // 1) Fundo (se não vier, decide pela cor do documento)
    const color = pet?.corDocumento || "Azul";
    const bgSrc =
        bgTemplate ||
        (color === "Rosa" ? "./img/artInstaRosa.png" : "./img/artInsta.png");

    const bg = await loadImage(bgSrc);
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    // ... resto do código igual



    // 2) Foto do pet (inclinação leve)
    if (pet?.photoUrl) {
        const foto = await loadImage(pet.photoUrl);

        ctx.save();
        ctx.translate(1107, 620);              // ajuste fino se precisar
        ctx.rotate(degToRad(-9));
        ctx.drawImage(foto, -350, -388, 600, 700);
        ctx.restore();
    }

    // 3) Logo por cima
    const logo = await loadImage("./img/artInstaLogo.png");
    ctx.drawImage(logo, 20, 150, 800, 700);

    // 4) Miniaturas (carregar imagens primeiro)
    const rgImg = rgPng ? await loadImage(rgPng) : null;
    const certImg = certPng ? await loadImage(certPng) : null;

    // vacina pode ser objeto {frente, verso} ou string
    const vacinaFrente = (typeof vacinaResult === "object" && vacinaResult)
        ? (vacinaResult.frente || vacinaResult.verso || null)
        : vacinaResult;

    const vacinaImg = vacinaFrente ? await loadImage(vacinaFrente) : null;

    // Posições (centro) + tamanhos
    // Ajuste estes números conforme encaixe no seu template
    const thumbW = 360;
    const thumbH = 500;
    const baseY = 1220;

    if (vacinaImg) drawImageRotated(ctx, vacinaImg, 475, baseY, 580, 430, 10);
    if (rgImg) drawImageRotated(ctx, rgImg, 200, baseY + 20, 450, 330, 60);
    if (certImg) drawImageRotated(ctx, certImg, 400, baseY, thumbW, thumbH, 0);


    // 5) Nome do pet com contorno + rotação
    const nomeCompleto = (pet?.nomePet || pet?.petNome || "").trim();
    const nome = nomeCompleto.split(/\s+/)[0] || "";
    if (nome) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "130px 'Weather Sunday - Personal Use', cursive";

        drawTextRotatedWithStroke(ctx, nome, 1100, 1050, -9, 18);
    }

    return canvas.toDataURL("image/png");
}

/* =========================
   Utils
========================= */
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Falha ao carregar imagem: " + src));
        img.src = src;
    });
}
