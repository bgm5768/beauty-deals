// 크롤링 소스 목록. 소스를 추가/삭제하려면 이 배열만 고치면 됩니다.
// kind: "deal" = 커뮤니티 핫딜 게시판(뷰티 키워드로 필터), "event" = 이벤트/세일 소식
// Google News는 OR로 여러 단어를 묶으면 결과가 0건이 되므로 단순 검색어 여러 개로 나눈다.
const NEWS_QUERIES = [
  ["news-olyoungsale", "올영세일", "올영세일", false],
  ["news-coupang", "쿠팡 뷰티", "쿠팡 뷰티 세일", true],
  ["news-musinsa", "무신사 뷰티", "무신사 뷰티 세일", true],
  ["news-daiso", "다이소 뷰티", "다이소 화장품", true],
  ["news-1plus1", "1+1·증정", "화장품 1+1", true],
  ["news-gift", "사은품·기획세트", "화장품 사은품", true],
  ["news-bf", "블랙프라이데이", "블랙프라이데이 화장품", true],
  ["news-oyevent", "올리브영 이벤트", "올리브영 이벤트", false],
  ["news-sulwhasoo", "설화수·럭셔리", "설화수 증정", true],
];

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
  ...NEWS_QUERIES.map(([id, name, q, filter]) => ({ id, name, kind: "event", url: gnews(q), filter })),
];


function gnews(q) {
  return (
    "https://news.google.com/rss/search?q=" +
    encodeURIComponent(q + " when:7d") +
    "&hl=ko&gl=KR&ceid=KR:ko"
  );
}
