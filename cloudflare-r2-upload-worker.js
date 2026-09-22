// Deploy with: wrangler deploy cloudflare-r2-upload-worker.js
// Bind an R2 bucket as IMAGES and set UPLOAD_TOKEN plus PUBLIC_BASE_URL as Worker secrets/vars.
// PUBLIC_BASE_URL should point back to this Worker for protected image delivery.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-File-Name"
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "X-Content-Type-Options": "nosniff" }
  });
}

function imageHeaders(metadata) {
  return {
    ...corsHeaders,
    "Content-Type": metadata?.httpMetadata?.contentType || "image/webp",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Disposition": "inline",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer"
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    if (request.method === "GET") {
      const key = decodeURIComponent(new URL(request.url).pathname.replace(/^\/+/, ""));
      if (!key || key.includes("..")) return json({ error: "Invalid image key" }, 400);
      const object = await env.IMAGES.get(key);
      if (!object) return new Response("Not found", { status: 404, headers: corsHeaders });
      return new Response(object.body, { headers: imageHeaders(object) });
    }

    if (request.method !== "POST") return json({ error: "GET, POST, or OPTIONS only" }, 405);
    const expected = String(env.UPLOAD_TOKEN || "");
    if (expected && request.headers.get("Authorization") !== `Bearer ${expected}`) {
      return json({ error: "Unauthorized" }, 401);
    }
    const contentType = request.headers.get("Content-Type") || "";
    if (contentType !== "image/webp" && contentType !== "image/svg+xml") return json({ error: "Only WebP and SVG are accepted" }, 415);
    const fileName = decodeURIComponent(request.headers.get("X-File-Name") || "image.webp")
      .replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
    const key = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${fileName}`;
    await env.IMAGES.put(key, request.body, { httpMetadata: { contentType } });
    const base = String(env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
    return json({ key, url: base ? `${base}/${encodeURIComponent(key)}` : "" }, 201);
  }
};

// Manual Cloudflare steps:
// 1. Set PUBLIC_BASE_URL to the Worker URL, not the R2 public development URL.
// 2. Keep the R2 bucket private and remove/disable its public development URL.
// 3. Configure CORS for the Worker/origin if your Cloudflare account requires it.
// 4. Keep UPLOAD_TOKEN secret; only the admin browser's local storage should contain it.
// Note: no browser can make a displayed image impossible to copy; this worker, watermark,
// signed/obscure delivery URL, no-referrer policy, and UI protections reduce casual reuse.
