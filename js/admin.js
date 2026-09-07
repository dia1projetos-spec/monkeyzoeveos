const Admin = (() => {
  let data = Store.load();
  let editing = { type: null, id: null };

  function $(sel) {
    return document.querySelector(sel);
  }

  async function showApp() {
    $("#login-view").classList.add("hidden");
    $("#app-view").classList.remove("hidden");
    data = await Store.hydrate();
    const user = FirebaseReady.currentUser();
    if ($("#firebase-user")) {
      $("#firebase-user").textContent = user
        ? `Conectada a Firebase como ${user.email}. Los cambios se escriben en shop/catalog.`
        : "No hay sesión de Firebase.";
    }
    loadCloudForm();
    renderAll();
  }

  function toast(msg) {
    const el = $("#status") || $("#login-status");
    if (!el) return;
    el.textContent = msg;
    setTimeout(() => { if (el.textContent === msg) el.textContent = ""; }, 4200);
  }

  function applyCloudSettings() {
    const s = (data.settings || {});
    window.ZOE_CONFIG.cloudinary = {
      cloudName: s.cloudinaryCloudName || window.ZOE_CONFIG.cloudinary.cloudName || "",
      uploadPreset: s.cloudinaryUploadPreset || window.ZOE_CONFIG.cloudinary.uploadPreset || ""
    };
  }

  function loadCloudForm() {
    applyCloudSettings();
    const c = window.ZOE_CONFIG.cloudinary;
    if ($("#cloud-name")) $("#cloud-name").value = c.cloudName || "";
    if ($("#cloud-preset")) $("#cloud-preset").value = c.uploadPreset || "";
    if ($("#cloud-status")) {
      $("#cloud-status").textContent = c.cloudName
        ? "Cloudinary listo. Las subidas van a la carpeta zoe-veos."
        : "Falta el Cloud Name. Sin Cloudinary no se pueden subir archivos.";
    }
  }

  async function maybeUpload(input, fallbackUrl, fallbackType) {
    const file = input.files?.[0];
    if (!file) {
      const url = fallbackUrl || "";
      if (url.startsWith("data:")) {
        throw new Error("Esa imagen está en el navegador, no en Firebase. Subila a Cloudinary.");
      }
      return {
        url,
        mediaType: fallbackType || Media.typeFromUrl(url)
      };
    }
    applyCloudSettings();
    toast("Subiendo archivo a Cloudinary...");
    try {
      return await Cloudinary.upload(file);
    } catch (err) {
      throw new Error(err.message || "No se pudo subir a Cloudinary. Completá Cloud Name en la pestaña Cloudinary.");
    }
  }

  function fillSelects() {
    const catOpts = data.categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
    $("#sub-category").innerHTML = catOpts;
    $("#prod-category").innerHTML = catOpts;
    refreshSubOptions($("#prod-category").value);
  }

  function refreshSubOptions(categoryId) {
    $("#prod-subcategory").innerHTML = data.subcategories
      .filter((s) => s.categoryId === categoryId)
      .map((s) => `<option value="${s.id}">${s.name}</option>`)
      .join("");
  }

  function renderCats() {
    $("#cat-table").innerHTML = data.categories
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((c) => `
      <tr>
        <td>${Media.thumbMarkup(c.image, c.mediaType)}</td>
        <td>${c.name}<br><small>${c.slug} · ${c.mediaType || "image"}</small></td>
        <td>${c.description}</td>
        <td class="row-actions">
          <button class="btn btn-ghost" data-edit-cat="${c.id}">Editar</button>
          <button class="btn btn-ghost" data-del-cat="${c.id}">Borrar</button>
        </td>
      </tr>
    `).join("");
  }

  function renderSubs() {
    $("#sub-table").innerHTML = data.subcategories.map((s) => {
      const cat = data.categories.find((c) => c.id === s.categoryId);
      return `<tr>
        <td>${s.name}</td>
        <td>${cat ? cat.name : "-"}</td>
        <td class="row-actions">
          <button class="btn btn-ghost" data-edit-sub="${s.id}">Editar</button>
          <button class="btn btn-ghost" data-del-sub="${s.id}">Borrar</button>
        </td>
      </tr>`;
    }).join("");
  }

  function renderProds() {
    $("#prod-table").innerHTML = data.products.map((p) => {
      const cat = data.categories.find((c) => c.id === p.categoryId);
      const sub = data.subcategories.find((s) => s.id === p.subcategoryId);
      const url = `../producto.html?slug=${encodeURIComponent(p.slug || p.id)}`;
      return `<tr>
        <td>${Media.thumbMarkup(p.image)}</td>
        <td>${p.name}<br><small>${p.slug || p.id}</small></td>
        <td>${cat ? cat.name : "-"} / ${sub ? sub.name : "-"}</td>
        <td>$${Number(p.price).toLocaleString("es-AR")}</td>
        <td><a href="${url}" target="_blank">Ver ficha</a></td>
        <td class="row-actions">
          <button class="btn btn-ghost" data-edit-prod="${p.id}">Editar</button>
          <button class="btn btn-ghost" data-del-prod="${p.id}">Borrar</button>
        </td>
      </tr>`;
    }).join("");
  }

  function renderPages() {
    if (!$("#page-table")) return;
    $("#page-table").innerHTML = (data.pages || []).map((p) => `
      <tr>
        <td>${Media.thumbMarkup(p.image, p.mediaType)}</td>
        <td>${p.title}<br><small>pagina.html?slug=${p.slug}</small></td>
        <td>${p.seoTitle || p.title}</td>
        <td class="row-actions">
          <a class="btn btn-ghost" href="../pagina.html?slug=${encodeURIComponent(p.slug)}" target="_blank">Ver</a>
          <button class="btn btn-ghost" data-edit-page="${p.id}">Editar</button>
          <button class="btn btn-ghost" data-del-page="${p.id}">Borrar</button>
        </td>
      </tr>
    `).join("");
  }

  function fillSiteForm() {
    const s = data.settings || {};
    if ($("#site-brand")) $("#site-brand").value = s.brand || "";
    if ($("#site-tagline")) $("#site-tagline").value = s.tagline || "";
    if ($("#site-seo-title")) $("#site-seo-title").value = s.seoTitle || "";
    if ($("#site-seo-desc")) $("#site-seo-desc").value = s.seoDescription || "";
    if ($("#site-seo-keywords")) $("#site-seo-keywords").value = s.seoKeywords || "";
    if ($("#site-seo-image")) $("#site-seo-image").value = s.seoImage || "";
    if ($("#site-logo")) $("#site-logo").value = s.logo || "";
    if ($("#site-logo-preview")) $("#site-logo-preview").src = s.logo || "../assets/logo.svg";
  }

  function renderAll() {
    fillSelects();
    fillSiteForm();
    renderCats();
    renderSubs();
    renderProds();
    renderPages();
  }

  async function persist() {
    try {
      await Store.persist(data);
    } catch (err) {
      throw new Error(FirebaseReady.authMessage(err));
    }
    renderAll();
    loadCloudForm();
    toast("Guardado en Firebase (shop/catalog).");
  }

  function bind() {
    applyCloudSettings();

    $("#login-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#login-user").value.trim();
      const pass = $("#login-pass").value;
      try {
        toast("Ingresando...");
        await Store.login(email, pass);
        toast("Sesión iniciada. Cargando Firebase...");
        await showApp();
      } catch (err) {
        toast(FirebaseReady.authMessage(err));
      }
    });

    $("#logout")?.addEventListener("click", async () => {
      await Store.logout();
      location.reload();
    });

    document.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-tab]").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll("[data-panel]").forEach((p) => p.classList.add("hidden"));
        btn.classList.add("active");
        $(`[data-panel="${btn.dataset.tab}"]`).classList.remove("hidden");
      });
    });

    $("#prod-category").addEventListener("change", (e) => refreshSubOptions(e.target.value));

    $("#cloud-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        data.settings = Object.assign({}, data.settings, {
          cloudinaryCloudName: $("#cloud-name").value.trim(),
          cloudinaryUploadPreset: $("#cloud-preset").value.trim()
        });
        await persist();
        toast("Cloudinary guardado en Firebase.");
      } catch (err) {
        toast(err.message || "No se pudo guardar Cloudinary.");
      }
    });

    $("#cat-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const current = editing.type === "cat" ? data.categories.find((c) => c.id === editing.id) : null;
        const uploaded = await maybeUpload($("#cat-file"), $("#cat-image").value.trim(), current?.mediaType);
        const item = {
          id: editing.type === "cat" ? editing.id : Store.uid("cat"),
          name: $("#cat-name").value.trim(),
          slug: Store.slugify($("#cat-slug").value || $("#cat-name").value),
          description: $("#cat-desc").value.trim(),
          image: uploaded.url,
          mediaType: uploaded.mediaType,
          order: Number($("#cat-order").value || 1)
        };
        data.categories = data.categories.filter((c) => c.id !== item.id);
        data.categories.push(item);
        editing = { type: null, id: null };
        e.target.reset();
        await persist();
      } catch (err) {
        toast(err.message || "No se pudo guardar la categoría.");
      }
    });

    $("#sub-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const item = {
          id: editing.type === "sub" ? editing.id : Store.uid("sub"),
          name: $("#sub-name").value.trim(),
          slug: Store.slugify($("#sub-name").value),
          categoryId: $("#sub-category").value
        };
        data.subcategories = data.subcategories.filter((s) => s.id !== item.id);
        data.subcategories.push(item);
        editing = { type: null, id: null };
        e.target.reset();
        await persist();
      } catch (err) {
        toast(err.message || "No se pudo guardar la subcategoría.");
      }
    });

    $("#site-logo-file")?.addEventListener("change", () => {
      const file = $("#site-logo-file").files?.[0];
      if (!file || !$("#site-logo-preview")) return;
      $("#site-logo-preview").src = URL.createObjectURL(file);
      toast("Logo seleccionado. Tocá Guardar logo.");
    });

    $("#logo-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const uploaded = await maybeUpload($("#site-logo-file"), $("#site-logo").value.trim());
        if (!uploaded.url) {
          toast("Elegí un archivo o pegá una URL.");
          return;
        }
        data.settings = Object.assign({}, data.settings, { logo: uploaded.url });
        if ($("#site-logo")) $("#site-logo").value = uploaded.url;
        if ($("#site-logo-preview")) $("#site-logo-preview").src = uploaded.url;
        await persist();
        toast("Logo guardado en Firebase.");
      } catch (err) {
        toast(err.message || "No se pudo guardar el logo.");
      }
    });

    $("#site-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        data.settings = Object.assign({}, data.settings, {
          brand: $("#site-brand").value.trim(),
          tagline: $("#site-tagline").value.trim(),
          seoTitle: $("#site-seo-title").value.trim(),
          seoDescription: $("#site-seo-desc").value.trim(),
          seoKeywords: $("#site-seo-keywords").value.trim(),
          seoImage: $("#site-seo-image").value.trim()
        });
        await persist();
      } catch (err) {
        toast(err.message || "No se pudo guardar la marca.");
      }
    });

    $("#page-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const current = editing.type === "page" ? data.pages.find((p) => p.id === editing.id) : null;
        const uploaded = await maybeUpload($("#page-file"), $("#page-image").value.trim(), current?.mediaType);
        const title = $("#page-title").value.trim();
        const item = {
          id: editing.type === "page" ? editing.id : Store.uid("pg"),
          title,
          slug: Store.slugify($("#page-slug").value || title),
          excerpt: $("#page-excerpt").value.trim(),
          content: $("#page-content").value,
          seoTitle: $("#page-seo-title").value.trim() || title,
          seoDescription: $("#page-seo-desc").value.trim(),
          seoKeywords: $("#page-seo-keywords").value.trim(),
          seoImage: $("#page-seo-image").value.trim(),
          image: uploaded.url,
          mediaType: uploaded.mediaType,
          published: $("#page-published").value === "true",
          showInMenu: $("#page-menu").value === "true"
        };
        data.pages = (data.pages || []).filter((p) => p.id !== item.id);
        data.pages.push(item);
        editing = { type: null, id: null };
        e.target.reset();
        await persist();
      } catch (err) {
        toast(err.message || "No se pudo guardar la página.");
      }
    });

    $("#prod-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const uploaded = await maybeUpload($("#prod-file"), $("#prod-image").value.trim());
        const name = $("#prod-name").value.trim();
        const item = {
          id: editing.type === "prod" ? editing.id : Store.uid("p"),
          name,
          slug: Store.slugify($("#prod-slug").value || name),
          description: $("#prod-desc").value.trim(),
          seoTitle: $("#prod-seo-title").value.trim() || name,
          seoDescription: $("#prod-seo-desc").value.trim(),
          seoKeywords: $("#prod-seo-keywords").value.trim(),
          price: Number($("#prod-price").value || 0),
          categoryId: $("#prod-category").value,
          subcategoryId: $("#prod-subcategory").value,
          image: uploaded.url
        };
        data.products = data.products.filter((p) => p.id !== item.id);
        data.products.push(item);
        editing = { type: null, id: null };
        e.target.reset();
        await persist();
      } catch (err) {
        toast(err.message || "No se pudo guardar el producto.");
      }
    });

    document.body.addEventListener("click", async (e) => {
      const catId = e.target.dataset.editCat || e.target.dataset.delCat;
      const subId = e.target.dataset.editSub || e.target.dataset.delSub;
      const prodId = e.target.dataset.editProd || e.target.dataset.delProd;

      if (e.target.dataset.editCat) {
        const c = data.categories.find((x) => x.id === catId);
        editing = { type: "cat", id: c.id };
        $("#cat-name").value = c.name;
        $("#cat-slug").value = c.slug;
        $("#cat-desc").value = c.description;
        $("#cat-image").value = c.image;
        $("#cat-order").value = c.order;
      }
      if (e.target.dataset.delCat) {
        try {
          data.categories = data.categories.filter((c) => c.id !== catId);
          data.subcategories = data.subcategories.filter((s) => s.categoryId !== catId);
          data.products = data.products.filter((p) => p.categoryId !== catId);
          await persist();
        } catch (err) {
          toast(err.message || "No se pudo borrar la categoría.");
        }
      }
      if (e.target.dataset.editSub) {
        const s = data.subcategories.find((x) => x.id === subId);
        editing = { type: "sub", id: s.id };
        $("#sub-name").value = s.name;
        $("#sub-category").value = s.categoryId;
      }
      if (e.target.dataset.delSub) {
        try {
          data.subcategories = data.subcategories.filter((s) => s.id !== subId);
          await persist();
        } catch (err) {
          toast(err.message || "No se pudo borrar la subcategoría.");
        }
      }
      if (e.target.dataset.editProd) {
        const p = data.products.find((x) => x.id === prodId);
        editing = { type: "prod", id: p.id };
        $("#prod-name").value = p.name;
        $("#prod-slug").value = p.slug || "";
        $("#prod-desc").value = p.description;
        $("#prod-seo-title").value = p.seoTitle || "";
        $("#prod-seo-desc").value = p.seoDescription || "";
        $("#prod-seo-keywords").value = p.seoKeywords || "";
        $("#prod-price").value = p.price;
        $("#prod-category").value = p.categoryId;
        refreshSubOptions(p.categoryId);
        $("#prod-subcategory").value = p.subcategoryId;
        $("#prod-image").value = p.image;
      }
      if (e.target.dataset.delProd) {
        try {
          data.products = data.products.filter((p) => p.id !== prodId);
          await persist();
        } catch (err) {
          toast(err.message || "No se pudo borrar el producto.");
        }
      }
      if (e.target.dataset.editPage) {
        const p = data.pages.find((x) => x.id === e.target.dataset.editPage);
        editing = { type: "page", id: p.id };
        $("#page-title").value = p.title;
        $("#page-slug").value = p.slug;
        $("#page-excerpt").value = p.excerpt || "";
        $("#page-content").value = p.content || "";
        $("#page-seo-title").value = p.seoTitle || "";
        $("#page-seo-desc").value = p.seoDescription || "";
        $("#page-seo-keywords").value = p.seoKeywords || "";
        $("#page-seo-image").value = p.seoImage || "";
        $("#page-image").value = p.image || "";
        $("#page-published").value = p.published === false ? "false" : "true";
        $("#page-menu").value = p.showInMenu ? "true" : "false";
      }
      if (e.target.dataset.delPage) {
        try {
          data.pages = data.pages.filter((p) => p.id !== e.target.dataset.delPage);
          await persist();
        } catch (err) {
          toast(err.message || "No se pudo borrar la página.");
        }
      }
    });
  }

  function init() {
    bind();
    FirebaseReady.init();
    FirebaseReady.onAuth((user) => {
      if (user) showApp();
    });
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", Admin.init);
