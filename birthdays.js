// Narodeniny klientov (admin). The client list is read in this browser; only the name, day and month
// of birth, phone and e-mail are sent to the server. Year of birth and birth numbers stay here.
const XLSX_LIB='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
const BD_MONTH_DAYS=[31,29,31,30,31,30,31,31,30,31,30,31];
const bdOk=(d,m)=>Number.isInteger(d)&&Number.isInteger(m)&&m>=1&&m<=12&&d>=1&&d<=BD_MONTH_DAYS[m-1]?{d,m}:null;
const bdNorm=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const bdKey=e=>e.name.toLowerCase()+'|'+e.d+'|'+e.m;
function bdDate(v){
 if(v instanceof Date&&!isNaN(v))return bdOk(v.getDate(),v.getMonth()+1);
 if(typeof v==='number'&&v>1000&&v<80000){const t=new Date(Math.round((v-25569)*864e5));return bdOk(t.getUTCDate(),t.getUTCMonth()+1);}
 const s=String(v??'').trim();let r=s.match(/^(\d{1,2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]?\s*(\d{2,4})?/);if(r)return bdOk(+r[1],+r[2]);
 r=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);return r?bdOk(+r[3],+r[2]):null;
}
// Slovak/Czech birth number: YYMMDD, women +50 to the month, numbers issued since 2004 may add 20.
function bdFromRc(v){const s=String(v??'').replace(/\D/g,'');if(s.length<9||s.length>10)return null;let m=+s.slice(2,4);const d=+s.slice(4,6);if(m>70)m-=70;else if(m>50)m-=50;else if(m>20)m-=20;return bdOk(d,m);}
const BD_COLS={name:/^(meno a priezvisko|priezvisko a meno|cele meno|klient|meno klienta|nazov klienta|nazov|name|full name)$/,first:/^(meno|krstne meno|first name)$/,last:/^(priezvisko|last name|surname)$/,date:/(datum narodenia|narodenia|narodeni|narodenie|datum nar|birth)/,rc:/(rodne cislo|^rc$|^r c$)/,phone:/(telefon|mobil|^tel|phone)/,email:/(^e mail|email|^mail)/};
function bdParseCsv(text){const first=text.split(/\r?\n/,1)[0];const delim=[';',',','\t'].map(c=>[c,first.split(c).length]).sort((a,b)=>b[1]-a[1])[0][0];
 const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else q=false;}else cell+=c;}else if(c==='"')q=true;else if(c===delim){row.push(cell);cell='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=c;}
 if(cell||row.length){row.push(cell);rows.push(row);}return rows;}
// Excel and Numbers on a Mac save CSV in the old Mac Central European encoding, Windows in windows-1250.
// Without UTF-8, both decodings are tried and the one that reads like Slovak names wins.
const BD_MACCE='\xc4\u0100\u0101\xc9\u0104\xd6\xdc\xe1\u0105\u010c\xe4\u010d\u0106\u0107\xe9\u0179\u017a\u010e\xed\u010f\u0112\u0113\u0116\xf3\u0117\xf4\xf6\xf5\xfa\u011a\u011b\xfc\u2020\xb0\u0118\xa3\xa7\u2022\xb6\xdf\xae\xa9\u2122\u0119\xa8\u2260\u0123\u012e\u012f\u012a\u2264\u2265\u012b\u0136\u2202\u2211\u0142\u013b\u013c\u013d\u013e\u0139\u013a\u0145\u0146\u0143\xac\u221a\u0144\u0147\u2206\xab\xbb\u2026\xa0\u0148\u0150\xd5\u0151\u014c\u2013\u2014\u201c\u201d\u2018\u2019\xf7\u25ca\u014d\u0154\u0155\u0158\u2039\u203a\u0159\u0156\u0157\u0160\u201a\u201e\u0161\u015a\u015b\xc1\u0164\u0165\xcd\u017d\u017e\u016a\xd3\xd4\u016b\u016e\xda\u016f\u0170\u0171\u0172\u0173\xdd\xfd\u0137\u017b\u0141\u017c\u0122\u02c7';
function bdDecode8bit(bytes){
 const win=new TextDecoder('windows-1250').decode(bytes),mac=Array.from(bytes,b=>b<128?String.fromCharCode(b):BD_MACCE[b-128]).join('');
 const score=t=>(t.match(/[áäčďéíĺľňóôŕšťúýž]/g)||[]).length-3*(t.match(/[‡‰‹›‘’“”„†•…ˇ˘¤¦§¨©«¬®°±´µ¶·¸»√∆≠≤≥∂∑◊]/g)||[]).length-2*(t.match(/[a-záäčďéíĺľňóôŕšťúýž][ÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽŪĚ]/g)||[]).length-2*(t.match(/[ěöüżūůőűąęłńśźć]/g)||[]).length;
 const useMac=score(mac)>score(win);return {text:useMac?mac:win,mac:useMac};
}
async function bdReadFile(file){
 if(/\.(csv|txt)$/i.test(file.name)){const buf=new Uint8Array(await file.arrayBuffer());let text,mac=false;
  if(buf[0]===0xFF&&buf[1]===0xFE)text=new TextDecoder('utf-16le').decode(buf);else if(buf[0]===0xFE&&buf[1]===0xFF)text=new TextDecoder('utf-16be').decode(buf);
  else{try{text=new TextDecoder('utf-8',{fatal:true}).decode(buf);}catch{const r=bdDecode8bit(buf);text=r.text;mac=r.mac;}}
  const rows=bdParseCsv(text.replace(/^\ufeff/,''));rows.mac=mac;return rows;}
 await loadScript(XLSX_LIB);const wb=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];
 return window.XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''});
}
// Finds the header row and the columns, then turns rows into {name,d,m,phone,email}.
function bdRows(rows){
 let head=-1,cols={};
 for(let i=0;i<Math.min(rows.length,10)&&head<0;i++){const c={};(rows[i]||[]).forEach((h,j)=>{const n=bdNorm(h);if(!n)return;for(const [k,re] of Object.entries(BD_COLS))if(c[k]===undefined&&re.test(n)){c[k]=j;break;}});if((c.name!==undefined||c.first!==undefined||c.last!==undefined)&&(c.date!==undefined||c.rc!==undefined)){head=i;cols=c;}}
 if(head<0)return {error:'V súbore som nenašiel stĺpce s menom a dátumom narodenia (alebo rodným číslom). Skontrolujte, že prvý riadok obsahuje názvy stĺpcov, napríklad „Meno“, „Priezvisko“ a „Dátum narodenia“.'};
 const out=[],skipped=[];
 for(const r of rows.slice(head+1)){if(!r||!r.some(x=>String(x).trim()))continue;
  const name=(cols.name!==undefined?String(r[cols.name]??''):[r[cols.first],r[cols.last]].filter(x=>String(x??'').trim()).join(' ')).replace(/\s+/g,' ').trim();
  const dm=(cols.date!==undefined&&bdDate(r[cols.date]))||(cols.rc!==undefined&&bdFromRc(r[cols.rc]))||null;
  if(name.length<2||!dm){skipped.push(name||'(bez mena)');continue;}
  const phone=cols.phone!==undefined?String(r[cols.phone]??'').trim():'',email=cols.email!==undefined?String(r[cols.email]??'').trim().toLowerCase():'';
  out.push({name:name.slice(0,100),...dm,...(/^[+0-9 ()\/.-]{6,30}$/.test(phone)?{phone}:{}),...(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)?{email}:{})});}
 const found=Object.entries(cols).map(([k,j])=>`${{name:'meno',first:'meno',last:'priezvisko',date:'dátum narodenia',rc:'rodné číslo',phone:'telefón',email:'e-mail'}[k]}: „${rows[head][j]}“`).join(', ');
 return {list:out,skipped,found};
}
// Adds new clients; a client already in the list keeps whose client they are.
function bdMerge(list,add){const map=new Map(list.map(e=>[bdKey(e),e]));let kept=0;for(const e of add){const k=bdKey(e),old=map.get(k);if(old){const m={...old,...e};if(bdOwner(old)==='martin')m.owner='martin';else delete m.owner;if(bdOwner(old)!==bdOwner(e))kept++;map.set(k,m);}else map.set(k,e);}const out=[...map.values()];out.kept=kept;return out;}
function bdUpcoming(list,days=30){const now=new Date();const res=[];for(let i=0;i<days;i++){const t=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i);const y=t.getFullYear(),leap=y%4===0&&(y%100!==0||y%400===0);for(const e of list)if((e.m===t.getMonth()+1&&e.d===t.getDate())||(!leap&&e.m===2&&e.d===29&&t.getMonth()===1&&t.getDate()===28))res.push({...e,i,label:i===0?'Dnes':i===1?'Zajtra':`${t.getDate()}. ${t.getMonth()+1}.`});}return res;}
const bdDay=e=>`${e.d}. ${e.m}.`;
const BD_OWNER_NAMES={alexandra:'Alexandra',martin:'Martin'};
const bdOwner=e=>e&&e.owner==='martin'?'martin':'alexandra';
const bdTag=e=>`<span class="bday-owner bday-owner-${bdOwner(e)}">${BD_OWNER_NAMES[bdOwner(e)]}</span>`;
const bdCount=n=>`${n} ${n===1?'klient':n>=2&&n<=4?'klienti':'klientov'}`;

function birthdaysAdminPage(){return `<div class="page-shell wrap review-admin bday-admin"><a class="back" href="/admin">← Späť do správy</a><div class="page-intro"><span class="eyebrow">Správa</span><h1>Narodeniny<br><em>klientov.</em></h1><p>Gratulácie odchádzajú automaticky o 9:00 v deň narodenín zo schránky toho, koho je klient, s jeho podpisom. Potom mu príde prehľad, komu odišli. Kým schránka nemá nastavené heslo, príde mu namiesto toho ráno okolo 7:20 zoznam oslávencov s tlačidlom na napísanie gratulácie.</p></div>
<form id="bday-login" class="contact-form admin-login"><label>Kľúč správcu<input name="token" type="password" required minlength="32" autocomplete="current-password"></label><button class="btn" type="submit">Otvoriť <span>→</span></button></form><p id="bday-status" class="usage-status" role="status"></p>
<section id="bday-panel" hidden>
<form id="bday-settings" class="contact-form bday-box"><h2>Ranný e-mail</h2><div class="form-row"><label>Alexandre na adresu<input name="to" type="email" required maxlength="254" autocomplete="off" placeholder="curillova@poistkapodlupou.sk"></label><label>Martinovi na adresu <span class="optional">(nepovinné)</span><input name="to_martin" type="email" maxlength="254" autocomplete="off" placeholder="dominik@poistkapodlupou.sk"></label></div><div id="bday-auto" class="bday-auto"></div><p class="admin-meta">Text gratulácie je uložený vo webmaile každého z vás ako odpoveď „Gratulácia“ (Nastavenia → Odpovede), tam ho aj upravíte. Odkaz v ňom vedie na gratuláciu na webe: Alexandrini klienti <a href="/gratulacia" target="_blank" rel="noopener">poistkapodlupou.sk/gratulacia</a>, Martinovi <a href="/gratulacia?od=martin" target="_blank" rel="noopener">poistkapodlupou.sk/gratulacia?od=martin</a>.</p><div class="bday-actions"><button class="btn" type="submit">Uložiť</button><button class="btn secondary" type="button" id="bday-test">Poslať skúšobný e-mail</button></div><p class="admin-meta" id="bday-settings-status" role="status"></p></form>
<div class="bday-box"><h2>Najbližších 30 dní</h2><div id="bday-upcoming"></div></div>
<div class="bday-box"><h2>Nahrať zoznam klientov</h2><p class="admin-meta">Súbor Excel (XLSX) alebo CSV, v ktorom je meno, dátum narodenia alebo rodné číslo a e-mail. Gratulácie idú e-mailom, klienta bez e-mailu ranný e-mail len pripomenie. Súbor sa spracuje len v tomto prehliadači. Na web sa uloží meno, deň a mesiac narodenia, telefón a e-mail, rok narodenia ani rodné číslo nie. Klienti, ktorí v zozname už sú, sa nezdvoja. Komu gratulovať nechcete, tomu v zozname všetkých klientov zrušte „Gratulovať“. Zostane v zozname, takže sa nevráti ani pri ďalšom nahratí.</p><fieldset class="bday-owner-pick"><legend>Koho sú to klienti?</legend><label><input type="radio" name="bday-owner" value="alexandra" checked> Alexandrini</label><label><input type="radio" name="bday-owner" value="martin"> Martinovi</label></fieldset><label class="bday-replace"><input type="checkbox" id="bday-replace"> Nahradiť doterajších klientov tejto osoby novým súborom (napríklad pri oprave zoznamu)</label><label class="doc-drop bday-drop"><input type="file" id="bday-file" accept=".xlsx,.xls,.csv,.txt"><b class="doc-drop-title">Vybrať súbor so zoznamom</b><span class="doc-drop-hint">Excel (XLSX) alebo CSV</span></label><div id="bday-preview" class="admin-meta" role="status"></div><button class="btn" type="button" id="bday-import" hidden>Pridať do zoznamu</button></div>
<form id="bday-add" class="contact-form bday-box"><h2>Pridať klienta ručne</h2><div class="form-row"><label>Meno a priezvisko<input name="name" required minlength="2" maxlength="100"></label><label>Dátum narodenia<input name="date" type="date" required></label></div><div class="form-row"><label>E-mail<input name="email" type="email" maxlength="254"></label><label>Telefón <span class="optional">(nepovinné)</span><input name="phone" type="tel" maxlength="30"></label></div><label>Koho klient<select name="owner"><option value="alexandra">Alexandrin</option><option value="martin">Martinov</option></select></label><button class="btn" type="submit">Pridať</button></form>
<details class="bday-box" id="bday-all"><summary><b>Všetci klienti</b> <small id="bday-count"></small></summary><label class="bday-search">Hľadať<input type="search" id="bday-q" autocomplete="off"></label><div id="bday-table"></div><button class="btn secondary" type="button" id="bday-clear">Vymazať celý zoznam</button></details>
<button class="btn secondary" type="button" id="bday-logout">Odhlásiť</button>
</section></div>`}

function bindBirthdaysAdmin(){
 const login=document.querySelector('#bday-login');if(!login)return;let token='',data={list:[]},pending=[];
 const status=document.querySelector('#bday-status'),panel=document.querySelector('#bday-panel'),settings=document.querySelector('#bday-settings'),setStatus=document.querySelector('#bday-settings-status');
 const auth=(json)=>({Authorization:'Bearer '+token,...(json?{'Content-Type':'application/json'}:{})});
 const save=async body=>{const r=await fetch(REVIEWS_API+'/admin/birthdays',{method:'POST',credentials:'omit',headers:auth(true),body:JSON.stringify(body)});if(!r.ok){const j=await r.json().catch(()=>({}));throw Error(j.field||String(r.status));}return r.json();};
 function draw(){
  const up=bdUpcoming(data.list.filter(e=>!e.skip));document.querySelector('#bday-upcoming').innerHTML=up.length?`<ul class="bday-list">${up.map(e=>`<li><b>${e.label}</b> ${reviewEsc(e.name)} ${bdTag(e)}${e.email?` · ${reviewEsc(e.email)}`:' · <span class="bday-noemail">bez e-mailu</span>'}</li>`).join('')}</ul>`:'<p class="admin-meta">V najbližších 30 dňoch nemá nikto zo zoznamu narodeniny.</p>';
  document.querySelector('#bday-count').textContent=`(${data.list.length})`;
  const q=bdNorm(document.querySelector('#bday-q').value);const rows=data.list.filter(e=>!q||bdNorm(e.name).includes(q)).sort((a,b)=>a.m-b.m||a.d-b.d||a.name.localeCompare(b.name,'sk'));
  document.querySelector('#bday-table').innerHTML=rows.length?`<div class="legal-table-wrap"><table class="legal-table bday-table"><thead><tr><th>Meno</th><th>Narodeniny</th><th>Koho klient</th><th>E-mail</th><th>Gratulovať</th><th></th></tr></thead><tbody>${rows.slice(0,500).map(e=>`<tr><th scope="row">${reviewEsc(e.name)}</th><td data-label="Narodeniny">${bdDay(e)}</td><td data-label="Koho klient"><select class="bday-owner-sel" data-bday-owner="${reviewEsc(bdKey(e))}" aria-label="Koho klient"><option value="alexandra"${bdOwner(e)==='alexandra'?' selected':''}>Alexandrin</option><option value="martin"${bdOwner(e)==='martin'?' selected':''}>Martinov</option></select></td><td data-label="E-mail">${reviewEsc(e.email||'')}</td><td data-label="Gratulovať"><label class="bday-skip"><input type="checkbox" data-bday-skip="${reviewEsc(bdKey(e))}"${e.skip?'':' checked'}> áno</label></td><td><button class="btn secondary" data-bday-del="${reviewEsc(bdKey(e))}">Odstrániť</button></td></tr>`).join('')}</tbody></table></div>${rows.length>500?'<p class="admin-meta">Zobrazených prvých 500, ostatných nájdete hľadaním.</p>':''}`:'<p class="admin-meta">Zoznam je prázdny.</p>';
  document.querySelectorAll('[data-bday-skip]').forEach(cb=>cb.onchange=async()=>{const k=cb.dataset.bdaySkip;const list=data.list.map(e=>{if(bdKey(e)!==k)return e;const n={...e};if(cb.checked)delete n.skip;else n.skip=true;return n;});cb.disabled=true;try{await save({list});data.list=list;draw();status.textContent=bdStatus();}catch{cb.disabled=false;cb.checked=!cb.checked;alert('Zmena zlyhala.');}});
  document.querySelectorAll('[data-bday-owner]').forEach(sel=>sel.onchange=async()=>{const k=sel.dataset.bdayOwner;const list=data.list.map(e=>{if(bdKey(e)!==k)return e;const n={...e};if(sel.value==='martin')n.owner='martin';else delete n.owner;return n;});sel.disabled=true;try{await save({list});data.list=list;draw();status.textContent=bdStatus();}catch{sel.disabled=false;alert('Zmena zlyhala.');}});
  document.querySelectorAll('[data-bday-del]').forEach(b=>b.onclick=async()=>{const k=b.dataset.bdayDel;const list=data.list.filter(e=>bdKey(e)!==k);b.disabled=true;try{await save({list});data.list=list;draw();}catch{b.disabled=false;alert('Odstránenie zlyhalo.');}});
 }
 const bdStatus=()=>{const m=data.list.filter(e=>bdOwner(e)==='martin').length;const sk=data.list.filter(e=>e.skip).length;return `V zozname: ${bdCount(data.list.length)} (Alexandra ${data.list.length-m}, Martin ${m})`+(sk?`, ${sk} bez gratulácie`:'');};
 function drawAuto(){const el=document.querySelector('#bday-auto');const a=data.auto||{};
  el.innerHTML=[['alexandra','Alexandra','curillova@'],['martin','Martin','dominik@']].map(([k,n,box])=>`<p><b>${n}:</b> ${a[k]?`gratulácie o 9:00 odchádzajú automaticky zo schránky ${box}poistkapodlupou.sk <button type="button" class="bday-chip" data-greet-test="${k}">Poslať skúšobnú gratuláciu sebe</button>`:`automatické odosielanie čaká na heslo schránky ${box}poistkapodlupou.sk v Cloudflare`}</p>`).join('');
  el.querySelectorAll('[data-greet-test]').forEach(b=>b.onclick=async()=>{b.disabled=true;setStatus.textContent='Posielam skúšobnú gratuláciu…';try{const r=await fetch(REVIEWS_API+'/admin/birthdays/greeting-test',{method:'POST',credentials:'omit',headers:auth(true),body:JSON.stringify({owner:b.dataset.greetTest})});const j=await r.json().catch(()=>({}));const d=String(j.detail||'');setStatus.textContent=r.ok?`Skúšobná gratulácia odišla na ${j.to}.`:j.error==='no_password'?'Heslo schránky v Cloudflare nevidím. Skontrolujte názov tajného údaju.':/_(auth|user|pass)_/.test(d)?`Schránka odmietla prihlásenie, heslo v Cloudflare nesedí (${d}). Uložené heslo má ${j.password?j.password.length:'?'} znakov`+(j.password&&j.password.quotes?', je v úvodzovkách':'')+(j.password&&j.password.spaces?', obsahuje medzeru':'')+(j.password&&j.password.nonAscii?', obsahuje znak s diakritikou alebo neobvyklý znak':'')+(j.password&&j.password.trimmed?`, na začiatku alebo konci malo ${j.password.trimmed} prázdnych znakov`:'')+'.'+(j.server?` Server: ${j.server}`:'')+(j.serverPlain&&j.serverPlain!==j.server?` (prvý pokus: ${j.serverPlain})`:''):d?`Gratulácia neodišla, server odpovedal: ${d}.`:'Gratulácia neodišla.';}catch{setStatus.textContent='Spojenie zlyhalo.';}b.disabled=false;});}
 async function load(){const r=await fetch(REVIEWS_API+'/admin/birthdays',{credentials:'omit',headers:auth()});if(r.status===401){adminRemember('');login.hidden=false;panel.hidden=true;status.textContent='Nesprávny kľúč.';return;}if(!r.ok){status.textContent='Služba nie je dostupná ('+r.status+').';return;}
  data=await r.json();adminRemember(token);login.hidden=true;panel.hidden=false;
  status.textContent=bdStatus()+(data.lastSent?` · posledná kontrola ${data.lastSent.split('-').reverse().join('. ')}`:'');
  settings.to.value=data.to||'';settings.to_martin.value=data.to_martin||'';drawAuto();if(!data.to)setStatus.textContent='Zadajte e-mail, kam majú chodiť ranné správy.';draw();}
 login.onsubmit=e=>{e.preventDefault();if(!login.reportValidity())return;token=login.token.value.trim();login.token.value='';status.textContent='Overujem…';load().catch(()=>{status.textContent='Spojenie zlyhalo.';});};
 settings.onsubmit=async e=>{e.preventDefault();if(!settings.reportValidity())return;setStatus.textContent='Ukladám…';try{await save({to:settings.to.value,to_martin:settings.to_martin.value});setStatus.textContent='Uložené.';data.to=settings.to.value;data.to_martin=settings.to_martin.value;}catch{setStatus.textContent='Uloženie zlyhalo. Skontrolujte e-mail.';}};
 document.querySelector('#bday-test').onclick=async()=>{if(!data.to){setStatus.textContent='Najprv uložte e-mail.';return;}setStatus.textContent='Posielam…';const r=await fetch(REVIEWS_API+'/admin/birthdays/test',{method:'POST',credentials:'omit',headers:auth()});const j=await r.json().catch(()=>({}));setStatus.textContent=r.ok?`Skúšobný e-mail odišiel na ${(j.results||[]).filter(x=>x.sent).map(x=>x.owner==='martin'?data.to_martin:data.to).join(' a ')||data.to}.`:j.error==='empty'?'Zoznam je prázdny, nie je čo poslať.':j.error==='no_recipient'?'Najprv uložte e-mail.':'E-mail sa nepodarilo odoslať.';};
 const file=document.querySelector('#bday-file'),preview=document.querySelector('#bday-preview'),imp=document.querySelector('#bday-import');
 file.onchange=async()=>{pending=[];imp.hidden=true;const f=file.files[0];if(!f)return;preview.textContent='Čítam súbor…';
  try{const raw=await bdReadFile(f);const res=bdRows(raw);if(res.error){preview.textContent=res.error;return;}pending=res.list;
   preview.innerHTML=`Našiel som <b>${res.list.length}</b> ${res.list.length===1?'klienta':'klientov'} (stĺpce ${reviewEsc(res.found)}).`+(res.skipped.length?` ${res.skipped.length} ${res.skipped.length===1?'riadok nemá':'riadkov nemá'} meno alebo platný dátum narodenia, tie preskočím: ${reviewEsc(res.skipped.slice(0,5).join(', '))}${res.skipped.length>5?'…':''}.`:'')+(res.list.length?`<br>Napríklad: ${res.list.slice(0,3).map(e=>reviewEsc(e.name)+' '+bdDay(e)).join(' · ')}`:'');
   if(raw.mac)preview.insertAdjacentHTML('beforeend','<br>Súbor bol uložený v staršom kódovaní z Macu (Excel alebo Numbers), diakritiku som opravil.');imp.hidden=!res.list.length;}catch(err){preview.textContent='Súbor sa nepodarilo prečítať. Skúste ho uložiť ako XLSX alebo CSV.';}};
 imp.onclick=async()=>{const owner=(document.querySelector('input[name=bday-owner]:checked')||{}).value,replace=document.querySelector('#bday-replace').checked;
  // Replacing keeps the people this person marked "Gratulovať: nie".
  const skipKeys=new Set(data.list.filter(e=>bdOwner(e)===owner&&e.skip).map(bdKey));const base=replace?data.list.filter(e=>bdOwner(e)!==owner):data.list;
  const list=bdMerge(base,pending.map(e=>({...e,...(owner==='martin'?{owner:'martin'}:{}),...(replace&&skipKeys.has(bdKey(e))?{skip:true}:{})})));if(list.length>5000){preview.textContent='Zoznam môže mať najviac 5 000 klientov.';return;}imp.disabled=true;try{const r=await save({list});data.list=list;preview.textContent=`Uložené. V zozname: ${bdCount(r.count)}.`+(list.kept?` ${list.kept} z nich už v zozname boli u druhého z vás, tam aj ostali.`:'');imp.hidden=true;file.value='';pending=[];document.querySelector('#bday-replace').checked=false;draw();status.textContent=bdStatus();}catch{preview.textContent='Uloženie zlyhalo.';}imp.disabled=false;};
 const add=document.querySelector('#bday-add');add.onsubmit=async e=>{e.preventDefault();if(!add.reportValidity())return;const [,mm,dd]=add.date.value.split('-').map(Number);const entry={name:add.name.value.trim(),d:dd,m:mm,...(add.phone.value.trim()?{phone:add.phone.value.trim()}:{}),...(add.email.value.trim()?{email:add.email.value.trim()}:{}),...(add.owner.value==='martin'?{owner:'martin'}:{})};const list=bdMerge(data.list,[entry]);try{await save({list});data.list=list;add.reset();document.querySelector('#bday-preview').textContent='';draw();status.textContent=bdStatus();}catch(err){alert('Klienta sa nepodarilo pridať. Skontrolujte telefón a e-mail.');}};
 document.querySelector('#bday-q').oninput=draw;
 document.querySelector('#bday-clear').onclick=async()=>{if(!confirm('Vymazať celý zoznam klientov? Nedá sa to vrátiť.'))return;try{await save({list:[]});data.list=[];draw();status.textContent='Zoznam je prázdny.';}catch{alert('Vymazanie zlyhalo.');}};
 document.querySelector('#bday-logout').onclick=()=>{adminRemember('');token='';data={list:[]};panel.hidden=true;login.hidden=false;status.textContent='Odhlásené.';};
 const t=adminToken();if(t){token=t;login.hidden=true;load().catch(()=>{login.hidden=false;});}
}

// Birthday card at /gratulacia (Alexandra) and /gratulacia?od=martin (Martin): the link sent with the wishes. No selling, one small moment:
// make a wish, then blow out the candles. Link previews show assets/og-gratulacia.jpg.
function grCake(){
 const candle=x=>`<g class="gr-candle"><circle class="gr-glow" cx="${x}" cy="44" r="17" fill="#f2b84b" opacity=".16"/><rect x="${x-5}" y="64" width="10" height="42" rx="3" fill="#fdfbf3" stroke="#254755" stroke-width="2.5"/><path d="M${x-5} 78l10-6M${x-5} 90l10-6M${x-5} 102l10-6" stroke="#a9c3cc" stroke-width="3"/><path d="M${x} 64v-6" stroke="#254755" stroke-width="2" stroke-linecap="round"/><g class="gr-flame"><path d="M${x} 58c-8-6-7-16 0-26 7 10 8 20 0 26z" fill="#f2b84b" stroke="#254755" stroke-width="2" stroke-linejoin="round"/><path d="M${x} 55c-3.5-3-3-8 0-13 3 5 3.5 10 0 13z" fill="#fff2c9"/></g><path class="gr-smoke" opacity="0" d="M${x} 54c-5-6 5-10 0-17s5-11 0-17" fill="none" stroke="#a9c3cc" stroke-width="3" stroke-linecap="round"/></g>`;
 const scallops=(x0,x1,y,r,step,fill)=>{let s='';for(let x=x0;x<=x1;x+=step)s+=`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;return s;};
 const sprinkle=(x,y,c,a)=>`<rect x="${x-6}" y="${y-2}" width="12" height="4" rx="2" fill="${c}" transform="rotate(${a} ${x} ${y})"/>`;
 return `<svg class="gr-cake" viewBox="0 0 320 262" aria-hidden="true"><defs><clipPath id="gr-t1"><rect x="56" y="158" width="208" height="76" rx="12"/></clipPath><clipPath id="gr-t2"><rect x="96" y="104" width="128" height="58" rx="10"/></clipPath></defs>
<ellipse cx="160" cy="252" rx="122" ry="9" fill="#163b46" opacity=".08"/><ellipse cx="160" cy="236" rx="126" ry="12" fill="#e7efe3" stroke="#254755" stroke-width="3"/>
<rect x="56" y="158" width="208" height="76" rx="12" fill="#fdfbf3"/><g clip-path="url(#gr-t1)"><rect x="56" y="150" width="208" height="22" fill="#cfdfcd"/>${scallops(66,264,172,10.5,21,'#cfdfcd')}</g>
${sprinkle(84,198,'#f2b84b',30)}${sprinkle(118,214,'#a9c3cc',-20)}${sprinkle(150,196,'#e9a991',15)}${sprinkle(186,213,'#f2b84b',-35)}${sprinkle(220,197,'#a9c3cc',25)}${sprinkle(242,219,'#e9a991',-12)}${sprinkle(100,222,'#749981',40)}${sprinkle(168,222,'#749981',-28)}
<rect x="56" y="158" width="208" height="76" rx="12" fill="none" stroke="#254755" stroke-width="3"/>
<rect x="96" y="104" width="128" height="58" rx="10" fill="#749981"/><g clip-path="url(#gr-t2)"><rect x="96" y="96" width="128" height="20" fill="#fdfbf3"/>${scallops(104,224,116,8,16,'#fdfbf3')}</g>
<g fill="#fdfbf3" opacity=".85"><circle cx="118" cy="140" r="3"/><circle cx="146" cy="150" r="3"/><circle cx="176" cy="138" r="3"/><circle cx="204" cy="150" r="3"/></g>
<rect x="96" y="104" width="128" height="58" rx="10" fill="none" stroke="#254755" stroke-width="3"/>
${candle(128)}${candle(160)}${candle(192)}</svg>`;
}
const GR_FROM={alexandra:{name:'Alexandra Čurillová',photo:'assets/alexandra-240.webp'},martin:{name:'Martin Dominik',photo:'assets/martin-480.webp'}};
function greetingPage(){const k=new URLSearchParams(location.search).get('od');const f=k&&Object.hasOwn(GR_FROM,k)?GR_FROM[k]:GR_FROM.alexandra;return `<div class="page-shell wrap gr-page"><article class="gr-card"><div class="gr-stage">${grCake()}</div><h1>Všetko najlepšie<br><em>k narodeninám</em></h1><p class="gr-wish">Prajem Vám veľa zdravia, radosti a pokojných dní s ľuďmi, na ktorých Vám záleží.</p><div class="gr-actions"><p class="gr-step" aria-live="polite">Zavrite na chvíľu oči a v duchu si niečo zaželajte.</p><button class="btn gr-go" type="button">Mám želanie</button><p class="gr-after" hidden>Nech sa splní, čo ste si želali.<button type="button" class="gr-relight">Zapáliť znova</button></p></div><div class="gr-sign"><img src="${f.photo}" alt="" width="56" height="56"><div><b>${f.name}</b><span>Poistka pod Lupou</span></div></div></article></div>`}
function grConfetti(){
 if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const box=document.createElement('div');box.className='gr-confetti';box.setAttribute('aria-hidden','true');
 const colors=['#f2b84b','#749981','#a9c3cc','#e9a991','#cfdfcd','#254755'];
 for(let i=0;i<80;i++){const s=document.createElement('span');const w=6+Math.random()*6;s.style.cssText=`left:${Math.random()*100}%;width:${w}px;height:${w*(1.3+Math.random()*.8)}px;background:${colors[i%colors.length]};--dx:${(Math.random()*2-1)*90}px;--r:${360+Math.random()*540}deg;animation-duration:${2.2+Math.random()*1.4}s;animation-delay:${Math.random()*.35}s;border-radius:${Math.random()<.3?'50%':'2px'}`;box.append(s);}
 document.body.append(box);setTimeout(()=>box.remove(),4200);
}
function bindGreeting(){
 const page=document.querySelector('.gr-page'),chat=document.querySelector('#chat-toggle');
 if(chat)chat.style.display=page?'none':'';
 if(!page)return;const card=page.querySelector('.gr-card'),go=page.querySelector('.gr-go'),step=page.querySelector('.gr-step'),after=page.querySelector('.gr-after');
 const reset=()=>{card.classList.remove('gr-out','gr-ready');step.hidden=false;step.textContent='Zavrite na chvíľu oči a v duchu si niečo zaželajte.';go.textContent='Mám želanie';go.hidden=false;after.hidden=true;};
 go.onclick=()=>{
  if(!card.classList.contains('gr-ready')){card.classList.add('gr-ready');step.textContent='A teraz sfúknite sviečky.';go.textContent='Sfúknuť sviečky';return;}
  card.classList.add('gr-out');go.hidden=true;step.hidden=true;after.hidden=false;grConfetti();};
 page.querySelector('.gr-relight').onclick=()=>{reset();go.focus();};
}
