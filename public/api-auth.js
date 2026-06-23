/*
 * api-auth.js — single, page-agnostic auth layer for the dashboard.
 * Load this FIRST in <head> on every page (before any other script that fetches).
 *
 * What it does:
 *   1. Patches window.fetch so every same-origin /api/ request automatically
 *      carries the `x-portfolio-password` header from sessionStorage.
 *   2. Shows a self-contained login overlay when there is no stored password,
 *      or when any /api/ call comes back 401.
 *   3. Exposes window.PortfolioAuth = { getPassword, logout }.
 *
 * The real enforcement lives on the server (lib/auth.js + the api/* handlers).
 * This file only makes the browser send the password the user typed.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "portfolioPassword";
  var nativeFetch = window.fetch.bind(window);
  var overlayShown = false;

  function getPassword() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) || "";
    } catch (error) {
      return "";
    }
  }

  function setPassword(value) {
    try {
      sessionStorage.setItem(STORAGE_KEY, value);
    } catch (error) {
      /* ignore */
    }
  }

  function clearPassword() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      /* ignore */
    }
  }

  function isApiPath(url) {
    try {
      var parsed = new URL(url, window.location.origin);
      return parsed.origin === window.location.origin && parsed.pathname.indexOf("/api/") === 0;
    } catch (error) {
      return false;
    }
  }

  // Patch fetch: inject the password header for /api/ calls; trigger login on 401.
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : input && input.url ? input.url : String(input || "");
    var nextInput = input;
    var nextInit = init;

    if (isApiPath(url)) {
      var password = getPassword();
      var headers = new Headers(
        (init && init.headers) ||
          (typeof input !== "string" && input && input.headers) ||
          {}
      );
      if (password && !headers.has("x-portfolio-password")) {
        headers.set("x-portfolio-password", password);
      }
      if (typeof input === "string") {
        nextInit = Object.assign({}, init, { headers: headers });
      } else {
        // Request object: preserve method/body/url, override headers only.
        nextInput = new Request(input, { headers: headers });
        nextInit = init;
      }
    }

    return nativeFetch(nextInput, nextInit).then(function (response) {
      if (response && response.status === 401 && isApiPath(url)) {
        showLogin();
      }
      return response;
    });
  };

  function showLogin() {
    if (overlayShown) return;
    overlayShown = true;

    var overlay = document.createElement("div");
    overlay.id = "portfolio-auth-overlay";
    overlay.setAttribute(
      "style",
      "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;" +
        "justify-content:center;background:rgba(8,18,33,0.78);backdrop-filter:blur(4px);" +
        "font-family:'Noto Sans Thai',system-ui,sans-serif;"
    );

    var card = document.createElement("div");
    card.setAttribute(
      "style",
      "width:min(92vw,360px);background:#fff;border-radius:16px;padding:28px 24px;" +
        "box-shadow:0 24px 60px rgba(8,18,33,0.35);text-align:center;"
    );
    card.innerHTML =
      '<div style="font-size:28px;margin-bottom:6px;">🔒</div>' +
      '<h2 style="margin:0 0 4px;font-size:20px;color:#17324d;">เข้าสู่ระบบ Dashboard</h2>' +
      '<p style="margin:0 0 16px;font-size:13px;color:#6c778c;">กรอกรหัสผ่านเพื่อเข้าถึงข้อมูลพอร์ต</p>';

    var input = document.createElement("input");
    input.type = "password";
    input.autocomplete = "current-password";
    input.placeholder = "password";
    input.setAttribute(
      "style",
      "width:100%;box-sizing:border-box;padding:11px 13px;border:1px solid #d3dae6;" +
        "border-radius:10px;font-size:15px;margin-bottom:10px;"
    );

    var error = document.createElement("p");
    error.setAttribute("style", "margin:0 0 10px;min-height:16px;font-size:12px;color:#ef476f;");

    var button = document.createElement("button");
    button.type = "button";
    button.textContent = "เข้าใช้งาน";
    button.setAttribute(
      "style",
      "width:100%;padding:11px 13px;border:0;border-radius:10px;background:#0f8b8d;" +
        "color:#fff;font-size:15px;font-weight:600;cursor:pointer;"
    );

    card.appendChild(input);
    card.appendChild(error);
    card.appendChild(button);
    overlay.appendChild(card);

    function attach() {
      document.body.appendChild(overlay);
      input.focus();
    }
    if (document.body) attach();
    else document.addEventListener("DOMContentLoaded", attach);

    function submit() {
      var value = input.value;
      if (!value) {
        error.textContent = "กรุณากรอกรหัสผ่าน";
        return;
      }
      button.disabled = true;
      button.textContent = "กำลังตรวจสอบ...";
      error.textContent = "";
      // Verify with a real, auth-gated endpoint using the native fetch directly.
      nativeFetch("/api/portfolio", {
        cache: "no-store",
        headers: { "x-portfolio-password": value }
      })
        .then(function (response) {
          if (response.ok) {
            setPassword(value);
            window.location.reload();
            return;
          }
          button.disabled = false;
          button.textContent = "เข้าใช้งาน";
          error.textContent =
            response.status === 401 ? "รหัสผ่านไม่ถูกต้อง" : "เข้าระบบไม่สำเร็จ (" + response.status + ")";
        })
        .catch(function () {
          button.disabled = false;
          button.textContent = "เข้าใช้งาน";
          error.textContent = "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ";
        });
    }

    button.addEventListener("click", submit);
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") submit();
    });
  }

  // Proactively prompt for login if we have no password yet.
  function maybePrompt() {
    if (!getPassword()) showLogin();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", maybePrompt);
  } else {
    maybePrompt();
  }

  // Bounded-concurrency map: run `worker` over items with at most `limit` in flight.
  // Prevents the Refresh buttons from firing one fetch per asset all at once,
  // which throttles the upstream price provider.
  function mapWithConcurrency(items, limit, worker) {
    var arr = Array.isArray(items) ? items : [];
    return new Promise(function (resolve) {
      var results = new Array(arr.length);
      if (!arr.length) {
        resolve(results);
        return;
      }
      var max = Math.max(1, Math.min(limit || 4, arr.length));
      var nextIndex = 0;
      var completed = 0;
      function runNext() {
        if (nextIndex >= arr.length) return;
        var current = nextIndex;
        nextIndex += 1;
        Promise.resolve(worker(arr[current], current)).then(
          function (value) {
            results[current] = value;
          },
          function () {
            results[current] = undefined;
          }
        ).then(function () {
          completed += 1;
          if (completed === arr.length) resolve(results);
          else runNext();
        });
      }
      for (var i = 0; i < max; i += 1) runNext();
    });
  }
  window.mapWithConcurrency = mapWithConcurrency;

  window.PortfolioAuth = {
    getPassword: getPassword,
    logout: function () {
      clearPassword();
      window.location.reload();
    }
  };
})();
