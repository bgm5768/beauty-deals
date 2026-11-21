// 임시 진단용 (배포 확인 후 삭제)
const UA = "Mozilla/5.0 (compatible; BeautyDealsBot/1.0; +https://github.com/)";
const FEEDS = {
  ppomppu: "https://www.ppomppu.co.kr/rss.php?id=ppomppu",
  ruliweb: "https://bbs.ruliweb.com/market/board/1020/rss",
  clien: "https://www.clien.net/service/board/jirum/rss",
  quasarzone: "https://quasarzone.com/bbs/qb_saleinfo/rss",
};

const rss2json = (u) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(u)}`;
const jina = (u) => `https://r.jina.ai/${u}`;

export async function runDiag() {
  const out = [];
  // rss2json (서버측 fetch + JSON 변환)
  for (const [id, url] of Object.entries(FEEDS)) {
    try {
      const res = await fetch(rss2json(url));
      const text = await res.text();
      let count = null;
      try {
        const j = JSON.parse(text);
        count = j.items?.length ?? null;
      } catch {}
      out.push({ name: `rss2json:${id}`, status: res.status, bytes: text.length, count, head: text.slice(0, 90).replace(/\s+/g, " ") });
    } catch (e) {
      out.push({ name: `rss2json:${id}`, error: String(e?.message || e).slice(0, 120) });
    }
  }
  // jina (순차 + 간격)
  for (const [id, url] of Object.entries(FEEDS)) {
    try {
      const res = await fetch(jina(url), { headers: { "User-Agent": UA, "X-Return-Format": "text" } });
      const text = await res.text();
      out.push({ name: `jina:${id}`, status: res.status, bytes: text.length, head: text.slice(0, 90).replace(/\s+/g, " ") });
    } catch (e) {
      out.push({ name: `jina:${id}`, error: String(e?.message || e).slice(0, 120) });
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return out;
}
