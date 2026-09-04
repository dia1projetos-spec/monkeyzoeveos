const Media = {
  typeFromFile(file) {
    if (!file) return "image";
    const name = String(file.name || "").toLowerCase();
    if (file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v|ogg)$/.test(name)) return "video";
    if (file.type === "image/gif" || name.endsWith(".gif")) return "gif";
    return "image";
  },

  typeFromUrl(url) {
    const u = String(url || "").toLowerCase();
    if (!u) return "image";
    if (u.includes("/video/upload") || /\.(mp4|webm|mov|m4v|ogg)(\?|$)/.test(u)) return "video";
    if (u.includes("image/gif") || /\.gif(\?|$)/.test(u)) return "gif";
    return "image";
  },

  bannerMarkup(item) {
    const url = item.image || "";
    const type = item.mediaType || this.typeFromUrl(url);
    const alt = item.name || "";
    if (type === "video") {
      return `<video autoplay muted loop playsinline preload="metadata" aria-label="${alt}"><source src="${url}"></video>`;
    }
    return `<img src="${url}" alt="${alt}" width="1200" height="640" loading="eager">`;
  },

  thumbMarkup(url, mediaType) {
    const type = mediaType || this.typeFromUrl(url);
    if (!url) return "";
    if (type === "video") return `<video class="thumb" src="${url}" muted playsinline></video>`;
    return `<img class="thumb" src="${url}" alt="">`;
  }
};
