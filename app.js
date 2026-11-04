'use strict';

/* ============================================================
   CENTRALE INSTELLINGEN
   ============================================================ */
const CONFIG = {
    storageKeys: {
        points: 'rk_points_v6',
        activeTime: 'rk_active_time_v1',
        history: 'rk_history_v6',
        progress: 'rk_progress_v6',
        reward500: 'rk_reward500_v1'
    },
    historyLimit: 100,
    duplicateRetryLimit: 25,
    defaultTafels: [8, 9, 10, 12],
    defaultSommenPerOefening: 10,
    defaultGetalbereik: 1000,
    defaultNiveau: 'groep6',
    rewardThreshold: 500,
    tafelFactoren: [3,4,5,6,7,8,9,11,12],
    tafelBereik: { min: 1, max: 20 }
};

// Begin = leren richting de middentoets; Midden = leren richting de eindtoets.
const TAFELS_BASIS = [1,2,3,4,5,6,7,8,9,10];
const BASIS4 = ['getalbegrip','tafels','optellen_aftrekken','klokkijken','geld','strategie','redactie'];
const BASIS5 = [...BASIS4,'vermenigvuldigen','delen','meten','informatie'];
const BASIS6 = [...BASIS5,'breuken','breukencontext','kommagetallen','meetkunde','schatten'];
const BASIS7 = [...BASIS6,'procenten','verhoudingen'];
const LEVELS = {
    begin4:{label:'Begin 4',uitleg:'Tot de middentoets van groep 4: rekenen tot 100, alle tafels 1–10, hele en halve uren. Selecteer eventueel eerst een paar tafels.',maxGetal:100,tafels:TAFELS_BASIS,factoren:TAFELS_BASIS,categories:BASIS4},
    midden4:{label:'Midden 4',uitleg:'Van midden naar eind groep 4: rekenen tot 100, tafels 1–10 automatiseren, eenvoudige deelsommen, kwartieren en vijf minuten.',maxGetal:100,tafels:TAFELS_BASIS,factoren:TAFELS_BASIS,categories:[...BASIS4,'vermenigvuldigen','delen','informatie']},
    begin5:{label:'Begin 5',uitleg:'Tot de middentoets van groep 5: getallen tot 1.000, rustig opbouwen met tientallen, eenvoudige keersommen, delen en maten herkennen.',maxGetal:1000,tafels:TAFELS_BASIS,factoren:TAFELS_BASIS,categories:BASIS5},
    midden5:{label:'Midden 5',uitleg:'Van midden naar eind groep 5: rekenen tot 1.000, tweecijferig × één cijfer, delen met één cijfer, eenvoudige maten en omtrek.',maxGetal:1000,tafels:TAFELS_BASIS,factoren:TAFELS_BASIS,categories:[...BASIS5,'meetkunde','schatten']},
    groep6:{label:'Begin 6',uitleg:'Tot de middentoets van groep 6: rekenen tot 10.000, bijvoorbeeld 24 × 6 en 144 : 8, halven en kwarten, kennismaken met kommagetallen, maten en klokkijken.',maxGetal:10000,tafels:TAFELS_BASIS,factoren:TAFELS_BASIS,categories:BASIS6},
    midden6:{label:'Midden 6',uitleg:'Van midden naar eind groep 6: grotere getallen, bijvoorbeeld 34 × 26 en 936 : 24, breuken vergelijken en berekenen, kommagetallen +/−, maten omrekenen en tijdsduur.',maxGetal:100000,tafels:TAFELS_BASIS,factoren:TAFELS_BASIS,categories:BASIS6},
    groep7:{label:'Begin 7',uitleg:'Tot de middentoets van groep 7: verder met grote getallen, breuken en kommagetallen, eenvoudige procenten en verhoudingen, oppervlakte en inhoud.',maxGetal:100000,tafels:TAFELS_BASIS,factoren:TAFELS_BASIS,categories:BASIS7},
    midden7:{label:'Midden 7',uitleg:'Van midden naar eind groep 7: getallen tot 1.000.000, grotere bewerkingen, delen met rest, breuken, percentages, schaal en meerstapsproblemen.',maxGetal:1000000,tafels:TAFELS_BASIS,factoren:TAFELS_BASIS,categories:BASIS7}
};
const LEERLIJN = {
    begin4:{plusMax:100,mul:[2,10,2,10],div:[2,10,2,10,100],commaDigits:0},
    midden4:{plusMax:100,mul:[2,10,2,10],div:[2,10,2,10,100],commaDigits:0},
    begin5:{plusMax:1000,mul:[12,24,2,5],div:[2,5,2,12,60],commaDigits:0},
    midden5:{plusMax:1000,mul:[12,49,2,9],div:[2,9,2,20,180],commaDigits:0},
    groep6:{plusMax:10000,mul:[12,99,2,9],div:[2,9,2,50,450],commaDigits:1},
    midden6:{plusMax:100000,mul:[12,99,11,49],div:[12,24,12,40,960],commaDigits:2},
    groep7:{plusMax:100000,mul:[12,99,11,99],div:[12,49,12,99,5000],commaDigits:2},
    midden7:{plusMax:1000000,mul:[101,999,11,99],div:[12,99,12,199,20000],commaDigits:3}
};
function leerprofiel(instellingen={}){return LEERLIJN[instellingen.niveau]||LEERLIJN[CONFIG.defaultNiveau];}
function getalgrens(instellingen={}){
    const max=leerprofiel(instellingen).plusMax;
    return Math.max(20,Math.min(max,Number(instellingen.getalbereik)||max));
}
function rekenGetal(min,max,stap=1){return randInt(Math.ceil(min/stap),Math.floor(max/stap))*stap;}

/* ============================================================
   HULPFUNCTIES (klein en puur, makkelijk te testen)
   ============================================================ */
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(arr) {
    return arr[randInt(0, arr.length - 1)];
}

function maakWaardenMetUniekExtreem(aantal, min, max, soort = 'max') {
    let waarden;
    do {
        waarden = Array.from({ length: aantal }, () => randInt(min, max));
        const extreem = soort === 'min' ? Math.min(...waarden) : Math.max(...waarden);
        if (waarden.filter(v => v === extreem).length === 1) return waarden;
    } while (true);
}

function gcd(a, b) {
    while (b !== 0) {
        [a, b] = [b, a % b];
    }
    return a;
}

function maakSom(vraag, antwoordNum, strategie = null, extra = {}) {
    const antwoord = String(antwoordNum);
    return Object.assign({
        vraag,
        antwoord,
        strategie,
        isSplitsen: false,
        splitsData: null,
        customHTML: '',
        signature: `${vraag}=${antwoord}`
    }, extra);
}

function maakSplitsSom(totaal, links, rechts, antwoordNum, strategie = 'getalbegrip') {
    const antwoord = String(antwoordNum);
    return {
        vraag: 'Vul het missende getal in het splitsingsschema in:',
        antwoord,
        strategie,
        isSplitsen: true,
        splitsData: { totaal, links, rechts },
        signature: `splits:${totaal}-${links}-${rechts}`
    };
}

/* ============================================================
   SOM-GENERATOREN PER CATEGORIE
   Elke generator is een pure functie zonder bijwerkingen buiten
   het lezen van de (injecteerbare) instellingen.
   ============================================================ */

function genTafels(instellingen) {
    const profiel = LEVELS[instellingen.niveau] || LEVELS.groep6;
    const tafels = (instellingen.selectedTafels && instellingen.selectedTafels.length)
        ? instellingen.selectedTafels.filter(t => profiel.tafels.includes(t))
        : profiel.tafels;
    const bruikbareTafels = tafels.length ? tafels : profiel.tafels;
    const t = pickRandom(bruikbareTafels);
    const factoren = profiel.factoren;
    const m = pickRandom(factoren);
    const klein = Math.min(m, t), groot = Math.max(m, t);
    return maakSom(`${m} × ${t} =`, m * t, 'tafels', { signature: `mul:${klein}x${groot}` });
}

function genSchattenOptellen() {
    const g1 = randInt(201, 600);
    const g2 = randInt(101, 400);
    const antwoord = Math.round(g1 / 100) * 100 + Math.round(g2 / 100) * 100;
    return maakSom(`Hoeveel is het ongeveer? (Rond af op honderdtallen):\n ${g1} + ${g2} ≈`, antwoord);
}

function genSchattenAftrekken() {
    const g1 = randInt(400, 1199);
    const g2 = randInt(101, 400);
    const antwoord = Math.round(g1 / 100) * 100 - Math.round(g2 / 100) * 100;
    return maakSom(`Hoeveel is het ongeveer? (Rond af op honderdtallen):\n ${g1} - ${g2} ≈`, antwoord);
}

function genSchattenVermenigvuldigen() {
    const g1 = pickRandom([29, 39, 49, 99]);
    const g2 = randInt(3, 9);
    const antwoord = Math.round(g1 / 10) * 10 * g2;
    return maakSom(`Hoeveel is het ongeveer? (Rond af op tientallen):\n ${g1} × ${g2} ≈`, antwoord);
}

function genSchatten(instellingen={}){
    const max=getalgrens(instellingen),stap=max<=1000?10:100;
    const a=randInt(stap,Math.floor(max*0.6)),b=randInt(stap,Math.floor(max*0.3));
    return maakSom(`Rond beide getallen af op ${stap===10?'tientallen':'honderdtallen'} en tel de afgeronde getallen op: ${a} + ${b} ≈`,Math.round(a/stap)*stap+Math.round(b/stap)*stap,'schatten');
}

function genSplitsen(instellingen) {
    const niveau=instellingen.niveau||CONFIG.defaultNiveau;
    if(niveau==='begin4'||niveau==='midden4'){
        const totaal=randInt(10,niveau==='begin4'?20:100), links=randInt(1,totaal-1), rechts=totaal-links;
        const linksOnbekend=Math.random()<0.5;
        return maakSplitsSom(totaal,linksOnbekend?'?':links,linksOnbekend?rechts:'?',linksOnbekend?links:rechts,'getalbegrip');
    }
    const max=getalgrens(instellingen), n=randInt(max>=1000?101:10,max);
    const plaats=10**randInt(1,String(n).length-1);
    if(Math.random()<0.5){
        const groot=Math.floor(n/plaats)*plaats;
        return maakSom(`${n} = ${groot} + ...`,n-groot,'getalbegrip');
    }
    const cijfer=Math.floor(n/plaats)%10;
    const namen={10:'tientallen',100:'honderdtallen',1000:'duizendtallen',10000:'tienduizendtallen',100000:'honderdduizendtallen'};
    return maakSom(`Welk cijfer staat op de plaats van de ${namen[plaats]} in ${n}?`,cijfer,'getalbegrip');
}

const POOL_BREUKEN_HELFT_VAN = [12, 16, 20, 24, 32, 36, 40, 44, 48];
const POOL_BREUKEN_TELLER = [6, 8, 10, 12, 14, 16, 18, 20];

function breukenStrook(teller,noemer){
    const vakken=Array.from({length:noemer},(_,i)=>`<rect x="${i*360/noemer}" y="8" width="${360/noemer}" height="48" fill="${i<teller?'#4f70df':'#edf0fa'}" stroke="#27365a"/>`).join('');
    return `<svg viewBox="0 0 360 64" style="display:block;width:100%;max-width:360px;margin:12px auto" role="img" aria-label="Breukenstrook met gekleurde en lege vakken">${vakken}</svg>`;
}
function genBreuken(instellingen={}){
    const niveau=instellingen.niveau||CONFIG.defaultNiveau;
    if(niveau==='groep7'||niveau==='midden7')return genBreukenGevorderd(instellingen);
    if(niveau==='groep6'){
        const noemer=pickRandom([2,4]), variant=randInt(0,2);
        if(variant===0){
            const delen=noemer*randInt(1,5);
            return maakSom('Welk deel is gekleurd? Typ 1/2 of 1/4.',`1/${noemer}`,'breuken',{customHTML:breukenStrook(delen/noemer,delen),signature:`strook:${delen/noemer}:${delen}`});
        }
        if(variant===1){
            const totaal=noemer*randInt(2,12);
            return maakSom(`Wat is 1/${noemer} van ${totaal}?`,totaal/noemer,'breuken');
        }
        const totaal=noemer*randInt(2,10),deel=totaal/noemer;
        return maakSom(`Je verdeelt ${totaal} blokjes in ${noemer} gelijke groepjes. Welk deel is één groepje van ${deel} blokjes? Typ een breuk.`,`1/${noemer}`,'breuken');
    }
    const variant=randInt(0,2),noemer=pickRandom([2,3,4,5,8,10]);
    if(variant===0){
        const [n1,n2]=Math.random()<0.5?[noemer,noemer]:pickRandom([[2,4],[2,8],[4,8],[3,6],[5,10]]);
        const a=randInt(1,n1-1),b=randInt(1,n2-1),links=a*n2,rechts=b*n1;
        return maakSom(`Vul <, > of = in: ${a}/${n1} ... ${b}/${n2}`,links<rechts?'<':links>rechts?'>':'=','breuken');
    }
    if(variant===1){
        const teller=randInt(1,noemer-1),hoeveelheid=noemer*randInt(2,15);
        return maakSom(`Wat is ${teller}/${noemer} van ${hoeveelheid}?`,teller*hoeveelheid/noemer,'breuken');
    }
    const a=randInt(1,noemer-1),b=randInt(1,noemer-a);
    return maakSom(`${a}/${noemer} + ${b}/${noemer} = ... (typ een breuk)`,`${a+b}/${noemer}`,'breuken');
}

function genBreukenGevorderd(instellingen) {
    const subB = randInt(0, instellingen.niveau==='midden7'?3:2);
    if (subB === 0) {
        const nr = pickRandom(POOL_BREUKEN_HELFT_VAN);
        return maakSom(`Wat is 3/4 van ${nr}?`, (nr / 4) * 3);
    }
    if (subB === 1) {
        const nrs = pickRandom(POOL_BREUKEN_TELLER);
        return maakSom(`Vul de ontbrekende teller in:\n1/2 = .../${nrs}`, nrs / 2);
    }
    if (subB === 2) {
        // Procedureel gegenereerd (in plaats van een vaste lijst), zodat er
        // duizenden verschillende vereenvoudig-opgaven mogelijk zijn.
        // Belangrijk: teller/noemer moet écht al volledig vereenvoudigd zijn
        // (gcd = 1), anders klopt "zo ver mogelijk" niet met de gevraagde noemer.
        let noemerVereenvoudigd, tellerVereenvoudigd;
        do {
            noemerVereenvoudigd = randInt(2, 9);
            tellerVereenvoudigd = randInt(1, noemerVereenvoudigd - 1);
        } while (gcd(tellerVereenvoudigd, noemerVereenvoudigd) !== 1);
        const factor = randInt(2, 9);
        const teller = tellerVereenvoudigd * factor;
        const noemer = noemerVereenvoudigd * factor;
        return maakSom(`Vereenvoudig de breuk zo ver mogelijk:\n${teller}/${noemer} = ... / ${noemerVereenvoudigd}`, tellerVereenvoudigd);
    }
    // "Haal de helen eruit": ook procedureel, ruime variatie.
    const noemer = randInt(2, 9);
    const helen = randInt(1, 5);
    const rest = randInt(1, noemer - 1);
    const teller = helen * noemer + rest;
    const antwoord = `${helen} ${rest}/${noemer}`;
    return maakSom(`Haal de helen eruit:\n${teller}/${noemer} = ... (Geef op als bijv: 1 3/4)`, antwoord);
}

const POOL_BREUKEN_CONTEXT = [
    { n: 1, v: 'Van een hardlooproute van [X] km heeft Tess 1/[Y] deel afgelegd. Hoeveel km heeft ze gerend?', f: (x, y) => x / y },
    { n: 2, v: 'In een klas zitten [X] kinderen. 2/[Y] deel zit op voetbal. Hoeveel kinderen zijn dat?', f: (x, y) => (x / y) * 2 },
    { n: 3, v: 'Een benzinetank heeft een inhoud van [X] liter. De tank is voor 3/[Y] gevuld. Hoeveel liter zit erin?', f: (x, y) => (x / y) * 3 },
    { n: 1, v: 'Daan krijgt [X] euro zakgeld per maand. Hij spaart 1/[Y] deel hiervan. Hoeveel euro spaart hij?', f: (x, y) => x / y },
    { n: 3, v: 'Een cake moet [X] minuten in de oven. Hij staat er nu 3/[Y] van de tijd in. Hoeveel minuten staat hij al in de oven?', f: (x, y) => (x / y) * 3 },
    { n: 1, v: 'Er liggen [X] koekjes in een trommel. Siem eet 1/[Y] deel op. Hoeveel koekjes eet Siem?', f: (x, y) => x / y },
    { n: 4, v: 'Een film duurt [X] minuten. Merel heeft al 4/[Y] deel gekeken. Hoeveel minuten heeft ze gezien?', f: (x, y) => (x / y) * 4 },
    { n: 1, v: 'Een boer heeft [X] koeien. 1/[Y] deel staat in de stal, de rest staat in de wei. Hoeveel koeien staan er in de stal?', f: (x, y) => x / y },
    { n: 1, v: 'De afstand naar opa en oma is [X] km. Na 1/[Y] deel van de rit stoppen we voor limonade. Na hoeveel km stoppen we?', f: (x, y) => x / y },
    { n: 2, v: 'Een chocoladereep bestaat uit [X] blokjes. Bram eet 2/[Y] deel op. Hoeveel blokjes eet Bram?', f: (x, y) => (x / y) * 2 },
    { n: 3, v: 'Voor een pizza is [X] gram kaas nodig. Sarah heeft al 3/[Y] deel geraspt. Hoeveel gram kaas is dat?', f: (x, y) => (x / y) * 3 },
    { n: 1, v: "Op een parkeerplaats staan [X] auto's. 1/[Y] deel is elektrisch. Hoeveel elektrische auto's staan er?", f: (x, y) => x / y },
    { n: 1, v: 'Een basisschool heeft [X] leerlingen. 1/[Y] deel komt met de step. Hoeveel leerlingen stappen op de step?', f: (x, y) => x / y },
    { n: 5, v: 'In een boomgaard hangen [X] appels. 5/[Y] deel is al rijp om te plukken. Hoeveel appels zijn er rijp?', f: (x, y) => (x / y) * 5 },
    { n: 1, v: 'Een zwembad is gevuld met [X] liter water. Door de zon verdampt 1/[Y] deel. Hoeveel liter water is er verdampt?', f: (x, y) => x / y },
    { n: 1, v: 'Een boek telt [X] bladzijden. Lucas heeft 1/[Y] deel uit. Hoeveel bladzijden heeft Lucas gelezen?', f: (x, y) => x / y },
    { n: 3, v: 'Er zitten [X] kralen in een zakje. Fleur gebruikt 3/[Y] deel voor een armband. Hoeveel kralen gebruikt Fleur?', f: (x, y) => (x / y) * 3 },
    { n: 4, v: 'Een fietstocht is [X] km lang. De wielrenners hebben er al 4/[Y] deel op zitten. Hoeveel km hebben ze gefietst?', f: (x, y) => (x / y) * 4 },
    { n: 1, v: 'In een mand liggen [X] peren. 1/[Y] deel is beurs en moet weg. Hoeveel peren gooi je weg?', f: (x, y) => x / y },
    { n: 2, v: 'Lars heeft [X] knikkers gewonnen. Hij geeft 2/[Y] deel weg aan zijn broertje. Hoeveel knikkers geeft hij weg?', f: (x, y) => (x / y) * 2 },
    { n: 1, v: 'Een computergame kost [X] euro. Luuk krijgt 1/[Y] deel korting. Hoeveel euro korting krijgt Luuk?', f: (x, y) => x / y },
    { n: 3, v: 'Op een hondenshow zijn [X] honden aanwezig. 3/[Y] deel bestaat uit poedels. Hoeveel poedels doen er mee?', f: (x, y) => (x / y) * 3 },
    { n: 1, v: 'Een schooltuin is [X] vierkante meter groot. 1/[Y] deel is gereserveerd voor bloemen. Hoeveel vierkante meter bloemen is dat?', f: (x, y) => x / y },
    { n: 1, v: 'Voor een groot feest zijn [X] ballonnen opgeblazen. 1/[Y] deel knapt helaas voortijdig. Hoeveel ballonnen knappen er?', f: (x, y) => x / y }
];

function genBreukenContext(instellingen={}) {
    const basis=instellingen.niveau==='groep6';
    const item = pickRandom(basis?POOL_BREUKEN_CONTEXT.filter(x=>x.n===1):POOL_BREUKEN_CONTEXT);
    // y moet groter zijn dan de teller uit het sjabloon, anders ontstaat er
    // een onechte breuk (bijv. "5/2 deel"), wat pedagogisch onzin is.
    const yOpties = (basis?[2,4]:[2,3,4,5,6,8,10,12]).filter(y => y > item.n);
    const y = pickRandom(yOpties);
    const factor = randInt(3, 14);
    const x = y * factor;
    const vraag = item.v.replace('[X]', x).replace('[Y]', y);
    return maakSom(vraag, item.f(x, y));
}

function genOptellenAftrekken(instellingen) {
    const niveau=instellingen.niveau||CONFIG.defaultNiveau,max=getalgrens(instellingen);
    // Mix herhaling, ronde getallen en sommen met meer overgangen.
    const variant=randInt(0,3);
    const werkMax=variant===0?Math.max(20,Math.floor(max/10)):max;
    const stap=variant===1&&werkMax>=1000?10:variant===2&&werkMax>=10000?100:1;
    const a=rekenGetal(stap,Math.floor(werkMax*0.65),stap);
    const b=rekenGetal(stap,Math.max(stap,Math.min(a,werkMax-a)),stap);
    const plus=Math.random()<0.5;
    if(!plus&&variant===2&&max>=1000){
        const rond=max>=10000?1000:100,minuend=randInt(2,Math.floor(max/rond))*rond;
        const aftrekker=randInt(1,minuend-1);
        return maakSom(`${minuend} - ${aftrekker} =`,minuend-aftrekker,'optellen_aftrekken');
    }
    return maakSom(plus?`${a} + ${b} =`:`${a+b} - ${b} =`,plus?a+b:a,'optellen_aftrekken');
}

function genVermenigvuldigen(instellingen) {
    const niveau=instellingen.niveau||CONFIG.defaultNiveau;
    let [amin,amax,bmin,bmax]=leerprofiel(instellingen).mul;
    // Ook in de tweede jaarhelft blijven bekende ééncijferige factoren terugkomen.
    if(['midden6','groep7','midden7'].includes(niveau)&&Math.random()<0.3){amin=12;amax=niveau==='midden7'?499:99;bmin=2;bmax=9;}
    const a=randInt(amin,amax),b=randInt(bmin,bmax);
    return maakSom(`${a} × ${b} =`,a*b,'vermenigvuldigen',{signature:`mul:${Math.min(a,b)}x${Math.max(a,b)}`});
}

function genDelen(instellingen) {
    const niveau=instellingen.niveau||CONFIG.defaultNiveau;
    let [dmin,dmax,qmin,qmax,max]=leerprofiel(instellingen).div;
    if(['midden6','groep7'].includes(niveau)&&Math.random()<0.3){dmin=2;dmax=9;qmin=12;qmax=50;}
    const deler=randInt(dmin,dmax),quotient=randInt(qmin,Math.min(qmax,Math.floor(max/deler)));
    const rest=niveau==='midden7'&&Math.random()<0.25?randInt(1,deler-1):0;
    const deeltal=deler*quotient+rest;
    return maakSom(`${deeltal} : ${deler} =${rest?' ... rest ...':''}`,rest?`${quotient} rest ${rest}`:quotient,'delen',{signature:`div:${deeltal}:${deler}`});
}

/* REDACTIE_DATASET
   Elke opgave is een los dataset-item met een tekstsjabloon (v),
   antwoordfunctie (f) en passende getallengenerator (genXY). Nieuwe
   redactiesommen kunnen hierdoor worden toegevoegd zonder de app-logica
   te wijzigen. */
const REDACTIE_DATASET = [
    { v: 'Een dierentuin verkoopt [X] familietickets in de ochtend en [Y] in de middag. Hoeveel familietickets zijn er in totaal verkocht?', f: (x, y) => x + y, genXY: () => [randInt(150, 449), randInt(50, 249)] },
    { v: 'Een bakker maakt [X] croissantjes. Aan het einde van de dag heeft hij er nog [Y] over. Hoeveel croissantjes zijn er verkocht?', f: (x, y) => x - y, genXY: () => [randInt(400, 899), randInt(50, 349)] },
    { v: 'Voor een barbecuefeest koopt de slager [X] luxe barbecuepakketten. In elk pakket zitten [Y] stuks vlees. Hoeveel stuks vlees zijn dit in totaal?', f: (x, y) => x * y, genXY: () => [randInt(8, 22), pickRandom([5, 6, 8, 10, 12])] },
    { v: 'Een basisschool verdeelt [X] potloden eerlijk over [Y] klassen. Hoeveel potloden krijgt elke klas?', f: (x, y) => x / y, genXY: () => { const y = randInt(4, 9); return [y * randInt(8, 19), y]; } },
    { v: 'Mila spaart voor een nieuwe fiets van [X] euro. Ze heeft al [Y] euro in haar spaarpot zitten. Hoeveel euro moet ze nog sparen?', f: (x, y) => x - y, genXY: () => [randInt(400, 899), randInt(50, 349)] },
    { v: 'Er staan [X] rijen met stoelen in de aula van de school. In elke rij staan precies [Y] stoelen. Hoeveel stoelen staan er in totaal?', f: (x, y) => x * y, genXY: () => [randInt(8, 22), pickRandom([5, 6, 8, 10, 12])] },
    { v: 'Een vrachtwagen vervoert [X] kratten appels. Bij de eerste winkel lost hij [Y] kratten. Hoeveel kratten met appels blijven er over?', f: (x, y) => x - y, genXY: () => [randInt(400, 899), randInt(50, 349)] },
    { v: 'Een bibliotheek krijgt een levering van [X] nieuwe boeken. Ze verdelen de boeken gelijkmatig over [Y] planken. Hoeveel boeken komen er op elke plank?', f: (x, y) => x / y, genXY: () => { const y = randInt(4, 9); return [y * randInt(8, 19), y]; } },
    { v: 'Sem fietst elke dag [X] km naar school en [X] km terug naar huis. Hoeveel km fietst Sem in [Y] schooldagen in totaal?', f: (x, y) => (x * 2) * y, genXY: () => [randInt(2, 5), randInt(4, 5)] },
    { v: 'In een bioscoopzaal zitten [X] mensen te kijken naar een spannende film. [Y] mensen verlaten de zaal tijdens de pauze. Hoeveel mensen blijven er over?', f: (x, y) => x - y, genXY: () => [randInt(400, 899), randInt(50, 349)] },
    { v: 'Een supermarkt vult de schappen aan met [X] dozen frisdrank. In iedere doos zitten [Y] flessen. Hoeveel flessen frisdrank zijn dit in totaal?', f: (x, y) => x * y, genXY: () => [randInt(8, 22), pickRandom([5, 6, 8, 10, 12])] },
    { v: 'Een groep van [X] vrienden gaat naar een pretpark. Ze betalen in totaal [Y] euro voor de entreekaartjes. Hoeveel kost één entreekaartje?', f: (x, y) => y / x, genXY: () => { const x = randInt(4, 7); const prijs = randInt(12, 16); return [x, x * prijs]; } },
    { v: 'Sophie koopt op de markt [X] gram aardbeien en [Y] gram blauwe bessen. Hoeveel gram fruit heeft Sophie in totaal gekocht?', f: (x, y) => x + y, genXY: () => [randInt(150, 449), randInt(50, 249)] },
    { v: 'Een marathonloper heeft al [X] meter afgelegd. De totale marathon is [Y] meter lang. Hoeveel meter moet de loper nog rennen?', f: (x, y) => y - x, genXY: () => [randInt(5000, 35000), 42195] },
    { v: 'Een bloemist maakt boeketten. Ze gebruikt [X] rozen per boeket. Hoeveel rozen heeft ze nodig om [Y] boeketten te maken?', f: (x, y) => x * y, genXY: () => [randInt(8, 22), pickRandom([5, 6, 8, 10, 12])] },
    { v: 'Er moeten [X] tennisballen verpakt worden in kokers. In elke koker passen [Y] tennisballen. Hoeveel kokers zijn er nodig?', f: (x, y) => x / y, genXY: () => { const y = randInt(4, 9); return [y * randInt(8, 19), y]; } },
    { v: 'Daan verdient [X] euro per uur met zijn bijbaantje. Vorige week heeft hij [Y] uur gewerkt. Hoeveel euro heeft hij in totaal verdiend?', f: (x, y) => x * y, genXY: () => [12, randInt(4, 9)] },
    { v: 'Een grote doos met legoblokjes weegt [X] gram. De lege plastic doos zelf weegt [Y] gram. Hoeveel gram wegen alle legoblokjes samen?', f: (x, y) => x - y, genXY: () => [randInt(400, 899), randInt(50, 349)] },
    { v: 'Voor een knutselproject heeft de juf [X] rollen touw gekocht. Elke rol is precies [Y] meter lang. Hoeveel meter touw is er in totaal?', f: (x, y) => x * y, genXY: () => [randInt(8, 22), pickRandom([5, 6, 8, 10, 12])] },
    { v: 'Een schoolbus start de rit met [X] kinderen. Bij de eerste halte stappen er [Y] kinderen uit, en komen er 5 bij. Hoeveel kinderen zitten er nu in de bus?', f: (x, y) => (x - y) + 5, genXY: () => { const y = randInt(5, 12); return [randInt(y + 5, y + 20), y]; } },
    { v: 'Emma bezorgt [X] folders per week. Hoeveel folders bezorgt zij in totaal in [Y] weken?', f: (x, y) => x * y, genXY: () => [randInt(8, 22), pickRandom([5, 6, 8, 10, 12])] },
    { v: 'Een fabriek verpakt [X] kilo suiker in zakken van [Y] kilo per stuk. Hoeveel suikerzakken worden er gevuld?', f: (x, y) => x / y, genXY: () => { const y = randInt(4, 9); return [y * randInt(8, 19), y]; } },
    { v: 'Op een verjaardagsfeestje krijgt Quinn [X] euro van zijn opa en [Y] euro van zijn tante. Hoeveel euro heeft hij in totaal gekregen?', f: (x, y) => x + y, genXY: () => [randInt(150, 449), randInt(50, 249)] },
    { v: 'Een voetbalstadion biedt plaats aan [X] toeschouwers. Tijdens een wedstrijd zijn er [Y] stoeltjes leeg. Hoeveel toeschouwers zijn er aanwezig?', f: (x, y) => x - y, genXY: () => [randInt(4000, 12000), randInt(200, 1800)] },
    { v: 'Een school koopt [X] dozen met [Y] schriften. Er worden 167 schriften uitgedeeld. Hoeveel schriften blijven over?', f: (x, y) => x * y - 167, genXY: () => [randInt(12, 24), pickRandom([18,20,24,25,30])] },
    { v: 'Een bus heeft [X] zitplaatsen. Er rijden [Y] bussen. In totaal gaan er 17 begeleiders mee. Hoeveel plaatsen blijven over als er 215 leerlingen meegaan?', f: (x, y) => x * y - 232, genXY: () => [pickRandom([45,50,55,60]), randInt(5,8)] },
    { v: 'Een winkel verkoopt [X] spellen van [Y] euro. De winkel geeft daarna 125 euro uit aan nieuwe posters. Hoeveel euro blijft van de opbrengst over?', f: (x, y) => x * y - 125, genXY: () => [randInt(12,35), pickRandom([15,20,25,30,40])] },
    { v: 'Voor een sportdag zijn [X] flesjes water nodig. In één doos zitten [Y] flesjes. Hoeveel hele dozen moeten minimaal worden besteld?', f: (x, y) => Math.ceil(x / y), genXY: () => [randInt(180,450), pickRandom([12,18,24])] }
];

const REDACTIE_LAAG = [
    { v:'In een mand liggen [X] appels. Er komen [Y] appels bij. Hoeveel appels liggen er nu?', f:(x,y)=>x+y, gen:(niv)=>[randInt(12,niv==='begin4'?45:120),randInt(3,niv==='begin4'?20:60)] },
    { v:'Een bakker heeft [X] broodjes. Hij verkoopt er [Y]. Hoeveel broodjes blijven over?', f:(x,y)=>x-y, gen:(niv)=>{const y=randInt(4,niv==='begin4'?18:50);return [randInt(y+8,y+(niv==='begin4'?40:120)),y];} },
    { v:'Er staan [X] tafels met [Y] stoelen per tafel. Hoeveel stoelen zijn dat samen?', f:(x,y)=>x*y, gen:(niv)=>[randInt(2,niv==='begin4'?6:12),randInt(2,niv==='begin4'?5:10)] },
    { v:'[X] potloden worden eerlijk verdeeld over [Y] kinderen. Hoeveel potloden krijgt ieder kind?', f:(x,y)=>x/y, gen:(niv)=>{const y=randInt(2,niv==='begin4'?5:10);return [y*randInt(2,niv==='begin4'?8:15),y];} },
    { v:'Sara heeft [X] euro. Ze koopt iets van [Y] euro. Hoeveel euro houdt ze over?', f:(x,y)=>x-y, gen:(niv)=>{const y=randInt(2,niv==='begin4'?15:40);return [randInt(y+5,y+(niv==='begin4'?35:80)),y];} },
    { v:'Een bus heeft eerst [X] kinderen. Er stappen [Y] kinderen bij. Hoeveel kinderen zitten er daarna in de bus?', f:(x,y)=>x+y, gen:(niv)=>[randInt(10,niv==='begin4'?35:80),randInt(2,niv==='begin4'?15:35)] },
    { v:'Een boek heeft [X] bladzijden. Noor heeft er [Y] gelezen. Hoeveel bladzijden moet ze nog?', f:(x,y)=>x-y, gen:(niv)=>{const y=randInt(5,niv==='begin4'?25:70);return [randInt(y+10,y+(niv==='begin4'?50:150)),y];} },
    { v:'Een klas heeft [X] rijen met [Y] leerlingen. Hoeveel leerlingen zijn dat?', f:(x,y)=>x*y, gen:(niv)=>[randInt(2,niv==='begin4'?5:8),randInt(2,niv==='begin4'?6:12)] },
    { v:'Een fietser rijdt [X] kilometer in de ochtend en [Y] kilometer in de middag. Hoeveel kilometer rijdt hij totaal?', f:(x,y)=>x+y, gen:(niv)=>[randInt(3,niv==='begin4'?15:40),randInt(3,niv==='begin4'?15:40)] },
    { v:'Een doos bevat [X] koekjes. Ze worden verdeeld over [Y] bordjes. Hoeveel koekjes komen op elk bordje?', f:(x,y)=>x/y, gen:(niv)=>{const y=randInt(2,niv==='begin4'?5:8);return [y*randInt(3,niv==='begin4'?8:15),y];} }
];

function genRedactie(instellingen) {
    const niveau = instellingen?.niveau || CONFIG.defaultNiveau;
    if (['begin4','midden4','begin5','midden5','groep6'].includes(niveau)) {
        const profiel=leerprofiel(instellingen),max=getalgrens(instellingen),variant=randInt(0,5);
        if(variant===0||variant===1){
            const limiet=niveau==='groep6'?Math.min(max,5000):niveau.includes('4')?100:1000;
            const stap=niveau==='groep6'?5:1;
            const a=rekenGetal(stap,Math.floor(limiet*0.6),stap),b=rekenGetal(stap,Math.floor(limiet*0.35),stap);
            if(variant===0)return maakSom(`De bibliotheek heeft ${a} boeken. Er komen ${b} boeken bij. Hoeveel boeken zijn er nu?`,a+b,'redactie');
            return maakSom(`Een winkel heeft ${a+b} potloden. Er worden ${b} verkocht. Hoeveel potloden blijven er over?`,a,'redactie');
        }
        if(variant===2||variant===3){
            const maxGroepen=niveau.includes('4')?10:niveau==='groep6'?24:12;
            const groepen=randInt(2,maxGroepen),perGroep=randInt(2,niveau==='begin5'?5:9);
            if(variant===2)return maakSom(`Er zijn ${groepen} dozen met elk ${perGroep} appels. Hoeveel appels zijn dat samen?`,groepen*perGroep,'redactie');
            return maakSom(`${groepen*perGroep} potloden worden eerlijk verdeeld over ${perGroep} kinderen. Hoeveel potloden krijgt ieder kind?`,groepen,'redactie');
        }
        const gelezen=randInt(5,niveau.includes('4')?30:120),over=randInt(5,niveau.includes('4')?50:180);
        if(variant===4)return maakSom(`Een boek heeft ${gelezen+over} bladzijden. Noor heeft er ${gelezen} gelezen. Hoeveel bladzijden moet ze nog lezen?`,over,'redactie');
        const km1=randInt(3,25),km2=randInt(3,25);
        return maakSom(`Je fietst 's ochtends ${km1} kilometer en 's middags ${km2} kilometer. Hoeveel kilometer fiets je samen?`,km1+km2,'redactie');
    }
    if (randInt(1, 100) <= 45) {
        const dozen = randInt(3, 12), perDoos = randInt(6, 24), verkocht = randInt(5, Math.max(6, dozen * perDoos - 10));
        const templates = [
            {vraag:`Een winkel ontvangt ${dozen} dozen met elk ${perDoos} flesjes. Die dag worden ${verkocht} flesjes verkocht. Hoeveel flesjes zijn er nog?`, antwoord:dozen*perDoos-verkocht},
            {vraag:`Een school koopt ${dozen} pakken met elk ${perDoos} schriften. De schriften worden gelijk verdeeld over ${dozen} groepen. Hoeveel schriften krijgt elke groep?`, antwoord:perDoos},
            {vraag:`Een bus rijdt 's ochtends ${dozen*perDoos} km en 's middags ${verkocht} km minder. Hoeveel kilometer rijdt de bus die dag in totaal?`, antwoord:dozen*perDoos+(dozen*perDoos-verkocht)}
        ];
        const gekozen=pickRandom(templates);
        return maakSom(gekozen.vraag, gekozen.antwoord, 'redactie');
    }
    const item = pickRandom(REDACTIE_DATASET);
    const [x, y] = item.genXY();
    const vraag = item.v.replace('[X]', x).replace('[Y]', y);
    return maakSom(vraag, item.f(x, y), 'redactie');
}

function genKommagetallen(instellingen) {
    const niveau=instellingen.niveau||CONFIG.defaultNiveau;
    const digits=leerprofiel(instellingen).commaDigits||1,scale=10**digits;
    const schrijf=n=>n.toFixed(digits).replace('.',',');
    if(niveau==='groep6'){
        const heel=randInt(0,9),tienden=randInt(1,9);
        if(Math.random()<0.5)return maakSom(`${heel} hele en ${tienden} tienden is welk kommagetal?`,schrijf(heel+tienden/10),'kommagetallen');
        return maakSom(`Hoeveel tienden staan er achter de komma in ${heel},${tienden}?`,tienden,'kommagetallen');
    }
    const a=randInt(10,1999)/scale,b=randInt(10,999)/scale;
    const variant=randInt(0,niveau==='midden6'?1:3);
    if(variant===0)return maakSom(`${schrijf(a)} + ${schrijf(b)} =`,schrijf(a+b),'kommagetallen');
    if(variant===1)return maakSom(`${schrijf(Math.max(a,b))} - ${schrijf(Math.min(a,b))} =`,schrijf(Math.abs(a-b)),'kommagetallen');
    const factor=pickRandom([2,4,5,10]);
    if(variant===2)return maakSom(`${schrijf(a)} × ${factor} =`,schrijf(a*factor),'kommagetallen');
    return maakSom(`${schrijf(a*factor)} : ${factor} =`,schrijf(a),'kommagetallen');
}

function genProcenten(instellingen) {
    const niveau = instellingen.niveau || CONFIG.defaultNiveau;
    const percentages = niveau !== 'midden7' ? [10,25,50] : [1,5,10,20,25,50,75];
    const p = pickRandom(percentages);
    const basis = pickRandom([40,60,80,100,120,160,200,240,300,400,500]);
    if (randInt(0,1) === 0) return maakSom(`${p}% van ${basis} =`, basis*p/100);
    const deel = basis*p/100;
    return maakSom(`${deel} is hoeveel procent van ${basis}?`, p);
}

function genVerhoudingen(instellingen) {
    const niveau = instellingen.niveau || CONFIG.defaultNiveau;
    const variant = pickRandom(niveau==='midden7'?[0,1,2,3,4,5]:[0,2,4]);
    const factor = randInt(2, niveau==='midden7'?12:5);
    if (variant === 0) {
        const personen = randInt(2, 8), perGroep = randInt(2, 9);
        return maakSom(`Voor ${personen} personen zijn ${personen * perGroep} broodjes nodig. Hoeveel broodjes zijn nodig voor ${personen * factor} personen?`, personen * perGroep * factor);
    }
    if (variant === 1) {
        const cm = randInt(2, 12), kmPerCm = randInt(2, 10);
        return maakSom(`Op een kaart is 1 cm gelijk aan ${kmPerCm} km. Twee plaatsen liggen ${cm} cm uit elkaar. Hoeveel km is dat in werkelijkheid?`, cm * kmPerCm);
    }
    if (variant === 2) {
        const pakken = randInt(2, 8), stuks = randInt(4, 12), doel = pakken * factor;
        return maakSom(`${pakken} pakken bevatten samen ${pakken * stuks} flesjes. Hoeveel flesjes zitten in ${doel} pakken?`, doel * stuks);
    }
    if (variant === 3) {
        const schaal = pickRandom([20, 25, 50, 100, 200]);
        const lengte = randInt(3, 15);
        return maakSom(`Een model is gemaakt op schaal 1 : ${schaal}. Op het model is een lengte ${lengte} cm. Hoeveel cm is dat in werkelijkheid?`, schaal * lengte);
    }
    if (variant === 4) {
        const basis = randInt(2, 7), prijsPer = randInt(3, 12), nieuwAantal = basis * factor;
        return maakSom(`${basis} kaartjes kosten samen €${basis * prijsPer}. Hoeveel euro kosten ${nieuwAantal} kaartjes?`, nieuwAantal * prijsPer);
    }
    const delenSap = randInt(1, 3), delenWater = randInt(3, 8), glazen = randInt(2, 6);
    return maakSom(`Voor limonade gebruik je ${delenSap} deel siroop en ${delenWater} delen water. Hoeveel delen water heb je nodig bij ${delenSap * glazen} delen siroop?`, delenWater * glazen);
}

function genMeten(instellingen) {
    const niveau=instellingen.niveau||CONFIG.defaultNiveau;
    if(niveau==='begin5'||niveau==='groep6'&&Math.random()<0.5){
        const items=[
            ['Een potlood is [N] ... lang.',5,22,'cm'],
            ['Een boom is [N] ... hoog.',3,20,'m'],
            ['Een kind weegt [N] ... .',20,45,'kg'],
            ['In een kan past [N] ... water.',1,5,'l'],
            ['Een gang is [N] ... lang.',3,25,'m'],
            ['Een schrift is [N] ... breed.',12,25,'cm'],
            ['Een zak aardappels weegt [N] ... .',1,10,'kg']
        ];
        const [tekst,min,max,eenheid]=pickRandom(items),n=randInt(min,max);
        const vraag=tekst.replace('[N]',n)+' Welke eenheid ontbreekt? Typ cm, m, kg of l.';
        return maakSom(vraag,eenheid,'meten');
    }
    const basis=niveau==='midden5'||niveau==='groep6';
    const omzettingen=basis?[[100,'meter','centimeter'],[1000,'kilogram','gram']]:[[100,'meter','centimeter'],[1000,'kilogram','gram'],[1000,'liter','milliliter'],[10,'centimeter','millimeter'],[1000,'kilometer','meter']];
    const [factor,van,naar]=pickRandom(omzettingen),n=randInt(1,basis?9:40);
    if(basis||Math.random()<0.5)return maakSom(`${n} ${van} = ... ${naar}`,n*factor,'meten');
    const deel=randInt(1,9)*factor/10;
    return maakSom(`${n*factor+deel} ${naar} = ... ${van}`,Number((n+deel/factor).toFixed(2)),'meten');
}

function genMeetkunde(instellingen) {
    const niveau=instellingen.niveau||CONFIG.defaultNiveau;
    const variant=pickRandom(niveau==='midden5'?[0,3]:niveau==='groep6'?[0,1,3]:niveau==='midden6'?[0,1,3,4,5]:niveau==='groep7'?[0,1,2,3,4,5,6]:[0,1,2,3,4,5,6,7]);
    const l=randInt(4,niveau==='midden5'?10:20),b=randInt(3,niveau==='midden5'?9:15),h=randInt(2,12);
    if (variant === 0) return maakSom(`Een rechthoekig schoolplein is ${l} m lang en ${b} m breed. Wat is de omtrek in meter?`, 2 * (l + b));
    if (variant === 1) return maakSom(`Een tuin is ${l} m lang en ${b} m breed. Wat is de oppervlakte in m²?`, l * b);
    if (variant === 2) return maakSom(`Een doos is ${l} cm lang, ${b} cm breed en ${h} cm hoog. Wat is de inhoud in cm³?`, l * b * h);
    if (variant === 3) {
        const zijde = randInt(4, 20);
        return maakSom(`Een vierkant heeft zijden van ${zijde} cm. Wat is de omtrek in cm?`, 4 * zijde);
    }
    if (variant === 4) {
        const zijde = randInt(4, 24);
        return maakSom(`Een vierkante tegel heeft zijden van ${zijde} cm. Wat is de oppervlakte in cm²?`, zijde * zijde);
    }
    if (variant === 5) {
        const omtrek = 2 * (l + b);
        return maakSom(`Een rechthoek heeft een omtrek van ${omtrek} cm en is ${l} cm lang. Hoe breed is de rechthoek?`, b);
    }
    if (variant === 6) {
        const opp = l * b;
        return maakSom(`Een rechthoek heeft een oppervlakte van ${opp} cm² en is ${l} cm lang. Hoe breed is de rechthoek?`, b);
    }
    const inhoud = l * b * h;
    return maakSom(`Een balk heeft een inhoud van ${inhoud} cm³. De lengte is ${l} cm en de breedte ${b} cm. Hoe hoog is de balk?`, h);
}


function maakKlokHTML(uur, minuut) {
    const uurHoek = (uur % 12) * 30 + minuut * 0.5;
    const minHoek = minuut * 6;
    const nummers = [[12,50,18],[3,82,50],[6,50,82],[9,18,50]].map(([n,x,y]) => `<span class="clock-number" style="left:${x}%;top:${y}%">${n}</span>`).join('');
    let streepjes='';
    for(let i=0;i<60;i++) streepjes += `<span class="clock-tick ${i%5===0?'major':''}" style="transform:translateX(-50%) rotate(${i*6}deg)"></span>`;
    return `<div class="visual-clock">${streepjes}${nummers}<span class="clock-hand minute" style="transform:translateX(-50%) rotate(${minHoek}deg)"></span><span class="clock-hand hour" style="transform:translateX(-50%) rotate(${uurHoek}deg)"></span></div>`;
}

function genKlokkijken(instellingen) {
    const niveau=instellingen.niveau||CONFIG.defaultNiveau;
    const hoger=['groep6','midden6','groep7','midden7'].includes(niveau);
    const variant=hoger?randInt(0,2):0;
    const stap=niveau==='begin4'?30:['midden6','groep7','midden7'].includes(niveau)?1:5;
    const minuut=randInt(0,60/stap-1)*stap,uur=randInt(1,12);
    if(variant===0){
        const antwoord=`${String(uur).padStart(2,'0')}:${String(minuut).padStart(2,'0')}`;
        return maakSom('Hoe laat is het op de klok? Typ bijvoorbeeld 08:30.',antwoord,'klokkijken',{customHTML:maakKlokHTML(uur,minuut),signature:`analoog:${antwoord}`});
    }
    const start=randInt(0,23)*60+minuut,duur=randInt(1,niveau==='groep6'?8:24)*(niveau==='groep6'?15:5);
    const tijd=n=>`${String(Math.floor((n%1440)/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
    if(variant===1)return maakSom(`Het is ${tijd(start)}. Hoe laat is het ${duur} minuten later? Typ de tijd in 24-uursnotatie.`,tijd(start+duur),'klokkijken');
    return maakSom(`Je vertrekt om ${tijd(start)} en komt ${start+duur>=1440?'de volgende dag ':''}om ${tijd(start+duur)} aan. Hoeveel minuten duurt de reis?`,duur,'klokkijken');
}

function geldHTML(items) {
    return `<div class="money-visual">${items.map(v => {
        const waarde=Number(v);
        let klasse='money-chip';
        if(waarde<1) klasse+=' coin copper';
        else if(waarde<5) klasse+=' coin gold';
        else klasse+=` bill${waarde}`;
        const tekst=waarde<1?Math.round(waarde*100)+' ct':'€'+String(waarde).replace('.',',');
        return `<span class="${klasse}">${tekst}</span>`;
    }).join('')}</div>`;
}
function maakBetaalSet(doel, waarden) {
    const items=[]; let totaal=0; let veilig=0;
    while(totaal < doel && veilig++ < 20){
        const passend=waarden.filter(v => v <= Math.max(doel-totaal, 2) || items.length===0);
        const v=pickRandom(passend.length?passend:waarden);
        items.push(v); totaal+=v;
    }
    if(totaal<doel){ const v=waarden.find(v=>totaal+v>=doel)||Math.max(...waarden); items.push(v); totaal+=v; }
    return {items:items.sort((a,b)=>b-a), totaal:Number(totaal.toFixed(2))};
}
function genGeld(instellingen) {
    const niveau=instellingen.niveau;
    const metCenten=!niveau.includes('4');
    const waarden=metCenten?[0.5,1,2,5,10,20,50]:[1,2,5,10];
    const variant=niveau==='begin4'?randInt(0,1):randInt(0,4);
    if(variant===0){
        const aantal=randInt(3,niveau==='begin4'?5:8); const items=Array.from({length:aantal},()=>pickRandom(waarden)).sort((a,b)=>b-a);
        const totaal=Number(items.reduce((a,b)=>a+b,0).toFixed(2));
        return maakSom(pickRandom(['Hoeveel geld zie je bij elkaar?','Tel de munten en biljetten. Wat is het totaalbedrag?','Hoeveel euro zit er in deze portemonnee?']),totaal,'geld',{customHTML:geldHTML(items)});
    }
    if(variant===1){
        const prijs=metCenten?Number((randInt(250,3995)/100).toFixed(2)):randInt(4,35);
        const set=maakBetaalSet(prijs,waarden.filter(v=>v>=1));
        return maakSom(`Jan koopt iets van €${prijs.toFixed(2).replace('.',',')}. Hij betaalt met het geld hieronder. Hoeveel krijgt hij terug?`,Number((set.totaal-prijs).toFixed(2)),'geld',{customHTML:geldHTML(set.items),signature:`geld-terug:${prijs}:${set.totaal}`});
    }
    if(variant===2){
        const prijs=metCenten?Number((randInt(350,2995)/100).toFixed(2)):randInt(5,30);
        const set=maakBetaalSet(prijs,waarden.filter(v=>v>=1));
        return maakSom(`Een spel kost €${prijs.toFixed(2).replace('.',',')}. Is dit geld genoeg? Vul in hoeveel euro je overhoudt.`,Number((set.totaal-prijs).toFixed(2)),'geld',{customHTML:geldHTML(set.items),signature:`geld-over:${prijs}:${set.totaal}`});
    }
    if(variant===3){
        const p1=metCenten?Number((randInt(150,1295)/100).toFixed(2)):randInt(2,12); const p2=metCenten?Number((randInt(150,1295)/100).toFixed(2)):randInt(2,12);
        return maakSom(`Sara koopt een broodje van €${p1.toFixed(2).replace('.',',')} en drinken van €${p2.toFixed(2).replace('.',',')}. Hoeveel betaalt ze samen?`,Number((p1+p2).toFixed(2)),'geld',{signature:`geld-samen:${p1}:${p2}`});
    }
    const budget=pickRandom([10,20,50]); const prijs=metCenten?Number((randInt(200,budget*100-100)/100).toFixed(2)):randInt(2,budget-1);
    return maakSom(`Je hebt €${budget}. Je koopt iets van €${prijs.toFixed(2).replace('.',',')}. Hoeveel geld houd je over?`,Number((budget-prijs).toFixed(2)),'geld',{signature:`geld-budget:${budget}:${prijs}`});
}


function maakTabelHTML(koppen, rijen, extraClass='') {
    return `<div class="study-visual"><table class="mini-data-table ${extraClass}"><thead><tr>${koppen.map(k=>`<th>${k}</th>`).join('')}</tr></thead><tbody>${rijen.map(r=>`<tr>${r.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function maakStaafdiagramHTML(labels, waarden, titel='Aantal') {
    const maxWaarde=Math.max(...waarden);
    const stap=maxWaarde<=10?1:(maxWaarde<=20?2:5);
    const schaalMax=Math.ceil(maxWaarde/stap)*stap;
    const W=520,H=285,L=48,R=18,T=24,B=54, plotW=W-L-R, plotH=H-T-B;
    let svg=`<div class="study-visual"><div class="study-title">${titel}</div><svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Staafdiagram ${titel}">`;
    for(let v=0;v<=schaalMax;v+=stap){ const y=T+plotH-(v/schaalMax)*plotH; svg+=`<line class="chart-grid" x1="${L}" y1="${y}" x2="${W-R}" y2="${y}"/><text class="chart-small" x="${L-8}" y="${y+4}" text-anchor="end">${v}</text>`; }
    svg+=`<line class="chart-axis" x1="${L}" y1="${T}" x2="${L}" y2="${T+plotH}"/><line class="chart-axis" x1="${L}" y1="${T+plotH}" x2="${W-R}" y2="${T+plotH}"/>`;
    const slot=plotW/labels.length, bw=Math.min(58,slot*.58);
    waarden.forEach((v,i)=>{ const x=L+i*slot+(slot-bw)/2, h=v/schaalMax*plotH, y=T+plotH-h; svg+=`<rect class="chart-bar" x="${x}" y="${y}" width="${bw}" height="${h}" rx="4"/><text class="chart-text" x="${x+bw/2}" y="${T+plotH+22}" text-anchor="middle">${labels[i]}</text>`; });
    return svg+`</svg></div>`;
}
function maakLijngrafiekHTML(labels, waarden, titel='Groei in cm') {
    const maxWaarde=Math.max(...waarden), minWaarde=Math.min(0,...waarden);
    const stap=maxWaarde<=20?2:5, schaalMax=Math.ceil(maxWaarde/stap)*stap;
    const W=520,H=290,L=52,R=20,T=26,B=58, plotW=W-L-R, plotH=H-T-B;
    let svg=`<div class="study-visual"><div class="study-title">${titel}</div><svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Lijngrafiek ${titel}">`;
    for(let v=minWaarde;v<=schaalMax;v+=stap){ const y=T+plotH-((v-minWaarde)/(schaalMax-minWaarde))*plotH; svg+=`<line class="chart-grid" x1="${L}" y1="${y}" x2="${W-R}" y2="${y}"/><text class="chart-small" x="${L-8}" y="${y+4}" text-anchor="end">${v}</text>`; }
    svg+=`<line class="chart-axis" x1="${L}" y1="${T}" x2="${L}" y2="${T+plotH}"/><line class="chart-axis" x1="${L}" y1="${T+plotH}" x2="${W-R}" y2="${T+plotH}"/>`;
    const pts=waarden.map((v,i)=>{const x=L+i*(plotW/(labels.length-1)), y=T+plotH-((v-minWaarde)/(schaalMax-minWaarde))*plotH; return [x,y];});
    svg+=`<polyline class="chart-line" points="${pts.map(p=>p.join(',')).join(' ')}"/>`;
    pts.forEach((p,i)=>{svg+=`<circle class="chart-dot" cx="${p[0]}" cy="${p[1]}" r="5"/><text class="chart-small" x="${p[0]}" y="${T+plotH+23}" text-anchor="middle">${labels[i]}</text>`;});
    return svg+`</svg></div>`;
}
function maakGetallenlijnHTML(min,max,stappen,markerIndex) {
    let html='<div class="study-visual"><div class="number-line">';
    for(let i=0;i<=stappen;i++){ const left=i/stappen*100; html+=`<span class="tick" style="left:${left}%"></span>`; if(i===0) html+=`<span class="tick-label" style="left:${left}%">${min}</span>`; }
    const markerPos=markerIndex/stappen*100; return html+`<span class="marker" style="left:${markerPos}%">▼</span></div></div>`;
}
function genInformatie(instellingen) {
    const niveau=instellingen.niveau||CONFIG.defaultNiveau;
    const vraag = opties => pickRandom(opties);

    if(niveau==='midden4'){
        const variant=randInt(0,4);
        if(variant===0){
            const labels=['ma','di','wo','do'], waarden=labels.map(()=>randInt(2,10)), i=randInt(0,3);
            return maakSom(vraag([
                `Hoeveel boeken zijn op ${labels[i]} geleend?`,
                `Lees het staafdiagram. Welk aantal hoort bij ${labels[i]}?`,
                `Op ${labels[i]} werden hoeveel boeken geleend?`
            ]),waarden[i],'informatie',{customHTML:maakStaafdiagramHTML(labels,waarden,'Geleende boeken'),signature:`staaf4:${labels.join('-')}:${waarden.join('-')}:${i}`});
        }
        if(variant===1){
            const dieren=['kat','hond','konijn','vis'], aantallen=dieren.map(()=>randInt(2,9)), i=randInt(0,3);
            return maakSom(vraag([
                `Hoeveel kinderen kozen voor ${dieren[i]}?`,
                `Zoek ${dieren[i]} in de tabel. Welk aantal staat erbij?`,
                `Welk getal hoort in de tabel bij ${dieren[i]}?`
            ]),aantallen[i],'informatie',{customHTML:maakTabelHTML(['Huisdier','Aantal kinderen'],dieren.map((d,j)=>[d,aantallen[j]])),signature:`tabel4:${aantallen.join('-')}:${i}`});
        }
        if(variant===2){
            const labels=['rood','blauw','groen','geel'], waarden=maakWaardenMetUniekExtreem(labels.length,1,9,'max');
            const max=Math.max(...waarden), i=waarden.indexOf(max);
            return maakSom('Welke kleur is het vaakst gekozen? Typ de kleur.',labels[i],'informatie',{customHTML:maakStaafdiagramHTML(labels,waarden,'Favoriete kleuren'),signature:`kleur4:${waarden.join('-')}`});
        }
        if(variant===3){
            const dagen=['ma','di','wo','do'], waarden=dagen.map(()=>randInt(1,8)); const totaal=waarden.reduce((a,b)=>a+b,0);
            return maakSom('Hoeveel kinderen kwamen in totaal op deze vier dagen?',totaal,'informatie',{customHTML:maakTabelHTML(['Dag','Kinderen'],dagen.map((d,i)=>[d,waarden[i]])),signature:`totaal4:${waarden.join('-')}`});
        }
        const labels=['Sam','Noa','Mila','Finn'], waarden=maakWaardenMetUniekExtreem(labels.length,2,10,'min'); const min=Math.min(...waarden), i=waarden.indexOf(min);
        return maakSom('Wie las de minste bladzijden? Typ de naam.',labels[i],'informatie',{customHTML:maakStaafdiagramHTML(labels,waarden,'Gelezen bladzijden'),signature:`minste4:${waarden.join('-')}`});
    }

    if(niveau==='begin5'||niveau==='midden5'){
        const variant=randInt(0,5);
        if(variant===0){ const labels=['ma','di','wo','do','vr'], waarden=labels.map(()=>randInt(3,15)), i=randInt(0,4); return maakSom(vraag([`Hoeveel bezoekers waren er op ${labels[i]}?`,`Welk bezoekersaantal hoort bij ${labels[i]}?`,`Lees af hoeveel mensen op ${labels[i]} kwamen.`]),waarden[i],'informatie',{customHTML:maakStaafdiagramHTML(labels,waarden,'Bezoekers bibliotheek'),signature:`staaf5:${waarden.join('-')}:${i}`}); }
        if(variant===1){ const lengtes=['1,40–1,45','1,45–1,50','1,50–1,55','1,55–1,60']; const jongens=lengtes.map(()=>randInt(1,5)), meisjes=lengtes.map(()=>randInt(1,5)), i=randInt(0,3); return maakSom(vraag([`Hoeveel kinderen zijn samen tussen ${lengtes[i]} meter lang?`,`Tel jongens en meisjes in de rij ${lengtes[i]} bij elkaar op.`,`Hoeveel kinderen vallen in de lengtegroep ${lengtes[i]} meter?`]),jongens[i]+meisjes[i],'informatie',{customHTML:maakTabelHTML(['Lengte (m)','Jongens','Meisjes'],lengtes.map((l,j)=>[l,jongens[j],meisjes[j]])),signature:`freq:${jongens.join('-')}:${meisjes.join('-')}:${i}`}); }
        if(variant===2){ const labels=['1 mei','3 mei','5 mei','7 mei','9 mei'], waarden=[4,8,13,19,24].map(v=>v+randInt(0,3)); const i=randInt(0,4); return maakSom(vraag([`Hoe groot was het plantje op ${labels[i]}?`,`Lees de hoogte van het plantje af op ${labels[i]}.`,`Hoeveel centimeter hoort bij ${labels[i]}?`]),waarden[i],'informatie',{customHTML:maakLijngrafiekHTML(labels,waarden,'Lengte tomatenplantje in cm'),signature:`lijnplant:${waarden.join('-')}:${i}`}); }
        if(variant===3){ const labels=['voetbal','zwemmen','dans','judo'], waarden=labels.map(()=>randInt(4,16)); const i=randInt(0,3), j=(i+1)%4; return maakSom(`Wat is het verschil tussen ${labels[i]} en ${labels[j]}?`,Math.abs(waarden[i]-waarden[j]),'informatie',{customHTML:maakStaafdiagramHTML(labels,waarden,'Sportkeuze'),signature:`verschil5:${waarden.join('-')}:${i}:${j}`}); }
        if(variant===4){ const dagen=['ma','di','wo','do','vr'], waarden=dagen.map(()=>randInt(5,18)); return maakSom('Hoeveel bezoekers waren er de hele week samen?',waarden.reduce((a,b)=>a+b,0),'informatie',{customHTML:maakTabelHTML(['Dag','Bezoekers'],dagen.map((d,i)=>[d,waarden[i]])),signature:`weektotaal5:${waarden.join('-')}`}); }
        const labels=['A','B','C','D'], waarden=maakWaardenMetUniekExtreem(labels.length,3,15,'min'); const min=Math.min(...waarden), i=waarden.indexOf(min); return maakSom('Welke groep heeft het kleinste aantal? Typ de letter.',labels[i],'informatie',{customHTML:maakStaafdiagramHTML(labels,waarden,'Aantal leerlingen'),signature:`minimum5:${waarden.join('-')}`});
    }

    const variant=randInt(0,8);
    if(variant===0){
        const rassen=['Labrador','Poedel','Beagle','Chihuahua','Vizsla'];
        const waarden=maakWaardenMetUniekExtreem(rassen.length,2,15,'max');
        const idx=waarden.indexOf(Math.max(...waarden));
        return maakSom(vraag(['Welk hondenras komt het vaakst voor? Typ het ras.','Van welk ras zijn de meeste honden geteld?','Welke staaf is het hoogst? Typ het hondenras.']),rassen[idx],'informatie',{customHTML:maakStaafdiagramHTML(rassen,waarden,'Honden in de wijk'),signature:`honden:${waarden.join('-')}`});
    }
    if(variant===1){ const labels=['1 mei','2 mei','4 mei','5 mei','7 mei','8 mei','10 mei'], waarden=[3,6,10,12,20,24,27].map(v=>v+randInt(0,2)); const i=randInt(0,labels.length-1); return maakSom(vraag([`Hoe hoog was het tomatenplantje op ${labels[i]}?`,`Lees de hoogte af op ${labels[i]}.`,`Welke lengte hoort bij ${labels[i]}?`]),waarden[i],'informatie',{customHTML:maakLijngrafiekHTML(labels,waarden,'Lengte tomatenplantje in cm'),signature:`tomaat:${waarden.join('-')}:${i}`}); }
    if(variant===2){ const steden=['Den Bosch','Tilburg','Eindhoven','Breda']; const d=[[0,24,37,46],[24,0,35,22],[37,35,0,58],[46,22,58,0]]; const html=maakTabelHTML(['',...steden],steden.map((st,i)=>[st,...d[i]]),'distance-table'); return maakSom(vraag(['Wat is de kortste afstand tussen twee verschillende steden?','Hoeveel kilometer is de kleinste afstand in de tabel?','Zoek de kortste route in de afstandstabel. Hoe lang is die?']),22,'informatie',{customHTML:html,signature:'afstand-kortste'}); }
    if(variant===3){ const lengtes=['1,40–1,45','1,45–1,50','1,50–1,55','1,55–1,60','1,60–1,65']; const jongens=lengtes.map(()=>randInt(1,6)), meisjes=lengtes.map(()=>randInt(1,6)); const i=randInt(0,4); return maakSom(vraag([`Hoeveel meisjes zijn tussen ${lengtes[i]} meter lang?`,`Lees bij ${lengtes[i]} het aantal meisjes af.`,`Welk aantal meisjes hoort bij de lengtegroep ${lengtes[i]}?`]),meisjes[i],'informatie',{customHTML:maakTabelHTML(['Lengte (m)','Jongens','Meisjes'],lengtes.map((l,j)=>[l,jongens[j],meisjes[j]])),signature:`lengte:${jongens.join('-')}:${meisjes.join('-')}:${i}`}); }
    if(variant===4){ const labels=['jan','feb','mrt','apr','mei'], waarden=labels.map(()=>randInt(5,25)), i=randInt(0,4); return maakSom(vraag([`Hoeveel kilogram papier werd in ${labels[i]} ingezameld?`,`Lees het aantal kilo voor ${labels[i]} af.`,`Welk gewicht hoort bij ${labels[i]}?`]),waarden[i],'informatie',{customHTML:maakStaafdiagramHTML(labels,waarden,'Ingezameld papier in kg'),signature:`papier:${waarden.join('-')}:${i}`}); }
    if(variant===5){ const labels=['jan','feb','mrt','apr','mei'], waarden=labels.map(()=>randInt(8,30)); const i=randInt(0,3); return maakSom(`Met hoeveel kilogram nam de inzameling toe of af van ${labels[i]} naar ${labels[i+1]}?`,Math.abs(waarden[i+1]-waarden[i]),'informatie',{customHTML:maakStaafdiagramHTML(labels,waarden,'Ingezameld papier in kg'),signature:`papier-verschil:${waarden.join('-')}:${i}`}); }
    if(variant===6){ const producten=['brood','melk','fruit','groente'], prijzen=producten.map(()=>randInt(100,500)/100); const i=randInt(0,3), j=(i+1)%4; return maakSom(`Hoeveel euro kosten ${producten[i]} en ${producten[j]} samen?`,Number((prijzen[i]+prijzen[j]).toFixed(2)),'informatie',{customHTML:maakTabelHTML(['Product','Prijs'],producten.map((x,k)=>[x,`€ ${prijzen[k].toFixed(2).replace('.',',')}`])),signature:`prijzen:${prijzen.join('-')}:${i}:${j}`}); }
    if(variant===7){ const teams=['Rood','Blauw','Groen','Geel'], punten=teams.map(()=>randInt(20,60)); const totaal=punten.reduce((a,b)=>a+b,0); return maakSom('Hoeveel punten behaalden de vier teams samen?',totaal,'informatie',{customHTML:maakTabelHTML(['Team','Punten'],teams.map((t,i)=>[t,punten[i]])),signature:`teams-totaal:${punten.join('-')}`}); }
    const labels=['week 1','week 2','week 3','week 4','week 5'], waarden=[10]; for(let i=1;i<5;i++) waarden.push(waarden[i-1]+randInt(2,8)); return maakSom('Hoeveel is de waarde gestegen van week 1 tot week 5?',waarden[4]-waarden[0],'informatie',{customHTML:maakLijngrafiekHTML(labels,waarden,'Groei per week'),signature:`groei:${waarden.join('-')}`});
}

function genStrategie(instellingen) {
    const niveau=instellingen.niveau||CONFIG.defaultNiveau;
    if(niveau==='begin4'||niveau==='midden4'){
        const stap=niveau==='begin4'?pickRandom([1,2,5]):pickRandom([2,5,10]); const min=0, stappen=10, max=stap*stappen; const markerIndex=randInt(1,stappen-1);
        return maakSom(`Bekijk de getallenlijn. Begin bij 0 en tel per streepje ${stap} verder. Welk getal hoort bij het pijltje?`,markerIndex*stap,'strategie',{customHTML:maakGetallenlijnHTML(min,max,stappen,markerIndex),signature:`lijn:${min}:${stap}:${markerIndex}`});
    }
    const max=getalgrens(instellingen),variant=randInt(0,2);
    if(variant===0){
        const stap=pickRandom(max<=100?[1,2,5,10]:max<=1000?[5,10,20,25]:[10,25,50,100]);
        const marker=randInt(1,7);
        return maakSom(`Tel vanaf 0 steeds ${stap} verder. Welk getal hoort bij het pijltje?`,marker*stap,'strategie',{customHTML:maakGetallenlijnHTML(0,stap*8,8,marker),signature:`lijn:${stap}:${marker}`});
    }
    const rond=max<=100?10:max<=1000?100:1000,verschil=randInt(1,9),b=rond-verschil,a=randInt(rond,Math.min(max-rond,rond*4));
    if(variant===1)return maakSom(`Tel eerst ${rond} erbij en haal daarna ${verschil} eraf. ${a} + ${b} =`,a+b,'strategie');
    return maakSom(`Trek eerst ${rond} af en tel daarna ${verschil} terug. ${a} - ${b} =`,a-b,'strategie');
}

/* ============================================================
   CATEGORIE-REGISTRATIE
   Nieuwe oefening toevoegen? Eén regel hieronder toevoegen,
   verder hoeft er nergens anders iets te veranderen.
   ============================================================ */
const CATEGORIES = {
    getalbegrip: { label: 'Getalbegrip', icon: '🔢', sub: 'Splitsbomen, plaatswaarde en strategie', generator: genSplitsen },
    tafels: { label: 'Tafels', icon: '🧮', sub: 'Passend bij het gekozen niveau', generator: genTafels },
    optellen_aftrekken: { label: 'Optellen & aftrekken', icon: '➕', sub: 'Met passend getalbereik', generator: genOptellenAftrekken },
    vermenigvuldigen: { label: 'Vermenigvuldigen', icon: '✖️', sub: 'Van basis tot grote keersommen', generator: genVermenigvuldigen },
    delen: { label: 'Delen', icon: '➗', sub: 'Eerlijk verdelen en grote deelsommen', generator: genDelen },
    klokkijken: { label: 'Klokkijken', icon: '🕒', sub: 'Analoog en digitaal', generator: genKlokkijken },
    geld: { label: 'Geld', icon: '💶', sub: 'Munten, biljetten en bedragen', generator: genGeld },
    breuken: { label: 'Breuken', icon: '🍕', sub: 'Van halven en kwarten naar breukrekenen', generator: genBreuken },
    breukencontext: { label: 'Breuken in context', icon: '🍫', sub: 'Breuk van een hoeveelheid', generator: genBreukenContext },
    kommagetallen: { label: 'Kommagetallen', icon: '🔸', sub: 'Van tienden herkennen naar bewerkingen', generator: genKommagetallen },
    procenten: { label: 'Procenten', icon: '💯', sub: 'Van basis naar toepassing', generator: genProcenten },
    verhoudingen: { label: 'Verhoudingen & schaal', icon: '⚖️', sub: 'Verhoudingstabel en kaart', generator: genVerhoudingen },
    meten: { label: 'Meten & omrekenen', icon: '📏', sub: 'Lengte, gewicht, inhoud en tijd', generator: genMeten },
    meetkunde: { label: 'Omtrek, oppervlakte & inhoud', icon: '📐', sub: 'Vormen en maten', generator: genMeetkunde },
    schatten: { label: 'Schatten', icon: '🎯', sub: 'Controleren met een schatting', generator: genSchatten },
    informatie: { label: 'Studievaardigheden', icon: '📊', sub: 'Grafieken, tabellen en informatie aflezen', generator: genInformatie },
    strategie: { label: 'Getallenlijn & slim rekenen', icon: '↔️', sub: 'Plaatsen, compenseren en redeneren', generator: genStrategie },
    redactie: { label: 'Redactiesommen', icon: '📚', sub: 'Eén- en meerstapsproblemen', generator: genRedactie }
};

/* ============================================================
   REKENSTRATEGIEËN
   Eén centrale uitleg per rekendomein. Nieuwe strategieën kunnen
   hier worden toegevoegd zonder de weergavecode aan te passen.
   ============================================================ */
const REKENSTRATEGIEEN = {
    getalbegrip: {
        titel: 'Splits het getal in handige delen',
        stappen: ['Kijk naar de plaatswaarde van elk cijfer.', 'Schrijf duizenden, honderden, tientallen en eenheden apart.', 'Controleer of de delen samen weer het oorspronkelijke getal vormen.'],
        voorbeeld: '4.582 = 4.000 + 500 + 80 + 2'
    },
    tafels: {
        titel: 'Gebruik een bekende tafel',
        stappen: ['Zoek de twee factoren.', 'Gebruik een tafel die je al kent of splits één factor.', 'Controleer met de omgekeerde deelsom.'],
        voorbeeld: '7 × 14 = 7 × 10 + 7 × 4 = 70 + 28 = 98'
    },
    optellen_aftrekken: {
        titel: 'Reken onder elkaar of splits',
        stappen: ['Zet eenheden, tientallen en honderdtallen recht onder elkaar.', 'Reken van rechts naar links.', 'Onthoud of leen wanneer dat nodig is.'],
        voorbeeld: '  468\n+ 257\n-----\n  725'
    },
    vermenigvuldigen: {
        titel: 'Splits de tweede factor',
        stappen: ['Splits het grootste getal in tientallen en eenheden.', 'Vermenigvuldig elk deel apart.', 'Tel de tussenantwoorden bij elkaar op.'],
        voorbeeld: '36 × 24 = 36 × 20 + 36 × 4 = 720 + 144 = 864'
    },
    delen: {
        titel: 'Delen met hapjes of staartdeling',
        stappen: ['Bepaal hoe vaak de deler in een handig deel past.', 'Trek dat deel af en ga verder met de rest.', 'Controleer: uitkomst × deler + rest = deeltal.'],
        voorbeeld: '936 : 8\n800 : 8 = 100\n136 : 8 = 17\nDus 936 : 8 = 117'
    },
    breuken: {
        titel: 'Kijk eerst naar teller en noemer',
        stappen: ['De noemer vertelt in hoeveel gelijke delen het geheel is verdeeld.', 'De teller vertelt hoeveel delen je gebruikt.', 'Maak breuken zo nodig gelijknamig of vereenvoudig teller en noemer met hetzelfde getal.'],
        voorbeeld: `3/4 van 28

Stap 1: bereken 1/4
28 : 4 = 7

Stap 2: bereken 3/4
7 × 3 = 21`
    },
    breukencontext: {
        titel: 'Bereken eerst één breukdeel',
        stappen: ['Deel de hele hoeveelheid door de noemer.', 'Vermenigvuldig de uitkomst met de teller.', 'Schrijf de juiste eenheid achter het antwoord.'],
        voorbeeld: `2/5 van 30 koekjes

Stap 1: bereken 1/5
30 : 5 = 6 koekjes

Stap 2: bereken 2/5
6 × 2 = 12 koekjes`
    },
    kommagetallen: {
        titel: 'Zet de komma’s recht onder elkaar',
        stappen: ['Schrijf de getallen met de komma onder de komma.', 'Vul eventueel nullen aan.', 'Reken alsof het hele getallen zijn en plaats de komma terug.'],
        voorbeeld: '  3,50\n+ 1,75\n------\n  5,25'
    },
    procenten: {
        titel: 'Reken via 1%, 10% of een bekende breuk',
        stappen: ['Bepaal welk eenvoudig percentage helpt.', 'Gebruik 50% = 1/2, 25% = 1/4 en 10% = delen door 10.', 'Bouw daarmee het gevraagde percentage op.'],
        voorbeeld: '25% van 240 = 1/4 van 240 = 60'
    },
    verhoudingen: {
        titel: 'Gebruik een verhoudingstabel',
        stappen: ['Schrijf de bij elkaar horende hoeveelheden naast elkaar.', 'Reken eerst naar 1 als dat handig is.', 'Vermenigvuldig daarna naar de gevraagde hoeveelheid.'],
        voorbeeld: `Voorbeeld verhoudingstabel:
3 pakken → 18 flessen
1 pak → 6 flessen
8 pakken → 48 flessen`
    },
    meten: {
        titel: 'Kies de juiste omrekenstap',
        stappen: ['Bepaal van welke eenheid je naar welke eenheid gaat.', 'Naar een kleinere eenheid: vermenigvuldigen.', 'Naar een grotere eenheid: delen.'],
        voorbeeld: '4 meter = 4 × 100 = 400 centimeter'
    },
    meetkunde: {
        titel: 'Kies de juiste formule',
        stappen: ['Omtrek: tel alle zijden op.', 'Oppervlakte rechthoek: lengte × breedte.', 'Inhoud balk: lengte × breedte × hoogte.'],
        voorbeeld: `Kies eerst wat gevraagd wordt:

Omtrek: alle zijden optellen
Oppervlakte: lengte × breedte
Inhoud: lengte × breedte × hoogte`
    },
    schatten: {
        titel: 'Rond eerst handig af',
        stappen: ['Rond ieder getal af zoals in de opdracht staat.', 'Reken met de afgeronde getallen.', 'Gebruik de schatting om een exact antwoord te controleren.'],
        voorbeeld: '498 + 304 ≈ 500 + 300 = 800'
    },
    redactie: {
        titel: 'Haal de rekensom uit het verhaal',
        stappen: ['Onderstreep de getallen en de vraag.', 'Bepaal welke bewerking of bewerkingen nodig zijn.', 'Reken stap voor stap en controleer of het antwoord logisch is.', 'Schrijf de gevraagde eenheid bij het antwoord.'],
        voorbeeld: 'Eerst uitrekenen wat er totaal is; daarna aftrekken wat gebruikt of verkocht is.'
    }
};

function getStrategieVoorSom(somObj) {
    return REKENSTRATEGIEEN[somObj.strategie] || REKENSTRATEGIEEN[somObj.categorie] || REKENSTRATEGIEEN.redactie;
}

function renderStrategie(somObj) {
    const strategie = getStrategieVoorSom(somObj);
    const stappen = strategie.stappen.map(stap => `<li>${stap}</li>`).join('');
    return `<div class="strategy-card"><h4>💡 ${strategie.titel}</h4><ol>${stappen}</ol><div class="strategy-example">Voorbeeld:\n${strategie.voorbeeld}</div></div>`;
}

/* ============================================================
   VALIDATIE + ANTI-DUPLICAAT
   ============================================================ */
function valideerSom(som) {
    if (!som) return false;
    if (som.isSplitsen) {
        const a = parseFloat(som.antwoord);
        return som.splitsData && !Number.isNaN(a);
    }
    return typeof som.vraag === 'string' && som.vraag.length > 0 &&
        typeof som.antwoord === 'string' && som.antwoord.length > 0 && som.antwoord !== 'NaN';
}

function genereerUniekeGeldigeSom(catKey, instellingen, gebruikteSignatures) {
    const generator=CATEGORIES[catKey].generator; let som=null;
    for(let poging=0;poging<CONFIG.duplicateRetryLimit*4;poging++){
        som=generator(instellingen);
        if(valideerSom(som) && !gebruikteSignatures.has(som.signature)){
            gebruikteSignatures.add(som.signature); return som;
        }
    }
    console.warn(`Geen nieuwe unieke som meer beschikbaar voor categorie "${catKey}".`);
    return null;
}

/* ============================================================
   ANTWOORD-NORMALISATIE
   ============================================================ */
function normaliseerAntwoord(ruw) {
    if (typeof ruw !== 'string') return '';
    return ruw.trim().replace(',', '.').replace(/\s+/g, ' ');
}

function parseBreukAntwoord(waarde) {
    const tekst = normaliseerAntwoord(waarde);
    let match = tekst.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
    if (match) {
        const geheel = Number(match[1]), teller = Number(match[2]), noemer = Number(match[3]);
        if (noemer === 0) return null;
        const teken = geheel < 0 ? -1 : 1;
        return teken * (Math.abs(geheel) + teller / noemer);
    }
    match = tekst.match(/^(-?\d+)\/(\d+)$/);
    if (match) {
        const teller = Number(match[1]), noemer = Number(match[2]);
        return noemer === 0 ? null : teller / noemer;
    }
    return null;
}

function antwoordenZijnGelijk(ruwAntwoord, verwachtAntwoord) {
    const gebruiker = normaliseerAntwoord(ruwAntwoord);
    const verwacht = normaliseerAntwoord(verwachtAntwoord);
    if (gebruiker === verwacht) return true;
    if (!gebruiker || !verwacht) return false;

    // Tekstantwoorden zijn niet hoofdlettergevoelig.
    if (gebruiker.toLocaleLowerCase('nl-NL') === verwacht.toLocaleLowerCase('nl-NL')) return true;

    // Kloktijden: 8:30 en 08:30 betekenen hetzelfde.
    const klokPatroon = /^(\d{1,2}):(\d{2})$/;
    const klokGebruiker = gebruiker.match(klokPatroon);
    const klokVerwacht = verwacht.match(klokPatroon);
    if (klokGebruiker && klokVerwacht) {
        return Number(klokGebruiker[1]) === Number(klokVerwacht[1]) && Number(klokGebruiker[2]) === Number(klokVerwacht[2]);
    }

    // Delen met rest: accepteer bijvoorbeeld '12 rest 3', '12 r 3' en '12, rest 3'.
    const restPatroon = /^(\d+)\s*(?:[,.]?\s*(?:rest|r))\s*(\d+)$/i;
    const restGebruiker = gebruiker.match(restPatroon);
    const restVerwacht = verwacht.match(restPatroon);
    if (restGebruiker && restVerwacht) {
        return Number(restGebruiker[1]) === Number(restVerwacht[1]) && Number(restGebruiker[2]) === Number(restVerwacht[2]);
    }

    // Gelijkwaardige breuken en gemengde getallen worden goed gerekend.
    const breukGebruiker = parseBreukAntwoord(gebruiker);
    const breukVerwacht = parseBreukAntwoord(verwacht);
    if (breukGebruiker !== null && breukVerwacht !== null) {
        return Math.abs(breukGebruiker - breukVerwacht) < 1e-10;
    }

    // Gewone getallen: voorloopnullen en komma/punt maken geen verschil.
    if (/^-?\d+(?:\.\d+)?$/.test(gebruiker) && /^-?\d+(?:\.\d+)?$/.test(verwacht)) {
        return Number(gebruiker) === Number(verwacht);
    }
    return false;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG, CATEGORIES,
        randInt, pickRandom, maakSom, maakSplitsSom,
        genTafels, genSchatten, genSplitsen, genBreuken, genBreukenContext, genInformatie, genStrategie,
        genOptellenAftrekken, genVermenigvuldigen, genDelen, genKlokkijken, genGeld, genRedactie,
        valideerSom, genereerUniekeGeldigeSom, normaliseerAntwoord, antwoordenZijnGelijk,
        REDACTIE_DATASET, POOL_BREUKEN_CONTEXT
    };
}

'use strict';

/* ============================================================
   VEILIGE LOCALSTORAGE WRAPPER
   Voorkomt crashes in bijv. privé-browsen waar localStorage
   kan ontbreken of vol kan zitten.
   ============================================================ */
const Storage = {
    get(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return fallback;
            return JSON.parse(raw);
        } catch (e) {
            console.warn('Kon opslag niet lezen voor', key, e);
            return fallback;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('Kon opslag niet schrijven voor', key, e);
            return false;
        }
    }
};

/* ============================================================
   APP-STATUS (alles op één plek, geen losse globale variabelen)
   ============================================================ */
const PROFILE_INDEX_KEY = 'rk_profiles_v1';
const ACTIVE_PROFILE_KEY = 'rk_active_profile_v1';

function maakProfielId(naam) {
    return (naam || 'leerling').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);
}

let profiles = Storage.get(PROFILE_INDEX_KEY, []);
if (!Array.isArray(profiles) || profiles.length === 0) {
    profiles = [{ id:'standaard', naam:'Leerling 1' }];
    Storage.set(PROFILE_INDEX_KEY, profiles);
}
let activeProfileId = Storage.get(ACTIVE_PROFILE_KEY, profiles[0].id);
if (!profiles.some(p => p.id === activeProfileId)) activeProfileId = profiles[0].id;

function profielOpslagSleutel(basis) {
    return `${basis}__${activeProfileId}`;
}

function profielGet(type, fallback) {
    const basis = CONFIG.storageKeys[type];
    let waarde = Storage.get(profielOpslagSleutel(basis), undefined);
    if (waarde === undefined && activeProfileId === 'standaard') {
        waarde = Storage.get(basis, undefined); // eenmalige migratie van oudere appversie
        if (waarde !== undefined) Storage.set(profielOpslagSleutel(basis), waarde);
    }
    return waarde === undefined ? fallback : waarde;
}

function profielSet(type, value) {
    return Storage.set(profielOpslagSleutel(CONFIG.storageKeys[type]), value);
}

function buildDefaultProgress() {
    const progress = {};
    Object.keys(CATEGORIES).forEach(key => {
        progress[key] = { totaal: 0, goed: 0 };
    });
    return progress;
}

const state = {
    xp: profielGet('points', 0),
    activeTimeMs: profielGet('activeTime', 0),
    history: profielGet('history', []),
    progress: profielGet('progress', buildDefaultProgress()),
    selectedCategories: [],
    selectedTafels: CONFIG.defaultTafels.slice(),
    sommenPerOefening: CONFIG.defaultSommenPerOefening,
    getalbereik: CONFIG.defaultGetalbereik,
    niveau: CONFIG.defaultNiveau,
    werkbladAlBeoordeeld: false,
    huidigWerkblad: [], // de op dit moment getoonde, nog na te kijken sommen
    reward500Claimed: profielGet('reward500', false)
};

// Zorg dat elke bekende categorie een progress-record heeft, ook als er
// een nieuwe categorie is toegevoegd na een eerder bezoek (localStorage
// kan een oudere structuur bevatten).
if (state.progress.splitsen && !state.progress.getalbegrip) state.progress.getalbegrip = state.progress.splitsen;
Object.keys(CATEGORIES).forEach(key => {
    if (!state.progress[key]) {
        state.progress[key] = { totaal: 0, goed: 0 };
    }
});

/* ============================================================
   NAVIGATIE (gefixt: één consistente naamgeving overal)
   ============================================================ */
function switchView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById(`view-${name}`);
    if (el) {
        el.classList.add('active');
        if (name === 'werkblad') markeerLeeractiviteit();
    } else {
        console.error('Onbekend scherm aangevraagd:', name);
    }
    window.scrollTo(0, 0);
}

function terugNaarHome() {
    updateStatsUI();
    switchView('dashboard');
}

/* ============================================================
   DASHBOARD: TEGELS OPBOUWEN VANUIT DE CATEGORY-REGISTRATIE
   ============================================================ */
function bouwTegels() {
    const grid = document.getElementById('tileGrid');
    grid.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const toegestaan = LEVELS[state.niveau].categories;
    Object.entries(CATEGORIES).filter(([key]) => toegestaan.includes(key)).forEach(([key, cat]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tile' + (state.selectedCategories.includes(key) ? ' active' : '') + (cat.wide ? ' tile-wide' : '');
        btn.id = `tile-${key}`;
        btn.dataset.action = 'toggle-tile';
        btn.dataset.cat = key;
        btn.setAttribute('aria-pressed', state.selectedCategories.includes(key) ? 'true' : 'false');
        btn.innerHTML = `
            <div class="tile-icon" aria-hidden="true">${cat.icon}</div>
            <div><h3>${cat.label}</h3><p>${cat.sub}</p></div>
        `;
        fragment.appendChild(btn);
    });
    grid.appendChild(fragment);
}

function bouwTafelCheckboxes() {
    const container = document.getElementById('tafelSubCheckboxes');
    container.innerHTML = '';
    const profiel = LEVELS[state.niveau];
    const fragment = document.createDocumentFragment();
    profiel.tafels.forEach(t => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-sub' + (state.selectedTafels.includes(t) ? ' active' : '');
        btn.id = `tfbtn-${t}`;
        btn.dataset.action = 'toggle-tafel';
        btn.dataset.tafel = String(t);
        btn.setAttribute('aria-pressed', state.selectedTafels.includes(t) ? 'true' : 'false');
        btn.textContent = String(t);
        fragment.appendChild(btn);
    });
    container.appendChild(fragment);
}

/* ============================================================
   TEGELS & INSTELLINGEN AAN/UIT ZETTEN
   ============================================================ */
function toggleTile(cat) {
    const tile = document.getElementById(`tile-${cat}`);
    const idx = state.selectedCategories.indexOf(cat);
    if (idx > -1) {
        state.selectedCategories.splice(idx, 1);
        tile.classList.remove('active');
        tile.setAttribute('aria-pressed', 'false');
    } else {
        state.selectedCategories.push(cat);
        tile.classList.add('active');
        tile.setAttribute('aria-pressed', 'true');
    }
    document.getElementById('tafelInlinePanel').style.display =
        state.selectedCategories.includes('tafels') ? 'block' : 'none';
}

function toggleTafelNummer(t) {
    const btn = document.getElementById(`tfbtn-${t}`);
    const idx = state.selectedTafels.indexOf(t);
    if (idx > -1) {
        if (state.selectedTafels.length > 1) {
            state.selectedTafels.splice(idx, 1);
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        }
        // Als dit de laatste geselecteerde tafel is, laten we hem aan staan
        // zodat er altijd minstens één tafel overblijft om mee te oefenen.
    } else {
        state.selectedTafels.push(t);
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
    }
}

const MAX_SOMMEN_PER_OEFENING = 200;

function setLengte(l) {
    state.sommenPerOefening = l;
    document.querySelectorAll('#lengteGroep .btn-sub').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.lengte, 10) === l);
    });
    const customInput = document.getElementById('customLengteInput');
    if (customInput) customInput.value = '';
    toonLengteWaarschuwingIndienNodig(l);
}

function setLengteCustom() {
    const input = document.getElementById('customLengteInput');
    let waarde = parseInt(input.value, 10);
    if (!Number.isFinite(waarde) || waarde < 1) {
        alert('Vul een geldig aantal in (minimaal 1).');
        return;
    }
    if (waarde > MAX_SOMMEN_PER_OEFENING) {
        alert(`Het maximum is ${MAX_SOMMEN_PER_OEFENING} sommen per oefening (anders wordt de pagina te zwaar om te laden). Er is nu ${MAX_SOMMEN_PER_OEFENING} gebruikt.`);
        waarde = MAX_SOMMEN_PER_OEFENING;
        input.value = String(waarde);
    }
    state.sommenPerOefening = waarde;
    document.querySelectorAll('#lengteGroep .btn-sub').forEach(b => b.classList.remove('active'));
    toonLengteWaarschuwingIndienNodig(waarde);
}

function toonLengteWaarschuwingIndienNodig(l) {
    document.getElementById('lengteWaarschuwing').style.display = l >= 100 ? 'block' : 'none';
}

function setBereik(r) {
    r=Math.max(20,Math.min(LEVELS[state.niveau].maxGetal,r));
    state.getalbereik = r;
    document.querySelectorAll('#bereikGroep .btn-sub').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.bereik, 10) === r);
    });
}

/* ============================================================
   PUNTEN, MEDAILLES EN STATISTIEKEN
   ============================================================ */
function setNiveau(niveau) {
    state.niveau = niveau;
    const profiel = LEVELS[niveau];
    document.querySelectorAll('#niveauGroep .btn-sub').forEach(b => b.classList.toggle('active', b.dataset.niveau === niveau));
    document.getElementById('niveauUitleg').textContent = profiel.uitleg;
    document.getElementById('headerLevelText').textContent = profiel.label;
    state.getalbereik = profiel.maxGetal;
    state.selectedTafels = profiel.tafels.slice();
    state.selectedCategories = state.selectedCategories.filter(cat => profiel.categories.includes(cat));
    bouwTegels();
    bouwTafelCheckboxes();
    document.getElementById('tafelInlinePanel').style.display = state.selectedCategories.includes('tafels') ? 'block' : 'none';
    const bereikGroep=document.getElementById('bereikGroep');
    bereikGroep.querySelectorAll('[data-bereik]').forEach(b=>{b.hidden=Number(b.dataset.bereik)>profiel.maxGetal;});
    bereikGroep.closest('.config-block').style.display=profiel.maxGetal<=1000?'none':'block';
    setBereik(profiel.maxGetal);
}

function toggleSomPaneel(panelId, knop) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const row = panel.closest('.som-row');
    const wasOpen = panel.classList.contains('open');
    row.querySelectorAll('.som-panel.open').forEach(p => p.classList.remove('open'));
    row.querySelectorAll('.som-tool-btn[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    if (!wasOpen) {
        panel.classList.add('open');
        knop.setAttribute('aria-expanded', 'true');
    }
}

function initialiseCanvas(canvas, force = false) {
    if (canvas.dataset.ready === 'true' && !force) return;
    const rect = canvas.getBoundingClientRect();
    // Een verborgen canvas heeft geen bruikbare afmetingen. Initialiseer pas in tekenmodus.
    if (rect.width < 10 || rect.height < 10) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#25324b';

    if (canvas.dataset.listeners !== 'true') {
        let tekenen = false;
        const positie = event => {
            const r = canvas.getBoundingClientRect();
            return { x: event.clientX - r.left, y: event.clientY - r.top };
        };
        canvas.addEventListener('pointerdown', event => {
            event.preventDefault();
            tekenen = true;
            canvas.setPointerCapture?.(event.pointerId);
            const p = positie(event);
            const context = canvas.getContext('2d');
            context.beginPath();
            context.moveTo(p.x, p.y);
        }, { passive: false });
        canvas.addEventListener('pointermove', event => {
            if (!tekenen) return;
            event.preventDefault();
            const p = positie(event);
            const context = canvas.getContext('2d');
            context.lineTo(p.x, p.y);
            context.stroke();
        }, { passive: false });
        const stop = () => { tekenen = false; canvas.getContext('2d').beginPath(); };
        canvas.addEventListener('pointerup', stop);
        canvas.addEventListener('pointercancel', stop);
        canvas.addEventListener('pointerleave', stop);
        canvas.dataset.listeners = 'true';
    }
    canvas.dataset.ready = 'true';
}

function setScratchMode(index, mode, knop) {
    const textarea = document.getElementById(`scratch-text-${index}`);
    const canvas = document.getElementById(`canvas-${index}`);
    if (!textarea || !canvas) return;
    const paneel = textarea.closest('.mini-scratch');
    paneel.querySelectorAll('.scratch-mode-btn').forEach(btn => btn.classList.toggle('active', btn === knop));
    const tekenen = mode === 'draw';
    textarea.classList.toggle('hidden', tekenen);
    canvas.classList.toggle('active', tekenen);
    if (tekenen) requestAnimationFrame(() => initialiseCanvas(canvas, canvas.dataset.ready !== 'true'));
    else textarea.focus();
}

function wisSomKladblok(index) {
    const canvas = document.getElementById(`canvas-${index}`);
    const textarea = document.getElementById(`scratch-text-${index}`);
    if (textarea) textarea.value = '';
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function bouwProfielKeuze() {
    const select = document.getElementById('studentSelect');
    if (!select) return;
    select.innerHTML = '';
    profiles.forEach(profiel => {
        const option = document.createElement('option');
        option.value = profiel.id;
        option.textContent = profiel.naam;
        option.selected = profiel.id === activeProfileId;
        select.appendChild(option);
    });
}

function laadActiefProfiel() {
    state.xp = profielGet('points', 0);
    state.activeTimeMs = profielGet('activeTime', 0);
    state.history = profielGet('history', []);
    state.progress = profielGet('progress', buildDefaultProgress());
    state.reward500Claimed = profielGet('reward500', false);
    Object.keys(CATEGORIES).forEach(key => {
        if (!state.progress[key]) state.progress[key] = { totaal:0, goed:0 };
    });
    document.getElementById('xpDisplay').textContent = String(state.xp);
    updateRewardUI();
    updateStatsUI();
    updateHistoryUI();
}

function wisselLeerling(id) {
    if (!profiles.some(p => p.id === id)) return;
    bewaarActieveTijd();
    activeProfileId = id;
    Storage.set(ACTIVE_PROFILE_KEY, activeProfileId);
    laadActiefProfiel();
    laatsteLeeractiviteit = 0;
    laatsteMeetmoment = Date.now();
}

function voegLeerlingToe() {
    const naam = prompt('Hoe heet de leerling?');
    if (!naam || !naam.trim()) return;
    const schoon = naam.trim().slice(0, 30);
    const profiel = { id: maakProfielId(schoon), naam: schoon };
    profiles.push(profiel);
    bewaarActieveTijd();
    Storage.set(PROFILE_INDEX_KEY, profiles);
    activeProfileId = profiel.id;
    Storage.set(ACTIVE_PROFILE_KEY, activeProfileId);
    bouwProfielKeuze();
    laadActiefProfiel();
    laatsteLeeractiviteit = 0;
    laatsteMeetmoment = Date.now();
}

const ACTIVE_POINT_BLOCK_MS = 10 * 60 * 1000;
const ACTIVE_POINT_VALUE = 10;
const IDLE_TIMEOUT_MS = 2 * 60 * 1000;
const MAX_TICK_GAP_MS = 5000;
const ACTIVE_TIME_SAVE_INTERVAL_MS = 15000;
let laatsteLeeractiviteit = 0;
let laatsteMeetmoment = Date.now();
let laatsteTijdopslag = Date.now();
let actieveTijdTrackerGestart = false;

function actiefWerkblad() {
    const werkblad = document.getElementById('view-werkblad');
    const beloningOpen = document.getElementById('rewardModal')?.classList.contains('open');
    return document.visibilityState === 'visible' && werkblad?.classList.contains('active') && !beloningOpen ? werkblad : null;
}

function markeerLeeractiviteit(event) {
    const werkblad = actiefWerkblad();
    if (!werkblad) return;
    if (event?.target && !werkblad.contains(event.target)) return;
    laatsteLeeractiviteit = Date.now();
}

function bewaarActieveTijd() {
    profielSet('activeTime', Math.max(0, Number(state.activeTimeMs) || 0));
    laatsteTijdopslag = Date.now();
}

function verdienTijdpunten(punten) {
    if (punten <= 0) return;
    const vorigePunten = state.xp;
    state.xp += punten;
    profielSet('points', state.xp);
    document.getElementById('xpDisplay').textContent = String(state.xp);
    controleerBeloning(vorigePunten);
}

function meetActieveLeertijd() {
    const nu = Date.now();
    const verstreken = nu - laatsteMeetmoment;
    laatsteMeetmoment = nu;
    if (!actiefWerkblad() || !laatsteLeeractiviteit || nu - laatsteLeeractiviteit > IDLE_TIMEOUT_MS || verstreken <= 0 || verstreken > MAX_TICK_GAP_MS) return;

    state.activeTimeMs = (Number(state.activeTimeMs) || 0) + verstreken;
    const blokken = Math.floor(state.activeTimeMs / ACTIVE_POINT_BLOCK_MS);
    if (blokken > 0) {
        state.activeTimeMs -= blokken * ACTIVE_POINT_BLOCK_MS;
        verdienTijdpunten(blokken * ACTIVE_POINT_VALUE);
        bewaarActieveTijd();
    } else if (nu - laatsteTijdopslag >= ACTIVE_TIME_SAVE_INTERVAL_MS) {
        bewaarActieveTijd();
    }
}

function startActieveTijdTracker() {
    if (actieveTijdTrackerGestart) return;
    actieveTijdTrackerGestart = true;
    ['pointerdown', 'keydown', 'input'].forEach(type => document.addEventListener(type, markeerLeeractiviteit, true));
    document.addEventListener('visibilitychange', () => {
        laatsteMeetmoment = Date.now();
        if (document.visibilityState !== 'visible') bewaarActieveTijd();
    });
    window.addEventListener('pagehide', bewaarActieveTijd);
    window.setInterval(meetActieveLeertijd, 1000);
}

function updateRewardUI() {
    const threshold = CONFIG.rewardThreshold;
    const voortgang = Math.min(state.xp, threshold);
    const pct = Math.min(100, Math.round((voortgang / threshold) * 100));
    const tekst = document.getElementById('rewardProgressText');
    const balk = document.getElementById('rewardProgressFill');
    if (tekst) tekst.textContent = `${voortgang} / ${threshold}`;
    if (balk) balk.style.width = `${pct}%`;
}

function controleerBeloning(vorigePunten) {
    updateRewardUI();
    if (vorigePunten < CONFIG.rewardThreshold && state.xp >= CONFIG.rewardThreshold && !state.reward500Claimed) {
        state.reward500Claimed = true;
        profielSet('reward500', true);
        document.getElementById('rewardModal').classList.add('open');
    }
}

function sluitBeloning() {
    document.getElementById('rewardModal').classList.remove('open');
}

function resetPunten() {
    const bevestig = confirm('Weet je zeker dat je alle verdiende punten wilt resetten naar 0?\n\n(Geen zorgen: de medailles en voortgang per onderdeel worden NIET gewist!)');
    if (!bevestig) return;
    state.xp = 0;
    state.activeTimeMs = 0;
    profielSet('points', 0);
    profielSet('activeTime', 0);
    state.reward500Claimed = false;
    profielSet('reward500', false);
    document.getElementById('xpDisplay').textContent = '0';
    updateRewardUI();
}

function resetScores() {
    const bevestig = confirm('Weet je zeker dat je alle scores, medailles en voortgang wilt wissen?\n\nJe punten blijven behouden. Deze actie kan niet ongedaan worden gemaakt.');
    if (!bevestig) return;
    state.history = [];
    state.progress = buildDefaultProgress();
    profielSet('history', state.history);
    profielSet('progress', state.progress);
    ['rk_streak_v1','rk_badges_v1','rk_daily_v1'].forEach(basis => {
        try { localStorage.removeItem(`${basis}__${activeProfileId}`); } catch (e) { console.warn('Kon aanvullende voortgang niet wissen', basis, e); }
    });
    updateStatsUI();
    updateHistoryUI();
    alert('Alle scores en voortgang zijn gereset. Je punten zijn behouden.');
}

function getMedaille(percentage, totaalGemaakt) {
    if (totaalGemaakt === 0) return `<span class="level-badge" style="background:#e0e5f2; color:#a3aed0;">Geen data</span>`;
    if (percentage < 60) return `<span class="level-badge" style="background:#ffebee; color:#c62828;">🥉 Beginner</span>`;
    if (percentage < 80) return `<span class="level-badge" style="background:#e8f5e9; color:#2e7d32;">🥈 Goed</span>`;
    if (percentage < 95) return `<span class="level-badge" style="background:#e3f2fd; color:#1565c0;">🥇 Ster</span>`;
    return `<span class="level-badge" style="background:#fff8e1; color:#f57f17;">👑 Meester</span>`;
}

function updateStatsUI() {
    const tbody = document.getElementById('statsTableBody');
    tbody.innerHTML = '';
    const fragment = document.createDocumentFragment();

    let totaalSommenApp = 0;
    let totaalGoedApp = 0;
    let besteOnderdeel = '-';
    let bestePerc = -1;
    let minsteOnderdeel = '-';
    let minstePerc = 101;

    for (const [key, data] of Object.entries(state.progress)) {
        totaalSommenApp += data.totaal;
        totaalGoedApp += data.goed;

        let percentage = 0;
        if (data.totaal > 0) {
            percentage = Math.round((data.goed / data.totaal) * 100);
            const kortLabel = CATEGORIES[key] ? CATEGORIES[key].label.replace(/^\d+[a-z]?\.\s*/, '') : key;
            if (data.totaal >= 5 && percentage > bestePerc) {
                bestePerc = percentage;
                besteOnderdeel = kortLabel;
            }
            if (data.totaal >= 5 && percentage < minstePerc) {
                minstePerc = percentage;
                minsteOnderdeel = kortLabel;
            }
        }

        const label = CATEGORIES[key] ? CATEGORIES[key].label : key;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-weight:600;">${label}</td>
            <td>
                <div style="margin-bottom: 2px;"><strong>${data.goed}</strong> / ${data.totaal} <span style="font-size:10px; color:var(--text-muted);">(${percentage}%)</span></div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
                </div>
            </td>
            <td>${getMedaille(percentage, data.totaal)}</td>
        `;
        fragment.appendChild(row);
    }
    tbody.appendChild(fragment);

    document.getElementById('statTotaalSommen').textContent = String(totaalSommenApp);
    document.getElementById('statTotaalGoed').textContent = String(totaalGoedApp);
    document.getElementById('statBesteOnderdeel').textContent = besteOnderdeel + (bestePerc !== -1 ? ` (${bestePerc}%)` : '');
    document.getElementById('statMinderOnderdeel').textContent = minsteOnderdeel + (minstePerc !== 101 ? ` (${minstePerc}%)` : '');
}

function updateHistoryUI() {
    const container = document.getElementById('historyContainer');
    if (state.history.length === 0) {
        container.innerHTML = `<p class="empty-hint">Nog geen eerdere resultaten opgeslagen.</p>`;
        return;
    }
    container.innerHTML = state.history.slice(0, 4).map(h => `
        <div class="res-row">
            <strong>Blad (${h.aantalOnderdelen} ond.)</strong>
            <span>Score: ${h.score} (${h.datum})</span>
        </div>
    `).join('');
}

/* ============================================================
   WERKBLAD GENEREREN
   ============================================================ */

function bepaalInvoerEigenschappen(somObj, categorie) {
    const verwacht = String(somObj.antwoord ?? '').trim();
    if (categorie === 'klokkijken' && /^\d{1,2}:\d{2}$/.test(verwacht)) {
        return 'inputmode="numeric" pattern="[0-9:]*" maxlength="5" autocomplete="off" data-input-type="clock"';
    }
    if (/^-?\d+$/.test(verwacht)) {
        return 'inputmode="numeric" pattern="-?[0-9]*" autocomplete="off" data-input-type="integer"';
    }
    if (/^-?\d+(?:[.,]\d+)?$/.test(verwacht)) {
        return 'inputmode="decimal" autocomplete="off" data-input-type="decimal"';
    }
    // Breuken, antwoorden met rest en woorden hebben letters of een schuine streep nodig.
    return 'inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" data-input-type="text"';
}

function genereerWerkblad() {
    if (state.selectedCategories.length === 0) {
        alert('Kies eerst minimaal één onderdeel om te oefenen!');
        return;
    }

    const container = document.getElementById('worksheetContainer');
    container.innerHTML = '';
    state.huidigWerkblad = [];
    state.werkbladAlBeoordeeld = false;

    const fragment = document.createDocumentFragment();
    let globaleIndex = 0;
    let tekortAanUniekeSommen = false;

    state.selectedCategories.forEach(cat => {
        const header = document.createElement('div');
        header.className = 'category-header';
        header.textContent = CATEGORIES[cat] ? CATEGORIES[cat].label : cat;
        fragment.appendChild(header);

        const subContainer = document.createElement('div');
        subContainer.className = 'worksheet-container';

        const gebruikteSignatures = new Set();
        const instellingen = {
            selectedTafels: state.selectedTafels,
            getalbereik: state.getalbereik,
            niveau: state.niveau
        };

        for (let i = 0; i < state.sommenPerOefening; i++) {
            const somObj = genereerUniekeGeldigeSom(cat, instellingen, gebruikteSignatures);
            if (!somObj) { tekortAanUniekeSommen = true; break; }
            somObj.categorie = cat;
            somObj.index = globaleIndex;
            state.huidigWerkblad.push(somObj);

            const row = document.createElement('div');
            row.className = 'som-row';
            row.id = `som-row-${globaleIndex}`;

            // Bij grafieken/tabellen en visuele getallenlijnen is geen kladblok nodig.
            // Bij de overige sommen blijft het kladblok naast het antwoordvak beschikbaar.
            const toonKladblok = cat !== 'informatie' && !(cat === 'strategie' && somObj.customHTML);

            let somInhoud = '';
            if (somObj.isSplitsen) {
                const linksHTML = somObj.splitsData.links === '?'
                    ? `<label class="visually-hidden" for="input-${globaleIndex}">Ontbrekend getal, links</label><input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="${Math.max(2, String(somObj.antwoord).length + 1)}" autocomplete="off" data-input-type="integer" class="splits-input-box" id="input-${globaleIndex}">`
                    : somObj.splitsData.links;
                const rechtsHTML = somObj.splitsData.rechts === '?'
                    ? `<label class="visually-hidden" for="input-${globaleIndex}">Ontbrekend getal, rechts</label><input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="${Math.max(2, String(somObj.antwoord).length + 1)}" autocomplete="off" data-input-type="integer" class="splits-input-box" id="input-${globaleIndex}">`
                    : somObj.splitsData.rechts;

                somInhoud = `
                    <div class="som-main">
                        <div class="som-vraag">Vul het missende getal in het splitsingsschema in:</div>
                        <div class="visual-splits-diagram">
                            <div class="splits-top">${somObj.splitsData.totaal}</div>
                            <div class="splits-branches">
                                <div class="splits-left">${linksHTML}</div>
                                <div class="splits-rechts">${rechtsHTML}</div>
                            </div>
                        </div>
                        <div class="feedback-icon" id="fb-${globaleIndex}" aria-live="polite"></div>
                        ${toonKladblok ? `<div class="som-tools">
                            <button type="button" class="som-tool-btn" data-action="toggle-som-paneel" data-panel="scratch-${globaleIndex}" aria-expanded="false" title="Kladblok" aria-label="Open kladblok">📝</button>
                        </div>` : ''}
                    </div>`;
            } else {
                somInhoud = `
                    <div class="som-main">
                        ${somObj.customHTML ? `<div class="som-custom">${somObj.customHTML}</div>` : ``}<div class="som-vraag">${somObj.vraag}</div>
                        <div class="som-input-wrapper">
                            <label class="visually-hidden" for="input-${globaleIndex}">Antwoord voor som ${globaleIndex + 1}</label>
                            <input type="text" ${bepaalInvoerEigenschappen(somObj, cat)} class="som-input" id="input-${globaleIndex}" placeholder="?">
                            <span class="feedback-icon" id="fb-${globaleIndex}" aria-live="polite"></span>
                        </div>
                        ${toonKladblok ? `<div class="som-tools">
                            <button type="button" class="som-tool-btn" data-action="toggle-som-paneel" data-panel="scratch-${globaleIndex}" aria-expanded="false" title="Kladblok" aria-label="Open kladblok">📝</button>
                        </div>` : ''}
                    </div>`;
            }

            row.innerHTML = `${somInhoud}${toonKladblok ? `
                <div class="som-panel" id="scratch-${globaleIndex}">
                    <div class="som-panel-grid">
                        <div class="mini-scratch">
                            <div class="mini-scratch-head">
                                <span>Werk deze som uit</span>
                                <div class="mini-scratch-actions">
                                    <button type="button" data-action="wis-som-kladblok" data-index="${globaleIndex}" aria-label="Wis kladblok van som ${globaleIndex + 1}" title="Wissen">🗑️</button>
                                </div>
                            </div>
                            <div class="scratch-mode-switch" role="group" aria-label="Kies kladblokmodus">
                                <button type="button" class="scratch-mode-btn active" data-action="set-scratch-mode" data-index="${globaleIndex}" data-mode="type">⌨️ Typen</button>
                                <button type="button" class="scratch-mode-btn" data-action="set-scratch-mode" data-index="${globaleIndex}" data-mode="draw">✏️ Tekenen</button>
                            </div>
                            <textarea class="scratch-textarea" id="scratch-text-${globaleIndex}" placeholder="Typ hier je tussenstappen…" aria-label="Getypt kladblok voor som ${globaleIndex + 1}" inputmode="text" autocorrect="off" autocapitalize="none" autocomplete="off" spellcheck="false" data-gramm="false" data-gramm_editor="false"></textarea>
                            <canvas class="scratch-canvas" id="canvas-${globaleIndex}" data-index="${globaleIndex}" aria-label="Tekenkladblok voor som ${globaleIndex + 1}"></canvas>
                        </div>
                    </div>
                </div>` : ''}`;

            subContainer.appendChild(row);
            globaleIndex++;
        }
        fragment.appendChild(subContainer);
    });

    container.appendChild(fragment);

    document.getElementById('btnControleer').style.display = 'block';
    document.getElementById('btnNaarScore').style.display = 'none';

    switchView('werkblad');
    const eersteAntwoordveld = document.querySelector('#worksheetContainer input');
    if (eersteAntwoordveld) {
        eersteAntwoordveld.focus({ preventScroll: true });
        eersteAntwoordveld.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    if (tekortAanUniekeSommen) {
        setTimeout(() => alert('Voor de gekozen selectie waren minder unieke sommen beschikbaar dan het gekozen aantal. De app heeft alleen unieke opgaven geplaatst en geen dubbelen toegevoegd.'), 50);
    }
}

/* ============================================================
   NAKIJKEN
   ============================================================ */
function nakijkenWerkblad() {
    if (state.werkbladAlBeoordeeld) return;
    const totaalGemaakt = state.huidigWerkblad.length;
    if (totaalGemaakt === 0) return;

    let goedTelling = 0;
    const updatesPerCategorie = {};
    state.selectedCategories.forEach(c => {
        updatesPerCategorie[c] = { goed: 0, totaal: 0 };
    });

    state.huidigWerkblad.forEach(som => {
        const inputEl = document.getElementById(`input-${som.index}`);
        const rowEl = document.getElementById(`som-row-${som.index}`);
        const fbEl = document.getElementById(`fb-${som.index}`);

        const userAnsRuw = inputEl ? inputEl.value : '';
        const userAns = normaliseerAntwoord(userAnsRuw);
        const targetAns = normaliseerAntwoord(som.antwoord);

        updatesPerCategorie[som.categorie].totaal++;

        if (userAns === '') {
            rowEl.className = 'som-row unanswered';
            fbEl.innerHTML = `⚠️ <span style="font-size:11px; font-weight:normal; color:var(--danger);">(niet ingevuld, antwoord: ${som.antwoord})</span>`;
        } else if (antwoordenZijnGelijk(userAnsRuw, som.antwoord)) {
            rowEl.className = 'som-row correct';
            fbEl.innerHTML = '✔️';
            goedTelling++;
            updatesPerCategorie[som.categorie].goed++;
        } else {
            rowEl.className = 'som-row incorrect';
            fbEl.innerHTML = `❌ <span style="font-size:11px; font-weight:normal; color:var(--danger);">(${som.antwoord})</span>`;
        }
    });

    // Voortgang per categorie
    for (const [cat, data] of Object.entries(updatesPerCategorie)) {
        state.progress[cat].totaal += data.totaal;
        state.progress[cat].goed += data.goed;
    }
    profielSet('progress', state.progress);

    // Geschiedenis (beperkt tot CONFIG.historyLimit)
    const nu = new Date();
    const datumStr = `${nu.getDate()}-${nu.getMonth() + 1} ${nu.getHours()}:${(nu.getMinutes() < 10 ? '0' : '') + nu.getMinutes()}`;
    state.history.unshift({
        aantalOnderdelen: state.selectedCategories.length,
        score: `${goedTelling} / ${totaalGemaakt}`,
        datum: datumStr
    });
    if (state.history.length > CONFIG.historyLimit) {
        state.history.length = CONFIG.historyLimit;
    }
    profielSet('history', state.history);

    // Evaluatiescherm vullen
    document.getElementById('evalScore').textContent = `${goedTelling} / ${totaalGemaakt}`;
    document.getElementById('evalPoints').textContent = 'Je verdient 10 punten per 10 actieve oefenminuten.';

    const perc = (goedTelling / totaalGemaakt) * 100;
    let feedback;
    if (perc === 100) feedback = 'Perfect gedaan! Je bent een echte meester! 👑';
    else if (perc >= 80) feedback = 'Super goed gewerkt! Een dikke gouden ster! 🥇';
    else if (perc >= 60) feedback = 'Mooi resultaat! Je bent goed op weg! 🥈';
    else feedback = 'Goed geoefend! Blijf het proberen en je wordt vanzelf beter! 🥉';
    document.getElementById('evalFeedback').textContent = feedback;

    document.getElementById('btnControleer').style.display = 'none';
    document.getElementById('btnNaarScore').style.display = 'block';

    state.werkbladAlBeoordeeld = true;
    updateHistoryUI();
    window.scrollTo(0, document.body.scrollHeight);
}

function gaNaarEvaluatieScherm() {
    switchView('evaluatie');
}

/* ============================================================
   EVENT DELEGATIE
   Eén centraal punt voor alle klik- en toetsenbordinteracties,
   zodat er geen inline onclick-attributen of losse globale
   functie-koppelingen nodig zijn.
   ============================================================ */
function handleAction(el) {
    const action = el.dataset.action;
    switch (action) {
        case 'terug-naar-home': terugNaarHome(); break;
        case 'reset-punten': resetPunten(); break;
        case 'voeg-leerling-toe': voegLeerlingToe(); break;
        case 'sluit-beloning': sluitBeloning(); break;
        case 'reset-scores': resetScores(); break;
        case 'open-info': switchView('info'); break;
        case 'toggle-tile': toggleTile(el.dataset.cat); break;
        case 'toggle-tafel': toggleTafelNummer(parseInt(el.dataset.tafel, 10)); break;
        case 'set-lengte': setLengte(parseInt(el.dataset.lengte, 10)); break;
        case 'set-bereik': setBereik(parseInt(el.dataset.bereik, 10)); break;
        case 'set-niveau': setNiveau(el.dataset.niveau); break;
        case 'toggle-som-paneel': toggleSomPaneel(el.dataset.panel, el); break;
        case 'wis-som-kladblok': wisSomKladblok(parseInt(el.dataset.index, 10)); break;
        case 'set-scratch-mode': setScratchMode(parseInt(el.dataset.index, 10), el.dataset.mode, el); break;
        case 'genereer-werkblad': genereerWerkblad(); break;
        case 'nakijken': nakijkenWerkblad(); break;
        case 'naar-evaluatie': gaNaarEvaluatieScherm(); break;
        default: break;
    }
}

document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action]');
    if (el) handleAction(el);
});


document.addEventListener('change', (event) => {
    if (event.target.id === 'studentSelect') wisselLeerling(event.target.value);
});


// iPad-vriendelijke invoer. Bij klokkijken typt het kind alleen vier cijfers;
// de dubbele punt wordt automatisch na het uur geplaatst (bijv. 0830 → 08:30).
document.addEventListener('input', (event) => {
    const target = event.target;
    if (!target.matches('.som-input, .splits-input-box')) return;
    if (target.dataset.inputType === 'clock') {
        const cijfers = target.value.replace(/\D/g, '').slice(0, 4);
        if (cijfers.length <= 2) target.value = cijfers;
        else target.value = `${cijfers.slice(0, 2)}:${cijfers.slice(2)}`;
    }
});

document.addEventListener('blur', (event) => {
    const target = event.target;
    if (!target.matches('.som-input[data-input-type="clock"]')) return;
    const cijfers = target.value.replace(/\D/g, '');
    if (cijfers.length === 3) target.value = `0${cijfers[0]}:${cijfers.slice(1)}`;
    else if (cijfers.length === 4) target.value = `${cijfers.slice(0, 2)}:${cijfers.slice(2)}`;
}, true);

// Enter-toets in een antwoordveld: spring naar het volgende veld,
// of controleer het werkblad als het de laatste vraag was.
document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const target = event.target;
    if (!target.matches('.som-input, .splits-input-box')) return;
    event.preventDefault();
    const alleVelden = Array.from(document.querySelectorAll('#worksheetContainer input'));
    const idx = alleVelden.indexOf(target);
    if (idx > -1 && idx < alleVelden.length - 1) {
        alleVelden[idx + 1].focus();
    } else {
        nakijkenWerkblad();
    }
});

/* ============================================================
   OPSTARTEN
   ============================================================ */
function init() {
    bouwProfielKeuze();
    document.getElementById('xpDisplay').textContent = String(state.xp);
    updateRewardUI();
    setNiveau(state.niveau);
    updateHistoryUI();
    updateStatsUI();
    startActieveTijdTracker();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
