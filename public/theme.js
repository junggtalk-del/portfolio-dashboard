/*
 * theme.js — global light/dark theme controller.
 * Load this FIRST in <head> on every page (before stylesheets) so the theme
 * is applied before first paint (no flash). Persists choice in localStorage
 * so the selection follows the user across every page.
 */
(function () {
  "use strict";

  var KEY = "app-theme";
  var DEFAULT = "dark";

  function read() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }
  function write(value) {
    try {
      localStorage.setItem(KEY, value);
    } catch (e) {
      /* ignore */
    }
  }

  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var btn = document.getElementById("app-theme-toggle");
    if (btn) btn.textContent = theme === "dark" ? "🌙" : "☀️";
  }

  // Apply immediately (runs during <head> parse, before body paints).
  apply(read() || DEFAULT);

  function toggle() {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    write(next);
    apply(next);
  }

  function inject() {
    if (document.getElementById("app-theme-toggle")) return;
    var btn = document.createElement("button");
    btn.id = "app-theme-toggle";
    btn.type = "button";
    btn.title = "สลับธีม สว่าง / มืด";
    btn.setAttribute("aria-label", "Toggle light/dark theme");
    btn.addEventListener("click", toggle);
    document.body.appendChild(btn);
    apply(document.documentElement.getAttribute("data-theme") || DEFAULT);
  }

  if (document.body) inject();
  else document.addEventListener("DOMContentLoaded", inject);

  window.AppTheme = {
    toggle: toggle,
    set: function (t) { write(t); apply(t); },
    get: function () { return document.documentElement.getAttribute("data-theme") || DEFAULT; }
  };
})();
