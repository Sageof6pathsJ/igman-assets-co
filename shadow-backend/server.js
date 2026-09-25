import http from "node:http";

const PORT = Number(process.env.PORT || 10000);
const SHOP = (process.env.SHOPIFY_STORE_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "";
const API_VERSION = "2026-04";
const ALLOWED_ORIGIN = process.env.HQ_ORIGIN || "https://sageof6pathsj.github.io";

let cache = { at: 0, value: null };
const TTL_MS = 30000;

const QUERY = `query ShadowOrders {
  orders(first: 10, sortKey: CREATED_AT, reverse: true) {
    nodes {
      id
      name
      createdAt
      displayFinancialStatus
      displayFulfillmentStatus
      currentTotalPriceSet {
        shopMoney { amount currencyCode }
      }
      lineItems(first: 10) {
        nodes { title quantity }
      }
    }
  }
}`;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
}

function send(res, status, body) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function getShadowState() {
  if (!SHOP || !TOKEN) {
    return {
      mode: "SHADOW",
      connected: false,
      source: "shopify",
      reason: "awaiting_shopify_credentials",
      orderCount: 0,
      recentOrders: [],
      generatedAt: new Date().toISOString()
    };
  }

  const now = Date.now();
  if (cache.value && now - cache.at < TTL_MS) return cache.value;

  const response = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN
    },
    body: JSON.stringify({ query: QUERY })
  });

  if (!response.ok) throw new Error(`Shopify HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors.map(e => e.message).join("; "));

  const orders = payload.data?.orders?.nodes || [];
  const recentOrders = orders.map(o => ({
    id: o.id,
    name: o.name,
    createdAt: o.createdAt,
    financialStatus: o.displayFinancialStatus,
    fulfillmentStatus: o.displayFulfillmentStatus,
    total: o.currentTotalPriceSet?.shopMoney?.amount || "0.00",
    currency: o.currentTotalPriceSet?.shopMoney?.currencyCode || "USD",
    itemCount: (o.lineItems?.nodes || []).reduce((n, item) => n + Number(item.quantity || 0), 0)
  }));

  const value = {
    mode: "SHADOW",
    connected: true,
    source: "shopify",
    orderCount: recentOrders.length,
    recentOrders,
    permissions: { read: true, write: false, refunds: false, messaging: false, fulfillmentWrites: false },
    generatedAt: new Date().toISOString()
  };
  cache = { at: now, value };
  return value;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    cors(res); res.writeHead(204); return res.end();
  }
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/health") {
    return send(res, 200, { ok: true, service: "soft-chaos-shadow", mode: "SHADOW" });
  }
  if (req.method === "GET" && url.pathname === "/api/state") {
    try { return send(res, 200, await getShadowState()); }
    catch (error) {
      return send(res, 502, {
        mode: "SHADOW", connected: false, source: "shopify",
        error: "shopify_read_failed", detail: String(error.message || error),
        orderCount: 0, recentOrders: [], generatedAt: new Date().toISOString()
      });
    }
  }
  return send(res, 404, { error: "not_found" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Soft Chaos Shadow backend listening on ${PORT}`);
});