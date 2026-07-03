/* ======================================================================
   APP.JS — Lógica do site (não é necessário editar este arquivo)
   Os dados vêm de produtos.js e pagamento.js
   ====================================================================== */

const TAXA_ENTREGA = 6.00;

/* ============ STATE ============ */
let cart = [];
let currentProduct = null;
let currentQty = 1;
let activeCat = "Todos";
let search = "";

/* ============ HELPERS ============ */
const brl = v => "R$ " + v.toFixed(2).replace(".", ",");

/* ============ RENDER: CATEGORIES ============ */
function renderCategories() {
  const el = document.getElementById("categories");
  const abas = ["Todos", ...CATEGORIAS];
  el.innerHTML = abas.map(c =>
    `<button class="cat ${c === activeCat ? "active" : ""}" onclick="setCat('${c.replace(/'/g, "\\'")}')">${c}</button>`
  ).join("");
}
function setCat(c) { activeCat = c; renderCategories(); renderMenu(); }

/* ============ RENDER: MENU ============ */
function renderMenu() {
  const el = document.getElementById("menuSections");
  const cats = activeCat === "Todos" ? CATEGORIAS : [activeCat];
  const termo = search.trim().toLowerCase();

  const html = cats.map(cat => {
    const items = PRODUTOS.filter(p =>
      p.categoria === cat && p.nome.toLowerCase().includes(termo)
    );
    if (!items.length) return "";
    return `
      <h2 class="section-title">${cat}</h2>
      <div class="grid">
        ${items.map(p => `
          <article class="card" onclick="openProduct(${p.id})">
            <div class="card-img">
              <img src="${p.imagem}" alt="${p.nome}" loading="lazy">
              ${p.destaque ? `<span class="badge">Mais pedido</span>` : ""}
            </div>
            <div class="card-body">
              <h3>${p.nome}</h3>
              <p class="desc">${p.desc}</p>
              <div class="card-bottom">
                <span class="price">${brl(p.preco)}</span>
                <button class="add" onclick="event.stopPropagation();openProduct(${p.id})" aria-label="Adicionar ${p.nome}">+</button>
              </div>
            </div>
          </article>`).join("")}
      </div>`;
  }).join("");

  el.innerHTML = html || `<div class="empty-state">Nenhum produto encontrado para "${search}".</div>`;
}

document.getElementById("searchInput").addEventListener("input", e => {
  search = e.target.value;
  renderMenu();
});

/* ============ PRODUCT MODAL ============ */
function openProduct(id) {
  currentProduct = PRODUTOS.find(p => p.id === id);
  currentQty = 1;

  document.getElementById("mImg").src = currentProduct.imagem;
  document.getElementById("mName").textContent = currentProduct.nome;
  document.getElementById("mDesc").textContent = currentProduct.desc;
  document.getElementById("mIng").textContent = currentProduct.ingredientes;
  document.getElementById("mQty").textContent = 1;

  const addWrap = document.getElementById("mAddWrap");
  if (currentProduct.adicionais) {
    addWrap.style.display = "";
    document.getElementById("mAdd").innerHTML = ADICIONAIS.map((a, i) => `
      <label>
        <span><input type="checkbox" data-add="${i}" onchange="updateModalTotal()">${a.nome}</span>
        <span class="a-price">+ ${brl(a.preco)}</span>
      </label>`).join("");
  } else {
    addWrap.style.display = "none";
  }

  const obsWrap = document.getElementById("mObsWrap");
  if (currentProduct.observacoes) {
    obsWrap.style.display = "";
    document.getElementById("mObs").value = "";
  } else {
    obsWrap.style.display = "none";
  }

  updateModalTotal();
  document.getElementById("productOverlay").classList.add("open");
}

function changeQty(d) {
  currentQty = Math.max(1, currentQty + d);
  document.getElementById("mQty").textContent = currentQty;
  updateModalTotal();
}

function getModalAdicionais() {
  if (!currentProduct.adicionais) return [];
  return [...document.querySelectorAll("#mAdd input:checked")].map(i => ADICIONAIS[+i.dataset.add]);
}

function updateModalTotal() {
  const adds = getModalAdicionais().reduce((s, a) => s + a.preco, 0);
  const total = (currentProduct.preco + adds) * currentQty;
  document.getElementById("mTotal").textContent = brl(total);
}

function addToCart() {
  const adds = getModalAdicionais();
  const addTotal = adds.reduce((s, a) => s + a.preco, 0);
  cart.push({
    ...currentProduct,
    qty: currentQty,
    adicionaisEscolhidos: adds,
    obs: currentProduct.observacoes ? document.getElementById("mObs").value.trim() : "",
    unit: currentProduct.preco + addTotal,
    key: Date.now() + Math.random(),
  });
  closeModal("productOverlay");
  renderCart();
  showToast("Adicionado ao carrinho!");
  toggleCart(true);
}

/* ============ CART ============ */
function toggleCart(open) { document.getElementById("cart").classList.toggle("open", open); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

function renderCart() {
  const el = document.getElementById("cartItems");
  document.getElementById("cartCount").textContent = cart.reduce((s, i) => s + i.qty, 0);

  if (!cart.length) {
    el.innerHTML = `<div class="cart-empty">🛒<br><br>Seu carrinho está vazio</div>`;
    document.getElementById("subtotal").textContent = brl(0);
    document.getElementById("total").textContent = brl(0);
    document.getElementById("checkoutBtn").disabled = true;
    return;
  }

  el.innerHTML = cart.map(i => `
    <div class="cart-item">
      <img src="${i.imagem}" alt="">
      <div class="info">
        <b>${i.qty}x ${i.nome}</b>
        ${i.adicionaisEscolhidos.length ? `<div class="sub">+ ${i.adicionaisEscolhidos.map(a => a.nome).join(", ")}</div>` : ""}
        ${i.obs ? `<div class="sub">Obs: ${i.obs}</div>` : ""}
        <div class="p">${brl(i.unit * i.qty)}</div>
        <button class="rm" onclick="removeFromCart(${i.key})">Remover</button>
      </div>
    </div>`).join("");

  const sub = cart.reduce((s, i) => s + i.unit * i.qty, 0);
  document.getElementById("subtotal").textContent = brl(sub);
  document.getElementById("total").textContent = brl(sub + TAXA_ENTREGA);
  document.getElementById("checkoutBtn").disabled = false;
}
function removeFromCart(key) { cart = cart.filter(i => i.key !== key); renderCart(); }

/* ============ CHECKOUT ============ */
function openCheckout() {
  toggleCart(false);
  document.getElementById("checkoutOverlay").classList.add("open");
}

function goToPayment() {
  const nome = document.getElementById("fNome").value.trim();
  const tel = document.getElementById("fTel").value.trim();
  const end = document.getElementById("fEnd").value.trim();
  if (!nome || !tel || !end) { showToast("Preencha nome, telefone e endereço"); return; }

  closeModal("checkoutOverlay");

  const total = cart.reduce((s, i) => s + i.unit * i.qty, 0) + TAXA_ENTREGA;
  document.getElementById("payValor").textContent = brl(total);

  const txid = "PED" + Date.now().toString().slice(-8);
  const codigo = obterCodigoPix(total, txid);
  document.getElementById("pixCode").textContent = codigo;

  const qrWrap = document.getElementById("qrWrap");
  if (PAGAMENTO_CONFIG.gerarQrCode) {
    qrWrap.style.display = "";
    document.getElementById("qrImg").src =
      `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(codigo)}`;
  } else {
    qrWrap.style.display = "none";
  }

  const avisoManual = document.getElementById("avisoValorManual");
  avisoManual.style.display = PAGAMENTO_CONFIG.modo === "chave_fixa" ? "" : "none";

  const lista = document.getElementById("payInstrucoes");
  lista.innerHTML = PAGAMENTO_CONFIG.instrucoes.map(i => `<li>${i}</li>`).join("");

  document.getElementById("paymentOverlay").classList.add("open");
}

function copyPix() {
  const code = document.getElementById("pixCode").textContent;
  navigator.clipboard.writeText(code).then(() => showToast("Código Pix copiado!"));
}

function finalizeOrder() {
  closeModal("paymentOverlay");
  cart = [];
  renderCart();
  document.getElementById("successOverlay").classList.add("open");
}

/* ============ TOAST ============ */
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ============ INIT ============ */
renderCategories();
renderMenu();
renderCart();

document.querySelectorAll(".overlay").forEach(o => {
  o.addEventListener("click", e => { if (e.target === o) o.classList.remove("open"); });
});
