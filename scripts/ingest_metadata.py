#!/usr/bin/env python3
"""Small replaceable metadata adapters for QEVA.

Examples:
  python3 scripts/ingest_metadata.py openalex "dynamical systems" --limit 20
  python3 scripts/ingest_metadata.py crossref "prime number theorem" --limit 20 --mailto you@example.org
  python3 scripts/ingest_metadata.py arxiv "cat:math.DS" --limit 20

Writes normalized JSON Lines to stdout. It does not download or redistribute article full text.
"""
from __future__ import annotations
import argparse, datetime as dt, json, sys, urllib.parse, urllib.request, xml.etree.ElementTree as ET
UA="QEVA-metadata-reference/0.3 (+https://qeva.org/)"

def get(url):
    req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"application/json, application/atom+xml;q=0.9, */*;q=0.1"})
    with urllib.request.urlopen(req,timeout=30) as r: return r.read(),r.headers.get_content_type()

def emit(o): print(json.dumps(o,ensure_ascii=False,separators=(',',':')))
def now(): return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()

def openalex(q,limit):
    params=urllib.parse.urlencode({"search":q,"per_page":min(limit,100),"select":"id,doi,display_name,publication_year,publication_date,authorships,primary_location,open_access,cited_by_count,referenced_works,type"})
    body,_=get("https://api.openalex.org/works?"+params); data=json.loads(body)
    for x in data.get("results",[])[:limit]:
        emit({"provider":"openalex","provider_id":x.get("id"),"doi":x.get("doi"),"title":x.get("display_name"),"year":x.get("publication_year"),"date":x.get("publication_date"),"authors":[a.get("author",{}).get("display_name") for a in x.get("authorships",[]) if a.get("author")],"type":x.get("type"),"cited_by_count":x.get("cited_by_count"),"referenced_provider_ids":x.get("referenced_works",[]),"open_access":x.get("open_access"),"retrieved":now()})

def crossref(q,limit,mailto):
    params={"query.bibliographic":q,"rows":min(limit,1000),"select":"DOI,title,author,published,type,URL,reference,license"}
    if mailto: params["mailto"]=mailto
    body,_=get("https://api.crossref.org/works?"+urllib.parse.urlencode(params)); items=json.loads(body).get("message",{}).get("items",[])
    for x in items[:limit]:
        parts=((x.get("published") or {}).get("date-parts") or [[None]])[0]; date="-".join(str(v) for v in parts if v is not None) or None
        emit({"provider":"crossref","provider_id":x.get("DOI"),"doi":x.get("DOI"),"title":((x.get("title") or [None])[0]),"date":date,"authors":[" ".join(v for v in [a.get("given"),a.get("family")] if v) for a in x.get("author",[])],"type":x.get("type"),"url":x.get("URL"),"reference_count":len(x.get("reference",[])),"licenses":x.get("license",[]),"retrieved":now()})

def arxiv(q,limit):
    params=urllib.parse.urlencode({"search_query":q,"start":0,"max_results":min(limit,100),"sortBy":"relevance"})
    body,_=get("https://export.arxiv.org/api/query?"+params)
    root=ET.fromstring(body); ns={"a":"http://www.w3.org/2005/Atom","arxiv":"http://arxiv.org/schemas/atom"}
    for e in root.findall("a:entry",ns)[:limit]:
        authors=[(a.findtext("a:name",default="",namespaces=ns) or "").strip() for a in e.findall("a:author",ns)]
        cats=[c.attrib.get("term") for c in e.findall("a:category",ns)]
        emit({"provider":"arxiv","provider_id":e.findtext("a:id",default="",namespaces=ns).strip(),"title":" ".join(e.findtext("a:title",default="",namespaces=ns).split()),"summary":" ".join(e.findtext("a:summary",default="",namespaces=ns).split()),"published":e.findtext("a:published",default=None,namespaces=ns),"updated":e.findtext("a:updated",default=None,namespaces=ns),"authors":authors,"categories":cats,"retrieved":now(),"reuse_note":"Metadata index only. Check the submission license before redistributing article text or source."})

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("provider",choices=["openalex","crossref","arxiv"]); ap.add_argument("query"); ap.add_argument("--limit",type=int,default=20); ap.add_argument("--mailto",default=""); a=ap.parse_args();
    if a.limit<1 or a.limit>1000: ap.error("--limit must be 1..1000")
    if a.provider=="openalex": openalex(a.query,a.limit)
    elif a.provider=="crossref": crossref(a.query,a.limit,a.mailto)
    else: arxiv(a.query,a.limit)
if __name__=="__main__": main()
