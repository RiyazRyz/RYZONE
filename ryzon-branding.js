(function () {
  "use strict";
  function applyRYZONBranding() {
    const candidates = Array.from(document.querySelectorAll(
      "header h1, header h2, header .ryzon-brand, main h1, main h2, main .ryzon-brand, h1, h2, .ryzon-brand"
    )).filter(el => {
      if (el.closest("footer, .ryzon-unified-brand")) return false;
      if (!/RYZONE/i.test((el.textContent || "").trim())) return false;
      // Prefer the smallest brand-name element; never replace a wrapper containing another brand heading.
      return !Array.from(el.querySelectorAll("h1, h2, .ryzon-brand")).some(child =>
        /RYZONE/i.test((child.textContent || "").trim())
      );
    });

    candidates.forEach(target => {
      if (!target.parentElement || target.closest(".ryzon-unified-brand")) return;
      const scope = target.closest("header") || target.parentElement;
      const marks = Array.from(scope.querySelectorAll(".logo, .brand-mark, .ryzon-mark, .ryzon-logo-mark"))
        .filter(el => !el.closest(".ryzon-unified-brand") && /^R$/i.test((el.textContent || "").trim()));
      let mark = marks[0] || null;

      const oldTaglines = Array.from(scope.querySelectorAll(".tagline, .subtitle, .brand-tagline"))
        .filter(el => /One App, Endless Possibilities!?/i.test((el.textContent || "").trim()));
      oldTaglines.forEach(el => el.remove());

      const targetText = (target.textContent || "").trim();
      const label = (mark && target.contains(mark) ? targetText.replace(/^R\\s*/i, "").trim() : targetText) || "RYZONE";
      const parent = target.parentElement;
      const lockup = document.createElement("div");
      lockup.className = "ryzon-unified-brand";

      const logoImage = document.createElement("img");
      logoImage.className = "ryzon-unified-mark";
      logoImage.src = "./assets/ryzon-logo.svg";
      logoImage.alt = "RYZONE";
      logoImage.decoding = "async";
      if (mark) mark.replaceWith(logoImage);
      mark = logoImage;

      const stack = document.createElement("span");
      stack.className = "ryzon-unified-copy";
      const name = document.createElement("span");
      name.className = "ryzon-unified-name";
      name.textContent = label.replace(/^RYZONE\\s*/i, "RYZONE") || "RYZONE";
      const tagline = document.createElement("span");
      tagline.className = "ryzon-unified-tagline";
      tagline.textContent = "One App, Endless Possibilities!";

      stack.append(name, tagline);
      lockup.append(mark, stack);
      parent.insertBefore(lockup, target);
      if (mark.parentElement !== lockup) mark.remove();
      target.remove();
    });
  }

  function addStyles() {
    if (document.getElementById("ryzon-unified-brand-style")) return;
    const style = document.createElement("style");
    style.id = "ryzon-unified-brand-style";
    style.textContent = `
      .ryzon-unified-brand {
        display: inline-flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 10px !important;
        max-width: 100%;
        margin: 8px auto 14px !important;
        text-align: left !important;
        vertical-align: middle;
      }
      .ryzon-unified-mark {
        flex: 0 0 48px !important;
        width: 48px !important;
        height: 48px !important;
        min-width: 48px !important;
        min-height: 48px !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 14px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        display: block !important;
        object-fit: cover !important;
        overflow: hidden !important;
        border-radius: 12px !important;
        background: #090909 !important;
        box-shadow: 0 4px 15px #d6a83b55 !important;
      }
      .ryzon-unified-copy {
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        justify-content: center !important;
        gap: 2px !important;
        min-width: 0;
      }
      .ryzon-unified-name {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        color: #e6bd62 !important;
        font: 600 22px/1.1 "Trebuchet MS", "Segoe UI", sans-serif !important;
        letter-spacing: 1.2px !important;
        text-align: left !important;
        white-space: nowrap;
      }
      .ryzon-unified-tagline {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        color: #d8c28d !important;
        font: 400 10px/1.25 Arial,sans-serif !important;
        letter-spacing: .15px !important;
        text-align: left !important;
        white-space: normal;
      }
      @media (max-width: 360px) {
        .ryzon-unified-brand { gap: 8px !important; }
        .ryzon-unified-mark { flex-basis: 42px !important; width: 42px !important; height: 42px !important; min-width: 42px !important; min-height: 42px !important; font-size: 30px !important; }
        .ryzon-unified-name { font-size: 19px !important; }
        .ryzon-unified-tagline { font-size: 9px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function applyUserAppearance() {
    const themes = {
      ocean:["#071a30","#10243d","#142d49","#55dcff","#f1f7ff","#9eb2ca","#294966"],
      midnight:["#090909","#191919","#252525","#b8b8b8","#f5f5f5","#aaaaaa","#3b3b3b"],
      purple:["#211044","#30205a","#422b70","#c39aff","#fbf7ff","#c4b4df","#59417d"],
      emerald:["#062d25","#103c32","#185345","#55e2ad","#f0fff8","#a8cbbd","#276b56"],
      sunset:["#4a1c24","#612d37","#783c48","#ff9a70","#fff7f1","#e0b9ad","#8a4b53"],
      rose:["#481d38","#5c2948","#713456","#ff91c8","#fff5fb","#d9b4cb","#87486c"],
      sky:["#123b68","#194d7d","#24618f","#55dcff","#f1f8ff","#b4cde2","#367ca8"],
      gold:["#392b0b","#4a3914","#65501d","#e5bd55","#fff9e8","#d8c99f","#80672c"],
      crimson:["#390d19","#501725","#6a2032","#ff718c","#fff4f6","#dcb4bd","#8a354b"],
      aqua:["#06383d","#104b50","#176268","#48e2d9","#efffff","#acd4d2","#287c80"],
      lavender:["#29213e","#3a3154","#4c416c","#c7b1ff","#faf7ff","#c8bddf","#68588b"],
      forest:["#142b1a","#203b26","#2d5033","#91c987","#f5fff2","#b9cdb5","#466d49"],
      coffee:["#2b1b15","#3c2920","#50372b","#d4a27e","#fff8f1","#d1b8a7","#79533e"],
      arctic:["#dceeff","#ffffff","#eaf4ff","#2878cf","#17263a","#5e7187","#b7cfe7"],
      white:["#ffffff","#ffffff","#edf4fb","#2878cf","#17263a","#61758d","#d8e2ee"],
      graphite:["#20252b","#2b323a","#39434e","#aab8c7","#f2f5f8","#b0bac5","#56616d"],
      neon:["#101026","#1b1b3c","#292952","#c5ff45","#f7fff0","#c3d0ad","#555b75"],
      coral:["#51251f","#67342c","#80473c","#ff9b86","#fff7f3","#dfb9af","#95594d"],
      galaxy:["#10102f","#1b1b48","#292963","#a98aff","#f8f5ff","#c0b8df","#55518c"]
    };
    const themeKey = localStorage.getItem("ryzon_appearance_theme") || "ocean";
    const palette = themes[themeKey] || themes.ocean;
    const fontKey = localStorage.getItem("ryzon_appearance_font") || "Poppins";
    const safeFont = /^[a-zA-Z ]+$/.test(fontKey) ? fontKey : "Poppins";
    const root = document.documentElement;
    const variableNames = ["--ryzon-bg","--ryzon-card","--ryzon-card2","--ryzon-accent","--ryzon-text","--ryzon-muted","--ryzon-border"];
    variableNames.forEach((key,i)=>{
      root.style.setProperty(key,palette[i]);
      document.body.style.setProperty(key,palette[i]);
    });
    // Common aliases used by existing RYZONE page styles.
    const aliases = {"--bg":palette[0],"--navy":palette[0],"--card":palette[1],"--panel":palette[1],"--card2":palette[2],"--panel2":palette[2],"--accent":palette[3],"--cyan":palette[3],"--text":palette[4],"--muted":palette[5],"--border":palette[6],"--line":palette[6]};
    Object.entries(aliases).forEach(([key,value])=>{
      root.style.setProperty(key,value);
      document.body.style.setProperty(key,value);
    });
    root.dataset.ryzonTheme = themeKey;
    root.style.setProperty("--ryzon-font", '"' + safeFont + '", "Noto Sans", Arial, sans-serif');
    let fontLink = document.getElementById("ryzon-selected-google-font");
    if (!fontLink) {
      fontLink = document.createElement("link");
      fontLink.id = "ryzon-selected-google-font";
      fontLink.rel = "stylesheet";
      document.head.appendChild(fontLink);
    }
    fontLink.href = "https://fonts.googleapis.com/css2?family=" + encodeURIComponent(safeFont).replace(/%20/g, "+") + ":wght@400;500;600;700&display=swap";
    document.body.style.backgroundColor = palette[0];
    document.body.style.color = palette[4];
    document.body.style.fontFamily = root.style.getPropertyValue("--ryzon-font");
    let style = document.getElementById("ryzon-user-appearance-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "ryzon-user-appearance-style";
      document.head.appendChild(style);
    }
    style.textContent = `
      body, body button, body input, body select, body textarea { font-family: var(--ryzon-font) !important; }
      body { background-color: var(--ryzon-bg) !important; color: var(--ryzon-text); }
      header, .topbar, .app-header { background-color: var(--ryzon-card) !important; }
      .card, .account-box, .setting, .panel, .modal-content, .feature-card, .service-card, .home-card {
        border-color: var(--ryzon-border) !important;
      }
      body.light { background-color: var(--ryzon-bg) !important; }
    `;
  }
  window.RYZONApplyAppearance = applyUserAppearance;

  function start() {
    addStyles();
    if (!document.getElementById("ryzone-theme-system-script")) {
      const themeScript = document.createElement("script");
      themeScript.id = "ryzone-theme-system-script";
      themeScript.src = "./ryzone-theme-system.js";
      themeScript.defer = true;
      document.head.appendChild(themeScript);
    }
    applyUserAppearance();
    applyRYZONBranding();
    if (!document.querySelector('link[rel="icon"][data-ryzon-logo]')) {
      const icon = document.createElement("link");
      icon.rel = "icon";
      icon.type = "image/svg+xml";
      icon.href = "./assets/ryzon-logo.svg";
      icon.dataset.ryzonLogo = "true";
      document.head.appendChild(icon);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();