import iconv from "iconv-lite";
import { SOURCES } from "./sources.js";
import { parseFeed } from "./rss.js";
import { isBeauty, isPromoNews, categorize, looksLikeEvent, extractMeta } from "./classify.js";

const KV_KEY = "deals:v1";
const KEEP_DAYS = 7;
const MAX_ITEMS = 600;
const UA = "Mozilla/5.0 (compatible; BeautyDealsBot/1.0; +https://github.com/)";

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors() });

    if (url.pathname === "/api/deals") {
      let data = await env.DEALS.get(KV_KEY, "json");
      if (!data) data = await crawl(env); // 첫 요청 시 즉시 수집
      return json(data, { "Cache-Control": "public, max-age=60" });
    }

    if (url.pathname === "/api/refresh" && req.method === "POST") {
      const token = env.REFRESH_TOKEN;
      if (!token || req.headers.get("authorization") !== `Bearer ${token}`) {
        return json({ error: "unauthorized" }, {}, 401);
      }
      const data = await crawl(env);
      return json({ ok: true, count: data.items.length, sources: data.sources });
    }

    if (url.pathname === "/api/diag") {
      const { runDiag } = await import("./diag.js");
      return json(await runDiag());
    }

    if (url.pathname === "/" || url.pathname === "/api/health") {
      return json({ ok: true, endpoints: ["/api/deals"] });
    }
    return json({ error: "not found" }, {}, 404);
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(crawl(env));
  },
};

export async function crawl(env, fetcher = fetch, scraped = []) {
  const prev = (await env.DEALS.get(KV_KEY, "json")) || { items: [] };
  const results = await Promise.allSettled(SOURCES.map((s) => crawlSource(s, fetcher, scraped)));

  const sources = [];
  const fresh = [];
  results.forEach((r, i) => {
    const s = SOURCES[i];
    if (r.status === "fulfilled") {
      sources.push({ id: s.id, name: s.name, ok: true, count: r.value.length });
      fresh.push(...r.value);
    } else {
      sources.push({ id: s.id, name: s.name, ok: false, error: String(r.reason?.message || r.reason).slice(0, 120) });
    }
  });

  // 기존 데이터와 병합 (링크 기준 중복 제거, 오래된 것 정리)
  const srcById = new Map(SOURCES.map((s) => [s.id, s]));
  const keep = (it) => { const s = srcById.get(it.source); return s && (s.kind !== "event" || s.scrape || isPromoNews(it.title)); };
  const byId = new Map(prev.items.filter(keep).map((it) => [it.id, it]));
  for (const it of fresh) {
    const old = byId.get(it.id);
    byId.set(it.id, old ? { ...old, ...it, firstSeen: old.firstSeen } : it);
  }
  const cutoff = Date.now() - KEEP_DAYS * 86400e3;
  const items = [...byId.values()]
    .filter((it) => new Date(it.date || it.firstSeen).getTime() >= cutoff)
    .sort((a, b) => new Date(b.date || b.firstSeen) - new Date(a.date || a.firstSeen))
    .slice(0, MAX_ITEMS);

  const data = { updatedAt: new Date().toISOString(), sources, items };
  await env.DEALS.put(KV_KEY, JSON.stringify(data));
  return data;
}

async function crawlSource(src, fetcher, scraped) {
  const now = new Date().toISOString();
  // scrape: scrapling 브라우저가 미리 수집한 항목(RSS가 막힌 사이트)
  if (src.scrape) return build(src, scraped.filter((it) => it.source === src.id), now);
  const res = await fetcher(src.url, {
    headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
    cf: { cacheTtl: 300 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = decode(await res.arrayBuffer(), res.headers.get("content-type"));
  return build(src, parseFeed(xml), now);
}

function build(src, items, now) {
  const ok = (t) => (src.kind === "event" && !src.scrape ? isPromoNews(t) : !src.filter || isBeauty(t));
  return items
    .filter((it) => ok(it.title))
    .map((it) => {
      const meta = extractMeta(it.title);
      // 이벤트 소스는 이벤트, 핫딜 게시판 글은 가격 없이 이벤트성 단어만 있으면 이벤트로 분류
      const kind = src.kind === "event" || (looksLikeEvent(it.title) && !meta.price) ? "event" : "deal";
      return {
        id: hash(it.link),
        title: it.title,
        link: it.link,
        image: it.image,
        summary: src.kind === "event" ? it.description : "",
        date: it.date || now,
        firstSeen: now,
        source: src.id,
        sourceName: src.kind === "event" && it.sourceName ? it.sourceName : src.name,
        kind,
        category: categorize(it.title),
        ...meta,
      };
    });
}

async function probe(target) {
  const CHROME =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
  const variants = {
    bot: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
    chrome: {
      "User-Agent": CHROME,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    },
    chromeNoAccept: { "User-Agent": CHROME },
    default: {},
  };
  const out = {};
  for (const [name, h] of Object.entries(variants)) {
    try {
      const res = await fetch(target, { headers: h });
      const buf = await res.arrayBuffer();
      out[name] = {
        status: res.status,
        bytes: buf.byteLength,
        ct: res.headers.get("content-type"),
        enc: res.headers.get("content-encoding"),
        head: new TextDecoder().decode(buf.slice(0, 90)).replace(/\s+/g, " "),
      };
    } catch (e) {
      out[name] = { error: String(e.message || e).slice(0, 160) };
    }
  }
  return out;
}

// 뽐뿌처럼 EUC-KR로 내려오는 피드 처리
function decode(buf, contentType = "") {
  const head = new TextDecoder("latin1").decode(buf.slice(0, 300));
  const declared = (contentType.match(/charset=([\w-]+)/i) || head.match(/encoding=["']([\w-]+)["']/i) || [])[1] || "utf-8";
  const enc = declared.toLowerCase();
  if (enc === "utf-8" || enc === "utf8") return new TextDecoder("utf-8").decode(buf);
  try {
    return new TextDecoder(enc).decode(buf);
  } catch {
    return iconv.decode(new Uint8Array(buf), enc === "ks_c_5601-1987" ? "cp949" : enc);
  }
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}

function json(body, headers = {}, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors(), ...headers },
  });
}
