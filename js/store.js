const Store = (() => {
  const KEY = "zoe-veos-data-v1";
  const CART_KEY = "zoe-veos-cart-v1";
  const SESSION_KEY = "zoe-veos-admin";

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
    ]
  };

  function normalize(data) {
    const next = data || {};
    next.categories ||= [];
    next.subcategories ||= [];
    next.products ||= [];
    next.categories.forEach((c) => {
      c.mediaType = c.mediaType || (window.Media ? Media.typeFromUrl(c.image) : "image");
    });
    return next;
  }

  function load() {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const initial = structuredClone(seed);
      localStorage.setItem(KEY, JSON.stringify(initial));
      return initial;
    }
    try {
      return normalize(JSON.parse(raw));
    } catch {
      return structuredClone(seed);
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  async function hydrate() {
    const local = load();
    if (!window.FirebaseReady || !FirebaseReady.configured()) return local;
    try {
      FirebaseReady.init();
      const remote = await FirebaseReady.loadCatalog();
      if (remote && (remote.categories.length || remote.products.length || remote.subcategories.length)) {
        const merged = normalize(remote);
        save(merged);
        return merged;
      }
      if (FirebaseReady.currentUser()) {
        await FirebaseReady.saveCatalog(local);
      }
    } catch (err) {
      console.warn("Firebase catalog:", err);
    }
    return local;
  }

  async function persist(data) {
    save(data);
    if (window.FirebaseReady && FirebaseReady.configured() && FirebaseReady.currentUser()) {
      await FirebaseReady.saveCatalog(data);
    }
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

  return {
    load,
    save,
    hydrate,
    persist,
    uid,
    slugify,
    getCart,
    saveCart,
    isAdmin() {
      return Boolean(FirebaseReady.currentUser()) || sessionStorage.getItem(SESSION_KEY) === "ok";
    },
    async login(email, pass) {
      await FirebaseReady.login(email, pass);
      sessionStorage.setItem(SESSION_KEY, "ok");
    },
    async logout() {
      sessionStorage.removeItem(SESSION_KEY);
      await FirebaseReady.logout();
    }
  };
})();
