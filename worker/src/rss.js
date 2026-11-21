// 의존성 없는 가벼운 RSS/Atom 파서 (Workers 환경용)

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function unwrap(s) {
  if (s == null) return "";
  s = s.trim();
  const cdata = s.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) s = cdata[1];
  else s = decodeEntities(s);
  return s.trim();
}

function tag(block, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i");
  const m = block.match(re);
  return m ? unwrap(m[1]) : "";
}

function stripHtml(s) {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function firstImage(html) {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? decodeEntities(m[1]) : null;
}

export function parseFeed(xml) {
  const items = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    let link = tag(b, "link");
    if (!link) {
      const m = b.match(/<link[^>]+href=["']([^"']+)["']/i);
      link = m ? decodeEntities(m[1]) : "";
    }
    const rawDesc = tag(b, "description") || tag(b, "content:encoded") || tag(b, "summary") || tag(b, "content");
    const date = tag(b, "pubDate") || tag(b, "dc:date") || tag(b, "published") || tag(b, "updated");
    const enclosure = (b.match(/<(?:enclosure|media:content|media:thumbnail)[^>]+url=["']([^"']+)["']/i) || [])[1];
    items.push({
      title: stripHtml(tag(b, "title")),
      link: link.trim(),
      description: stripHtml(rawDesc).slice(0, 200),
      image: enclosure ? decodeEntities(enclosure) : firstImage(rawDesc),
      date: safeDate(date),
      sourceName: tag(b, "source") || null, // 구글 뉴스는 언론사 이름을 줌
    });
  }
  return items.filter((i) => i.title && i.link);
}

function safeDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString();
}
