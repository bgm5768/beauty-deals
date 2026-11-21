// GitHub Actions에서 실행: 크롤링 결과를 site/data.json 으로 저장한다 (Cloudflare IP 차단 회피).
import { writeFileSync, readFileSync } from "node:fs";
import { crawl } from "../src/index.js";

const PREV_URL = process.env.PREV_URL; // 이전 배포의 data.json (누적 병합용)
let saved;
const env = {
  DEALS: {
    get: async () => {
      if (!PREV_URL) return null;
      try { const r = await fetch(PREV_URL); return r.ok ? await r.json() : null; } catch { return null; }
    },
    put: async (_k, v) => { saved = v; },
  },
};
let scraped = [];
try { scraped = JSON.parse(readFileSync(new URL("../scrape/scraped.json", import.meta.url), "utf8")).items; } catch { console.warn("scraped.json 없음 (브라우저 수집 생략)"); }
const data = await crawl(env, fetch, scraped);
console.log(data.sources, data.items.length);
if (!data.items.length && !data.sources.some((s) => s.ok)) { console.error("모든 소스 실패"); process.exit(1); }
writeFileSync(process.argv[2] || "../site/data.json", saved);
