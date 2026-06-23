"use strict";

// Shared resilient fetch for outbound calls to flaky upstreams (Yahoo, KAsset).
// - Enforces a hard timeout via AbortController (the #1 cause of hung functions).
// - Retries on network errors, 429 and 5xx with exponential backoff + jitter.
// - Does NOT retry on 4xx other than 429 (e.g. 404 = symbol not found).
// - Respects an upstream `Retry-After` header when present.

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}, settings = {}) {
  const timeoutMs = Number.isFinite(settings.timeoutMs) ? settings.timeoutMs : 6000;
  const retries = Number.isFinite(settings.retries) ? settings.retries : 2;
  const baseDelayMs = Number.isFinite(settings.retryDelayMs) ? settings.retryDelayMs : 400;

  let attempt = 0;
  let lastError = null;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);

      const isRetryableStatus = response.status === 429 || response.status >= 500;
      if (isRetryableStatus && attempt < retries) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const delay =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
        await sleep(delay);
        attempt += 1;
        continue;
      }
      return response;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt < retries) {
        await sleep(baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 200));
        attempt += 1;
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("fetchWithTimeout: retries exhausted");
}

// Yahoo Finance chart helper with query1 -> query2 host failover.
const YAHOO_HOSTS = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];

async function yahooChartJson(pathWithQuery, settings = {}) {
  let lastError = null;
  for (const host of YAHOO_HOSTS) {
    try {
      const response = await fetchWithTimeout(
        `https://${host}${pathWithQuery}`,
        {
          headers: {
            accept: "application/json",
            "user-agent": settings.userAgent || "portfolio-dashboard/1.0"
          }
        },
        { timeoutMs: settings.timeoutMs || 6000, retries: settings.retries == null ? 1 : settings.retries }
      );
      if (!response.ok) {
        lastError = new Error(`Yahoo request failed (${response.status})`);
        continue;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Yahoo request failed");
}

module.exports = { fetchWithTimeout, sleep, yahooChartJson };
