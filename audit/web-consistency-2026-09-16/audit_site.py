"""Read-only audit of PALO sitemap, publication inventory and same-origin links."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import Counter, defaultdict, deque
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit, unquote, quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import hashlib, json, re, time, xml.etree.ElementTree as ET

OUT = Path(__file__).parent
ROOT = Path(__file__).resolve().parents[2]
BASE = 'https://paloframework.org'
inventory = json.loads((OUT/'public-inventory.json').read_text())
bodies = OUT/'http-bodies'
bodies.mkdir(exist_ok=True)
records = {}
documents = {}
started = datetime.now(timezone.utc).isoformat()

def normalize(url):
    p = urlsplit(url)
    path = p.path or '/'
    if path.endswith('/index.html'): path = path[:-10]
    return urlunsplit((p.scheme.lower(), p.netloc.lower(), quote(unquote(path), safe='/!$&\'()*+,;=:@-._~'), '', ''))

def localpath(url):
    p = unquote(urlsplit(url).path).lstrip('/')
    return (p+'index.html') if not p or p.endswith('/') else p

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids=set(); self.refs=[]; self.canonicals=[]; self.metadata={}; self.lang=''; self.title=''; self.h1=[]; self.text=[]
        self.in_title=False; self.in_h1=False; self.skip=0; self.structured=[]; self.in_ld=False; self.ld=''
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if a.get('id'): self.ids.add(a['id'])
        if tag=='a' and a.get('name'): self.ids.add(a['name'])
        if tag=='html': self.lang=a.get('lang','')
        if tag=='title': self.in_title=True
        if tag=='h1': self.in_h1=True; self.h1.append('')
        if tag in ['script','style']: self.skip+=1
        if tag=='script' and a.get('type')=='application/ld+json': self.in_ld=True; self.ld=''
        if tag=='meta': self.metadata[a.get('name',a.get('property','')).lower()]=a.get('content','')
        if tag=='link' and 'canonical' in a.get('rel','').split(): self.canonicals.append(a.get('href',''))
        if tag=='a' and a.get('href'): self.refs.append(('link',a['href']))
        if tag=='link' and a.get('href') and any(x in a.get('rel','') for x in ['stylesheet','icon','preload','manifest']): self.refs.append(('asset',a['href']))
        if tag in ['img','script','iframe','source','video','audio'] and a.get('src'): self.refs.append(('asset',a['src']))
        if a.get('poster'): self.refs.append(('asset',a['poster']))
    def handle_endtag(self, tag):
        if tag=='title': self.in_title=False
        if tag=='h1': self.in_h1=False
        if tag=='script' and self.in_ld:
            try: self.structured.append({'valid':True,'value':json.loads(self.ld)})
            except Exception as e: self.structured.append({'valid':False,'error':str(e)})
            self.in_ld=False
        if tag in ['script','style']: self.skip=max(0,self.skip-1)
    def handle_data(self,data):
        if self.in_title:self.title+=data
        if self.in_h1:self.h1[-1]+=data
        if self.in_ld:self.ld+=data
        if not self.skip:self.text.append(data)

def fetch(url, body=False):
    url=normalize(url)
    row={'url':url,'method':'GET' if body else 'HEAD'}
    for attempt in range(2):
        try:
            req=Request(url,headers={'User-Agent':'PALOConsistencyAudit/1.0 (read-only)','Accept':'*/*'},method=row['method'])
            with urlopen(req,timeout=20) as response:
                row.update(status=response.status,finalUrl=response.url,contentType=response.headers.get('Content-Type',''),contentLength=response.headers.get('Content-Length'),lastModified=response.headers.get('Last-Modified'),xRobotsTag=response.headers.get('X-Robots-Tag',''))
                if body:
                    data=response.read(4*1024*1024+1)
                    row['truncated']=len(data)>4*1024*1024
                    if row['truncated']:data=data[:4*1024*1024]
                    digest=hashlib.sha256(data).hexdigest();row['sha256']=digest
                    name=hashlib.sha256(url.encode()).hexdigest()+'.txt';(bodies/name).write_bytes(data);row['bodyFile']='http-bodies/'+name
                    row['_text']=data.decode('utf-8','replace')
                return row
        except HTTPError as e:
            row.update(status=e.code,finalUrl=e.url,error=str(e))
            if row['method']=='HEAD' and e.code in [403,405,501]:
                row['method']='GET';body=False
                continue
            if e.code in [429,500,502,503,504] and attempt==0:time.sleep(.5);continue
            return row
        except Exception as e:
            row.update(status=None,error=str(e))
            if attempt==0:continue
    return row

def collect(urls, body):
    todo=sorted(set(map(normalize,urls))-set(records))
    with ThreadPoolExecutor(max_workers=6) as executor:
        tasks={executor.submit(fetch,u,body):u for u in todo}
        done=0
        for task in as_completed(tasks):
            row=task.result(); text=row.pop('_text',None);records[row['url']]=row
            if text is not None:
                documents[row['url']]=text
            done+=1
            if done%40==0:print(f'Fetched {done}/{len(todo)} in current batch',flush=True)
    print(f'Batch complete: {len(todo)}; total {len(records)}',flush=True)

collect([BASE+'/sitemap.xml',BASE+'/robots.txt',BASE+'/feed.xml',BASE+'/release-manifest.json',BASE+'/data/knowledge-reader-release.json'],True)
sitemap_text=documents[BASE+'/sitemap.xml']
tree=ET.fromstring(sitemap_text)
entries=[]
for e in tree:
    if e.tag.endswith('url'):entries.append({x.tag.split('}')[-1]:x.text for x in e})
sitemap_urls=[normalize(e['loc']) for e in entries]
html_urls=[BASE+'/'+p for p in inventory['PUBLIC_HTML']]+[BASE+'/governance-hub/']
collect(sitemap_urls+html_urls,True)
pages={}
refs=[]
external=defaultdict(set)
for url,text in list(documents.items()):
    if 'text/html' not in records[url].get('contentType',''):continue
    page=Page();page.feed(text);pages[url]=page
    for kind,raw in page.refs:
        absolute=urljoin(url,raw);p=urlsplit(absolute)
        if p.scheme not in ['http','https']:continue
        if p.netloc.lower()!=urlsplit(BASE).netloc:
            external[absolute].add(url);continue
        refs.append({'from':url,'target':normalize(absolute),'fragment':unquote(p.fragment),'kind':kind,'raw':raw})
# Fetch any additional HTML linked by the inspected publication, once, before
# checking fragments; public inventory already includes generated documents.
extra_html=[r['target'] for r in refs if urlsplit(r['target']).path.endswith('.html') or urlsplit(r['target']).path.endswith('/')]
collect(extra_html,True)
for url,text in documents.items():
    if url not in pages and 'text/html' in records[url].get('contentType',''):
        page=Page();page.feed(text);pages[url]=page
asset_urls=[BASE+'/'+p for p in inventory['PUBLIC_FILES']]+[r['target'] for r in refs]
collect(asset_urls,False)
issues=[]
def issue(kind,**kw):issues.append({'kind':kind,**kw})
for u,n in Counter(sitemap_urls).items():
    if n>1:issue('duplicate_sitemap_url',url=u,count=n)
now=datetime.now(timezone.utc).date().isoformat()
for e in entries:
    u=normalize(e['loc']);row=records[u];p=pages.get(u)
    if row.get('status')!=200:issue('sitemap_http',url=u,status=row.get('status'),error=row.get('error'))
    if normalize(row.get('finalUrl',u))!=u:issue('sitemap_redirect',url=u,target=row.get('finalUrl'))
    if e.get('lastmod','')>now:issue('future_lastmod',url=u,lastmod=e['lastmod'])
    if p:
        if p.canonicals!=[e['loc']]:issue('sitemap_canonical',url=u,canonicals=p.canonicals)
        if 'noindex' in (p.metadata.get('robots','')+' '+row.get('xRobotsTag','')).lower():issue('sitemap_noindex',url=u)
for url,p in pages.items():
    if records[url].get('status')!=200:continue
    if not p.title.strip():issue('missing_title',url=url)
    if len(p.h1)!=1:issue('h1_count',url=url,count=len(p.h1))
    if not p.metadata.get('description','').strip():issue('missing_description',url=url)
    if not p.lang:issue('missing_language',url=url)
    if len(p.canonicals)!=1:issue('canonical_count',url=url,count=len(p.canonicals))
    if any(not obj['valid'] for obj in p.structured):issue('invalid_jsonld',url=url)
    indexable='noindex' not in (p.metadata.get('robots','')+' '+records[url].get('xRobotsTag','')).lower()
    selfcanon=len(p.canonicals)==1 and normalize(p.canonicals[0])==url
    if indexable and selfcanon and url not in sitemap_urls:issue('indexable_page_missing_from_sitemap',url=url,title=p.title.strip())
    if p.canonicals and p.metadata.get('og:url') and normalize(p.canonicals[0])!=normalize(p.metadata['og:url']):issue('og_canonical_mismatch',url=url)
for r in refs:
    row=records.get(r['target'],{});status=row.get('status')
    if status is not None and status>=400:issue('broken_internal_reference',**r,status=status)
    elif status is None:issue('unverified_internal_reference',**r,error=row.get('error'))
    elif r['fragment'] and r['kind']=='link' and r['target'] in pages and r['fragment'] not in pages[r['target']].ids:
        issue('missing_static_fragment',**r)
titles=defaultdict(list);descriptions=defaultdict(list)
for url,p in pages.items():
    if records[url].get('status')!=200:continue
    if p.title.strip():titles[p.title.strip()].append(url)
    if p.metadata.get('description'):descriptions[p.metadata['description']].append(url)
for val,urls in titles.items():
    if len(urls)>1:issue('duplicate_title',title=val,urls=urls)
for val,urls in descriptions.items():
    if len(urls)>1:issue('duplicate_description',description=val,urls=urls)
graph=defaultdict(set)
for r in refs:
    if r['kind']=='link' and r['target'] in pages:graph[r['from']].add(r['target'])
reachable=set();queue=deque([BASE+'/'])
while queue:
    u=queue.popleft()
    if u in reachable:continue
    reachable.add(u);queue.extend(graph[u]-reachable)
for u in sitemap_urls:
    if u not in reachable:issue('sitemap_page_not_reachable_from_home',url=u)
page_summary=[]
for u,p in sorted(pages.items()):
    text=' '.join(' '.join(p.text).split())
    dist=ROOT/'dist'/localpath(u)
    same=hashlib.sha256(dist.read_bytes()).hexdigest()==records[u].get('sha256') if dist.exists() else None
    page_summary.append({'url':u,'status':records[u].get('status'),'title':p.title.strip(),'description':p.metadata.get('description',''),'h1':[' '.join(x.split()) for x in p.h1],'language':p.lang,'canonical':p.canonicals,'robots':p.metadata.get('robots',''),'inSitemap':u in sitemap_urls,'reachableFromHome':u in reachable,'matchesLocalDist':same,'mentionsAns':bool(re.search(r'\bANS\b|Agent Name Service',text)),'maturitySnippets':[text[max(0,m.start()-70):m.end()+130] for m in list(re.finditer(r'developer preview|production.candidate|production.ready|production.use|prototype|production.grade',text,re.I))[:8]]})
result={'startedAt':started,'finishedAt':datetime.now(timezone.utc).isoformat(),'origin':BASE,'scope':'All sitemap URLs, public HTML inventory, same-origin references and public assets; static HTML, no authenticated writes or interactive flows. Third-party links inventoried but not fetched. Query-specific behavior not tested.','counts':{'sitemapEntries':len(entries),'htmlPages':len(pages),'requests':len(records),'internalReferences':len(refs),'externalUrlsInventoried':len(external)},'httpStatuses':dict(Counter(str(x.get('status')) for x in records.values())),'issueCounts':dict(Counter(x['kind'] for x in issues)),'issues':issues,'sitemap':entries,'pages':page_summary,'requests':list(records.values()),'externalUrls':[{'url':u,'sources':sorted(v)} for u,v in sorted(external.items())]}
(OUT/'sitemap-audit.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
(OUT/'internal-references.json').write_text(json.dumps(refs,indent=2,ensure_ascii=False)+'\n')
print(json.dumps({k:result[k] for k in ['counts','httpStatuses','issueCounts']},indent=2),flush=True)
