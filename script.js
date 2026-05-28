// ============================================================
// THE E-MILLENIAL STORE — main script
// ============================================================
// Cart shape: { [productId]: { id, name, price, image, qty } }

// Paste your Paystack TEST public key here (from dashboard.paystack.com → Settings → API Keys).
// Until a real pk_test_ key is set, checkout falls back to a simulated success so the
// rest of the flow (summary modal, cart reset) can still be demonstrated.
const PAYSTACK_PUBLIC_KEY = "pk_test_cbdae07ddac2e2a565ffa95e1260a91cbea8fc00";
const PAYSTACK_CURRENCY = "GHS";

const cart = {};

// ---------- DOM refs ----------
const productGrid = document.getElementById("productGrid");
const cartBtn = document.getElementById("cartBtn");
const cartCount = document.getElementById("cartCount");
const cartModal = document.getElementById("cartModal");
const cartItemsBody = document.getElementById("cartItemsBody");
const cartEmptyMsg = document.getElementById("cartEmptyMsg");
const cartTotalEl = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");
const userForm = document.getElementById("userForm");

const summaryModal = document.getElementById("summaryModal");
const summaryName = document.getElementById("summaryName");
const summaryBody = document.getElementById("summaryBody");
const summaryOkBtn = document.getElementById("summaryOkBtn");

// ============================================================
// Helpers
// ============================================================
function formatCedis(amount) {
  return amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function openModal(modal) {
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal(modal) {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// ============================================================
// Product grid render
// ============================================================
function renderProducts() {
  productGrid.innerHTML = PRODUCTS.map(p => `
    <div class="product-card" data-product-id="${p.id}">
      <img class="product-thumb" src="${p.image}" alt="${p.name}"
           onerror="this.style.background='#eee';this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22></svg>'" />
      <h3>${p.name}</h3>
      <p class="price">&#8373;${formatCedis(p.price)}</p>
      <button type="button" class="btn btn-primary cart-toggle" data-product-id="${p.id}">
        ADD TO CART
      </button>
    </div>
  `).join("");

  productGrid.querySelectorAll(".cart-toggle").forEach(btn => {
    btn.addEventListener("click", () => toggleProductInCart(btn.dataset.productId));
  });
}

function toggleProductInCart(productId) {
  if (cart[productId]) {
    delete cart[productId];
  } else {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    cart[productId] = { ...product, qty: 1 };
  }
  syncProductButtons();
  updateCartBadge();
  renderCart();
}

function syncProductButtons() {
  productGrid.querySelectorAll(".cart-toggle").forEach(btn => {
    const id = btn.dataset.productId;
    if (cart[id]) {
      btn.textContent = "REMOVE FROM CART";
      btn.classList.remove("btn-primary");
      btn.classList.add("btn-soft");
    } else {
      btn.textContent = "ADD TO CART";
      btn.classList.add("btn-primary");
      btn.classList.remove("btn-soft");
    }
  });
}

// ============================================================
// Cart badge + totals
// ============================================================
function updateCartBadge() {
  cartCount.textContent = Object.keys(cart).length;
}

function getCartTotal() {
  return Object.values(cart).reduce((sum, item) => sum + item.price * item.qty, 0);
}

// ============================================================
// Cart modal render
// ============================================================
function renderCart() {
  const items = Object.values(cart);

  if (items.length === 0) {
    cartItemsBody.innerHTML = "";
    cartEmptyMsg.style.display = "block";
  } else {
    cartEmptyMsg.style.display = "none";
    cartItemsBody.innerHTML = items.map((item, i) => `
      <tr data-row-id="${item.id}">
        <td>${i + 1}</td>
        <td>${item.name}</td>
        <td>&#8373;${formatCedis(item.price)}</td>
        <td>
          <span class="qty-cell">
            <button type="button" class="qty-btn" data-action="dec" data-id="${item.id}" aria-label="Decrease">-</button>
            <span class="qty-val">${item.qty}</span>
            <button type="button" class="qty-btn" data-action="inc" data-id="${item.id}" aria-label="Increase">+</button>
          </span>
        </td>
        <td>
          <button type="button" class="remove-btn" data-action="rm" data-id="${item.id}">Remove</button>
        </td>
      </tr>
    `).join("");

    cartItemsBody.querySelectorAll("button[data-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const { action, id } = btn.dataset;
        if (action === "inc") cart[id].qty++;
        else if (action === "dec") {
          cart[id].qty = Math.max(1, cart[id].qty - 1);
        } else if (action === "rm") {
          delete cart[id];
        }
        updateCartBadge();
        syncProductButtons();
        renderCart();
      });
    });
  }

  cartTotalEl.textContent = formatCedis(getCartTotal());
}

// ============================================================
// Cart open / close
// ============================================================
cartBtn.addEventListener("click", () => {
  renderCart();
  openModal(cartModal);
});

document.querySelectorAll("[data-close-cart]").forEach(el => {
  el.addEventListener("click", () => closeModal(cartModal));
});

// Esc closes either open modal
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (cartModal.classList.contains("open")) closeModal(cartModal);
  if (summaryModal.classList.contains("open")) handleSummaryDismiss();
});

// ============================================================
// Form validation
// ============================================================
const validators = {
  fullName: v => v.trim().length >= 2 || "Please enter your name.",
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Please enter a valid email.",
  phone: v => /^[0-9+\-\s()]{7,15}$/.test(v.trim()) || "Please enter a valid phone number."
};

function validateField(name) {
  const input = userForm.elements[name];
  const errEl = userForm.querySelector(`[data-error-for="${name}"]`);
  const result = validators[name](input.value);
  if (result === true) {
    input.classList.remove("invalid");
    errEl.textContent = "";
    return true;
  }
  input.classList.add("invalid");
  errEl.textContent = result;
  return false;
}

Object.keys(validators).forEach(name => {
  const input = userForm.elements[name];
  input.addEventListener("blur", () => validateField(name));
  input.addEventListener("input", () => {
    // clear error visual as soon as they fix it
    if (input.classList.contains("invalid")) validateField(name);
  });
});

function validateForm() {
  return Object.keys(validators)
    .map(name => validateField(name))
    .every(Boolean);
}

// ============================================================
// Checkout
// ============================================================
checkoutBtn.addEventListener("click", () => {
  if (Object.keys(cart).length === 0) {
    alert("Your cart is empty.");
    return;
  }
  if (!validateForm()) return;

  closeModal(cartModal);
  startPaystack();
});

function startPaystack() {
  const customer = {
    fullName: userForm.elements.fullName.value.trim(),
    email: userForm.elements.email.value.trim(),
    phone: userForm.elements.phone.value.trim()
  };
  const amountPesewas = Math.round(getCartTotal() * 100); // Paystack expects sub-unit (pesewas for GHS)
  const purchasedItems = Object.values(cart).map(i => ({
    id: i.id, name: i.name, qty: i.qty
  }));

  const keyIsPlaceholder = !PAYSTACK_PUBLIC_KEY.startsWith("pk_test_") || PAYSTACK_PUBLIC_KEY.includes("REPLACE");
  if (typeof PaystackPop === "undefined" || keyIsPlaceholder) {
    // Paystack unavailable or test key not yet set — simulate success so the
    // checkout → summary flow can be demonstrated end-to-end.
    console.warn("Paystack not configured; simulating successful payment.");
    showSummary(customer, purchasedItems, `SIMULATED-${Date.now()}`);
    return;
  }

  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: customer.email,
    amount: amountPesewas,
    currency: PAYSTACK_CURRENCY,
    ref: `ems-${Date.now()}`,
    metadata: {
      custom_fields: [
        { display_name: "Full Name", variable_name: "full_name", value: customer.fullName },
        { display_name: "Phone Number", variable_name: "phone", value: customer.phone }
      ]
    },
    callback: function(response) {
      // Paystack invokes outside React/etc — wrap to be safe
      setTimeout(() => showSummary(customer, purchasedItems, response.reference), 0);
    },
    onClose: function() {
      // user dismissed Paystack — re-open cart so they can try again
      openModal(cartModal);
    }
  });
  handler.openIframe();
}

// ============================================================
// Summary modal
// ============================================================
function showSummary(customer, items, reference) {
  summaryName.textContent = customer.fullName;
  summaryBody.innerHTML = items.map((it, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${it.name}</td>
      <td>${it.qty}</td>
    </tr>
  `).join("");
  console.log("Paystack reference:", reference);
  openModal(summaryModal);
}

function handleSummaryDismiss() {
  // Reset cart state and reload to a clean state
  Object.keys(cart).forEach(k => delete cart[k]);
  userForm.reset();
  closeModal(summaryModal);
  location.reload();
}

summaryOkBtn.addEventListener("click", handleSummaryDismiss);

// ============================================================
// Init
// ============================================================
renderProducts();
updateCartBadge();
