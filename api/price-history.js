function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "s-maxage=300, stale-while-revalidate=600");
  res.end(JSON.stringify(payload));
}

async function fetchDailyHistory(symbol) {
  const endpoint = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  endpoint.searchParams.set("interval", "1d");
  endpoint.searchParams.set("range", "2y");
  endpoint.searchParams.set("includePrePost", "false");

  const response = await fetch(endpoint, {
    headers: {
      accept: "application/json",
      "user-agent": "portfolio-dashboard/1.0"
    }
  });
  if (!response.ok) throw new Error("price history request failed");

  const payload = await response.json();
  const result = payload.chart?.result?.[0];
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const rows = [];

  for (let index = 0; index < Math.min(timestamps.length, closes.length); index += 1) {
    const close = closes[index];
    const unix = timestamps[index];
    if (!Number.isFinite(close) || !Number.isFinite(unix)) continue;
    rows.push({
      date: new Date(unix * 1000).toISOString().slice(0, 10),
      close: Number(close)
    });
  }

  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return rows;
}

module.exports = async function handler(req, res) {
  const symbol = String(req.query?.symbol || "").trim().toUpperCase();
  if (!symbol) {
    send(res, 400, { error: "Please provide symbol." });
    return;
  }

  try {
    const rows = await fetchDailyHistory(symbol);
    send(res, 200, {
      symbol,
      dates: rows.map((row) => row.date),
      closes: rows.map((row) => row.close)
    });
  } catch (error) {
    send(res, 502, { error: "Unable to fetch daily price history." });
  }
};
