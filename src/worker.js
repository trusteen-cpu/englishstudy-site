// 마스터 영어 — 교재 잠금·1일 체험·접속 코드
// /apps/<교재>/... 는 산 사람(코드)이나 체험 중인 사람만 연다. 나머지 파일은 그대로 내보낸다.
// 필요한 설정: KV 바인딩 KV, 비밀 값 SECRET(서명용)·ADMIN_KEY(코드 발급 화면 열쇠)

const APPS = ["voa", "words-1000-mid", "words-1000-basic", "words-2000", "words-5000"];
const DAY = 24 * 3600 * 1000;
const TRIAL_MS = 1 * DAY;            // 1일 체험
const TRIAL_AGAIN_MS = 30 * DAY;     // 같은 곳(네트워크)에서 같은 교재 체험은 30일에 한 번
const OWN_MS = 3650 * DAY;           // 산 교재는 이 기기에서 10년
const MAX_DEVICES = 3;               // 코드 하나로 열 수 있는 기기 수
const enc = new TextEncoder();

const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function sign(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
async function sha(s) { return b64u(await crypto.subtle.digest("SHA-256", enc.encode(s))).slice(0, 22); }

function cookies(req) {
  const out = {};
  (req.headers.get("Cookie") || "").split(/;\s*/).forEach(p => { const i = p.indexOf("="); if (i > 0) out[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1)); });
  return out;
}
const setCookie = (name, value, ms) =>
  `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${Math.floor(ms / 1000)}; HttpOnly; Secure; SameSite=Lax`;

// 통행증: "t|p" . 교재 . 끝나는 때 . 서명
async function pass(env, kind, app, until) { return `${kind}.${app}.${until}.${await sign(env.SECRET, `${kind}.${app}.${until}`)}`; }
async function readPass(env, req, app) {
  const v = cookies(req)["me_" + app]; if (!v || !env.SECRET) return null;
  const [kind, a, until, sig] = v.split(".");
  if (a !== app || +until < Date.now()) return null;
  if (sig !== await sign(env.SECRET, `${kind}.${a}.${until}`)) return null;
  return { kind, until: +until };
}

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });

function deviceId(req) { return cookies(req).me_dev || crypto.randomUUID(); }

function newCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", r = crypto.getRandomValues(new Uint8Array(8));
  const s = [...r].map(x => A[x % A.length]).join("");
  return `ME-${s.slice(0, 4)}-${s.slice(4)}`;
}

function lockPage(app) {
  return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>마스터 영어 · 교재 열기</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#EEF1EC;font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif;color:#16241F;padding:20px}
.box{background:#FBFCF9;border-radius:16px;padding:26px 24px;max-width:380px;width:100%;box-shadow:0 10px 24px -14px rgba(22,36,31,.4)}
h1{margin:0 0 6px;font-size:22px}p{color:#4A5A53;font-size:14.5px;margin:0 0 16px;line-height:1.6}
input{width:100%;box-sizing:border-box;font:inherit;font-size:17px;letter-spacing:.06em;text-transform:uppercase;padding:11px 12px;border:1.5px solid #CBD4CE;border-radius:10px}
button{width:100%;margin-top:10px;font:inherit;font-weight:700;font-size:15px;border:0;border-radius:10px;padding:12px;cursor:pointer;background:#16241F;color:#fff}
button.alt{background:#F2D23C;color:#16241F}a{color:#2F6B57}.msg{min-height:20px;font-size:13.5px;color:#D8573C;margin-top:8px}
</style></head><body><div class="box">
<h1>🔒 교재 열기</h1><p>받으신 접속 코드를 넣거나, 하루 무료로 체험해 보세요.</p>
<input id="c" placeholder="ME-XXXX-XXXX" autocomplete="off"><button id="go">코드로 열기</button>
<button class="alt" id="tr">1일 무료 체험</button><div class="msg" id="m"></div>
<p style="margin-top:14px"><a href="/">← 마스터 영어로 돌아가기</a></p></div>
<script>
const app=${JSON.stringify(app)},m=document.getElementById("m");
async function post(u,b){const r=await fetch(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)});return [r.ok,await r.json().catch(()=>({}))];}
document.getElementById("go").onclick=async()=>{const [ok,d]=await post("/api/unlock",{code:document.getElementById("c").value});
 if(ok&&d.app===app)location.reload();else if(ok)location.href="/apps/"+d.app+"/";else m.textContent=d.error||"코드를 확인해 주세요.";};
document.getElementById("tr").onclick=async()=>{const [ok,d]=await post("/api/trial",{app});if(ok)location.reload();else m.textContent=d.error||"체험을 시작할 수 없습니다.";};
</script></body></html>`, { status: 403, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), p = url.pathname;

    // ── 교재 잠금 ──
    const m = p.match(/^\/apps\/([a-z0-9-]+)(\/|$)/);
    if (m) {
      const app = m[1];
      if (!APPS.includes(app)) return env.ASSETS.fetch(req);
      if (await readPass(env, req, app)) return env.ASSETS.fetch(req);
      return lockPage(app);
    }

    // ── 1일 체험 ──
    if (p === "/api/trial" && req.method === "POST") {
      const { app } = await req.json().catch(() => ({}));
      if (!APPS.includes(app)) return json({ error: "없는 교재입니다." }, 400);
      if (!env.SECRET || !env.KV) return json({ error: "체험 준비 중입니다." }, 503);
      const now = await readPass(env, req, app);
      if (now) return json({ ok: true, until: now.until });
      const who = await sha((req.headers.get("CF-Connecting-IP") || "") + "|" + env.SECRET);
      const k = `trial:${app}:${who}`;
      if (await env.KV.get(k)) return json({ error: "이 교재의 무료 체험은 이미 사용하셨습니다. 받기로 계속 이용하실 수 있습니다." }, 403);
      const until = Date.now() + TRIAL_MS;
      await env.KV.put(k, String(Date.now()), { expirationTtl: Math.floor(TRIAL_AGAIN_MS / 1000) });
      return json({ ok: true, until }, 200, { "Set-Cookie": setCookie("me_" + app, await pass(env, "t", app, until), TRIAL_MS) });
    }

    // ── 접속 코드로 열기 ──
    if (p === "/api/unlock" && req.method === "POST") {
      if (!env.SECRET || !env.KV) return json({ error: "준비 중입니다." }, 503);
      const { code } = await req.json().catch(() => ({}));
      const c = String(code || "").trim().toUpperCase().replace(/\s+/g, "");
      const rec = c && await env.KV.get("code:" + c, "json");
      if (!rec) return json({ error: "맞지 않는 코드입니다. 다시 확인해 주세요." }, 404);
      const dev = deviceId(req);
      rec.devices = rec.devices || [];
      if (!rec.devices.includes(dev)) {
        if (rec.devices.length >= MAX_DEVICES) return json({ error: `이 코드는 기기 ${MAX_DEVICES}대까지 쓸 수 있습니다. 문의해 주세요.` }, 403);
        rec.devices.push(dev); rec.used = Date.now();
        await env.KV.put("code:" + c, JSON.stringify(rec));
      }
      const until = Date.now() + OWN_MS, h = new Headers({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      h.append("Set-Cookie", setCookie("me_" + rec.app, await pass(env, "p", rec.app, until), OWN_MS));
      h.append("Set-Cookie", setCookie("me_dev", dev, OWN_MS));
      return new Response(JSON.stringify({ ok: true, app: rec.app }), { headers: h });
    }

    // ── 이 기기의 상태(산 교재·체험 남은 시간) ──
    if (p === "/api/status") {
      const out = {};
      for (const a of APPS) { const s = await readPass(env, req, a); if (s) out[a] = s; }
      return json(out);
    }

    // ── 코드 발급(선생님 전용) ──
    if (p.startsWith("/api/admin/")) {
      if (!env.ADMIN_KEY || req.headers.get("X-Admin-Key") !== env.ADMIN_KEY) return json({ error: "열쇠가 맞지 않습니다." }, 401);
      if (p === "/api/admin/code" && req.method === "POST") {
        const { app, note } = await req.json().catch(() => ({}));
        if (!APPS.includes(app)) return json({ error: "없는 교재입니다." }, 400);
        let code; do { code = newCode(); } while (await env.KV.get("code:" + code));
        const rec = { app, note: String(note || "").slice(0, 120), created: Date.now(), devices: [] };
        await env.KV.put("code:" + code, JSON.stringify(rec));
        return json({ ok: true, code, ...rec });
      }
      if (p === "/api/admin/list") {
        const l = await env.KV.list({ prefix: "code:", limit: 200 }), rows = [];
        for (const k of l.keys) { const r = await env.KV.get(k.name, "json"); if (r) rows.push({ code: k.name.slice(5), ...r, devices: (r.devices || []).length }); }
        rows.sort((a, b) => b.created - a.created);
        return json(rows);
      }
      return json({ error: "없는 요청" }, 404);
    }

    return env.ASSETS.fetch(req);
  },
};
