// 뷰티 관련 여부 판단, 카테고리 분류, 가격/쇼핑몰 추출

const CATEGORIES = {
  // 순서 중요: 앞에서부터 먼저 매칭 (선크림이 스킨케어 "크림"에 걸리지 않게)
  선케어: ["선크림", "선블록", "선스틱", "선쿠션", "자외선차단", "선세럼", "선젤"],
  스킨케어: ["스킨", "토너", "로션", "에센스", "세럼", "앰플", "크림", "수분크림", "클렌징", "클렌저", "폼클렌", "마스크팩", "시트팩", "토너패드", "필링패드", "미스트", "아이크림", "레티놀", "비타민c", "시카"],
  메이크업: ["쿠션", "파운데이션", "립스틱", "틴트", "립밤", "립글로스", "아이섀도", "섀도우", "마스카라", "아이라이너", "블러셔", "컨실러", "프라이머", "파우더", "팩트", "메이크업베이스", "메이크업"],
  "헤어·바디": ["샴푸", "트리트먼트", "컨디셔너", "헤어", "바디워시", "바디로션", "핸드크림", "데오드란트", "탈모"],
  향수: ["향수", "퍼퓸", "오드퍼퓸", "오드뚜왈렛", "edp", "edt", "디퓨저"],
  "남성": ["남성화장품", "올인원", "애프터쉐이브", "쉐이빙"],
};

// 카테고리 키워드 외에 뷰티로 판단할 브랜드/스토어 키워드
const BEAUTY_EXTRA = [
  "화장품", "뷰티", "코스메틱", "올리브영", "올영", "시코르", "세포라", "아모레", "이니스프리", "설화수", "라네즈", "헤라", "에스트라", "일리윤",
  "닥터지", "라로슈포제", "아벤느", "바이오더마", "세타필", "피지오겔", "토리든", "라운드랩", "아누아", "메디힐", "달바", "넘버즈인", "마녀공장",
  "롬앤", "클리오", "페리페라", "3ce", "에뛰드", "미샤", "더페이스샵", "키엘", "에스티로더", "랑콤", "디올", "샤넬", "입생로랑", "조말론",
  "맥", "나스", "바닐라코", "닥터자르트", "코스알엑스", "구달", "스킨1004", "아이소이", "미쟝센", "려", "닥터포헤어", "니베아", "뉴트로지나",
];

// 뷰티 키워드가 들어있어도 제외할 단어 (오탐 방지)
const EXCLUDE = ["아이스크림", "크림빵", "크림치즈", "생크림", "휘핑크림", "슈크림", "팩트체크", "프로틴", "단백질", "올인원pc", "올인원 pc", "시카고", "게임", "스팀", "선풍기", "자동차", "타이어", "그래픽카드", "모니터"];

const EVENT_WORDS = ["이벤트", "세일", "증정", "기획전", "페스타", "쿠폰", "1+1", "특가", "프로모션", "할인전", "올영세일"];

const ALL_BEAUTY = [...Object.values(CATEGORIES).flat(), ...BEAUTY_EXTRA].map((w) => w.toLowerCase());

export function isBeauty(title) {
  const t = title.toLowerCase();
  if (EXCLUDE.some((w) => t.includes(w))) return false;
  return ALL_BEAUTY.some((w) => {
    // 짧은 영문 키워드(맥, 나스 등은 한글이라 괜찮음)는 단어 경계로만 매칭
    if (/^[a-z0-9]{1,3}$/.test(w)) return new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`).test(t);
    if (w.length === 1) return false; // "려" 같은 한 글자는 단독 매칭 안 함
    return t.includes(w);
  });
}

export function categorize(title) {
  const t = title.toLowerCase();
  for (const [cat, words] of Object.entries(CATEGORIES)) {
    if (words.some((w) => t.includes(w.toLowerCase()))) return cat;
  }
  return "기타";
}

export function looksLikeEvent(title) {
  return EVENT_WORDS.some((w) => title.includes(w));
}

// "[쿠팡] 라로슈포제 선크림 (15,900원/무료)" → { store: "쿠팡", price: 15900 }
export function extractMeta(title) {
  const store = (title.match(/^\s*\[([^\]]{1,20})\]/) || [])[1] || null;
  let price = null;
  const m = title.match(/([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,8})\s*원/);
  if (m) price = parseInt(m[1].replace(/,/g, ""), 10);
  else {
    const m2 = title.match(/([0-9]+(?:\.[0-9])?)\s*만\s*원/);
    if (m2) price = Math.round(parseFloat(m2[1]) * 10000);
  }
  const free = /무료\s*배송|\/\s*무료|무배/.test(title);
  return { store, price, freeShipping: free };
}
