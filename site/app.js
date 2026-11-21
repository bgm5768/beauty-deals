(() => {
  const API = (window.API_BASE || "").replace(/\/$/, "") + "/api/deals";
  const CAT_ICON = { 스킨케어: "🧴", 선케어: "☀️", 메이크업: "💄", "헤어·바디": "🫧", 향수: "🌸", 남성: "🪒", 기타: "🛍️" };
  const $ = (id) => document.getElementById(id);

  const state = { items: [], kind: "all", cat: "전체", q: "", sort: "new", favs: loadFavs() };

  function loadFavs() {
    try { return JSON.parse(localStorage.getItem("favs") || "{}"); } catch { return {}; }
  }
  function saveFavs() {
    try { localStorage.setItem("favs", JSON.stringify(state.favs)); } catch {}
  }

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const won = (n) => n.toLocaleString("ko-KR") + "원";
  function ago(iso) {
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60) return "방금";
    if (s < 3600) return Math.floor(s / 60) + "분 전";
    if (s < 86400) return Math.floor(s / 3600) + "시간 전";
    return Math.floor(s / 86400) + "일 전";
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    let list = state.items.filter((it) => {
      if (state.kind === "fav") { if (!state.favs[it.id]) return false; }
      else if (state.kind !== "all" && it.kind !== state.kind) return false;
      if (state.cat !== "전체" && it.category !== state.cat) return false;
      if (q && !(it.title + " " + (it.store || "") + " " + it.sourceName).toLowerCase().includes(q)) return false;
      return true;
    });
    if (state.sort === "price") list = [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    return list;
  }

  function renderChips() {
    const base = state.items.filter((it) => state.kind === "all" || state.kind === "fav" || it.kind === state.kind);
    const counts = base.reduce((m, it) => ((m[it.category] = (m[it.category] || 0) + 1), m), {});
    const cats = ["전체", ...Object.keys(CAT_ICON).filter((c) => counts[c])];
    if (!cats.includes(state.cat)) state.cat = "전체";
    $("chips").innerHTML = cats
      .map((c) => `<button class="chip${c === state.cat ? " on" : ""}" data-cat="${esc(c)}">${c === "전체" ? "전체" : CAT_ICON[c] + " " + esc(c)}<small>${c === "전체" ? base.length : counts[c]}</small></button>`)
      .join("");
  }

  // "[쿠팡] 제품명 (15,900원/무료)" → "제품명" (쇼핑몰·가격은 배지/가격 줄에 따로 표시)
  function cleanTitle(it) {
    let t = it.title.replace(/^\s*\[[^\]]{1,20}\]\s*/, "");
    if (it.price) t = t.replace(/\s*\([^()]*원[^()]*\)\s*$/, "");
    return t || it.title;
  }

  function card(it) {
    const fresh = Date.now() - new Date(it.date) < 3 * 3600e3;
    const thumb = it.image
      ? `<div class="thumb" style="background-image:url('${esc(it.image)}')"></div>`
      : `<div class="thumb">${CAT_ICON[it.category] || "🛍️"}</div>`;
    return `<li class="card">
      <a class="cover" href="${esc(it.link)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(it.title)}"></a>
      ${thumb}
      <div class="body">
        <div class="badges">
          <span class="b ${it.kind}">${it.kind === "deal" ? "핫딜" : "이벤트"}</span>
          ${fresh ? '<span class="b new">NEW</span>' : ""}
          ${it.store ? `<span class="b">${esc(it.store)}</span>` : ""}
          ${it.category !== "기타" ? `<span class="b">${esc(it.category)}</span>` : ""}
        </div>
        <p class="title">${esc(cleanTitle(it))}</p>
        ${it.summary ? `<p class="summary">${esc(it.summary)}</p>` : ""}
        <div class="meta">
          ${it.price ? `<span class="price">${won(it.price)}</span>` : ""}
          ${it.freeShipping ? '<span class="ship">무료배송</span>' : ""}
          <span>${esc(it.sourceName)} · ${ago(it.date)}</span>
        </div>
      </div>
      <button class="fav${state.favs[it.id] ? " on" : ""}" data-fav="${esc(it.id)}" aria-label="찜하기">♥</button>
    </li>`;
  }

  function render() {
    renderChips();
    const list = filtered();
    $("list").innerHTML = list.map(card).join("");
    const empty = $("empty");
    empty.hidden = list.length > 0;
    empty.textContent = state.kind === "fav" ? "찜한 항목이 없어요. ♥를 눌러 저장해 보세요." : "조건에 맞는 항목이 없어요.";
  }

  async function load() {
    try {
      const res = await fetch(API, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      // 찜 목록은 원본이 사라져도 유지
      const ids = new Set(data.items.map((i) => i.id));
      const keptFavs = Object.values(state.favs).filter((f) => typeof f === "object" && !ids.has(f.id));
      state.items = [...data.items, ...keptFavs];
      $("updated").textContent = "업데이트 " + ago(data.updatedAt);
      $("sources").innerHTML =
        "수집처: " +
        data.sources.map((s) => (s.ok ? `${esc(s.name)} ${s.count}` : `<span class="bad" title="${esc(s.error)}">${esc(s.name)} 실패</span>`)).join(" · ");
      render();
    } catch (e) {
      $("updated").textContent = "불러오기 실패";
      if (!state.items.length) {
        $("list").innerHTML = "";
        const empty = $("empty");
        empty.hidden = false;
        empty.textContent = "데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
      }
    }
  }

  $("tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-kind]");
    if (!b) return;
    state.kind = b.dataset.kind;
    [...$("tabs").children].forEach((x) => x.classList.toggle("on", x === b));
    render();
  });
  $("chips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]");
    if (!b) return;
    state.cat = b.dataset.cat;
    render();
  });
  $("list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-fav]");
    if (!b) return;
    const id = b.dataset.fav;
    if (state.favs[id]) delete state.favs[id];
    else state.favs[id] = state.items.find((i) => i.id === id) || true;
    saveFavs();
    b.classList.toggle("on", !!state.favs[id]);
    if (state.kind === "fav") render();
  });
  let t;
  $("q").addEventListener("input", (e) => {
    clearTimeout(t);
    t = setTimeout(() => { state.q = e.target.value; render(); }, 150);
  });
  $("sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });

  $("list").innerHTML = '<li class="skeleton"></li>'.repeat(5);
  load();
  setInterval(load, 5 * 60e3);
})();
