/*
 * Privacy Lock — hide portfolio money (Thai Baht ฿) behind a passcode.
 *
 * On every page the dashboard starts LOCKED for the session: all ฿ amounts
 * (total wealth / invested / cash / per-asset / DCA journal, and "N บาท|THB"
 * bare numbers) render as ฿XXX / XXX บาท. Percentages, $ market data (BTC price,
 * Thesis company figures) and everything else stay visible. Enter the existing
 * app password to reveal; press the lock button to hide again.
 *
 * This is a shoulder-surfing privacy screen, NOT hard security — the data is
 * already in the DOM. Passcode reuses window.PortfolioAuth (APP_PASSWORD).
 *
 * Loaded on every page (after api-auth.js). IIFE + window.PortfolioPrivacy,
 * module.exports for Node smoke tests (maskText is pure).
 */
(function () {
  "use strict";

  // ---- pure core: mask ฿-amounts and "N บาท|THB", leave $ / % / plain numbers ----
  // group1 = ฿ (+opt space/minus), group2 = number      → ฿XXX
  // group3 = number (+opt minus), group4 = space+บาท|THB → XXX บาท
  var MONEY_RE = /(฿\s?-?)([\d,]+(?:\.\d+)?)|(-?[\d,]+(?:\.\d+)?)(\s?(?:บาท|THB))(?![A-Za-z0-9])/g;
  var TOKEN = "XXX";
  function maskText(s) {
    if (s == null) return s;
    s = String(s);
    if (s.indexOf("฿") < 0 && s.indexOf("บาท") < 0 && s.indexOf("THB") < 0) return s;
    return s.replace(MONEY_RE, function (m, bsym, bnum, snum, ssuf) {
      return bsym != null ? bsym + TOKEN : TOKEN + ssuf;
    });
  }

  // ---- DOM plumbing (browser only) ----
  if (typeof window === "undefined" || typeof document === "undefined") {
    if (typeof module !== "undefined" && module.exports) module.exports = { maskText: maskText };
    return;
  }

  var UNLOCK_KEY = "pv_unlocked_v1"; // sessionStorage → unlocked for this tab/session
  var PW_KEY = "portfolioPassword"; // api-auth.js storage key (reused)
  var originals = typeof Map !== "undefined" ? new Map() : null; // text node -> real text
  var locked = true;
  var applying = false;
  var obs = null;

  function isSkippable(el) {
    if (!el) return true;
    var tag = el.nodeName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA" || tag === "INPUT") return true;
    return !!(el.closest && el.closest("[data-pv-ui],[data-pv-skip]"));
  }
  function maskNode(node) {
    if (!node || node.nodeType !== 3 || !originals) return;
    if (isSkippable(node.parentNode)) return;
    var s = node.nodeValue;
    if (!s || (s.indexOf("฿") < 0 && s.indexOf("บาท") < 0 && s.indexOf("THB") < 0)) return;
    var out = maskText(s);
    if (out !== s) {
      if (!originals.has(node)) originals.set(node, s);
      applying = true; try { node.nodeValue = out; } catch (e) {} applying = false;
    }
  }
  function walkMask(root) {
    if (!root || !document.createTreeWalker) return;
    if (root.nodeType === 3) { maskNode(root); return; }
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (isSkippable(n.parentNode)) return NodeFilter.FILTER_REJECT;
        var s = n.nodeValue;
        if (!s || (s.indexOf("฿") < 0 && s.indexOf("บาท") < 0 && s.indexOf("THB") < 0)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var batch = [], node;
    while ((node = w.nextNode())) batch.push(node);
    batch.forEach(maskNode);
  }
  function unmaskAll() {
    if (!originals) return;
    originals.forEach(function (orig, node) { applying = true; try { node.nodeValue = orig; } catch (e) {} applying = false; });
    originals.clear();
  }
  function startObserver() {
    if (obs || typeof MutationObserver === "undefined") return;
    obs = new MutationObserver(function (muts) {
      if (!locked || applying) return;
      for (var i = 0; i < muts.length; i++) {
        var mu = muts[i];
        if (mu.type === "characterData") maskNode(mu.target);
        else if (mu.type === "childList") {
          for (var j = 0; j < mu.addedNodes.length; j++) {
            var an = mu.addedNodes[j];
            if (an.nodeType === 3) maskNode(an);
            else if (an.nodeType === 1) walkMask(an);
          }
        }
      }
    });
    try { obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true }); } catch (e) {}
  }

  function apply() {
    if (locked) walkMask(document.body); else unmaskAll();
    updateButton();
  }
  function lock() {
    locked = true;
    try { sessionStorage.removeItem(UNLOCK_KEY); } catch (e) {}
    apply();
  }
  function doUnlock() {
    locked = false;
    try { sessionStorage.setItem(UNLOCK_KEY, "1"); } catch (e) {}
    apply();
  }
  // verify against the existing app password (reuse). If the client doesn't
  // hold it yet, fall back to a server check on a protected endpoint.
  function verify(candidate) {
    if (candidate == null || candidate === "") return Promise.resolve(false);
    var pw = "";
    try { pw = (window.PortfolioAuth && window.PortfolioAuth.getPassword && window.PortfolioAuth.getPassword()) || ""; } catch (e) {}
    if (pw) return Promise.resolve(candidate === pw);
    return fetch("/api/portfolio", { headers: { "x-portfolio-password": candidate }, cache: "no-store" })
      .then(function (r) { if (r.ok) { try { sessionStorage.setItem(PW_KEY, candidate); } catch (e) {} return true; } return false; })
      .catch(function () { return false; });
  }

  // ---- UI: floating button + passcode modal ----
  function updateButton() {
    var b = document.getElementById("pv-btn");
    if (!b) return;
    b.textContent = locked ? "🔒" : "👁";
    b.title = locked ? "ซ่อนจำนวนเงินอยู่ — คลิกเพื่อใส่รหัสดูจำนวน" : "แสดงจำนวนเงินอยู่ — คลิกเพื่อซ่อน";
    b.setAttribute("aria-label", locked ? "Unlock amounts" : "Lock amounts");
  }
  function injectStyle() {
    if (document.getElementById("pv-style")) return;
    var css =
      "#pv-btn{position:fixed;right:18px;bottom:74px;z-index:2147483001;width:46px;height:46px;border-radius:50%;cursor:pointer;border:1px solid var(--app-border-strong,#334155);background:var(--app-card,#0f172a);color:var(--app-text,#e2e8f0);box-shadow:var(--app-shadow,0 6px 20px rgba(0,0,0,.35));font-size:20px;line-height:1;display:flex;align-items:center;justify-content:center;transition:transform .15s}" +
      "#pv-btn:hover{transform:translateY(-2px) scale(1.06)}" +
      "#pv-modal{position:fixed;inset:0;z-index:2147483002;display:none;align-items:center;justify-content:center;background:rgba(2,6,23,.55)}" +
      "#pv-modal.pv-open{display:flex}" +
      ".pv-card{background:var(--app-card,#0f172a);color:var(--app-text,#e2e8f0);border:1px solid var(--app-border-strong,#334155);border-radius:16px;box-shadow:var(--app-shadow,0 20px 60px rgba(0,0,0,.5));padding:20px 22px;width:min(360px,92vw);font-family:inherit}" +
      ".pv-card h3{margin:0 0 4px;font-size:16px;font-weight:800}" +
      ".pv-card p{margin:0 0 12px;font-size:12.5px;color:var(--app-muted,#94a3b8);line-height:1.55}" +
      ".pv-card input{width:100%;box-sizing:border-box;font-family:inherit;font-size:14px;padding:10px 12px;border-radius:10px;border:1px solid var(--app-border-strong,#334155);background:var(--app-bg,#020617);color:var(--app-text,#e2e8f0)}" +
      ".pv-card input:focus{outline:none;border-color:#38bdf8}" +
      ".pv-err{color:#f43f5e;font-size:12px;margin-top:8px;min-height:16px}" +
      ".pv-row{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}" +
      ".pv-row button{font-family:inherit;font-size:13px;font-weight:700;padding:8px 16px;border-radius:10px;cursor:pointer;border:1px solid var(--app-border-strong,#334155);background:transparent;color:var(--app-text,#e2e8f0)}" +
      ".pv-row .pv-ok{background:#38bdf8;border-color:#38bdf8;color:#04121f}";
    var st = document.createElement("style");
    st.id = "pv-style"; st.textContent = css;
    document.head.appendChild(st);
  }
  function openModal() {
    var m = document.getElementById("pv-modal");
    if (!m) return;
    m.classList.add("pv-open");
    var inp = document.getElementById("pv-input"), err = document.getElementById("pv-err");
    if (err) err.textContent = "";
    if (inp) { inp.value = ""; setTimeout(function () { inp.focus(); }, 30); }
  }
  function closeModal() {
    var m = document.getElementById("pv-modal");
    if (m) m.classList.remove("pv-open");
  }
  function submitModal() {
    var inp = document.getElementById("pv-input"), err = document.getElementById("pv-err"), ok = document.getElementById("pv-ok");
    if (!inp) return;
    if (ok) { ok.disabled = true; ok.textContent = "กำลังตรวจ..."; }
    verify(inp.value).then(function (good) {
      if (ok) { ok.disabled = false; ok.textContent = "ปลดล็อก"; }
      if (good) { doUnlock(); closeModal(); }
      else if (err) { err.textContent = "รหัสไม่ถูกต้อง"; inp.select(); }
    });
  }
  function injectUI() {
    if (document.getElementById("pv-btn")) { updateButton(); return; }
    injectStyle();
    var btn = document.createElement("button");
    btn.id = "pv-btn"; btn.type = "button"; btn.setAttribute("data-pv-ui", "1");
    btn.addEventListener("click", function () { if (locked) openModal(); else lock(); });
    document.body.appendChild(btn);

    var modal = document.createElement("div");
    modal.id = "pv-modal"; modal.setAttribute("data-pv-ui", "1");
    modal.innerHTML =
      '<div class="pv-card" role="dialog" aria-modal="true">' +
      "<h3>🔒 ดูจำนวนเงินในพอร์ต</h3>" +
      "<p>จำนวนเงินถูกซ่อนไว้ (แสดงเป็น XXX) — ใส่รหัสของระบบเพื่อแสดงจำนวนจริง · % และข้อมูลอื่นแสดงปกติอยู่แล้ว</p>" +
      '<input id="pv-input" type="password" autocomplete="current-password" placeholder="รหัสผ่าน" />' +
      '<div class="pv-err" id="pv-err"></div>' +
      '<div class="pv-row"><button type="button" class="pv-cancel" id="pv-cancel">ยกเลิก</button>' +
      '<button type="button" class="pv-ok" id="pv-ok">ปลดล็อก</button></div>' +
      "</div>";
    document.body.appendChild(modal);
    document.getElementById("pv-cancel").addEventListener("click", closeModal);
    document.getElementById("pv-ok").addEventListener("click", submitModal);
    document.getElementById("pv-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); submitModal(); }
      else if (e.key === "Escape") { e.preventDefault(); closeModal(); }
    });
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
    updateButton();
  }

  function boot() {
    try { locked = sessionStorage.getItem(UNLOCK_KEY) !== "1"; } catch (e) { locked = true; }
    startObserver();
    injectUI();
    if (locked) walkMask(document.body);
    updateButton();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.PortfolioPrivacy = {
    maskText: maskText,
    isLocked: function () { return locked; },
    lock: lock,
    unlock: function (candidate) { return verify(candidate).then(function (ok) { if (ok) doUnlock(); return ok; }); }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = { maskText: maskText };
})();
