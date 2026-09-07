const Store = (() => {
  const CART_KEY = "zoe-veos-cart-v1";

  const seed = {
    categories: [
      {
        id: "cat-home",
        name: "Home",
        slug: "home",
        description: "Todo para crear espacios cálidos y armoniosos.",
        image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=80",
        mediaType: "image",
        order: 1
      },
      {
        id: "cat-maternidad",
        name: "Maternidad",
        slug: "maternidad",
        description: "Acompañamos cada etapa de este momento único.",
        image: "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=1600&q=80",
        mediaType: "image",
        order: 2
      }
    ],
    subcategories: [
      { id: "sub-living", categoryId: "cat-home", name: "Living", slug: "living" },
      { id: "sub-deco", categoryId: "cat-home", name: "Decoración", slug: "decoracion" },
      { id: "sub-textil", categoryId: "cat-home", name: "Textiles", slug: "textiles" },
      { id: "sub-embarazo", categoryId: "cat-maternidad", name: "Embarazo", slug: "embarazo" },
      { id: "sub-bebe", categoryId: "cat-maternidad", name: "Bebé", slug: "bebe" },
      { id: "sub-regalos", categoryId: "cat-maternidad", name: "Regalos", slug: "regalos" }
    ],
    products: [
      {
        id: "p1",
        name: "Manta de lino natural",
        description: "Textura suave y caída elegante para un living cálido.",
        price: 48900,
        categoryId: "cat-home",
        subcategoryId: "sub-textil",
        image: "https://images.unsplash.com/photo-1616627458550-5cca4c1b0f0c?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "p2",
        name: "Almohadón sage",
        description: "Un toque de verde suave para armonizar el espacio.",
        price: 21900,
        categoryId: "cat-home",
        subcategoryId: "sub-living",
        image: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "p3",
        name: "Jarrón eucalipto",
        description: "Pieza artesanal para flores secas o ramitas verdes.",
        price: 27600,
        categoryId: "cat-home",
        subcategoryId: "sub-deco",
        image: "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "p4",
        name: "Bata de maternidad",
        description: "Algodón liviano, pensada para acompañarte en cada etapa.",
        price: 62400,
        categoryId: "cat-maternidad",
        subcategoryId: "sub-embarazo",
        image: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "p5",
        name: "Osito de tela",
        description: "Compañero suave para el rinconcito del bebé.",
        price: 19800,
        categoryId: "cat-maternidad",
        subcategoryId: "sub-bebe",
        image: "https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=1200&q=80"
      },
      {
        id: "p6",
        name: "Canasta de bienvenida",
        description: "Un regalo delicado para celebrar este momento único.",
        price: 55200,
        categoryId: "cat-maternidad",
        subcategoryId: "sub-regalos",
        image: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=1200&q=80"
      }
    ],
    pages: [],
    settings: {
      logo: "assets/logo.svg",
      brand: "Zoë véos",
      tagline: "Diseños exclusivos",
      seoTitle: "Zoë véos · Diseños exclusivos",
      seoDescription: "Zoë véos. Diseños exclusivos para el hogar y la maternidad. Envíos a todo el país.",
      seoKeywords: "hogar, maternidad, decoración, bebé, Argentina",
      seoImage: "",
      cloudinaryCloudName: "",
      cloudinaryUploadPreset: ""
    }
  };

  let cache = null;
  let ready = false;

  function productSlug(p) {
    return p.slug || slugify(p.name) || p.id;
  }

  function normalize(data) {
    const next = data || {};
    next.categories ||= [];
    next.subcategories ||= [];
    next.products ||= [];
    next.pages ||= [];
    next.settings = Object.assign({
      logo: "assets/logo.svg",
      brand: "Zoë véos",
      tagline: "Diseños exclusivos",
      seoTitle: "Zoë véos · Diseños exclusivos",
      seoDescription: "Zoë véos. Diseños exclusivos para el hogar y la maternidad. Envíos a todo el país.",
      seoKeywords: "hogar, maternidad, decoración, bebé, Argentina",
      seoImage: "",
      cloudinaryCloudName: "",
      cloudinaryUploadPreset: ""
    }, next.settings || {});
    next.categories.forEach((c) => {
      c.mediaType = c.mediaType || (window.Media ? Media.typeFromUrl(c.image) : "image");
    });
    next.products.forEach((p) => {
      p.slug = p.slug || slugify(p.name) || p.id;
      p.seoTitle = p.seoTitle || p.name;
      p.seoDescription = p.seoDescription || p.description || "";
      p.seoKeywords = p.seoKeywords || "";
    });
    next.pages.forEach((p) => {
      p.slug = p.slug || slugify(p.title || p.name);
      p.published = p.published !== false;
      p.showInMenu = Boolean(p.showInMenu);
      p.mediaType = p.mediaType || (window.Media ? Media.typeFromUrl(p.image) : "image");
    });
    return next;
  }

  function applyCloudFromSettings(data) {
    const s = (data && data.settings) || {};
    window.ZOE_CONFIG.cloudinary = {
      cloudName: s.cloudinaryCloudName || window.ZOE_CONFIG.cloudinary.cloudName || "",
      uploadPreset: s.cloudinaryUploadPreset || window.ZOE_CONFIG.cloudinary.uploadPreset || ""
    };
  }

  function hasCatalog(remote) {
    if (!remote) return false;
    return Boolean(
      (remote.categories && remote.categories.length) ||
      (remote.products && remote.products.length) ||
      (remote.subcategories && remote.subcategories.length) ||
      (remote.pages && remote.pages.length) ||
      (remote.settings && (remote.settings.logo || remote.settings.seoTitle || remote.settings.brand || remote.settings.cloudinaryCloudName))
    );
  }

  function rejectEmbeddedMedia(data) {
    const raw = JSON.stringify(data);
    if (raw.includes("data:image") || raw.includes("data:video") || raw.includes("data:application")) {
      throw new Error("No se pueden guardar archivos en Firebase. Subí el logo y las fotos a Cloudinary.");
    }
    if (raw.length > 900000) {
      throw new Error("El catálogo es demasiado grande para Firebase. Usá Cloudinary para las imágenes.");
    }
  }

  function load() {
    return cache || normalize(structuredClone(seed));
  }

  async function hydrate() {
    cache = normalize(structuredClone(seed));
    if (!window.FirebaseReady || !FirebaseReady.configured()) {
      ready = true;
      applyCloudFromSettings(cache);
      return cache;
    }
    try {
      FirebaseReady.init();
      await FirebaseReady.waitAuth();
      const remote = await FirebaseReady.loadCatalog();
      if (hasCatalog(remote)) {
        cache = normalize(remote);
      } else if (FirebaseReady.currentUser()) {
        cache = normalize(structuredClone(seed));
        await FirebaseReady.saveCatalog(cache);
      }
    } catch (err) {
      console.warn("Firebase catalog:", err);
    }
    applyCloudFromSettings(cache);
    ready = true;
    return cache;
  }

  async function persist(data) {
    const next = normalize(data);
    rejectEmbeddedMedia(next);
    if (!window.FirebaseReady || !FirebaseReady.configured()) {
      throw new Error("Firebase no está configurado.");
    }
    FirebaseReady.init();
    const user = await FirebaseReady.waitAuth();
    if (!user) {
      throw new Error("Tenés que estar logueada para guardar en Firebase.");
    }
    await FirebaseReady.saveCatalog(next);
    cache = next;
    applyCloudFromSettings(cache);
    return cache;
  }

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      el.textContent = items.reduce((n, i) => n + i.qty, 0);
    });
  }

  function addToCart(productId, qty = 1) {
    const cart = getCart();
    const found = cart.find((i) => i.id === productId);
    if (found) found.qty += qty;
    else cart.push({ id: productId, qty });
    saveCart(cart);
    return cart;
  }

  return {
    load,
    hydrate,
    persist,
    uid,
    slugify,
    productSlug,
    getCart,
    saveCart,
    addToCart,
    isReady() {
      return ready;
    },
    isAdmin() {
      return Boolean(FirebaseReady.currentUser());
    },
    async login(email, pass) {
      await FirebaseReady.login(email, pass);
    },
    async logout() {
      await FirebaseReady.logout();
    }
  };
})();
