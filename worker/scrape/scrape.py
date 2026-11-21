"""scrapling 브라우저로 RSS가 막힌 사이트를 수집해 JSON으로 저장한다.
사용: python scrape.py out.json   (크롬 필요: 로컬은 real_chrome, CI는 설치된 chrome)"""
import json, re, sys, datetime as dt
from urllib.parse import urljoin
from scrapling.fetchers import StealthyFetcher

KW = "?page="  # 다중 페이지 필요 시 확장
now = dt.datetime.now(dt.timezone.utc).isoformat()

def fetch(url):
    return StealthyFetcher.fetch(url, headless=True, real_chrome=True, network_idle=True, timeout=90000)

def clien(pages=3):
    out = []
    for n in range(pages):
        p = fetch(f"https://www.clien.net/service/board/jirum?po={n}")
        for r in p.css(".list_item.symph_row"):
            sp = r.css("span.list_subject")
            href = r.css("span.list_subject a::attr(href)").get()
            if not sp or not href or "/board/jirum/" not in href: continue
            title = sp[0].attrib.get("title") or sp[0].text
            out.append(dict(source="clien", title=re.sub(r"\s+", " ", title).strip(), link=urljoin("https://www.clien.net", href), date=None, image=r.css(".list_image img::attr(src)").get()))
    return out

def quasarzone(pages=2):
    out = []
    for n in range(1, pages + 1):
        p = fetch(f"https://quasarzone.com/bbs/qb_saleinfo?page={n}")
        for a in p.css('a.subject-link[href*="qb_saleinfo/views"]'):
            row = a.parent.parent.parent
            title = re.sub(r"\s+", " ", " ".join(a.css("*::text").getall())).strip()
            if not title: continue
            out.append(dict(source="quasarzone", title=title, link=urljoin("https://quasarzone.com", a.attrib["href"].split("?")[0]), date=None, image=None))
    return out

def ppomppu(boards=("ppomppu", "ppomppu4"), pages=2):
    out = []
    for b in boards:
        for n in range(1, pages + 1):
            p = fetch(f"https://www.ppomppu.co.kr/zboard/zboard.php?id={b}&page={n}")
            for r in p.css("tr.baseList"):
                a = r.css("a.baseList-title")
                if not a: continue
                t = a[0].css("span::text").get() or a[0].text
                href = a[0].attrib["href"]
                out.append(dict(source="ppomppu", title=t.strip(), link="https://www.ppomppu.co.kr/zboard/view.php?id=%s&no=%s" % (b, re.search(r"no=(\d+)", href).group(1)), date=None, image=None))
    return out

def oliveyoung():
    out = []
    p = fetch("https://www.oliveyoung.co.kr/store/main/getEventList.do")
    for li in p.css("li"):
        nm = li.css("input.original-title::attr(value)").get() or li.css("input.evtNm::attr(value)").get()
        if not nm: continue
        end = re.search(r"~\s*(\d\d)\.(\d\d)\.(\d\d)", li.css(".evt_date::text").get() or "")
        if end and dt.date(2000 + int(end[1]), int(end[2]), int(end[3])) < dt.date.today(): continue
        url = li.css("input[name=urlInfo]::attr(value)").get() or ""
        no = li.css("input[name=evtNo]::attr(value)").get()
        out.append(dict(source="oliveyoung", title=nm.strip(), link=urljoin("https://www.oliveyoung.co.kr/store/", url) if url else f"https://www.oliveyoung.co.kr/store/main/getEventList.do#{no}",
                        date=None, image=li.css("img::attr(data-original)").get(), period=li.css(".evt_date::text").get()))
    return out

if __name__ == "__main__":
    items, status = [], {}
    for name, fn in [("clien", clien), ("quasarzone", quasarzone), ("ppomppu", ppomppu), ("oliveyoung", oliveyoung)]:
        try:
            r = fn(); items += r; status[name] = len(r)
        except Exception as e:
            status[name] = f"ERR {str(e)[:100]}"
    print(status)
    json.dump(dict(scrapedAt=now, items=items), open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False)
