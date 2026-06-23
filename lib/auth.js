"use strict";

const crypto = require("crypto");

// Constant-time string comparison to avoid leaking the password via timing.
function safeEqual(a, b) {
  const bufferA = Buffer.from(String(a == null ? "" : a));
  const bufferB = Buffer.from(String(b == null ? "" : b));
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

// Fail-closed: if APP_PASSWORD is not configured, NO request is authorized.
function isPasswordValid(req) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  const provided = req && req.headers ? req.headers["x-portfolio-password"] : undefined;
  if (!provided) return false;
  return safeEqual(provided, expected);
}

// Helper that writes a 401 and returns false when auth fails.
// `send` is the file-local responder: send(res, status, payload).
function requireAuth(req, res, send) {
  if (isPasswordValid(req)) return true;
  send(res, 401, { error: "Unauthorized: missing or incorrect password." });
  return false;
}

module.exports = { isPasswordValid, requireAuth, safeEqual };
