/* Odkiaľ návštevník prišiel – bez cookies a bez ukladania do prehliadača.
   Zdroj sa zistí raz pri otvorení webu z adresy (utm_source, utm_campaign, fbclid, gclid) alebo z predchádzajúcej stránky
   (document.referrer) a drží sa len v pamäti otvorenej stránky. Web prechádza medzi stránkami bez načítania (history.pushState),
   takže zdroj vydrží až po odoslanie formulára. Posiela sa iba súhrnný štítok, napr. „meta / 3pilier-dec“ alebo „google“.
   Reklamy označujte: ?utm_source=meta&utm_medium=paid&utm_campaign=<krátky-názov>. */
const VISIT_SOURCE=(()=>{
 const clean=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);
 const HOSTS=[[/(^|\.)(facebook\.com|fb\.com|fb\.me)$/,'facebook'],[/(^|\.)instagram\.com$/,'instagram'],[/(^|\.)tiktok\.com$/,'tiktok'],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/,'youtube'],[/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/,'linkedin'],[/(^|\.)g\.page$/,'google-profil'],
  [/(^|\.)gemini\.google\.com$/,'gemini'],[/(^|\.)google\.[a-z.]+$/,'google'],[/(^|\.)bing\.com$/,'bing'],[/(^|\.)seznam\.cz$/,'seznam'],[/(^|\.)(chatgpt\.com|openai\.com)$/,'chatgpt'],
  [/(^|\.)perplexity\.ai$/,'perplexity'],[/(^|\.)copilot\.microsoft\.com$/,'copilot'],[/(^|\.)claude\.ai$/,'claude']];
 try{
  const q=new URLSearchParams(location.search);
  let ref='';try{ref=document.referrer?new URL(document.referrer).hostname.replace(/^www\./,''):'';}catch{}
  const own=location.hostname.replace(/^www\./,'');
  const internal=ref===own||ref==='axiona-web.github.io';
  let src=clean(q.get('utm_source'));const camp=clean(q.get('utm_campaign'));
  if(!src&&q.has('fbclid'))src=/instagram/.test(ref)?'instagram':'facebook';
  if(!src&&q.has('gclid'))src='google-ads';
  if(!src&&ref&&!internal){const hit=HOSTS.find(([re])=>re.test(ref));src=hit?hit[1]:'web-'+clean(ref).slice(0,30);}
  if(!src)src=internal?'':'priamo';
  return {label:src?(camp?src+' / '+camp:src):'',landing:!internal};
 }catch{return {label:'',landing:false};}
})();
