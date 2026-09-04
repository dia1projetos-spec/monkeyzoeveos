const Admin = (() => {
  let data = Store.load();
  let editing = { type: null, id: null };

  function $(sel) {
    return document.querySelector(sel);
  }

  async function showApp() {
    $("#login-view").classList.add("hidden");
    $("#app-view").classList.remove("hidden");
    loadCloudForm();
    data = await Store.hydrate();
    renderAll();
  }

  function toast(msg) {
    const el = $("#status") || $("#login-status");
    if (!el) return;
    el.textContent = msg;
    setTimeout(() => { if (el.textContent === msg) el.textContent = ""; }, 2800);
  }

  function cloudSettings() {
    try {
      return JSON.parse(localStorage.getItem("zoe-veos-cloudinary") || "{}");
    } catch {
      return {};
    }
  }

  function applyCloudSettings() {
    const saved = cloudSettings();
    window.ZOE_CONFIG.cloudinary = {
      cloudName: saved.cloudName || window.ZOE_CONFIG.cloudinary.cloudName || "",
      uploadPreset: saved.uploadPreset || window.ZOE_CONFIG.cloudinary.uploadPreset || ""
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
        : "Falta el Cloud Name.";
    }
  }

  async function maybeUpload(input, fallbackUrl, fallbackType) {
    const file = input.files?.[0];
    if (!file) {
      return {
        url: fallbackUrl || "",
        mediaType: fallbackType || Media.typeFromUrl(fallbackUrl)
      };
    }
    applyCloudSettings();
    if (Cloudinary.configured()) {
      toast("Subiendo archivo a Cloudinary...");
      const uploaded = await Cloudinary.upload(file);
      return uploaded;
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        url: reader.result,
        mediaType: Media.typeFromFile(file)
      });
      reader.readAsDataURL(file);
    });
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
      return `<tr>
        <td>${Media.thumbMarkup(p.image)}</td>
        <td>${p.name}</td>
        <td>${cat ? cat.name : "-"} / ${sub ? sub.name : "-"}</td>
        <td>$${Number(p.price).toLocaleString("es-AR")}</td>
        <td class="row-actions">
          <button class="btn btn-ghost" data-edit-prod="${p.id}">Editar</button>
          <button class="btn btn-ghost" data-del-prod="${p.id}">Borrar</button>
        </td>
      </tr>`;
    }).join("");
  }

  function renderAll() {
    fillSelects();
    renderCats();
    renderSubs();
    renderProds();
  }

  async function persist() {
    try {
      await Store.persist(data);
      renderAll();
      toast("Guardado en Firebase.");
    } catch (err) {
      toast(err.message || "Se guardó local, pero Firebase falló.");
      renderAll();
    }
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

    $("#cloud-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const payload = {
        cloudName: $("#cloud-name").value.trim(),
        uploadPreset: $("#cloud-preset").value.trim()
      };
      localStorage.setItem("zoe-veos-cloudinary", JSON.stringify(payload));
      applyCloudSettings();
      loadCloudForm();
      toast("Cloudinary guardado.");
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
        persist();
      } catch (err) {
        toast(err.message || "No se pudo guardar la categoría.");
      }
    });

    $("#sub-form").addEventListener("submit", (e) => {
      e.preventDefault();
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
      persist();
    });

    $("#prod-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const uploaded = await maybeUpload($("#prod-file"), $("#prod-image").value.trim());
        const item = {
          id: editing.type === "prod" ? editing.id : Store.uid("p"),
          name: $("#prod-name").value.trim(),
          description: $("#prod-desc").value.trim(),
          price: Number($("#prod-price").value || 0),
          categoryId: $("#prod-category").value,
          subcategoryId: $("#prod-subcategory").value,
          image: uploaded.url
        };
        data.products = data.products.filter((p) => p.id !== item.id);
        data.products.push(item);
        editing = { type: null, id: null };
        e.target.reset();
        persist();
      } catch (err) {
        toast(err.message || "No se pudo guardar el producto.");
      }
    });

    document.body.addEventListener("click", (e) => {
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
        data.categories = data.categories.filter((c) => c.id !== catId);
        data.subcategories = data.subcategories.filter((s) => s.categoryId !== catId);
        data.products = data.products.filter((p) => p.categoryId !== catId);
        persist();
      }
      if (e.target.dataset.editSub) {
        const s = data.subcategories.find((x) => x.id === subId);
        editing = { type: "sub", id: s.id };
        $("#sub-name").value = s.name;
        $("#sub-category").value = s.categoryId;
      }
      if (e.target.dataset.delSub) {
        data.subcategories = data.subcategories.filter((s) => s.id !== subId);
        persist();
      }
      if (e.target.dataset.editProd) {
        const p = data.products.find((x) => x.id === prodId);
        editing = { type: "prod", id: p.id };
        $("#prod-name").value = p.name;
        $("#prod-desc").value = p.description;
        $("#prod-price").value = p.price;
        $("#prod-category").value = p.categoryId;
        refreshSubOptions(p.categoryId);
        $("#prod-subcategory").value = p.subcategoryId;
        $("#prod-image").value = p.image;
      }
      if (e.target.dataset.delProd) {
        data.products = data.products.filter((p) => p.id !== prodId);
        persist();
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
