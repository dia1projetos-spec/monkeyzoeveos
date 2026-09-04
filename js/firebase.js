const FirebaseReady = {
  app: null,
  auth: null,
  db: null,

  configured() {
    const f = window.ZOE_CONFIG.firebase || {};
    return Boolean(f.apiKey && f.projectId && window.firebase);
  },

  init() {
    if (this.app || !this.configured()) return this;
    this.app = firebase.initializeApp(window.ZOE_CONFIG.firebase);
    this.auth = firebase.auth();
    this.db = firebase.firestore();
    return this;
  },

  catalogRef() {
    this.init();
    return this.db.doc("shop/catalog");
  },

  async loadCatalog() {
    this.init();
    if (!this.db) return null;
    const snap = await this.catalogRef().get();
    if (!snap.exists) return null;
    const remote = snap.data() || {};
    return {
      categories: remote.categories || [],
      subcategories: remote.subcategories || [],
      products: remote.products || []
    };
  },

  async saveCatalog(data) {
    this.init();
    if (!this.db) throw new Error("Firebase no está listo.");
    await this.catalogRef().set({
      categories: data.categories || [],
      subcategories: data.subcategories || [],
      products: data.products || [],
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  authMessage(err) {
    const map = {
      "auth/invalid-email": "El email no es válido.",
      "auth/user-not-found": "No encontramos esa cuenta.",
      "auth/wrong-password": "Contraseña incorrecta.",
      "auth/invalid-credential": "Email o contraseña incorrectos.",
      "auth/too-many-requests": "Demasiados intentos. Probá más tarde.",
      "auth/network-request-failed": "No hay conexión con Firebase."
    };
    return map[err.code] || err.message || "No se pudo iniciar sesión.";
  },

  async login(email, pass) {
    this.init();
    if (!this.auth) throw new Error("Firebase Auth no está listo.");
    await this.auth.signInWithEmailAndPassword(email, pass);
  },

  async logout() {
    this.init();
    if (this.auth) await this.auth.signOut();
  },

  currentUser() {
    this.init();
    return this.auth ? this.auth.currentUser : null;
  },

  onAuth(cb) {
    this.init();
    if (!this.auth) return () => {};
    return this.auth.onAuthStateChanged(cb);
  }
};
