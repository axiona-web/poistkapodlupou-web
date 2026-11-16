// E-mail signatures (/podpis). Plain tables with inline styles and hosted PNG images, so they look
// the same in Gmail, Outlook, Apple Mail and the Websupport webmail.
const SIGNATURES={
 alexandra:{name:'Mgr. Alexandra Čurillová',email:'curillova@poistkapodlupou.sk',phone:'+421 948 220 080',tel:'+421948220080',photo:'assets/podpis/alexandra.png',
  legal:'Mgr. Alexandra Čurillová, s. r. o., IČO 54913748, podriadený finančný agent v sektore poistenia alebo zaistenia, reg. č. NBS 273149, na základe zmluvy so samostatným finančným agentom Finportal, a. s., reg. č. NBS 119713.'},
 martin:{name:'Ing. Martin Dominik, MBA, EUR ING',email:'dominik@poistkapodlupou.sk',photo:'assets/podpis/martin.png',
  legal:'Ing. Martin Dominik s.r.o., IČO 36597961, podriadený finančný agent v sektoroch poistenia alebo zaistenia, poskytovania úverov, úverov na bývanie a spotrebiteľských úverov, kapitálového trhu, doplnkového dôchodkového sporenia a starobného dôchodkového sporenia, reg. č. NBS 281061, na základe zmluvy so samostatným finančným agentom Finportal, a. s., reg. č. NBS 119713.'}
};
function signatureHtml(p){const S='https://poistkapodlupou.sk/',a='color:#183748;text-decoration:none';
 return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Manrope,Arial,Helvetica,sans-serif;color:#183748;max-width:480px">`
 +`<tr><td width="88" style="width:88px;padding:0 16px 0 0;vertical-align:top"><img src="${S}${p.photo}" width="72" height="72" alt="${p.name}" style="display:block;width:72px;height:72px;border:0;border-radius:50%"></td>`
 +`<td style="padding:2px 0 2px 16px;vertical-align:top;border-left:2px solid #b8cdb9">`
 +`<div style="font-size:17px;line-height:22px;font-weight:bold;color:#183748">${p.name}</div>`
 +`<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:4px 0 8px"><tr><td style="padding:0 6px 0 0;vertical-align:middle"><img src="${S}assets/podpis/logo.png" width="18" height="18" alt="" style="display:block;width:18px;height:18px;border:0"></td><td style="vertical-align:middle;font-size:13px;line-height:18px;font-weight:bold;color:#3f6b4c">Poistka pod Lupou</td></tr></table>`
 +(p.phone?`<div style="font-size:13px;line-height:20px"><a href="tel:${p.tel}" style="${a}">${p.phone}</a></div>`:'')
 +`<div style="font-size:13px;line-height:20px"><a href="mailto:${p.email}" style="${a}">${p.email}</a></div>`
 +`<div style="font-size:13px;line-height:20px"><a href="${S}" style="${a}">poistkapodlupou.sk</a></div>`
 +`</td></tr><tr><td colspan="2" style="padding:12px 0 0;font-size:10px;line-height:14px;color:#7b8a8d">${p.legal}</td></tr></table>`;}

function signaturePage(){const people=Object.entries(SIGNATURES);return `<div class="page-shell wrap review-admin sig-page"><div class="page-intro"><span class="eyebrow">E-mailový podpis</span><h1>Podpis<br><em>do e-mailu.</em></h1><p>Skopírujte svoj podpis a vložte ho do nastavení podpisu vo svojom e-mailovom programe. Fotka a logo sa načítajú z webu.</p></div>
${people.map(([k,p])=>{const html=signatureHtml(p);return `<section class="sig-person" id="podpis-${k}"><h2>${p.name.split(',')[0]} <small>${p.email}</small></h2><div class="sig-preview" data-sig-preview="${k}">${html}</div>
<div class="sig-actions"><button class="btn" type="button" data-sig-copy="${k}">Kopírovať podpis</button><button class="btn secondary" type="button" data-sig-code="${k}">Kopírovať HTML kód</button></div><p class="admin-meta" data-sig-status="${k}" role="status"></p>
<details class="sig-code"><summary>HTML kód</summary><textarea readonly rows="8" data-sig-html="${k}">${html.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</textarea></details></section>`;}).join('')}
<div class="sig-help"><h2>Kam podpis vložiť</h2>
<p><b>Webmail Websupport:</b> Nastavenia → Identity → vyberte svoju adresu → pole Podpis. Ak editor ponúka HTML režim alebo zdrojový kód (&lt;&gt;), vložte HTML kód, inak vložte skopírovaný podpis. Uložte.</p>
<p><b>Gmail:</b> Nastavenia (ozubené koliesko) → Zobraziť všetky nastavenia → Všeobecné → Podpis → Vytvoriť nový → vložte skopírovaný podpis (Ctrl+V alebo Cmd+V) → dole Uložiť zmeny.</p>
<p><b>Apple Mail na Macu:</b> Mail → Nastavenia → Podpisy → vyberte účet → + → vložte skopírovaný podpis a vypnite „Vždy používať moje predvolené písmo“.</p>
<p><b>Outlook:</b> Súbor → Možnosti → Pošta → Podpisy → Nový → vložte skopírovaný podpis → OK.</p></div></div>`}
function bindSignature(){
 const buttons=document.querySelectorAll('[data-sig-copy]');if(!buttons.length)return;
 buttons.forEach(btn=>{const k=btn.dataset.sigCopy,p=SIGNATURES[k],html=signatureHtml(p),status=document.querySelector(`[data-sig-status="${k}"]`),preview=document.querySelector(`[data-sig-preview="${k}"]`);
  btn.onclick=async()=>{try{if(window.ClipboardItem){await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([preview.innerText],{type:'text/plain'})})]);}else{const r=document.createRange();r.selectNodeContents(preview);const s=getSelection();s.removeAllRanges();s.addRange(r);document.execCommand('copy');s.removeAllRanges();}status.textContent='Podpis je skopírovaný. Vložte ho do nastavení podpisu.';}catch{status.textContent='Kopírovanie sa nepodarilo. Označte podpis myšou a skopírujte ho ručne.';}};
  document.querySelector(`[data-sig-code="${k}"]`).onclick=async()=>{try{await navigator.clipboard.writeText(html);status.textContent='HTML kód je skopírovaný.';}catch{const t=document.querySelector(`[data-sig-html="${k}"]`);t.closest('details').open=true;t.select();status.textContent='Kód je označený, skopírujte ho (Ctrl+C alebo Cmd+C).';}};});
}
