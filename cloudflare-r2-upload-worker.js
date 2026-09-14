// Deploy with: wrangler deploy cloudflare-r2-upload-worker.js
// Bind an R2 bucket as IMAGES and set UPLOAD_TOKEN plus PUBLIC_BASE_URL as Worker secrets/vars.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-File-Name"
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (request.method !== "POST") return json({ error: "POST only" }, 405);
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
