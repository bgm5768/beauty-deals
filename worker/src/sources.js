// 크롤링 소스 목록. 소스를 추가/삭제하려면 이 배열만 고치면 됩니다.
// kind: "deal" = 커뮤니티 핫딜 게시판(뷰티 키워드로 필터), "event" = 이벤트/세일 소식
export const SOURCES = [
  {
    id: "ppomppu",
    name: "뽐뿌",
    kind: "deal",
    url: "https://www.ppomppu.co.kr/rss.php?id=ppomppu",
    filter: true,
  },
  {
    id: "ruliweb",
    name: "루리웹",
    kind: "deal",
    url: "https://bbs.ruliweb.com/market/board/1020/rss",
    filter: true,
  },
  {
    id: "clien",
    name: "클리앙",
    kind: "deal",
    url: "https://www.clien.net/service/board/jirum/rss",
    filter: true,
  },
  {
    id: "quasarzone",
    name: "퀘이사존",
    kind: "deal",
    url: "https://quasarzone.com/bbs/qb_saleinfo/rss",
    filter: true,
  },
  {
    id: "news-oliveyoung",
    name: "올리브영 소식",
    kind: "event",
    url: gnews("올리브영 세일 OR 올영세일 OR 올리브영 이벤트"),
    filter: false,
  },
  {
    id: "news-beauty",
    name: "뷰티 이벤트 소식",
    kind: "event",
    url: gnews("화장품 할인 이벤트 OR 뷰티 세일 OR 화장품 증정"),
    filter: true,
  },
];

function gnews(q) {
  return (
    "https://news.google.com/rss/search?q=" +
    encodeURIComponent(q + " when:7d") +
    "&hl=ko&gl=KR&ceid=KR:ko"
  );
}
