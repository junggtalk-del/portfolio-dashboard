"use strict";

// Tolerant request-body reader. Handlers run both on the local Node server
// (req.body is pre-parsed to an object) and on Vercel (req.body may be an
// object, a JSON string, a Buffer, or undefined). This normalizes all of them.
// Throws on malformed JSON so the caller can return a clear error.
function parseJsonBody(req) {
  const body = req && req.body;
  if (body == null) return {};
  if (Buffer.isBuffer(body)) {
    const text = body.toString("utf8").trim();
    return text ? JSON.parse(text) : {};
  }
  if (typeof body === "string") {
    const text = body.trim();
    return text ? JSON.parse(text) : {};
  }
  if (typeof body === "object") return body;
  return {};
}

module.exports = { parseJsonBody };
