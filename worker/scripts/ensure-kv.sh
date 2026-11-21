#!/usr/bin/env bash
# KV 네임스페이스가 없으면 만들고, wrangler.toml의 __KV_ID__ 자리에 id를 채워 넣는다.
set -euo pipefail
TITLE="beauty-deals"
find_id() {
  npx wrangler kv namespace list 2>/dev/null | node -e '
    let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      const i=s.search(/^\[\s*[{\]]/m);const arr=i<0?[]:JSON.parse(s.slice(i));
      const t=process.argv[1];
      const ns=arr.find(n=>n.title===t||n.title.endsWith("-"+t));
      process.stdout.write(ns?ns.id:"");
    })' "$TITLE"
}
ID="$(find_id)"
if [ -z "$ID" ]; then
  echo "KV 네임스페이스 생성: $TITLE"
  npx wrangler kv namespace create "$TITLE" >/dev/null
  ID="$(find_id)"
fi
[ -n "$ID" ] || { echo "KV id를 찾지 못했습니다"; exit 1; }
sed -i "s/__KV_ID__/$ID/" wrangler.toml
echo "KV id: $ID"
