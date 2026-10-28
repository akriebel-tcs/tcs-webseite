"""Minimaler Storyblok-CDN-Mock aus dem konvertierten Paket (nur fuer lokale Pruefung)."""
import json, os, sys, re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

PK = sys.argv[1]
stories = []
sid = 1000
def load(path, folder_hint=None):
    global sid
    d = json.load(open(path, encoding="utf-8"))
    sid += 1
    folder = d.get("parent_folder_path", "")
    full = "/".join(x for x in (folder, d["slug"]) if x)
    if d.get("is_startpage") and folder:
        full = folder + "/"
    if d["slug"] == "home": full = "home"
    d["content"]["_editable"] = None
    stories.append({"id": sid, "uuid": f"u{sid}", "name": d["name"], "slug": d["slug"], "full_slug": full,
                    "is_startpage": bool(d.get("is_startpage")), "parent_id": None, "published_at": "2026-10-28",
                    "content": d["content"], "_publish": d.get("publish", True)})
for fn in sorted(os.listdir(f"{PK}/stories")): load(f"{PK}/stories/{fn}")
for fn in sorted(os.listdir(f"{PK}/globals")): load(f"{PK}/globals/{fn}")
ds = {}
for fn in os.listdir(f"{PK}/datasources"):
    d = json.load(open(f"{PK}/datasources/{fn}", encoding="utf-8")); ds[d["slug"]] = d

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def send(self, body, total):
        data = json.dumps(body).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*"); self.send_header("Access-Control-Expose-Headers", "total")
        self.send_header("total", str(total)); self.send_header("Content-Length", str(len(data))); self.end_headers(); self.wfile.write(data)
    def do_GET(self):
        u = urlparse(self.path); q = {k: v[0] for k, v in parse_qs(u.query).items()}
        path = u.path
        pub = [s for s in stories if s["_publish"] or q.get("version") == "draft"]
        if path.endswith("/stories"):
            res = pub
            if q.get("content_type"): res = [s for s in res if s["content"].get("component") == q["content_type"]]
            fk = [k for k in q if k.startswith("filter_query[")]
            for k in fk:
                m = re.match(r"filter_query\[(\w+)\]\[in\]", k)
                if m: vals = set(q[k].split(",")); res = [s for s in res if str(s["content"].get(m.group(1))) in vals]
            if q.get("excluding_fields"):
                res = [dict(s, content={k: v for k, v in s["content"].items() if k not in q["excluding_fields"].split(",")}) for s in res]
            per = int(q.get("per_page", 25)); page = int(q.get("page", 1))
            self.send({"stories": [{k: v for k, v in s.items() if k != "_publish"} for s in res[(page-1)*per:page*per]], "cv": 1}, len(res)); return
        m = re.match(r".*/stories/(.+)$", path)
        if m:
            slug = m.group(1).strip("/")
            for s in pub:
                if s["full_slug"].strip("/") == slug:
                    self.send({"story": {k: v for k, v in s.items() if k != "_publish"}, "cv": 1}, 1); return
            self.send_response(404); self.end_headers(); return
        if path.endswith("/datasource_entries"):
            d = ds.get(q.get("datasource", ""), {"entries": []}); dim = q.get("dimension")
            ents = [{"id": i, "name": e["name"], "value": e["value"], "dimension_value": e.get("dimension_values", {}).get(dim) if dim else None} for i, e in enumerate(d["entries"])]
            per = int(q.get("per_page", 25)); page = int(q.get("page", 1))
            self.send({"datasource_entries": ents[(page-1)*per:page*per]}, len(ents)); return
        self.send_response(404); self.end_headers()

ThreadingHTTPServer(("127.0.0.1", 8787), H).serve_forever()
