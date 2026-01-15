//public/app.js
const $ = (id) => document.getElementById(id);

$("year").textContent = new Date().getFullYear();

const input = $("reg");
const btn = $("btnBuscar");
const statusEl = $("status");
const resultEl = $("result");

const btnLimpar = $("btnLimpar");
const btnWhats = $("btnWhats");

// ===== ADMIN (atalho secreto no campo de registro) =====
const ADMIN_TRIGGER = "Joaquim5891"; // <- troque aqui quando quiser

const adminModal = document.getElementById("adminModal");
const adminClose = document.getElementById("adminClose");
const adminCancelBtn = document.getElementById("adminCancelBtn");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminUser = document.getElementById("adminUser");
const adminPass = document.getElementById("adminPass");
const adminStatus = document.getElementById("adminStatus");

function openAdminModal() {
    adminModal.classList.remove("hidden");
    adminModal.setAttribute("aria-hidden", "false");
    adminStatus.textContent = "";
    adminUser.value = "";
    adminPass.value = "";
    setTimeout(() => adminUser.focus(), 0);
}

function closeAdminModal() {
    adminModal.classList.add("hidden");
    adminModal.setAttribute("aria-hidden", "true");
    adminStatus.textContent = "";
}

adminClose?.addEventListener("click", closeAdminModal);
adminCancelBtn?.addEventListener("click", closeAdminModal);

// fecha clicando fora do card
adminModal?.addEventListener("click", (e) => {
    if (e.target === adminModal) closeAdminModal();
});

// fecha com ESC
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !adminModal.classList.contains("hidden")) {
        closeAdminModal();
    }
});

function setAdminStatus(msg, type = "") {
    adminStatus.className = "status" + (type ? " " + type : "");
    adminStatus.textContent = msg || "";
}

// Login real 
function saveToken(token) {
    sessionStorage.setItem("admToken", token);
}
function getToken() {
    return sessionStorage.getItem("admToken") || "";
}

async function adminLogin(user, pass) {
    const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, pass }),
    });

    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(body?.error || "Falha no login");

    return body.token;
}

adminLoginBtn?.addEventListener("click", async () => {
    const u = (adminUser.value || "").trim();
    const p = (adminPass.value || "").trim();

    try {
        setAdminStatus("Validando acesso...", "");
        const token = await adminLogin(u, p);

        saveToken(token);
        setAdminStatus("Acesso liberado.", "ok");

        setTimeout(() => {
            window.location.href = "/admin/";
        }, 250);
    } catch (e) {
        setAdminStatus(e.message || "Login ou senha inválidos.", "error");
    }
});

// Enter no modal
[adminUser, adminPass].forEach((el) => {
    el?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") adminLoginBtn.click();
    });
});



function setStatus(msg, type = "") {
    statusEl.className = "status" + (type ? " " + type : "");
    statusEl.textContent = msg || "";
}

function hideResult() {
    resultEl.classList.add("hidden");
}

function showResult(data) {
    $("petFoto").src = data.photoUrl || "./img/kenai.jpeg";
    $("petRegistro").textContent = `Registro: ${data.registro || "—"}`;
    $("petNome").textContent = data.petNome || "—";
    $("tutorNome").textContent = data.tutorNome || "—";

    const tel = (data.tutorTelefone || "").toString().trim();
    const telLink = $("tutorTel");

    if (tel) {
        telLink.textContent = tel;

        const digits = tel.replace(/\D/g, "");
        const wa = digits ? `https://wa.me/55${digits}` : "#";

        telLink.href = wa;
        telLink.target = "_blank";

        if (btnWhats) {
            btnWhats.href = wa;
            btnWhats.target = "_blank";
        }
    } else {
        telLink.textContent = "—";
        telLink.href = "#";
        telLink.removeAttribute("target");

        if (btnWhats) {
            btnWhats.href = "#";
            btnWhats.removeAttribute("target");
        }
    }

    resultEl.classList.remove("hidden");
}

async function buscar(registro) {
    hideResult();
    setStatus("");


    const reg = (registro || "").trim();

    // atalho secreto para admin
    if (reg === ADMIN_TRIGGER) {
        input.value = "";
        setStatus("");     // limpa status da busca
        hideResult();      // esconde resultado
        openAdminModal();  // abre modal
        return;
    }

    if (!reg) {
        setStatus("Digite um número de registro para buscar.", "error");
        return;
    }

    btn.disabled = true;
    setStatus("Buscando...");

    try {
        const resp = await fetch(`/api/lookup?registro=${encodeURIComponent(reg)}`, {
            headers: { "Accept": "application/json" }
        });

        const body = await resp.json().catch(() => ({}));

        if (!resp.ok) {
            setStatus(body?.message || "Registro não encontrado.", "error");
            return;
        }

        showResult(body);
        setStatus("Registro encontrado.", "ok");
    } catch (e) {
        setStatus("Erro de conexão. Tente novamente.", "error");
    } finally {
        btn.disabled = false;
    }
}

btn.addEventListener("click", () => buscar(input.value));
input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") buscar(input.value);
});

if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
        input.value = "";
        hideResult();
        setStatus("");
        input.focus();
    });
}

// Suporte a QR Code: ?registro=PD-123
const params = new URLSearchParams(location.search);
const regParam = params.get("registro");
if (regParam) {
    input.value = regParam;
    buscar(regParam);
}

/* =========================================================
   Carrossel (Cloudinary) - leve e rápido
========================================================= */
(function initCarousel() {
    const img = document.getElementById("petdocCarousel");
    if (!img) return;

    const images = [
        "https://res.cloudinary.com/dqktq9mot/image/upload/f_auto,q_auto,w_1200,c_fill,g_auto/v1768355504/05_wfacul.png",
        "https://res.cloudinary.com/dqktq9mot/image/upload/f_auto,q_auto,w_1200,c_fill,g_auto/v1768355502/01_jloigq.png",
        "https://res.cloudinary.com/dqktq9mot/image/upload/f_auto,q_auto,w_1200,c_fill,g_auto/v1768355502/15_yxgs1o.png",
        "https://res.cloudinary.com/dqktq9mot/image/upload/f_auto,q_auto,w_1200,c_fill,g_auto/v1768355502/03_dbn27m.png",
        "https://res.cloudinary.com/dqktq9mot/image/upload/f_auto,q_auto,w_1200,c_fill,g_auto/v1768355503/07_ngro0o.png",
        "https://res.cloudinary.com/dqktq9mot/image/upload/f_auto,q_auto,w_1200,c_fill,g_auto/v1768355504/09_nv7e2a.png",
        "https://res.cloudinary.com/dqktq9mot/image/upload/f_auto,q_auto,w_1200,c_fill,g_auto/v1768355503/08_apcn5j.png",
        "https://res.cloudinary.com/dqktq9mot/image/upload/f_auto,q_auto,w_1200,c_fill,g_auto/v1768355502/02_nyvnbp.png",
        "https://res.cloudinary.com/dqktq9mot/image/upload/f_auto,q_auto,w_1200,c_fill,g_auto/v1768355503/06_v2l9bz.png",
    ];
    // Se ainda não tiver as imagens no Cloudinary, coloca pelo menos 1 ou usa kenai como fallback:
    img.src = images[0] || "./img/kenai.jpeg";

    let i = 0;

    function preload(url) {
        const im = new Image();
        im.src = url;
    }

    function setImage(url) {
        img.style.opacity = "0";
        setTimeout(() => {
            img.src = url;
        }, 180);
    }

    img.onload = () => {
        img.style.opacity = "1";
        // pré-carrega a próxima
        preload(images[(i + 1) % images.length]);
    };

    // suaviza a troca
    img.style.transition = "opacity .35s ease";
    img.style.opacity = "1";

    // pré-carrega a segunda
    if (images[1]) preload(images[1]);

    setInterval(() => {
        i = (i + 1) % images.length;
        setImage(images[i]);
    }, 4500);
})();

