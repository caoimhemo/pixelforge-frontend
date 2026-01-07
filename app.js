// =====================
// 1) SET YOUR ENDPOINTS
// =====================
// These should be your Logic App callback URLs.
// Because you're using Consumption Logic Apps, you’ll call them like:
// - GETALL:  <url>
// - CREATE:  <url>   (multipart form-data)
// - UPDATE:  <url>?id=POST_ID
// - DELETE:  <url>?id=POST_ID

const ENDPOINTS = {
  GET_ALL: "https://prod-14.germanywestcentral.logic.azure.com:443/workflows/df807c42e6084edaaf3eabfd695f8eda/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=Jkx7haI9yt9EC4n4huAvT3umBZ-9njb3323497C2UGw",
  CREATE: "https://prod-24.germanywestcentral.logic.azure.com:443/workflows/83a0398702e14cd9b36d4988696906c4/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=wRcLxz7JFAO2nw-LfF16_p1G33U_co5hi3GphHOTf3s",
  UPDATE: "https://prod-19.germanywestcentral.logic.azure.com:443/workflows/6f10094c34ca4c60952fa12c40af5ec5/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=gTo1cgwbW-x7SxhEn8NM4bcd6sL88bMBdyYBNDzOge0",
  DELETE: "https://prod-26.germanywestcentral.logic.azure.com:443/workflows/e2153f12545c4825af8fa27cd4b315c4/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=TFzT2iseFseIPZuvFznJT3V_Dsp51wILnGp6j7bD4-4",
};

// =====================
// 2) DOM HOOKS
// =====================
const feed = document.getElementById("feed");
const btnRefresh = document.getElementById("btnRefresh");
const getAllHint = document.getElementById("getAllHint");

const uploadForm = document.getElementById("uploadForm");
const uploadStatus = document.getElementById("uploadStatus");

const updateForm = document.getElementById("updateForm");
const updateStatus = document.getElementById("updateStatus");

getAllHint.textContent = ENDPOINTS.GET_ALL;

// =====================
// 3) HELPERS
// =====================
function toTagsArray(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function setStatus(el, msg, ok = true) {
  el.textContent = msg;
  el.classList.remove("ok", "bad");
  el.classList.add(ok ? "ok" : "bad");
}

function ensureConfigured() {
  const missing = Object.entries(ENDPOINTS).filter(([, v]) => !v || v.includes("PASTE_YOUR"));
  if (missing.length) {
    feed.innerHTML =
      `<div class="skeleton">
        Set your Logic App URLs in <code>app.js</code> (ENDPOINTS).
        Missing: <b>${missing.map(([k]) => k).join(", ")}</b>
      </div>`;
    return false;
  }
  return true;
}

// =====================
// 4) API CALLS
// =====================
async function apiGetAll() {
  const res = await fetch(ENDPOINTS.GET_ALL, { method: "GET" });
  if (!res.ok) throw new Error(`GET_ALL failed: ${res.status}`);
  return await res.json();
}

async function apiCreatePost(formData) {
  const res = await fetch(ENDPOINTS.CREATE, {
    method: "POST",
    body: formData, // multipart/form-data automatically set by browser
  });
  if (!res.ok) throw new Error(`CREATE failed: ${res.status}`);
  return await res.json();
}

async function apiUpdatePost(id, payload) {
  const url = `${ENDPOINTS.UPDATE}?id=${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`UPDATE failed: ${res.status}`);
  return await res.json();
}

async function apiDeletePost(id) {
  const url = `${ENDPOINTS.DELETE}?id=${encodeURIComponent(id)}`;
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE failed: ${res.status}`);
  return await res.json().catch(() => ({}));
}

// =====================
// 5) RENDER
// =====================
function render(posts) {
  if (!Array.isArray(posts) || posts.length === 0) {
    feed.innerHTML = `<div class="skeleton">No posts yet. Upload one on the left.</div>`;
    return;
  }

  // newest first if you have createdAt-like field
  posts.sort((a, b) => {
    const da = Date.parse(pick(a, "createdAt", "upload_date", "date_posted") || "") || 0;
    const db = Date.parse(pick(b, "createdAt", "upload_date", "date_posted") || "") || 0;
    return db - da;
  });

  feed.innerHTML = posts
    .map((p) => {
      const id = pick(p, "id", "media_id", "postId");
      const gameTitle = pick(p, "gameTitle", "title", "game", "game_id") || "Untitled";
      const description = pick(p, "description", "text") || "";
      const tags = pick(p, "tags") || [];

      // your docs might store url/blobUrl/url
      const mediaUrl = pick(p, "blobUrl", "url", "mediaUrl");

      const isVideo = typeof mediaUrl === "string" && mediaUrl.match(/\.(mp4|webm|ogg)(\?|$)/i);

      const mediaHtml = mediaUrl
        ? isVideo
          ? `<video controls src="${mediaUrl}"></video>`
          : `<img src="${mediaUrl}" alt="post media" />`
        : `<div class="skeleton">No media URL on this record</div>`;

      return `
        <article class="card">
          <div class="card-media">${mediaHtml}</div>
          <div class="card-body">
            <div class="card-title">
              <h3>${escapeHtml(gameTitle)}</h3>
              <span class="mini">ID: <code>${escapeHtml(String(id || "unknown"))}</code></span>
            </div>
            ${description ? `<div class="mini">${escapeHtml(description)}</div>` : ""}
            <div class="tags">
              ${(Array.isArray(tags) ? tags : []).map((t) => `<span class="tag">${escapeHtml(String(t))}</span>`).join("")}
            </div>
            <div class="actions">
              <button class="btn btn-secondary" data-action="prefill" data-id="${escapeAttr(String(id))}">Edit</button>
              <button class="btn btn-danger" data-action="delete" data-id="${escapeAttr(String(id))}">Delete</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(s) {
  return escapeHtml(s);
}

// =====================
// 6) EVENTS
// =====================
btnRefresh.addEventListener("click", async () => {
  if (!ensureConfigured()) return;
  try {
    const posts = await apiGetAll();
    render(posts);
  } catch (e) {
    feed.innerHTML = `<div class="skeleton">Error loading posts: ${escapeHtml(e.message)}</div>`;
  }
});

uploadForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!ensureConfigured()) return;

  uploadStatus.textContent = "Uploading...";
  uploadStatus.classList.remove("ok", "bad");

  try {
    const fd = new FormData(uploadForm);

    // Convert tags -> if your Logic App expects tags, send as string or separate fields.
    // Here we’ll send tags as a single comma string in "tags"
    const tags = toTagsArray(uploadForm.elements.tags.value);
    fd.set("tags", tags.join(","));

    const result = await apiCreatePost(fd);
    setStatus(uploadStatus, "Upload successful.", true);

    // refresh feed
    const posts = await apiGetAll();
    render(posts);

    // optionally prefill update id
    const newId = result?.id || result?.media_id;
    if (newId) updateForm.elements.id.value = newId;
  } catch (e) {
    setStatus(uploadStatus, `Upload failed: ${e.message}`, false);
  }
});

updateForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!ensureConfigured()) return;

  updateStatus.textContent = "Updating...";
  updateStatus.classList.remove("ok", "bad");

  try {
    const id = updateForm.elements.id.value.trim();
    if (!id) throw new Error("Missing post id.");

    const payload = {};
    const gameTitle = updateForm.elements.gameTitle.value.trim();
    const description = updateForm.elements.description.value.trim();
    const tagsRaw = updateForm.elements.tags.value.trim();

    if (gameTitle) payload.gameTitle = gameTitle;
    if (description) payload.description = description;
    if (tagsRaw) payload.tags = toTagsArray(tagsRaw);

    if (Object.keys(payload).length === 0) {
      throw new Error("Nothing to update — fill at least one field.");
    }

    await apiUpdatePost(id, payload);
    setStatus(updateStatus, "Update successful.", true);

    const posts = await apiGetAll();
    render(posts);
  } catch (e) {
    setStatus(updateStatus, `Update failed: ${e.message}`, false);
  }
});

feed.addEventListener("click", async (ev) => {
  const btn = ev.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.getAttribute("data-action");
  const id = btn.getAttribute("data-id");

  if (action === "prefill") {
    updateForm.elements.id.value = id;
    updateForm.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (action === "delete") {
    if (!confirm(`Delete post ${id}? This will delete blob + metadata.`)) return;
    try {
      await apiDeletePost(id);
      const posts = await apiGetAll();
      render(posts);
    } catch (e) {
      alert(`Delete failed: ${e.message}`);
    }
  }
});

// initial hint view
ensureConfigured();
