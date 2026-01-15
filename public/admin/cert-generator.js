export async function generateCertNascimento(pet, templateUrl = "./img/certNasc.png") {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const template = await loadImage(templateUrl);
    canvas.width = template.width;
    canvas.height = template.height;

    // Fundo
    ctx.drawImage(template, 0, 0);

    // Fonte padrão da certidão
    ctx.fillStyle = "#000";
    ctx.font = "bold 17px Verdana";
    ctx.textBaseline = "alphabetic";

    // =====================
    // FOTO DO PET
    // =====================
    await drawPetPhoto(ctx, pet);

    // =====================
    // DADOS
    // =====================
    drawText(ctx, pet.registro, 305, 505);
    drawText(ctx, pet.dataNascimento, 530, 505);
    drawText(ctx, pet.especie, 757, 505);

    drawText(ctx, pet.raca, 305, 573);
    drawText(ctx, pet.pelagemCor, 645, 573);

    drawText(ctx, pet.sexo, 305, 642);
    drawText(ctx, pet.porte, 645, 642);

    drawText(ctx, pet.estado, 305, 712);
    drawText(ctx, pet.cidade, 645, 712);

    drawText(ctx, pet.nomePet, 80, 785);

    drawText(ctx, pet.tutor1, 80, 865);
    drawText(ctx, pet.tutor2 || "", 530, 865);

    drawText(ctx, pet.observacoes || "", 80, 950, 900);

    return canvas;
}

/* =====================
   Helpers
   const x = 74;
  const y = 467;
  const w = 208;
  const h = 267;
===================== */

async function drawPetPhoto(ctx, pet) {
    const fotoUrl = pet.photoUrl;
    if (!fotoUrl) return;

    const foto = await loadImage(fotoUrl);

    // Posição da foto na certidão
    const x = 74;
    const y = 467;
    const w = 208;
    const h = 268;
    const radius = 28; // 👈 controla o arredondamento

    ctx.save();

    // cria o retângulo arredondado
    roundedRect(ctx, x, y, w, h, radius);

    // aplica o recorte
    ctx.clip();

    // desenha a foto dentro do recorte
    ctx.drawImage(foto, x, y, w, h);

    ctx.restore();
}

function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}



function drawText(ctx, value, x, y, maxWidth) {
    if (!value) return;
    ctx.fillText(String(value).toUpperCase(), x, y, maxWidth);
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

