const Cloudinary = {
  configured() {
    const c = window.ZOE_CONFIG.cloudinary || {};
    return Boolean(c.cloudName || c.uploadPreset);
  },

  resourcePath(file) {
    return file && file.type && file.type.startsWith("video/") ? "video" : "auto";
  },

  async sign() {
    const res = await fetch("/api/sign-upload", { method: "POST" });
    if (!res.ok) throw new Error("No se pudo firmar la subida.");
    return res.json();
  },

  async uploadSigned(file) {
    const signed = await this.sign();
    const body = new FormData();
    body.append("file", file);
    body.append("api_key", signed.apiKey);
    body.append("timestamp", signed.timestamp);
    body.append("signature", signed.signature);
    if (signed.folder) body.append("folder", signed.folder);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/${this.resourcePath(file)}/upload`, {
      method: "POST",
      body
    });
    if (!res.ok) throw new Error("No se pudo subir el archivo a Cloudinary.");
    return res.json();
  },

  async uploadUnsigned(file) {
    const c = window.ZOE_CONFIG.cloudinary || {};
    if (!c.cloudName || !c.uploadPreset) {
      throw new Error("Falta cloudName o uploadPreset.");
    }
    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", c.uploadPreset);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${c.cloudName}/${this.resourcePath(file)}/upload`, {
      method: "POST",
      body
    });
    if (!res.ok) throw new Error("No se pudo subir el archivo a Cloudinary.");
    return res.json();
  },

  async upload(file) {
    let signedError = null;
    try {
      const json = await this.uploadSigned(file);
      return {
        url: json.secure_url,
        mediaType: json.resource_type === "video" ? "video" : Media.typeFromFile(file)
      };
    } catch (err) {
      signedError = err;
    }
    try {
      const json = await this.uploadUnsigned(file);
      return {
        url: json.secure_url,
        mediaType: json.resource_type === "video" ? "video" : Media.typeFromFile(file)
      };
    } catch (err) {
      throw new Error(signedError && signedError.message ? signedError.message : (err.message || "No se pudo subir el archivo a Cloudinary."));
    }
  }
};
