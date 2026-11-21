// 임시 진단용 (배포 확인 후 삭제)
const UA = "Mozilla/5.0 (compatible; BeautyDealsBot/1.0; +https://github.com/)";
const CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const RSS_ACCEPT = "application/rss+xml, application/xml, text/xml, */*";
const G = { headers: { "User-Agent": CHROME, Accept: "text/html,application/xhtml+xml,*/*;q=0.8" } };

const proxied = (url) => [
  [`jina:${url.slice(0, 28)}`, `https://r.jina.ai/${url}`, { headers: { "User-Agent": UA } }],
  [`allorigins:${url.slice(0, 24)}`, `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, { headers: { "User-Agent": UA } }],
  [`codetabs:${url.slice(0, 24)}`, `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`, { headers: { "User-Agent": UA } }],
];

export const EXPERIMENTS = [
  // 뽐뿌: RSS 200이지만 0바이트
  ["ppomppu-rss", "https://www.ppomppu.co.kr/rss.php?id=ppomppu", { headers: { "User-Agent": UA, Accept: RSS_ACCEPT } }],
  ["ppomppu-rss-id", "https://www.ppomppu.co.kr/rss.php?id=ppomppu", { headers: { "User-Agent": UA, Accept: RSS_ACCEPT, "Accept-Language": "ko-KR" }, cf: { cacheTtl: 0 } }],
  ["ppomppu-m", "https://m.ppomppu.co.kr/new/bbs_list.php?id=ppomppu", G],
  // 루리웹
  ["ruliweb-rss", "https://bbs.ruliweb.com/market/board/1020/rss", { headers: { "User-Agent": UA, Accept: RSS_ACCEPT } }],
  ["ruliweb-www", "https://www.ruliweb.com/", G],
  // 클리앙 HTML 파싱 가능
  ["clien-html", "https://www.clien.net/service/board/jirum", G],
  // 퀘이사존 WAF
  ["quasarzone-html", "https://quasarzone.com/bbs/qb_saleinfo", G],
  // 프록시 경유
  ...proxied("https://www.ppomppu.co.kr/rss.php?id=ppomppu"),
  ...proxied("https://bbs.ruliweb.com/market/board/1020/rss"),
  ...proxied("https://quasarzone.com/bbs/qb_saleinfo/rss"),
  ...proxied("https://www.clien.net/service/board/jirum/rss"),
  ["control", "https://example.com", {}],
];

export async function runDiag() {
  return Promise.all(
    EXPERIMENTS.map(async ([name, url, init]) => {
      try {
        const res = await fetch(url, init);
        const buf = await res.arrayBuffer();
        return {
          name,
          status: res.status,
          bytes: buf.byteLength,
          ct: res.headers.get("content-type"),
          head: new TextDecoder().decode(buf.slice(0, 110)).replace(/\s+/g, " "),
        };
      } catch (e) {
        return { name, error: String(e?.message || e).slice(0, 200) };
      }
    })
  );
}
