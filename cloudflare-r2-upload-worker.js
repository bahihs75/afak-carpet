// Deploy with: wrangler deploy cloudflare-r2-upload-worker.js
// Bind an R2 bucket as IMAGES and set UPLOAD_TOKEN plus PUBLIC_BASE_URL as Worker secrets/vars.
// PUBLIC_BASE_URL should point back to this Worker for protected image delivery.
// Set ALLOWED_ORIGIN to the exact public site origin in production.

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGIN || "*");
  const allowedOrigins = allowed.split(",").map(value => value.trim()).filter(Boolean);
  const originAllowed = allowedOrigins.includes("*") || allowedOrigins.includes(origin);
  return {
    "Access-Control-Allow-Origin": originAllowed ? (origin || "*") : "null",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-File-Name",
    "Vary": "Origin"
  };
}

function json(body, status, request, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request, env), "Content-Type": "application/json", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" }
  });
}

function imageHeaders(metadata, request, env) {
  return {
    ...corsHeaders(request, env),
    "Content-Type": metadata?.httpMetadata?.contentType || "image/webp",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Disposition": "inline",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'"
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(request, env) });

    if (request.method === "GET") {
      const key = decodeURIComponent(new URL(request.url).pathname.replace(/^\/+/, ""));
      if (!key || key.includes("..")) return json({ error: "Invalid image key" }, 400, request, env);
      const object = await env.IMAGES.get(key);
      if (!object) return new Response("Not found", { status: 404, headers: corsHeaders(request, env) });
      return new Response(object.body, { headers: imageHeaders(object, request, env) });
    }

    if (request.method !== "POST") return json({ error: "GET, POST, or OPTIONS only" }, 405, request, env);
    const expected = String(env.UPLOAD_TOKEN || "");
    if (expected && request.headers.get("Authorization") !== `Bearer ${expected}`) {
      return json({ error: "Unauthorized" }, 401, request, env);
    }
    const contentType = request.headers.get("Content-Type") || "";
    const allowedTypes = new Set(["image/webp", "image/svg+xml", "video/mp4", "video/webm"]);
    if (!allowedTypes.has(contentType)) return json({ error: "Only WebP, SVG, MP4, and WebM are accepted" }, 415, request, env);
    const fileName = decodeURIComponent(request.headers.get("X-File-Name") || "image.webp")
      .replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
    const key = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${fileName}`;
    await env.IMAGES.put(key, request.body, { httpMetadata: { contentType } });
    const base = String(env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
    return json({ key, url: base ? `${base}/${encodeURIComponent(key)}` : "" }, 201, request, env);
  }
};

// Manual Cloudflare steps:
// 1. Set PUBLIC_BASE_URL to the Worker URL, not the R2 public development URL.
// 2. Keep the R2 bucket private and remove/disable its public development URL.
// 3. Set ALLOWED_ORIGIN to the exact public website origin (never * in production).
// 4. Keep UPLOAD_TOKEN secret; only the admin browser's local storage should contain it.
// Note: no browser can make a displayed image impossible to copy; private R2 delivery,
// obscure object keys, no-referrer policy, headers, and UI protections reduce casual reuse.
