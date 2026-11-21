import assert from "node:assert";
import iconv from "iconv-lite";
import { crawl } from "../src/index.js";
import { isBeauty, extractMeta, categorize } from "../src/classify.js";

const rss = (items, enc = "utf-8") => `<?xml version="1.0" encoding="${enc}"?><rss><channel>${items
  .map((t, i) => `<item><title><![CDATA[${t}]]></title><link>https://ex.com/${encodeURIComponent(t)}</link><pubDate>${new Date(Date.now() - i * 6e5).toUTCString()}</pubDate><description>&lt;img src="https://img/x${i}.jpg"&gt; 설명</description></item>`)
  .join("")}</channel></rss>`;

const ppomppuXml = rss(["[쿠팡] 라로슈포제 안뗄리오스 선크림 50ml (15,900원/무료)", "[11번가] 삼성 모니터 27인치 (199,000원)", "[올리브영] 토리든 다이브인 세럼 1+1 기획"], "euc-kr");
const feeds = {
  ppomppu: new Response(iconv.encode(ppomppuXml, "euc-kr"), { headers: { "content-type": "text/xml; charset=euc-kr" } }),
  ruliweb: new Response(rss(["[G마켓] 롬앤 쥬시 래스팅 틴트 3개 (19,800원)", "[네이버] 아이스크림 기프티콘 (3,000원)", "[쿠팡] 아이패드 에어 (799,000원)"])),
  "news.google": new Response(rss(["올리브영, 12월 올영세일 시작…최대 70% 할인 - 매일경제"]).replace("</title>", "</title><source url='x'>매일경제</source>")),
};
const fetcher = async (url) => {
  if (url.includes("ppomppu")) return feeds.ppomppu.clone();
  if (url.includes("ruliweb")) return feeds.ruliweb.clone();
  if (url.includes("news.google")) return feeds["news.google"].clone();
  return new Response("blocked", { status: 403 });
};
const store = new Map();
const env = { DEALS: { get: async (k, t) => (store.has(k) ? JSON.parse(store.get(k)) : null), put: async (k, v) => store.set(k, v) } };

const data = await crawl(env, fetcher);
console.log(data.sources);
for (const it of data.items) console.log(it.kind, it.category, it.sourceName, it.price, "|", it.title);
const titles = data.items.map((i) => i.title);
assert(titles.some((t) => t.includes("라로슈포제")), "EUC-KR 디코딩/필터");
assert(!titles.some((t) => t.includes("모니터") || t.includes("아이스크림") || t.includes("아이패드")), "오탐 제외");
const laroche = data.items.find((i) => i.title.includes("라로슈포제"));
assert.equal(laroche.price, 15900); assert.equal(laroche.store, "쿠팡"); assert.equal(laroche.category, "선케어"); assert.equal(laroche.kind, "deal");
assert.equal(data.items.find((i) => i.title.includes("토리든")).kind, "event");
assert(data.items.some((i) => i.kind === "event" && i.sourceName === "매일경제"));
assert.equal(data.sources.find((s) => s.id === "clien").ok, false);
// 두 번째 크롤링: 중복 없이 병합
const again = await crawl(env, fetcher);
assert.equal(again.items.length, data.items.length);
assert.equal(extractMeta("[위메프] 닥터지 크림 2.5만원").price, 25000);
assert.equal(categorize("에스티로더 갈색병 세럼"), "스킨케어");
assert(!isBeauty("맥북 프로 M4"));
console.log("ALL TESTS PASSED");
