const SEO = (() => {
  function siteUrl() {
    const configured = (window.ZOE_CONFIG.siteUrl || "").replace(/\/$/, "");
    if (configured) return configured;
    return `${location.origin}${location.pathname.replace(/\/[^/]*$/, "")}` || location.origin;
  }

  function abs(path) {
    const fallback = (window.Store ? Store.load().settings.logo : "") || "assets/logo.svg";
    if (!path) return /^https?:\/\//i.test(fallback) || fallback.startsWith("data:") ? fallback : `${siteUrl()}/${fallback}`;
    if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
    return `${siteUrl()}/${String(path).replace(/^\//, "")}`;
  }

  function setMeta(attr, key, content) {
    if (!content) return;
    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }

  function setLink(rel, href) {
    if (!href) return;
    let el = document.head.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", rel);
      document.head.appendChild(el);
    }
    el.setAttribute("href", href);
  }

  function setJsonLd(id, data) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
  }

  function apply({ title, description, image, url, type = "website", jsonLd, robots = "index,follow", keywords = "" }) {
    const brand = (Store.load().settings || {}).brand || window.ZOE_CONFIG.brand;
    const fullTitle = title.includes(brand) ? title : `${title} · ${brand}`;
    document.title = fullTitle;
    setMeta("name", "description", description);
    setMeta("name", "keywords", keywords);
    setMeta("name", "robots", robots);
    setMeta("property", "og:locale", "es_AR");
    setMeta("property", "og:site_name", brand);
    setMeta("property", "og:type", type);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", image);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);
    setLink("canonical", url);
    if (jsonLd) setJsonLd("jsonld-page", jsonLd);
  }

  function organization() {
    const s = (window.Store ? Store.load().settings : null) || {};
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: s.brand || window.ZOE_CONFIG.brand,
      description: s.seoDescription || window.ZOE_CONFIG.description,
      url: siteUrl(),
      logo: abs(s.logo || "assets/logo.svg")
    };
  }

  return { siteUrl, abs, apply, organization };
})();
