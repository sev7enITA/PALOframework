from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError
from urllib.parse import urldefrag,quote,urlsplit,urlunsplit
from collections import Counter
from datetime import datetime,timezone
import json
OUT=Path(__file__).parent
items=json.loads((OUT/'sitemap-audit.json').read_text())['externalUrls']
urls={urldefrag(x['url'])[0] for x in items}
def check(url):
 p=urlsplit(url);encoded=urlunsplit((p.scheme,p.netloc,quote(p.path,safe='/%:@+'),p.query,''))
 row={'url':url}
 for method in ['HEAD','GET']:
  try:
   with urlopen(Request(encoded,method=method,headers={'User-Agent':'PALOConsistencyAudit/1.0 (read-only)'}),timeout=12) as r:
    return {**row,'status':r.status,'finalUrl':r.url,'method':method}
  except HTTPError as e:
   row.update(status=e.code,finalUrl=e.url,method=method)
   if method=='HEAD' and e.code in [400,403,404,405,410,429,500,501,502,503]:continue
   return row
  except Exception as e:return {**row,'status':None,'error':str(e),'method':method}
 return row
results=[]
with ThreadPoolExecutor(max_workers=6) as pool:
 for fut in as_completed([pool.submit(check,u) for u in sorted(urls)]):
  results.append(fut.result())
  if len(results)%25==0:print(f'Checked {len(results)}/{len(urls)} external destinations',flush=True)
data={'checkedAt':datetime.now(timezone.utc).isoformat(),'scope':'HEAD with bounded GET fallback, no downloaded external bodies. 403/429/timeouts are inconclusive, not proof of broken links.','counts':dict(Counter(str(x['status']) for x in results)),'results':sorted(results,key=lambda x:x['url'])}
(OUT/'external-links-audit.json').write_text(json.dumps(data,indent=2)+'\n')
print(json.dumps(data['counts'],indent=2),flush=True)
