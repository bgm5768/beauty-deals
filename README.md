# 뷰티핫딜 💄

커뮤니티 핫딜 게시판(뽐뿌·루리웹·클리앙·퀘이사존)에서 화장품 글만 골라내고, 올리브영·뷰티 이벤트 소식(구글 뉴스)을 함께 모아 보여주는 사이트.

```
site/     정적 사이트 (GitHub Pages)
worker/   크롤러 + API (Cloudflare Workers, 30분마다 수집, KV 저장)
```

## 배포 (자동)

`main`에 push하면 GitHub Actions가 워커를 배포하고, 워커 주소를 `site/config.js`에 넣어 Pages까지 배포합니다.

처음 한 번만 설정:

1. **Settings → Secrets and variables → Actions → New repository secret**
   - `CLOUDFLARE_API_TOKEN`: Cloudflare "Edit Cloudflare Workers" 템플릿으로 만든 토큰
   - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare 계정 ID
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**
3. **Actions → Deploy → Run workflow** (또는 아무 커밋 push)

Cloudflare 계정에서 Workers를 처음 쓰는 경우, 대시보드의 Workers 화면에 한 번 들어가 `workers.dev` 서브도메인을 먼저 등록해야 합니다.

## API

- `GET /api/deals` → `{ updatedAt, sources: [...], items: [...] }`
- `POST /api/refresh` (선택) → 즉시 재수집. `wrangler secret put REFRESH_TOKEN`으로 토큰을 정한 뒤 `Authorization: Bearer <토큰>` 헤더로 호출.

## 수정 포인트

- 수집처 추가/삭제: `worker/src/sources.js`
- 뷰티 판별 키워드, 카테고리, 오탐 제외 단어: `worker/src/classify.js`
- 테스트: `cd worker && npm test`
- 로컬 실행: `cd worker && npm run dev` 후 `site/index.html`을 열기 (기본 API 주소가 `localhost:8787`)

## 참고

게시글 제목과 링크만 보여주고 본문은 원 사이트로 연결합니다. 각 사이트가 RSS를 막거나 주소를 바꾸면 해당 소스만 "실패"로 표시되고 나머지는 계속 동작합니다.
