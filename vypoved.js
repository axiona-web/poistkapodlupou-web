/* Generator of a termination letter for an insurance contract (/vypoved-poistky).
   Everything runs in the browser: nothing is sent or stored. The PDF uses the same pdf-lib,
   fontkit and DejaVu fonts as the life insurance questionnaire (/formular/).

   Flow (modelled on the generator Martin used at netfinancie.sk): type of insurance -> reason
   from a list that depends on the type -> date -> deadline shown at once -> insurer picked from a
   list fills in its address -> policyholder -> PDF.

   Rules (checked 15. 11. 2026: Občiansky zákonník, law firm templates aksamec.sk and akmv.sk,
   netfinancie.sk generator and templates):
   - end of the insurance period: the insurer must receive the notice at least 6 weeks before
     the period ends (§ 800 ods. 1 OZ); this does not apply when the insurer announced a new
     premium later than 10 weeks before the end (§ 800 ods. 1, since 2018)
   - within 2 months of conclusion: only when the contract allows it, 8-day notice (§ 800 ods. 2 OZ)
   - PZP after a claim: within 1 month of reporting it, 1-month notice (zákon 381/2001 Z. z.);
     other insurance after a claim only as the policy conditions allow, so no deadline is computed
   - PZP ends by law when the vehicle changes holder, is deregistered or stolen: a notice, not a termination
   - change of owner of an insured thing ends the insurance unless the conditions say otherwise (§ 812 OZ)
   - personal insurance except accident insurance: withdrawal within 30 days of conclusion (§ 802a OZ)
   Insurer seats: Obchodný register SR (orsr.sk), 15. 11. 2026. Several lists on the web still
   show old addresses (Allianz moved to Pribinova 19, Kooperativa to Mlynské nivy 16, Wüstenrot to Einsteinova 21). */

const VP_ICONS = {
  pzp: '<path d="M5 16.5h14M6.5 16.5V19M17.5 16.5V19"/><path d="M4 16.5v-3.2l1.8-4.6A2 2 0 0 1 7.7 7.5h8.6a2 2 0 0 1 1.9 1.2l1.8 4.6v3.2"/><path d="M4.5 13h15"/><circle cx="7.5" cy="14.8" r=".6"/><circle cx="16.5" cy="14.8" r=".6"/>',
  kasko: '<path d="M4 17v-3l1.6-4A2 2 0 0 1 7.5 8.8H12"/><path d="M4 17h9M5.5 17v2"/><path d="M17.5 9.5 14 11v2.6c0 2.2 1.5 4 3.5 4.9 2-.9 3.5-2.7 3.5-4.9V11l-3.5-1.5Z"/>',
  majetok: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
  zivotne: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
  urazove: '<rect x="4" y="8.5" width="16" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="m10.5 10.5 3 3M12 9h.01M9 12h.01M15 12h.01M12 15h.01"/>',
  cestovne: '<path d="M10.5 13.5 4 11l1.5-1.5 7 1 3.6-3.6a1.8 1.8 0 0 1 2.5 2.5L15 13l1 7-1.5 1.5-2.5-6.5"/><path d="M4 20h7"/>',
  ine: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'
};
// [key, tile title, tile subtitle, phrase used in the letter, reasons]
const VP_TYPES = [
  ['pzp', 'PZP', 'Povinné zmluvné poistenie', 'povinné zmluvné poistenie zodpovednosti za škodu spôsobenú prevádzkou motorového vozidla', ['anniversary', 'twomonths', 'claim', 'sold', 'dereg', 'stolen']],
  ['kasko', 'Havarijné', 'KASKO', 'havarijné poistenie motorového vozidla', ['anniversary', 'twomonths', 'claimVpp', 'sold', 'dereg']],
  ['majetok', 'Domácnosť a nehnuteľnosť', 'Byt, dom, chata', 'poistenie majetku', ['anniversary', 'twomonths', 'claimVpp', 'soldProp', 'destroyed']],
  ['zivotne', 'Životné', 'Aj investičné', 'životné poistenie', ['surrender', 'withdraw', 'twomonths']],
  ['urazove', 'Úrazové', 'Samostatná zmluva', 'úrazové poistenie', ['anniversary', 'twomonths']],
  ['cestovne', 'Cestovné', 'Celoročné', 'cestovné poistenie', ['anniversary', 'twomonths']],
  ['ine', 'Iné poistenie', 'Zodpovednosť a ďalšie', 'poistenie', ['anniversary', 'twomonths']]
];
// reason -> [label in the list, short explanation under it (by type when it differs)]
const VP_REASONS = {
  anniversary: ['Ku koncu poistného obdobia (k výročiu)', 'Najčastejší spôsob. Poisťovňa musí výpoveď dostať aspoň 6 týždňov pred koncom poistného obdobia.'],
  twomonths: ['Do 2 mesiacov od uzavretia zmluvy', 'Len ak to vaša zmluva alebo poistné podmienky dovoľujú. Poistenie zanikne 8 dní po doručení výpovede.'],
  claim: ['Po škodovej udalosti (do 1 mesiaca od nahlásenia)', 'Poisťovňa musí výpoveď dostať do mesiaca od nahlásenia škody. Poistenie zanikne mesiac po doručení výpovede.'],
  claimVpp: ['Po poistnej udalosti', 'Len ak to umožňujú poistné podmienky. Lehotu nájdete v časti o zániku poistenia.'],
  sold: ['Predaj alebo darovanie auta', { pzp: 'PZP zaniká dňom zmeny držiteľa. Pripravíme oznámenie o zániku so žiadosťou o vrátenie preplatku.', kasko: 'Pri zmene vlastníka poistenie zaniká, ak poistné podmienky neurčujú inak. Pripravíme oznámenie so žiadosťou o ukončenie.' }],
  dereg: ['Vyradenie z evidencie alebo zošrotovanie', 'Poistenie končí vyradením vozidla. Pripravíme oznámenie, priložíte potvrdenie o vyradení alebo protokol o ekologickej likvidácii.'],
  stolen: ['Krádež auta', 'PZP krádežou vozidla zaniká. Pripravíme oznámenie, priložíte potvrdenie polície o nahlásení krádeže.'],
  soldProp: ['Predaj nehnuteľnosti (zmena vlastníka)', 'Pri zmene vlastníka poistenie zaniká, ak poistné podmienky neurčujú inak. Pripravíme oznámenie s dátumom prevodu.'],
  destroyed: ['Zánik poistenej veci', 'Napríklad zbúranie stavby. Pripravíme oznámenie so žiadosťou o ukončenie poistenia.'],
  surrender: ['Výpoveď s výplatou odkupnej hodnoty', 'Podmienky výpovede a výšku odkupnej hodnoty určujú poistné podmienky. V prvých rokoch zmluvy môže byť odkupná hodnota nízka alebo nulová.'],
  withdraw: ['Odstúpenie do 30 dní od uzavretia', 'Od životného poistenia môžete odstúpiť do 30 dní od uzavretia zmluvy, bez udania dôvodu.']
};
const VP_NOTICE = ['sold', 'dereg', 'stolen', 'soldProp', 'destroyed'];           // a notice that the insurance ended, not a termination
const VP_REFUND = ['twomonths', 'sold', 'dereg', 'stolen', 'soldProp', 'destroyed', 'withdraw', 'surrender'];
const VP_EVENT_LABEL = { sold: 'Dátum predaja (zmeny držiteľa)', dereg: 'Dátum vyradenia z evidencie', stolen: 'Dátum krádeže', soldProp: 'Dátum zmeny vlastníka', destroyed: 'Dátum zániku' };
// [name, address, used for]: v = vehicles, m = other non-life, z = life and accident
const VP_INSURERS = [
  ['Allianz - Slovenská poisťovňa, a.s.', 'Pribinova 19\n811 09 Bratislava', 'vmz'],
  ['BNP Paribas Cardif Poisťovňa, a.s.', 'Bottova 2A\n811 09 Bratislava', 'z'],
  ['ČSOB Poisťovňa, a.s.', 'Žižkova 11\n811 02 Bratislava', 'vmz'],
  ['Generali Poisťovňa, pobočka poisťovne z iného členského štátu', 'Lamačská cesta 3/A\n841 04 Bratislava', 'vmz'],
  ['KOMUNÁLNA poisťovňa, a.s. Vienna Insurance Group', 'Štefánikova 17\n811 05 Bratislava', 'vmz'],
  ['KOOPERATIVA poisťovňa, a.s. Vienna Insurance Group', 'Mlynské nivy 16\n821 09 Bratislava', 'vmz'],
  ['MetLife Europe d.a.c., pobočka poisťovne z iného členského štátu', 'Pribinova 10\n811 09 Bratislava', 'z'],
  ['NN Životná poisťovňa, a.s.', 'Jesenského 4/C\n811 02 Bratislava', 'z'],
  ['PARTNERS poisťovňa, a.s.', 'Einsteinova 24\n851 01 Bratislava', 'mz'],
  ['Poštová poisťovňa, a. s.', 'Dvořákovo nábrežie 4\n811 02 Bratislava', 'mz'],
  ['PREMIUM Poisťovňa, pobočka poisťovne z iného členského štátu', 'Námestie Mateja Korvína 1\n811 07 Bratislava', 'vm'],
  ['Union poisťovňa, a. s.', 'Karadžičova 10\n813 60 Bratislava', 'vmz'],
  ['UNIQA pojišťovna, a.s., pobočka poisťovne z iného členského štátu', 'Krasovského 3986/15\n851 01 Bratislava', 'vmz'],
  ['Wüstenrot poisťovňa, a.s.', 'Einsteinova 21\n851 01 Bratislava', 'vmz'],
  ['YOUPLUS Životná poisťovňa, pobočka poisťovne z iného členského štátu', 'Mlynské nivy 5\n821 09 Bratislava', 'z']
];
const vpShort = n => n.replace(/,? (pobočka poisťovne z iného členského štátu|Vienna Insurance Group|a\. ?s\.|d\.a\.c\.)/g, '').replace(/,\s*$/, '').replace(/ - Slovenská poisťovňa/, '');
const vpGroup = t => (t === 'pzp' || t === 'kasko' ? 'v' : t === 'zivotne' || t === 'urazove' ? 'z' : 'm');

const vpEsc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const vpDate = v => { if (!v) return null; const [y, m, d] = v.split('-').map(Number); return y ? new Date(y, m - 1, d) : null; };
const vpFmt = d => d ? `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}` : '';
const vpAddDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
// Adding months keeps the day of month, or the last day of a shorter month (§ 122 OZ)
function vpAddMonths(d, n) { const last = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate(); return new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), last)); }
const vpToday = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
const vpDays = (a, b) => Math.round((b - a) / 864e5);
// Slovak typesetting: one-letter words, § and short abbreviations stay with the next word (no-break space)
const vpNbsp = t => String(t).replace(/\bt\. j\./g, 't.\u00a0j.').replace(/(\d{1,2})\. (\d{1,2})\. (\d{4})/g, '$1.\u00a0$2.\u00a0$3').replace(/(^|[\s(])([aikosuvzAIKOSUVZ§]|č\.|ods\.|t\.\u00a0j\.) /g, '$1$2\u00a0').replace(/(^|[\s(])([aikosuvzAIKOSUVZ§]|č\.|ods\.) /g, '$1$2\u00a0');
const vpType = k => VP_TYPES.find(t => t[0] === k) || VP_TYPES[0];
const vpVehicle = k => k === 'pzp' || k === 'kasko';

function vypovedPage() {
  const ic = n => `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${VP_ICONS[n]}</svg>`;
  const tile = ([k, t, s], i) => `<label class="vp-type"><input type="radio" name="kind" value="${k}" form="vp-form"${i ? '' : ' checked'}><span class="vp-type-ico">${ic(k)}</span><b>${t}</b><small>${s}</small></label>`;
  const opts = VP_TYPES[0][4].map(r => `<option value="${r}">${VP_REASONS[r][0]}</option>`).join('');
  return `<div class="page-shell wrap tool-page vp-page">${toolIntro('Výpoveď poistnej zmluvy', 'Chcete poistku<br><em>zrušiť?</em>', 'Vyberte poistenie a dôvod, doplňte údaje a stiahnite si hotovú výpoveď ako PDF. Hneď uvidíte, dokedy ju musí poisťovňa dostať. Údaje zostávajú vo vašom prehliadači, nikam ich neposielame.')}
<fieldset class="vp-types"><legend>Aké poistenie rušíte?</legend><div class="vp-type-grid">${VP_TYPES.map(tile).join('')}</div></fieldset>
<div class="vp-grid">
 <form class="contact-form vp-form" id="vp-form" autocomplete="on" novalidate>
  <div class="vp-block">
   <label>Dôvod výpovede<select name="reason" id="vp-reason">${opts}</select></label>
   <p class="note vp-reason-note" id="vp-reason-note"></p>
   <div data-vp="anniversary"><label>Začiatok poistenia (výročie zmluvy)<input name="start" type="date"></label><p class="note">Nájdete ho v zmluve. Rozhoduje deň a mesiac, najbližšie výročie dopočítame.</p>
    <label class="check-label"><input type="checkbox" name="latePremium"><span>Poisťovňa mi oznámila nové poistné neskôr ako 10 týždňov pred výročím</span></label></div>
   <div data-vp="twomonths withdraw" hidden><label>Dátum uzavretia zmluvy<input name="concluded" type="date"></label></div>
   <div data-vp="claim claimVpp" hidden><label>Kedy ste škodu nahlásili poisťovni<input name="reported" type="date"></label></div>
   <div data-vp="sold dereg stolen soldProp destroyed" hidden><label><span id="vp-event-label">Dátum</span><input name="eventDate" type="date"></label></div>
   <div class="vp-deadline" id="vp-deadline" aria-live="polite"></div>
  </div>
  <fieldset><legend>Poisťovňa a zmluva</legend>
   <label>Poisťovňa<select name="insurerPick" id="vp-insurer-pick"></select></label>
   <label>Názov poisťovne<input name="insurer" maxlength="120" autocomplete="off"></label><label>Adresa poisťovne<textarea name="insurerAddress" rows="2" maxlength="200" placeholder="Ulica a číslo, PSČ a mesto"></textarea></label>
   <p class="note">Adresu sídla doplníme z obchodného registra. Ak zmluva uvádza inú adresu na korešpondenciu, prepíšte ju.</p>
   <label>Číslo poistnej zmluvy<input name="number" maxlength="40" autocomplete="off"></label>
   <div data-vp="vehicle"><div class="form-row"><label>Značka a model vozidla <span class="optional">(nepovinné)</span><input name="car" maxlength="60" autocomplete="off"></label><label>EČV (ŠPZ)<input name="plate" maxlength="12" autocomplete="off"></label></div></div>
   <div data-vp="property" hidden><label>Adresa poistenej nehnuteľnosti <span class="optional">(nepovinné)</span><input name="property" maxlength="120" autocomplete="off"></label></div>
   <div data-vp="other" hidden><label>Názov poistenia <span class="optional">(nepovinné)</span><input name="kindName" maxlength="80" placeholder="napríklad poistenie zodpovednosti zamestnanca"></label></div>
  </fieldset>
  <fieldset><legend>Poistník</legend>
   <p class="note vp-who">Výpoveď podpisuje poistník, teda ten, kto zmluvu uzavrel, alebo osoba s jeho plnou mocou.</p>
   <label>Meno a priezvisko alebo obchodné meno<input name="name" maxlength="100" autocomplete="name"></label>
   <label>Ulica a číslo<input name="street" maxlength="100" autocomplete="address-line1"></label>
   <div class="form-row vp-zip"><label>PSČ<input name="zip" maxlength="6" inputmode="numeric" autocomplete="postal-code"></label><label>Obec<input name="city" maxlength="60" autocomplete="address-level2"></label></div>
   <div class="form-row"><label>Dátum narodenia alebo IČO <span class="optional">(nepovinné)</span><input name="id" maxlength="20" autocomplete="off"></label><label>Telefón alebo e-mail <span class="optional">(nepovinné)</span><input name="contact" maxlength="80"></label></div>
  </fieldset>
  <fieldset><legend>Doplnky</legend>
   <div data-vp="refund"><label><span id="vp-iban-label">Číslo účtu (IBAN) na vrátenie preplatku</span> <span class="optional">(nepovinné)</span><input name="iban" maxlength="42" autocomplete="off" placeholder="SK.."></label></div>
   <label class="check-label" data-vp="vehicle"><input type="checkbox" name="history" checked><span>Požiadať o doklad o škodovom priebehu (bonus pre novú poistku)</span></label>
   <div class="form-row"><label>Miesto podpisu<input name="place" maxlength="40"></label><label>Dátum listu<input name="date" type="date"></label></div>
  </fieldset>
 </form>
 <aside class="vp-side" aria-label="Hotový list">
  <div class="vp-actions"><button type="button" class="btn" id="vp-pdf">Vytvoriť výpoveď (PDF)</button><button type="button" class="print-btn" id="vp-copy">Kopírovať text</button></div>
  <p class="vp-missing" id="vp-missing"></p>
  <div class="vp-letter-wrap"><h2 id="vp-letter-title">Náhľad listu</h2><div class="vp-letter" id="vp-letter" tabindex="0" role="region" aria-labelledby="vp-letter-title"></div></div>
 </aside>
</div>
<section class="reading-body vp-explain"><h2>Ako výpoveď doručiť</h2><ul><li><b>Doporučene s doručenkou</b> alebo osobne na pobočke. Rozhoduje deň, keď poisťovňa výpoveď dostane, nie deň odoslania.</li><li><b>Online</b> cez formulár alebo klientsku zónu poisťovne, ak ho ponúka. Obyčajný e-mail bez kvalifikovaného elektronického podpisu poisťovňa nemusí prijať.</li><li><b>Podpíšte sa</b> vlastnou rukou a odložte si kópiu listu aj doklad o odoslaní.</li></ul>
<h2>Čo priložiť</h2><p>Pri výpovedi k výročiu, do 2 mesiacov alebo po škode prílohy netreba. Pri zániku poistenia priložte kópiu dokladu:</p><ul><li><b>predaj auta:</b> osvedčenie o evidencii časť II s novým držiteľom alebo kúpna zmluva,</li><li><b>vyradenie alebo zošrotovanie:</b> potvrdenie o vyradení z evidencie alebo protokol o ekologickej likvidácii,</li><li><b>krádež:</b> potvrdenie polície o nahlásení krádeže,</li><li><b>predaj nehnuteľnosti:</b> výpis z listu vlastníctva alebo kúpna zmluva.</li></ul>
<h2>Nezabudnite na novú poistku</h2><p>Auto nesmie byť ani deň bez PZP. Nové poistenie si dohodnite so začiatkom v deň, keď staré skončí. Novú ponuku vám pripraví <a href="/kontakt">Alexandra</a>, alebo si ju môžete so súčasnou zmluvou <a href="/porovnanie">porovnať vedľa seba</a>. Viac o lehotách nájdete v návode <a href="/rady/vypoved-pzp">Ako vypovedať PZP a nezmeškať termín</a>.</p>
<p class="note">Generátor pripraví list podľa Občianskeho zákonníka a zákona o PZP. Nie je to právne poradenstvo. Ak má vaša zmluva iné dohodnuté podmienky, platia tie.</p></section></div>`;
}

function vpRead(form) {
  const v = Object.fromEntries(new FormData(form));
  v.latePremium = form.latePremium.checked; v.history = form.history.checked;
  for (const k in v) if (typeof v[k] === 'string') v[k] = v[k].trim();
  return v;
}

const vpLeft = (today, d) => { const n = vpDays(today, d); return n < 0 ? null : n === 0 ? 'dnes je posledný deň' : n === 1 ? 'zostáva 1 deň' : n < 5 ? `zostávajú ${n} dni` : `zostáva ${n} dní`; };

// Deadline, end of the insurance and a status for the chosen reason.
function vpTiming(v) {
  const today = vpToday(), out = { lines: [], tone: 'ok' };
  if (v.reason === 'anniversary') {
    const s = vpDate(v.start); if (!s) return { empty: 'Zadajte začiatok poistenia a hneď uvidíte, dokedy musí poisťovňa výpoveď dostať.' };
    // the next anniversary after today; the insurance period ends the day before it
    let a = new Date(today.getFullYear(), s.getMonth(), s.getDate());
    if (s > today) a = vpAddMonths(s, 12); else if (a <= today) a = new Date(today.getFullYear() + 1, s.getMonth(), s.getDate());
    let end = vpAddDays(a, -1);
    if (v.latePremium) {
      out.lines.push(['Doručiť', `do ${vpFmt(end)}`], ['Poistenie skončí', vpFmt(end)]);
      out.note = 'Lehota 6 týždňov sa neuplatní, lebo poisťovňa oznámila nové poistné neskôr ako 10 týždňov pred výročím. Výpoveď musí dostať pred koncom poistného obdobia.';
    } else {
      const due = vpAddDays(end, -42), l = vpLeft(today, due);
      if (l === null) {
        const next = vpAddDays(vpAddMonths(a, 12), -1), nextDue = vpAddDays(next, -42);
        out.tone = 'late';
        out.note = `K najbližšiemu výročiu (koniec obdobia ${vpFmt(end)}) už výpoveď nestihnete, lehota uplynula ${vpFmt(due)}. Ak ju poisťovňa dostane do ${vpFmt(nextDue)}, poistenie skončí ${vpFmt(next)}.`;
        end = next; out.lines.push(['Doručiť najneskôr', vpFmt(nextDue)], ['Poistenie skončí', vpFmt(end)]);
      } else {
        out.lines.push(['Doručiť najneskôr', vpFmt(due)], ['Poistenie skončí', vpFmt(end)]);
        out.note = `Stihnete to, ${l}. Pošlite ju radšej o týždeň skôr, aby mala pošta rezervu.`;
      }
    }
    out.end = end;
  } else if (v.reason === 'twomonths' || v.reason === 'withdraw') {
    const c = vpDate(v.concluded); if (!c) return { empty: 'Zadajte dátum uzavretia zmluvy.' };
    const due = v.reason === 'withdraw' ? vpAddDays(c, 30) : vpAddMonths(c, 2), l = vpLeft(today, due);
    out.lines.push([v.reason === 'withdraw' ? 'Odstúpiť najneskôr' : 'Doručiť najneskôr', vpFmt(due)], ['Poistenie skončí', v.reason === 'withdraw' ? 'odstúpením od zmluvy' : '8 dní po doručení výpovede']);
    if (l === null) { out.tone = 'late'; out.note = v.reason === 'withdraw' ? 'Lehota 30 dní už uplynula. Vyberte výpoveď s výplatou odkupnej hodnoty.' : 'Lehota 2 mesiacov už uplynula. Vyberte výpoveď ku koncu poistného obdobia.'; }
    else out.note = `Stihnete to, ${l}.`;
  } else if (v.reason === 'claim') {
    const r = vpDate(v.reported); if (!r) return { empty: 'Zadajte, kedy ste škodu nahlásili poisťovni.' };
    const due = vpAddMonths(r, 1), l = vpLeft(today, due);
    out.lines.push(['Doručiť najneskôr', vpFmt(due)], ['Poistenie skončí', 'mesiac po doručení výpovede']);
    if (l === null) { out.tone = 'late'; out.note = 'Mesačná lehota od nahlásenia škody už uplynula. Vyberte výpoveď ku koncu poistného obdobia.'; }
    else out.note = `Stihnete to, ${l}.`;
  } else if (v.reason === 'claimVpp') {
    if (!vpDate(v.reported)) return { empty: 'Zadajte, kedy ste škodu nahlásili poisťovni.' };
    out.lines.push(['Lehota', 'podľa poistných podmienok']);
    out.note = 'Lehotu na výpoveď po poistnej udalosti a deň zániku poistenia určujú poistné podmienky. Pošlite výpoveď čo najskôr.';
  } else if (VP_NOTICE.includes(v.reason)) {
    const d = vpDate(v.eventDate); if (!d) return { empty: `Zadajte ${VP_EVENT_LABEL[v.reason].toLowerCase()}.` };
    out.lines.push(['Poistenie zaniká', `ku dňu ${vpFmt(d)}`], ['Čo poslať', 'oznámenie s prílohou']);
    out.note = v.kind === 'pzp' ? 'Výpoveď netreba, PZP zaniká zo zákona. Oznámenie pošlite, aby vám poisťovňa vrátila preplatok a vydala doklad o škodovom priebehu.' : 'Oznámenie pošlite bez zbytočného odkladu, aby vám poisťovňa vrátila nespotrebované poistné.';
  } else if (v.reason === 'surrender') {
    out.lines.push(['Poistenie skončí', 'podľa poistných podmienok']);
    out.note = 'Pred výpoveďou si v klientskej zóne alebo u poisťovne overte výšku odkupnej hodnoty. Niekedy sa oplatí zmluvu radšej upraviť.';
  }
  return out;
}

function vpLetter(v) {
  const type = vpType(v.kind), vehicle = vpVehicle(v.kind);
  const gap = t => t || '………………';
  const nr = gap(v.number), veh = `${v.car ? v.car + ' ' : ''}s EČV ${gap(v.plate)}`;
  const kind = v.kind === 'ine' && v.kindName ? v.kindName : type[3];
  const what = `${kind}${vehicle ? `, vozidlo ${veh}` : ''}${v.kind === 'majetok' && v.property ? `, ${v.property}` : ''}`;
  const t = vpTiming(v), ev = gap(vpFmt(vpDate(v.eventDate)));
  let subject = `Výpoveď poistnej zmluvy č. ${nr}`; const body = [];
  switch (v.reason) {
    case 'anniversary':
      body.push(`Týmto vypovedám poistnú zmluvu č. ${nr} (${what}) ku koncu poistného obdobia, t. j. ku dňu ${gap(vpFmt(t.end))}, v súlade s § 800 ods. 1 Občianskeho zákonníka.`);
      if (v.latePremium) body.push('Novú výšku poistného ste mi neoznámili najneskôr desať týždňov pred uplynutím poistného obdobia, preto sa lehota šiestich týždňov na doručenie výpovede neuplatní.');
      break;
    case 'twomonths':
      body.push(`Týmto vypovedám poistnú zmluvu č. ${nr} (${what}) uzavretú dňa ${gap(vpFmt(vpDate(v.concluded)))} v lehote dvoch mesiacov od jej uzavretia s osemdňovou výpovednou lehotou, v súlade s poistnou zmluvou a § 800 ods. 2 Občianskeho zákonníka.`);
      break;
    case 'claim':
      subject += ' po škodovej udalosti';
      body.push(`Týmto vypovedám poistnú zmluvu č. ${nr} o povinnom zmluvnom poistení zodpovednosti za škodu spôsobenú prevádzkou motorového vozidla (vozidlo ${veh}) v lehote jedného mesiaca odo dňa oznámenia škodovej udalosti, ktorú som vám oznámil(a) dňa ${gap(vpFmt(vpDate(v.reported)))}, s jednomesačnou výpovednou lehotou podľa zákona č. 381/2001 Z. z. o povinnom zmluvnom poistení zodpovednosti za škodu spôsobenú prevádzkou motorového vozidla.`);
      break;
    case 'claimVpp':
      subject += ' po poistnej udalosti';
      body.push(`Týmto vypovedám poistnú zmluvu č. ${nr} (${what}) po poistnej udalosti, ktorú som vám oznámil(a) dňa ${gap(vpFmt(vpDate(v.reported)))}, v lehote a s výpovednou lehotou podľa poistných podmienok.`);
      break;
    case 'sold':
      subject = `Oznámenie o zániku poistenia, zmluva č. ${nr}`;
      body.push(v.kind === 'pzp'
        ? `Oznamujem vám, že dňa ${ev} došlo k zmene držiteľa vozidla ${veh}. Povinné zmluvné poistenie podľa zmluvy č. ${nr} preto zaniklo podľa zákona č. 381/2001 Z. z.`
        : `Oznamujem vám, že dňa ${ev} došlo k zmene vlastníka vozidla ${veh}. Žiadam preto o ukončenie havarijného poistenia podľa zmluvy č. ${nr} ku dňu zmeny vlastníka.`);
      break;
    case 'dereg':
      subject = `Oznámenie o zániku poistenia, zmluva č. ${nr}`;
      body.push(v.kind === 'pzp'
        ? `Oznamujem vám, že dňa ${ev} bolo vozidlo ${veh} vyradené z evidencie vozidiel. Povinné zmluvné poistenie podľa zmluvy č. ${nr} preto zaniklo podľa zákona č. 381/2001 Z. z.`
        : `Oznamujem vám, že dňa ${ev} bolo vozidlo ${veh} vyradené z evidencie vozidiel. Žiadam preto o ukončenie havarijného poistenia podľa zmluvy č. ${nr} ku dňu vyradenia.`);
      break;
    case 'stolen':
      subject = `Oznámenie o zániku poistenia, zmluva č. ${nr}`;
      body.push(`Oznamujem vám, že dňa ${ev} došlo k odcudzeniu vozidla ${veh}. Krádež som nahlásil(a) polícii. Povinné zmluvné poistenie podľa zmluvy č. ${nr} preto zaniklo podľa zákona č. 381/2001 Z. z.`);
      break;
    case 'soldProp':
      subject = `Oznámenie o zmene vlastníka, zmluva č. ${nr}`;
      body.push(`Oznamujem vám, že dňa ${ev} došlo k zmene vlastníka poistenej nehnuteľnosti${v.property ? ` (${v.property})` : ''}. Žiadam preto o ukončenie poistenia podľa zmluvy č. ${nr} ku dňu zmeny vlastníka.`);
      break;
    case 'destroyed':
      subject = `Oznámenie o zániku poistenej veci, zmluva č. ${nr}`;
      body.push(`Oznamujem vám, že dňa ${ev} poistená vec${v.property ? ` (${v.property})` : ''} zanikla. Žiadam preto o ukončenie poistenia podľa zmluvy č. ${nr} ku dňu jej zániku.`);
      break;
    case 'surrender':
      body.push(`Týmto vypovedám poistnú zmluvu č. ${nr} (${what}) v súlade s poistnými podmienkami a žiadam o výplatu odkupnej hodnoty, ak na ňu vznikol nárok.`);
      break;
    case 'withdraw':
      subject = `Odstúpenie od poistnej zmluvy č. ${nr}`;
      body.push(`Týmto odstupujem od poistnej zmluvy č. ${nr} (${what}) uzavretej dňa ${gap(vpFmt(vpDate(v.concluded)))}, v lehote 30 dní od jej uzavretia podľa § 802a ods. 1 Občianskeho zákonníka.`);
      break;
  }
  const iban = v.iban ? v.iban.replace(/\s+/g, '').toUpperCase().replace(/(.{4})(?=.)/g, '$1 ') : '';
  if (v.reason === 'surrender') { if (iban) body.push(`Odkupnú hodnotu prosím poukázať na účet ${iban}.`); }
  else if (VP_REFUND.includes(v.reason)) {
    const refund = v.reason === 'withdraw' ? 'Prosím o vrátenie zaplateného poistného v rozsahu podľa zákona' : 'Prosím o vrátenie nespotrebovaného poistného';
    body.push(iban ? `${refund} na účet ${iban}.` : `${refund}.`);
  }
  if (vehicle && v.history) body.push('Zároveň vás žiadam o vydanie dokladu o škodovom priebehu poistenia.');
  body.push(VP_NOTICE.includes(v.reason) ? 'Prosím o písomné potvrdenie zániku poistenia.' : 'Prosím o písomné potvrdenie prijatia a dátumu zániku poistenia.');
  const idLine = v.id ? (/^\d{6,8}$/.test(v.id.replace(/\s/g, '')) ? `IČO: ${v.id}` : `dátum narodenia: ${v.id}`) : '';
  const from = [gap(v.name), gap(v.street), `${v.zip || ''} ${v.city || ''}`.trim() || gap(''), idLine, v.contact].filter(Boolean);
  const to = [gap(v.insurer), ...(v.insurerAddress ? v.insurerAddress.split(/\n|,\s*(?=\d{3}\s?\d{2})/).map(s => s.trim()).filter(Boolean) : [gap('')])];
  const attach = {
    sold: v.kind === 'pzp' || v.kind === 'kasko' ? 'kópia osvedčenia o evidencii časť II s novým držiteľom alebo kúpnej zmluvy' : '',
    dereg: 'kópia potvrdenia o vyradení vozidla z evidencie alebo protokolu o ekologickej likvidácii',
    stolen: 'kópia potvrdenia polície o nahlásení krádeže',
    soldProp: 'kópia výpisu z listu vlastníctva alebo kúpnej zmluvy',
    destroyed: 'kópia dokladu o zániku poistenej veci'
  }[v.reason];
  return { from, to, place: v.place, date: vpFmt(vpDate(v.date)) || vpFmt(vpToday()), subject, greeting: 'Dobrý deň,', body, sign: gap(v.name), attach: attach ? [attach] : [], timing: t };
}

function vpText(L) {
  return [...L.from, '', ...L.to, '', `${L.place ? L.place + ', ' : ''}${L.date}`, '', `Vec: ${L.subject}`, '', L.greeting, '', ...L.body.flatMap(p => [p, '']), 'S pozdravom', '', '', '……………………………', L.sign, 'podpis poistníka', ...(L.attach.length ? ['', 'Príloha:', ...L.attach.map(a => '- ' + a)] : [])].join('\n');
}

function vpMissing(v) {
  const need = [['number', 'číslo zmluvy'], ['insurer', 'poisťovňa'], ['insurerAddress', 'adresa poisťovne'], ['name', 'meno'], ['street', 'ulica'], ['zip', 'PSČ'], ['city', 'obec']];
  if (vpVehicle(v.kind)) need.push(['plate', 'EČV']);
  const date = { anniversary: ['start', 'začiatok poistenia'], twomonths: ['concluded', 'dátum uzavretia'], withdraw: ['concluded', 'dátum uzavretia'], claim: ['reported', 'dátum nahlásenia škody'], claimVpp: ['reported', 'dátum nahlásenia škody'] }[v.reason] || (VP_NOTICE.includes(v.reason) ? ['eventDate', (VP_EVENT_LABEL[v.reason] || 'dátum').toLowerCase()] : null);
  if (date) need.unshift(date);
  return need.filter(([k]) => !v[k]).map(([, l]) => l);
}

let vpLibs;
function vpLoad(src) { return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(Error('load ' + src)); document.head.appendChild(s); }); }
async function vpPdf(L) {
  vpLibs = vpLibs || Promise.all([vpLoad('/formular/vendor/pdf-lib.min.js'), vpLoad('/formular/vendor/fontkit.min.js')]);
  await vpLibs;
  const { PDFDocument, rgb } = PDFLib; const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  const [r1, r2] = await Promise.all([fetch('/formular/fonts/DejaVuSans.ttf'), fetch('/formular/fonts/DejaVuSans-Bold.ttf')]);
  const font = await doc.embedFont(await r1.arrayBuffer(), { subset: true }), bold = await doc.embedFont(await r2.arrayBuffer(), { subset: true });
  doc.setTitle(L.subject); doc.setCreator('poistkapodlupou.sk');
  const W = 595.28, H = 841.89, M = 68, ink = rgb(.09, .16, .2), muted = rgb(.35, .42, .45);
  let page = doc.addPage([W, H]), y = H - 72;
  const wrap = (text, f, size, width) => { const out = []; let cur = ''; for (const w of String(text).split(/ +/).filter(Boolean)) { const t = cur ? cur + ' ' + w : w; if (f.widthOfTextAtSize(t, size) <= width) cur = t; else { if (cur) out.push(cur); cur = w; } } out.push(cur); return out; };
  const line = (t, { f = font, size = 10.5, x = M, color = ink, gap = 15.5 } = {}) => { if (y < 70) { page = doc.addPage([W, H]); y = H - 72; } page.drawText(t, { x, y, size, font: f, color }); y -= gap; };
  // justify: every line but the last is spread to the full width; a line that would get very wide gaps stays left aligned
  const para = (t, o = {}) => {
    const f = o.f || font, size = o.size || 10.5, x0 = M + (o.indent || 0), width = W - M - x0, ls = wrap(t, f, size, width);
    ls.forEach((l, i) => {
      const words = l.split(' '), used = words.reduce((n, w) => n + f.widthOfTextAtSize(w, size), 0), space = words.length > 1 ? (width - used) / (words.length - 1) : 0;
      if (!o.justify || i === ls.length - 1 || words.length < 2 || space > f.widthOfTextAtSize(' ', size) * 4) return line(l, { ...o, x: x0 });
      if (y < 70) { page = doc.addPage([W, H]); y = H - 72; }
      let x = x0; for (const w of words) { page.drawText(w, { x, y, size, font: f, color: o.color || ink }); x += f.widthOfTextAtSize(w, size) + space; }
      y -= o.gap || 15.5;
    });
  };
  L.from.forEach(t => line(t, { size: 10, color: muted, gap: 14 }));
  y -= 18; const toX = W / 2 + 20; L.to.forEach((t, i) => { const f = i ? font : bold; for (const l of wrap(t, f, 10.5, W - M - toX)) { page.drawText(l, { x: toX, y, size: 10.5, font: f, color: ink }); y -= 15; } });
  y -= 22; line(`${L.place ? L.place + ', ' : ''}${L.date}`, { x: W - M - font.widthOfTextAtSize(`${L.place ? L.place + ', ' : ''}${L.date}`, 10.5) });
  y -= 18; para(`Vec: ${L.subject}`, { f: bold, size: 11.5 }); y -= 12;
  line(L.greeting); y -= 6;
  L.body.forEach(p => { para(vpNbsp(p), { justify: true }); y -= 8; });
  y -= 6; line('S pozdravom'); y -= 46;
  line('……………………………'); line(L.sign, { f: bold }); line('podpis poistníka', { size: 9, color: muted });
  if (L.attach.length) { y -= 16; line('Príloha:', { f: bold, size: 10 }); L.attach.forEach(a => para('– ' + a, { size: 10 })); }
  const bytes = await doc.save(); const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a'); a.href = url; a.download = 'vypoved-poistnej-zmluvy.pdf'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function bindVypoved() {
  const form = document.getElementById('vp-form'); if (!form) return;
  const root = form.closest('.vp-page'), $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, '0');
  if (!form.date.value) { const t = vpToday(); form.date.value = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`; }
  // ?typ=pzp preselects the type (links from the guides)
  const wanted = new URLSearchParams(location.search).get('typ');
  if (wanted && VP_TYPES.some(t => t[0] === wanted)) root.querySelector(`input[name=kind][value="${wanted}"]`).checked = true;
  let current, kindNow;
  function fillInsurers(kind) {
    const pick = $('vp-insurer-pick'), was = pick.value, g = vpGroup(kind);
    pick.innerHTML = '<option value="">Vyberte poisťovňu</option>' + VP_INSURERS.filter(i => i[2].includes(g)).map(([n]) => `<option value="${vpEsc(n)}">${vpEsc(vpShort(n))}</option>`).join('') + '<option value="other">Iná poisťovňa</option>';
    pick.value = [...pick.options].some(o => o.value === was) ? was : '';
  }
  function fillReasons(kind) {
    const sel = $('vp-reason'), was = sel.value, list = vpType(kind)[4];
    sel.innerHTML = list.map(r => `<option value="${r}">${VP_REASONS[r][0]}</option>`).join('');
    sel.value = list.includes(was) ? was : list[0];
  }
  function update() {
    const kind = (root.querySelector('input[name=kind]:checked') || {}).value || 'pzp';
    if (kind !== kindNow) { kindNow = kind; fillReasons(kind); fillInsurers(kind); }
    const v = vpRead(form); v.kind = kind;
    const note = VP_REASONS[v.reason][1]; $('vp-reason-note').textContent = typeof note === 'string' ? note : note[kind] || '';
    if (VP_EVENT_LABEL[v.reason]) $('vp-event-label').textContent = VP_EVENT_LABEL[v.reason];
    $('vp-iban-label').textContent = v.reason === 'surrender' ? 'Číslo účtu (IBAN) na výplatu odkupnej hodnoty' : 'Číslo účtu (IBAN) na vrátenie preplatku';
    const flags = { vehicle: vpVehicle(kind), property: kind === 'majetok', other: kind === 'ine', refund: VP_REFUND.includes(v.reason) };
    form.querySelectorAll('[data-vp]').forEach(el => { const keys = el.dataset.vp.split(' '); el.hidden = !keys.some(k => k === v.reason || flags[k]); });
    const L = vpLetter(v), t = L.timing; current = L;
    $('vp-deadline').className = 'vp-deadline' + (t.tone === 'late' ? ' late' : '') + (t.empty ? ' empty' : '');
    $('vp-deadline').innerHTML = t.empty ? `<p>${t.empty}</p>` : `<dl>${t.lines.map(([k, d]) => `<div><dt>${k}</dt><dd>${vpEsc(d)}</dd></div>`).join('')}</dl>${t.note ? `<p>${vpEsc(t.note)}</p>` : ''}`;
    const miss = vpMissing(v); $('vp-missing').textContent = miss.length ? 'Doplňte: ' + miss.join(', ') + '.' : 'List je pripravený. Vytlačte ho, podpíšte a doručte poisťovni.';
    $('vp-missing').className = 'vp-missing' + (miss.length ? '' : ' ready');
    const p = s => `<p>${vpEsc(s)}</p>`;
    $('vp-letter').innerHTML = `<div class="vp-from">${L.from.map(p).join('')}</div><div class="vp-to">${L.to.map((s, i) => i ? p(s) : `<p><b>${vpEsc(s)}</b></p>`).join('')}</div><p class="vp-date">${vpEsc(`${L.place ? L.place + ', ' : ''}${L.date}`)}</p><p class="vp-subject"><b>Vec: ${vpEsc(L.subject)}</b></p>${p(L.greeting)}${L.body.map(t => `<p>${vpEsc(vpNbsp(t))}</p>`).join('')}<p>S pozdravom</p><div class="vp-sign"><span></span><b>${vpEsc(L.sign)}</b><small>podpis poistníka</small></div>${L.attach.length ? `<p class="vp-attach"><b>Príloha:</b> ${L.attach.map(vpEsc).join(', ')}</p>` : ''}`;
  }
  $('vp-insurer-pick').addEventListener('change', e => {
    const hit = VP_INSURERS.find(i => i[0] === e.target.value);
    if (hit) { form.insurer.value = hit[0]; form.insurerAddress.value = hit[1]; }
    else if (e.target.value === 'other') { form.insurer.value = ''; form.insurerAddress.value = ''; form.insurer.focus(); }
  });
  root.addEventListener('input', update); root.addEventListener('change', update);
  $('vp-copy').onclick = async () => { try { await navigator.clipboard.writeText(vpText(current)); $('vp-copy').textContent = 'Skopírované'; setTimeout(() => { $('vp-copy').textContent = 'Kopírovať text'; }, 2000); } catch { $('vp-copy').textContent = 'Kopírovanie nefunguje, označte text v náhľade'; } };
  $('vp-pdf').onclick = async () => {
    const v = vpRead(form); v.kind = kindNow; const miss = vpMissing(v);
    if (miss.length) { $('vp-missing').textContent = 'Pred vytvorením PDF doplňte: ' + miss.join(', ') + '.'; return; }
    const b = $('vp-pdf'); b.disabled = true; b.textContent = 'Pripravujem PDF…';
    try { await vpPdf(current); } catch (e) { $('vp-missing').textContent = 'PDF sa nepodarilo vytvoriť. Skopírujte text listu alebo to skúste znova.'; }
    b.disabled = false; b.textContent = 'Vytvoriť výpoveď (PDF)';
  };
  update();
}
