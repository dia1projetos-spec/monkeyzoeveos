const App = (() => {
  const money = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: window.ZOE_CONFIG.currency || "ARS",
    maximumFractionDigits: 0
  });

  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function waLink(text) {
    const phone = window.ZOE_CONFIG.whatsapp;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  function settings() {
    return Store.load().settings || {};
  }

  function logoUrl() {
    return settings().logo || "assets/logo.svg";
  }

  function productUrl(p) {
    return `producto.html?slug=${encodeURIComponent(Store.productSlug(p))}`;
  }

  function updateCartBadge() {
    const count = Store.getCart().reduce((n, i) => n + i.qty, 0);
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      el.textContent = count;
    });
  }

  function toast(msg) {
    let el = document.querySelector("[data-toast]");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("data-toast", "");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function addProductToCart(productId, qty = 1) {
    Store.addToCart(productId, qty);
    updateCartBadge();
    toast("Agregado al carrito");
  }

  function applyBrand() {
    const s = settings();
    const logo = logoUrl();
    document.querySelectorAll("[data-brand-name]").forEach((el) => {
      el.textContent = s.brand || window.ZOE_CONFIG.brand;
    });
    document.querySelectorAll("[data-brand-tagline]").forEach((el) => {
      el.textContent = s.tagline || window.ZOE_CONFIG.tagline;
    });
    document.querySelectorAll("[data-brand-logo]").forEach((el) => {
      el.style.backgroundImage = `radial-gradient(circle at 50% 50%, #fff 0 54%, transparent 55%), url("${logo}")`;
      el.classList.toggle("has-custom-logo", Boolean(logo && logo !== "assets/logo.svg"));
    });
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) favicon.setAttribute("href", logo);
  }

  function applySeo(payload) {
    if (window.SEO) SEO.apply(payload);
  }

  function bindChrome() {
    const drawer = document.querySelector("[data-drawer]");
    document.querySelectorAll("[data-open-menu]").forEach((btn) => {
      btn.addEventListener("click", () => drawer?.classList.add("open"));
    });
    drawer?.addEventListener("click", (e) => {
      if (e.target === drawer) drawer.classList.remove("open");
    });
    document.querySelectorAll("[data-close-menu]").forEach((btn) => {
      btn.addEventListener("click", () => drawer?.classList.remove("open"));
    });
    document.body.addEventListener("click", (e) => {
      const addId = e.target.closest("[data-add-cart]")?.dataset.addCart;
      if (addId) {
        e.preventDefault();
        addProductToCart(addId, 1);
      }
    });
    applyBrand();
    updateCartBadge();
    renderMenu();
  }

  function renderMenu() {
    const data = Store.load();
    const box = document.querySelector("[data-menu-cats]");
    if (!box) return;
    const cats = data.categories
      .sort((a, b) => a.order - b.order)
      .map((c) => `<a href="categoria.html?slug=${encodeURIComponent(c.slug)}">${c.name}</a>`)
      .join("");
    const pages = (data.pages || [])
      .filter((p) => p.published !== false && p.showInMenu)
      .map((p) => `<a href="pagina.html?slug=${encodeURIComponent(p.slug)}">${p.title}</a>`)
      .join("");
    box.innerHTML = cats + pages;
  }

  function productCard(p) {
    return `
      <article class="product-card">
        <a href="${productUrl(p)}"><img src="${p.image}" alt="${p.name}" width="600" height="240" loading="lazy"></a>
        <div class="info">
          <h3><a href="${productUrl(p)}">${p.name}</a></h3>
          <div class="price">${money.format(p.price)}</div>
          <div class="card-actions">
            <a class="btn btn-ghost" href="${productUrl(p)}">Ver más</a>
            <button class="btn btn-rose" type="button" data-add-cart="${p.id}">Agregar</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderHome() {
    const data = Store.load();
    const s = data.settings;
    const stack = document.querySelector("[data-home-banners]");
    if (!stack) return;
    stack.innerHTML = data.categories
      .sort((a, b) => a.order - b.order)
      .map((c) => `
        <article class="category-banner">
          ${Media.bannerMarkup(c)}
          <div class="banner-copy">
            <h2>${c.name}</h2>
            <div class="heart-line"><span></span>♥</div>
            <p>${c.description}</p>
            <a class="btn btn-rose" href="categoria.html?slug=${encodeURIComponent(c.slug)}">Ver más →</a>
          </div>
        </article>
      `).join("");

    const wa = document.querySelector("[data-wa-home]");
    if (wa) wa.href = waLink("Hola, quiero asesoramiento de Zoë véos.");

    applySeo({
      title: s.seoTitle || `${s.brand} · ${s.tagline}`,
      description: s.seoDescription || window.ZOE_CONFIG.description,
      keywords: s.seoKeywords,
      image: SEO.abs(s.seoImage || s.logo || data.categories[0]?.image || "assets/logo.svg"),
      url: `${SEO.siteUrl()}/`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: s.brand,
        url: SEO.siteUrl(),
        inLanguage: "es-AR",
        description: s.seoDescription,
        publisher: SEO.organization()
      }
    });
  }

  function renderCategory() {
    const data = Store.load();
    const slug = qs("slug");
    const cat = data.categories.find((c) => c.slug === slug);
    const root = document.querySelector("[data-category-page]");
    if (!root) return;
    if (!cat) {
      root.innerHTML = `<div class="empty"><h2>No encontramos esta categoría</h2><p class="muted">Volvé al inicio y elegí otra.</p></div>`;
      applySeo({
        title: "Categoría no encontrada",
        description: "La categoría que buscás no está disponible.",
        image: SEO.abs(logoUrl()),
        url: location.href
      });
      return;
    }
    const subs = data.subcategories.filter((s) => s.categoryId === cat.id);
    const subSlug = qs("sub");
    const products = data.products.filter((p) => {
      if (p.categoryId !== cat.id) return false;
      if (!subSlug) return true;
      const sub = subs.find((s) => s.slug === subSlug);
      return sub ? p.subcategoryId === sub.id : true;
    });

    root.innerHTML = `
      <p class="crumbs"><a href="index.html">Inicio</a> / ${cat.name}</p>
      <h1 class="section-title">${cat.name}</h1>
      <p class="muted">${cat.description}</p>
      <div class="chips">
        <a class="chip ${!subSlug ? "active" : ""}" href="categoria.html?slug=${cat.slug}">Todas</a>
        ${subs.map((s) => `<a class="chip ${subSlug === s.slug ? "active" : ""}" href="categoria.html?slug=${cat.slug}&sub=${s.slug}">${s.name}</a>`).join("")}
      </div>
      <div class="grid-products">
        ${products.map(productCard).join("") || `<div class="empty">Todavía no hay productos en esta categoría.</div>`}
      </div>
    `;
    applySeo({
      title: cat.seoTitle || cat.name,
      description: cat.seoDescription || cat.description || `Productos de ${cat.name} en ${settings().brand}.`,
      keywords: cat.seoKeywords || "",
      image: SEO.abs(cat.image || logoUrl()),
      url: `${SEO.siteUrl()}/categoria.html?slug=${encodeURIComponent(cat.slug)}`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: cat.name,
        description: cat.description,
        url: `${SEO.siteUrl()}/categoria.html?slug=${encodeURIComponent(cat.slug)}`
      }
    });
  }

  function findProduct(data) {
    const slug = qs("slug");
    const id = qs("id");
    return data.products.find((p) => p.slug === slug || p.id === slug || p.id === id);
  }

  function renderProduct() {
    const data = Store.load();
    const product = findProduct(data);
    const root = document.querySelector("[data-product-page]");
    if (!root) return;
    if (!product) {
      root.innerHTML = `<div class="empty">Producto no encontrado.</div>`;
      applySeo({
        title: "Producto no encontrado",
        description: "El producto que buscás no está disponible.",
        image: SEO.abs(logoUrl()),
        url: location.href
      });
      return;
    }
    const cat = data.categories.find((c) => c.id === product.categoryId);
    const sub = data.subcategories.find((s) => s.id === product.subcategoryId);
    const shareUrl = `${SEO.siteUrl()}/${productUrl(product)}`;
    root.innerHTML = `
      <p class="crumbs"><a href="index.html">Inicio</a> / <a href="categoria.html?slug=${cat?.slug || ""}">${cat?.name || ""}</a> / ${product.name}</p>
      <div class="product-hero">
        <img src="${product.image}" alt="${product.name}" width="800" height="520">
        <div class="info">
          <h1 class="section-title">${product.name}</h1>
          <p class="muted">${sub ? sub.name : ""} · ${cat ? cat.name : ""}</p>
          <div class="price">${money.format(product.price)}</div>
          <p>${product.description || ""}</p>
          <div class="qty">
            <button type="button" data-minus>-</button>
            <strong data-qty>1</strong>
            <button type="button" data-plus>+</button>
          </div>
          <div class="card-actions">
            <button class="btn btn-rose" data-add type="button">Agregar al carrito</button>
            <a class="btn btn-ghost" href="carrito.html">Ver carrito</a>
          </div>
          <p class="muted" style="margin-top:16px">Compartí este producto: <a href="${productUrl(product)}">${shareUrl}</a></p>
        </div>
      </div>
    `;
    applySeo({
      title: product.seoTitle || product.name,
      description: product.seoDescription || product.description || `${product.name} en ${settings().brand}.`,
      keywords: product.seoKeywords || "",
      image: SEO.abs(product.seoImage || product.image || logoUrl()),
      url: shareUrl,
      type: "product",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.seoDescription || product.description,
        image: SEO.abs(product.image),
        sku: product.id,
        url: shareUrl,
        brand: { "@type": "Brand", name: settings().brand },
        offers: {
          "@type": "Offer",
          priceCurrency: window.ZOE_CONFIG.currency || "ARS",
          price: product.price,
          availability: "https://schema.org/InStock",
          url: shareUrl
        }
      }
    });
    let qty = 1;
    root.querySelector("[data-minus]").onclick = () => {
      qty = Math.max(1, qty - 1);
      root.querySelector("[data-qty]").textContent = qty;
    };
    root.querySelector("[data-plus]").onclick = () => {
      qty += 1;
      root.querySelector("[data-qty]").textContent = qty;
    };
    root.querySelector("[data-add]").onclick = () => addProductToCart(product.id, qty);
  }

  function renderPage() {
    const data = Store.load();
    const slug = qs("slug");
    const page = (data.pages || []).find((p) => p.slug === slug);
    const root = document.querySelector("[data-landing-page]");
    if (!root) return;
    if (!page || page.published === false) {
      root.innerHTML = `<div class="empty"><h2>Página no encontrada</h2><p class="muted">Esta landing no está disponible.</p></div>`;
      applySeo({
        title: "Página no encontrada",
        description: "La página que buscás no está disponible.",
        image: SEO.abs(logoUrl()),
        url: location.href
      });
      return;
    }
    root.innerHTML = `
      <article class="landing">
        ${page.image ? `<div class="category-banner landing-hero">${Media.bannerMarkup({ image: page.image, mediaType: page.mediaType, name: page.title })}<div class="banner-copy"><h1>${page.title}</h1><div class="heart-line"><span></span>♥</div><p>${page.excerpt || ""}</p></div></div>` : `<h1 class="section-title">${page.title}</h1>`}
        <div class="landing-body">${page.content || ""}</div>
      </article>
    `;
    applySeo({
      title: page.seoTitle || page.title,
      description: page.seoDescription || page.excerpt || page.title,
      keywords: page.seoKeywords || "",
      image: SEO.abs(page.seoImage || page.image || logoUrl()),
      url: `${SEO.siteUrl()}/pagina.html?slug=${encodeURIComponent(page.slug)}`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: page.seoTitle || page.title,
        description: page.seoDescription || page.excerpt,
        url: `${SEO.siteUrl()}/pagina.html?slug=${encodeURIComponent(page.slug)}`
      }
    });
  }

  function renderCart() {
    const data = Store.load();
    const root = document.querySelector("[data-cart-page]");
    if (!root) return;
    const cart = Store.getCart();
    if (!cart.length) {
      root.innerHTML = `<div class="empty"><h2>Tu carrito está vacío</h2><p class="muted">Explorá las categorías o las fichas de producto para agregar algo especial.</p><p style="margin-top:16px"><a class="btn btn-rose" href="index.html">Volver al inicio</a></p></div>`;
      return;
    }
    const rows = cart.map((item) => {
      const p = data.products.find((x) => x.id === item.id);
      if (!p) return "";
      return `
        <article class="cart-item">
          <a href="${productUrl(p)}"><img src="${p.image}" alt="${p.name}" width="92" height="92"></a>
          <div>
            <h3><a href="${productUrl(p)}">${p.name}</a></h3>
            <p class="muted">${money.format(p.price)} · ${item.qty} u.</p>
            <button class="btn btn-ghost" data-remove="${p.id}">Quitar</button>
          </div>
          <strong>${money.format(p.price * item.qty)}</strong>
        </article>
      `;
    }).join("");
    const total = cart.reduce((n, item) => {
      const p = data.products.find((x) => x.id === item.id);
      return n + (p ? p.price * item.qty : 0);
    }, 0);
    const message = cart.map((item) => {
      const p = data.products.find((x) => x.id === item.id);
      return p ? `- ${p.name} x${item.qty}` : "";
    }).filter(Boolean).join("\n");
    root.innerHTML = `
      <h1 class="section-title">Carrito</h1>
      <div class="cart-list">${rows}</div>
      <p style="margin:18px 0;font-size:22px">Total: <strong>${money.format(total)}</strong></p>
      <a class="btn btn-whatsapp" href="${waLink("Hola, quiero comprar:\n" + message + "\nTotal: " + money.format(total))}">Finalizar por WhatsApp</a>
    `;
    root.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.onclick = () => {
        Store.saveCart(cart.filter((i) => i.id !== btn.dataset.remove));
        renderCart();
        updateCartBadge();
      };
    });
  }

  async function init() {
    if (window.FirebaseReady) {
      FirebaseReady.init();
      await Store.hydrate();
    }
    bindChrome();
    if (document.body.dataset.page === "home") renderHome();
    if (document.body.dataset.page === "category") renderCategory();
    if (document.body.dataset.page === "product") renderProduct();
    if (document.body.dataset.page === "landing") renderPage();
    if (document.body.dataset.page === "cart") {
      renderCart();
      applySeo({
        title: "Carrito",
        description: "Revisá tu selección y finalizá la compra por WhatsApp.",
        image: SEO.abs(logoUrl()),
        url: `${SEO.siteUrl()}/carrito.html`,
        robots: "noindex,follow"
      });
    }
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", App.init);
