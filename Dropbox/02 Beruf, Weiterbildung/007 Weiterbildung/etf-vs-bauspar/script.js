'use strict';

// ============================================================
// GLOBALER ZUSTAND
// ============================================================
window.sparrechner = { foerderStatus: null };

// ============================================================
// KONSTANTEN
// ============================================================
const ABGELTUNGSSTEUER   = 0.26375;
const SPARERPAUSCHBETRAG = 1000;
const TER                = 0.002;
// Inflation wird jetzt dynamisch aus dem Slider gelesen (kein fester Wert mehr)

const ETF_RENDITE = {
  konservativ: 0.05,
  ausgewogen:  0.07,
  wachstum:    0.09
};

const WOHNBAUPRÄMIE_SATZ = 0.088;
const WOHNBAUPRÄMIE_MAX  = 700;
const ANSPARZULAGE_SATZ  = 0.09;
const ANSPARZULAGE_MAX   = 470;
const ABSCHLUSSGEBÜHR    = 0.01;

// Statische ETF-Empfehlungen je Risikoprofil
const ETF_EMPFEHLUNGEN = {
  konservativ: {
    strategie: 'Breite Streuung, wenig Schwankung',
    fonds: [
      {
        name: 'iShares Core MSCI World (IWDA)',
        isin: 'IE00B4L5Y983',
        ter:  '0,20 % p.a.',
        info: 'Über 1.400 Unternehmen aus 23 Industrieländern. Solider Kern für sicherheitsorientierte Anleger.'
      },
      {
        name: 'Xtrackers MSCI World Swap (XDWD)',
        isin: 'IE00BJ0KDQ92',
        ter:  '0,15 % p.a.',
        info: 'Günstigste MSCI-World-Option. Synthetische Replikation – etwas komplexer, aber kostengünstiger.'
      }
    ],
    tipp: 'Ergänze optional 20 % Anleihen-ETF (z.B. iShares Core € Govt Bond, IEGA) für mehr Stabilität.'
  },
  ausgewogen: {
    strategie: 'Weltportfolio in einem Fonds',
    fonds: [
      {
        name: 'Vanguard FTSE All-World (VWCE)',
        isin: 'IE00B3RBWM25',
        ter:  '0,22 % p.a.',
        info: 'Über 3.700 Unternehmen aus Industrie- und Schwellenländern in einem einzigen ETF.'
      },
      {
        name: 'iShares MSCI ACWI (IUSQ)',
        isin: 'IE00B6R52259',
        ter:  '0,20 % p.a.',
        info: 'Ähnlich breit wie VWCE, von BlackRock. Gute Alternative für Broker ohne Vanguard-Angebot.'
      }
    ],
    tipp: 'Ideal als Ein-ETF-Lösung. Kein Rebalancing nötig – einfach monatlich besparen und liegenlassen.'
  },
  wachstum: {
    strategie: '70/30 Industrie- + Schwellenländer',
    fonds: [
      {
        name: 'iShares Core MSCI World (IWDA) – 70 %',
        isin: 'IE00B4L5Y983',
        ter:  '0,20 % p.a.',
        info: '70 % des Portfolios in Industrieländer – USA, Europa, Japan.'
      },
      {
        name: 'iShares Core MSCI EM IMI (EIMI) – 30 %',
        isin: 'IE00BKM4GZ66',
        ter:  '0,18 % p.a.',
        info: '30 % in Schwellenländer (China, Indien, Brasilien etc.) für höheres Wachstumspotenzial.'
      }
    ],
    tipp: 'Höhere Renditechance, aber auch stärkere Kursschwankungen. Nur geeignet wenn du Einbrüche von 40–50 % aussitzen kannst.'
  }
};

const SPARTIPPS = [
  {
    icon: '📅',
    titel: 'Am 1. des Monats sparen',
    text: 'Überweise deinen Sparbetrag am Anfang des Monats – nicht am Ende. So arbeitet dein Geld den ganzen Monat für dich, statt einen Monat zu warten. Über 20 Jahre macht das einen spürbaren Unterschied.'
  },
  {
    icon: '⏰',
    titel: 'Früh starten schlägt hohen Betrag',
    text: 'Wer mit 25 Jahren 100 €/Monat investiert, hat mit 65 Jahren mehr als jemand, der mit 35 Jahren 200 €/Monat investiert – obwohl letzterer doppelt so viel einzahlt. Der Zinseszins braucht Zeit.'
  },
  {
    icon: '📈',
    titel: 'Sparrate jährlich erhöhen',
    text: 'Erhöhe deinen Sparbetrag jährlich um 1–2 % mit deinen Gehaltserhöhungen. 25 € mehr pro Monat wirken nach 20 Jahren wie ein extra Jahr Sparzeit.'
  },
  {
    icon: '🛡️',
    titel: 'Inflation frisst das Girokonto',
    text: 'Bei 2,5 % Inflation verliert Geld auf dem Girokonto jedes Jahr real an Wert. Nach 20 Jahren hat eine Summe von 10.000 € nur noch eine Kaufkraft von ~6.100 €. Investieren ist kein Luxus – es ist Selbstschutz.'
  },
  {
    icon: '🚫',
    titel: 'In der Krise nicht verkaufen',
    text: 'Börsencrashs fühlen sich schlimm an, sind aber normal. Der MSCI World hat nach jeder Krise (2000, 2008, 2020) neue Höchststände erreicht. Wer in der Krise verkauft, macht aus Buchverlusten echte Verluste.'
  },
  {
    icon: '🎯',
    titel: 'Beides kombinieren',
    text: 'ETF und Bausparvertrag schließen sich nicht aus. Ein Bausparvertrag auf die maximale Förderhöhe (ca. 97 €/Monat) + alles darüber in ETFs ist oft die klügste Kombination.'
  }
];

// ============================================================
// HILFSFUNKTIONEN
// ============================================================
function formatEuro(v) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0
  }).format(v);
}

function formatProzent(v, stellen = 1) {
  return new Intl.NumberFormat('de-DE', {
    style: 'percent',
    minimumFractionDigits: stellen,
    maximumFractionDigits: stellen
  }).format(v);
}

function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// ============================================================
// BERECHNUNG: ETF-SPARPLAN
// ============================================================
function calcETF(sparBetrag, jahre, risikoKey) {
  const nettoRenditePA = ETF_RENDITE[risikoKey] - TER;
  const monatsZins     = Math.pow(1 + nettoRenditePA, 1 / 12) - 1;
  const monate         = jahre * 12;

  let guthaben = 0;
  const jahresWerte           = [0];
  const jahresWerteEinzahlung = [0]; // nur was eingezahlt wurde, kein Zins

  for (let m = 1; m <= monate; m++) {
    guthaben = guthaben * (1 + monatsZins) + sparBetrag;
    if (m % 12 === 0) {
      jahresWerte.push(guthaben);
      jahresWerteEinzahlung.push(sparBetrag * m);
    }
  }

  const eingezahlt  = sparBetrag * monate;
  const bruttoGewinn = guthaben - eingezahlt;

  // Einfache Zinsen (ohne Zinseszins): jede Einzahlung × Rendite × verbleibende Zeit
  let einfacheZinsen = 0;
  for (let m = 0; m < monate; m++) {
    einfacheZinsen += sparBetrag * nettoRenditePA * (monate - m) / 12;
  }
  const zinseszinsAnteil = Math.max(0, bruttoGewinn - einfacheZinsen);

  const steuerfrei      = Math.min(bruttoGewinn, SPARERPAUSCHBETRAG * jahre);
  const steuerpflichtig = Math.max(0, bruttoGewinn - steuerfrei);
  const steuer          = steuerpflichtig * ABGELTUNGSSTEUER;

  const endwert       = guthaben - steuer;
  const nettoGewinn   = endwert - eingezahlt;
  const gesamtrendite = nettoGewinn / eingezahlt;

  return {
    endwert, eingezahlt, bruttoGewinn, nettoGewinn, steuer,
    gesamtrendite, jahresWerte, jahresWerteEinzahlung,
    einfacheZinsen, zinseszinsAnteil, nettoRenditePA
  };
}

// ============================================================
// BERECHNUNG: BAUSPARVERTRAG
// ============================================================
function calcBauspar(sparBetrag, jahre, zinsProzent, wohnpraemie, ansparzulage) {
  const zinsSatz   = zinsProzent / 100;
  const monatsZins = Math.pow(1 + zinsSatz, 1 / 12) - 1;
  const monate     = jahre * 12;

  const bausparsumme    = sparBetrag * monate;
  const abschlussgebühr = bausparsumme * ABSCHLUSSGEBÜHR;

  let guthaben = -abschlussgebühr;
  const jahresWerte = [0];

  for (let m = 1; m <= monate; m++) {
    guthaben = guthaben * (1 + monatsZins) + sparBetrag;
    if (m % 12 === 0) jahresWerte.push(Math.max(0, guthaben));
  }

  let foerderung = 0;
  const jaehrlEinzahlung = sparBetrag * 12;

  if (wohnpraemie) {
    foerderung += Math.min(jaehrlEinzahlung, WOHNBAUPRÄMIE_MAX) * WOHNBAUPRÄMIE_SATZ * jahre;
  }
  if (ansparzulage) {
    foerderung += Math.min(jaehrlEinzahlung, ANSPARZULAGE_MAX) * ANSPARZULAGE_SATZ * jahre;
  }

  jahresWerte[jahresWerte.length - 1] += foerderung;

  const endwert       = guthaben + foerderung;
  const eingezahlt    = sparBetrag * monate;
  const nettoGewinn   = endwert - eingezahlt;
  const gesamtrendite = nettoGewinn / eingezahlt;

  return { endwert, eingezahlt, nettoGewinn, gesamtrendite, foerderung, abschlussgebühr, jahresWerte };
}

// ============================================================
// REALER ENDWERT (inflationsbereinigt)
// ============================================================
// Formel: nominalerWert / (1 + inflationsRate)^jahre
// Ergebnis: Was die Summe in heutiger Kaufkraft wert ist
function calcRealerEndwert(nominalWert, inflationsRate, jahre) {
  return nominalWert / Math.pow(1 + inflationsRate, jahre);
}

// ============================================================
// BERECHNUNG: GIROKONTO (Sparkasse, ~0 % Zins)
// ============================================================
function calcGirokonto(sparBetrag, jahre, inflationsRate) {
  const monate     = jahre * 12;
  const eingezahlt = sparBetrag * monate;

  const jahresWerte = [0];
  for (let j = 1; j <= jahre; j++) {
    jahresWerte.push(sparBetrag * 12 * j);
  }

  const realerEndwert    = calcRealerEndwert(eingezahlt, inflationsRate, jahre);
  const kaufkraftverlust = eingezahlt - realerEndwert;

  return { endwert: eingezahlt, eingezahlt, realerEndwert, kaufkraftverlust, jahresWerte };
}

// ============================================================
// CHART
// ============================================================
let sparChart = null;

// Kürzeres Array auf Ziellänge mit null auffüllen (für Szenario B mit anderer Laufzeit)
function padMitNull(arr, zielLaenge) {
  const result = [...arr];
  while (result.length < zielLaenge) result.push(null);
  return result;
}

// etfB / bausparB sind optional (nur wenn Szenario B aktiv)
function renderChart(etfA, bausparA, girokonto, jahreA, etfB = null, bausparB = null, jahreB = 0) {
  const hasSzenarioB = etfB !== null;
  const maxJahre     = hasSzenarioB ? Math.max(jahreA, jahreB) : jahreA;
  const labels       = Array.from({ length: maxJahre + 1 }, (_, i) => i === 0 ? 'Start' : `Jahr ${i}`);
  const pts          = maxJahre <= 15 ? 4 : 2;

  const ctx = document.getElementById('sparChart').getContext('2d');
  if (sparChart) sparChart.destroy();

  // Daten auf maximale Länge auffüllen
  const dataEinzahlung = padMitNull(etfA.jahresWerteEinzahlung, maxJahre + 1);
  const dataEtfA       = padMitNull(etfA.jahresWerte,           maxJahre + 1);
  const dataBausparA   = padMitNull(bausparA.jahresWerte,        maxJahre + 1);
  const dataGirokonto  = padMitNull(girokonto.jahresWerte,       maxJahre + 1);

  const datasets = [
    {
      // Referenzlinie: nur Einzahlungen (kein Zins) – zeigt Zinseszins-Fläche
      label: 'Nur Einzahlungen',
      data: dataEinzahlung,
      borderColor: 'rgba(148,163,184,0.45)',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0,
      fill: false,
      borderDash: [5, 4],
      order: 10 // ganz hinten in der Legende
    },
    {
      // ETF A – füllt zur Einzahlungslinie wenn kein Szenario B
      label: hasSzenarioB ? 'ETF-Sparplan (A)' : 'ETF-Sparplan (Zinseszins)',
      data: dataEtfA,
      borderColor: '#06b6d4',
      backgroundColor: hasSzenarioB ? 'rgba(6,182,212,.08)' : 'rgba(16,185,129,.18)',
      borderWidth: 2.5,
      pointRadius: pts,
      tension: 0.4,
      fill: hasSzenarioB ? false : { target: 0, above: 'rgba(16,185,129,.18)' }
    },
    {
      label: hasSzenarioB ? 'Bauspar (A)' : 'Bausparvertrag',
      data: dataBausparA,
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245,158,11,.07)',
      borderWidth: 2.5,
      pointRadius: pts,
      tension: 0.4,
      fill: false
    },
    {
      label: 'Girokonto (0 %)',
      data: dataGirokonto,
      borderColor: '#475569',
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0,
      fill: false,
      borderDash: [3, 3],
      order: 9
    }
  ];

  // Szenario B Linien optional hinzufügen
  if (hasSzenarioB) {
    const dataEtfB     = padMitNull(etfB.jahresWerte,    maxJahre + 1);
    const dataBausparB = padMitNull(bausparB.jahresWerte, maxJahre + 1);

    datasets.splice(3, 0,
      {
        label: 'ETF-Sparplan (B)',
        data: dataEtfB,
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168,85,247,.08)',
        borderWidth: 2.5,
        pointRadius: pts,
        tension: 0.4,
        fill: false,
        borderDash: [6, 3] // gestrichelt → visuell als "B" erkennbar
      },
      {
        label: 'Bauspar (B)',
        data: dataBausparB,
        borderColor: '#f43f5e',
        backgroundColor: 'rgba(244,63,94,.07)',
        borderWidth: 2.5,
        pointRadius: pts,
        tension: 0.4,
        fill: false,
        borderDash: [6, 3]
      }
    );
  }

  sparChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#94a3b8', font: { size: 12 }, padding: 16 }
        },
        tooltip: {
          backgroundColor: '#1a2337',
          borderColor: '#2d3f5e',
          borderWidth: 1,
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
          padding: 12,
          callbacks: {
            label: ctx => ctx.raw !== null
              ? `  ${ctx.dataset.label}: ${formatEuro(ctx.raw)}`
              : null
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#94a3b8', maxTicksLimit: 11 },
          grid:  { color: 'rgba(255,255,255,.04)' }
        },
        y: {
          ticks: { color: '#94a3b8', callback: v => formatEuro(v) },
          grid:  { color: 'rgba(255,255,255,.04)' }
        }
      }
    }
  });
}

// ============================================================
// ZINSESZINS-ERKLÄRUNG
// ============================================================
function zeigeZinseszins(etf) {
  const card = document.getElementById('zinseszins-card');
  card.classList.remove('hidden');

  const gesamt    = etf.eingezahlt + etf.einfacheZinsen + etf.zinseszinsAnteil;
  const pEinzahl  = (etf.eingezahlt      / gesamt) * 100;
  const pEinfach  = (etf.einfacheZinsen  / gesamt) * 100;
  const pZinseszins = (etf.zinseszinsAnteil / gesamt) * 100;

  const erklaerung =
    `Der Zinseszinseffekt bedeutet: deine Zinsen werden wieder angelegt und ` +
    `erzielen selbst wieder Zinsen – ein sich selbst beschleunigender Schneeball. ` +
    `In diesem Beispiel hast du ${formatEuro(etf.eingezahlt)} eingezahlt und ` +
    `${formatEuro(Math.round(etf.einfacheZinsen))} wären als einfache Zinsen entstanden. ` +
    `Zusätzlich hat der Zinseszinseffekt weitere ${formatEuro(Math.round(etf.zinseszinsAnteil))} erzeugt – ` +
    `also Rendite auf deine Rendite. Das entspricht ${formatProzent(etf.zinseszinsAnteil / etf.bruttoGewinn)} ` +
    `des gesamten Gewinns.`;

  setEl('zinseszins-erklaerung', erklaerung);

  // Visualisierungsbalken
  setHTML('zinseszins-balken', `
    <div class="zb-legende">
      <span class="zb-dot zb-dot--einzahlung"></span>Eingezahlt: ${formatEuro(etf.eingezahlt)}
      <span class="zb-dot zb-dot--einfach"></span>Einfache Zinsen: ${formatEuro(Math.round(etf.einfacheZinsen))}
      <span class="zb-dot zb-dot--zinseszins"></span>Zinseszins-Bonus: ${formatEuro(Math.round(etf.zinseszinsAnteil))}
    </div>
    <div class="zb-bar">
      <div class="zb-segment zb-einzahlung" style="width:${pEinzahl.toFixed(1)}%"
        title="Eingezahlt: ${formatEuro(etf.eingezahlt)}"></div>
      <div class="zb-segment zb-zinsen"    style="width:${pEinfach.toFixed(1)}%"
        title="Einfache Zinsen: ${formatEuro(Math.round(etf.einfacheZinsen))}"></div>
      <div class="zb-segment zb-zinseszins" style="width:${pZinseszins.toFixed(1)}%"
        title="Zinseszins-Bonus: ${formatEuro(Math.round(etf.zinseszinsAnteil))}"></div>
    </div>
  `);
}

// ============================================================
// ETF-EMPFEHLUNGEN + BAUSPAR-OPTIMIERUNG
// ============================================================
// Bauspar-Optimierung als wiederverwendbare Hilfsfunktion
function bauOptimierungHTML(sparBetrag, jahre) {
  const optimalMonat   = (WOHNBAUPRÄMIE_MAX + ANSPARZULAGE_MAX) / 12;
  const wohnpOptimal   = WOHNBAUPRÄMIE_MAX / 12;
  const jaehrlEinz     = sparBetrag * 12;
  const mindestlaufzeit = 7;

  const tipps = [];
  if (sparBetrag < wohnpOptimal) {
    tipps.push(`Für volle Wohnungsbauprämie mindestens <strong>${formatEuro(wohnpOptimal)}/Monat</strong> sparen (aktuell ${formatEuro(sparBetrag)}/Monat).`);
  } else if (sparBetrag < optimalMonat) {
    tipps.push(`Wohnungsbauprämie wird voll ausgeschöpft. Für zusätzliche Arbeitnehmersparzulage auf <strong>${formatEuro(optimalMonat)}/Monat</strong> erhöhen.`);
  } else {
    tipps.push(`Förderungen sind maximal ausgeschöpft. Überschuss (${formatEuro(sparBetrag - optimalMonat)}/Monat) lohnt sich eher im ETF.`);
  }
  if (jahre < mindestlaufzeit) {
    tipps.push(`Mindestlaufzeit für Wohnungsbauprämie: <strong>${mindestlaufzeit} Jahre</strong> (aktuell ${jahre} J. – zu kurz).`);
  }

  const maxWohnpraemie  = Math.min(jaehrlEinz, WOHNBAUPRÄMIE_MAX) * WOHNBAUPRÄMIE_SATZ * jahre;
  const maxAnsparzulage = Math.min(jaehrlEinz, ANSPARZULAGE_MAX)  * ANSPARZULAGE_SATZ  * jahre;

  return `
    <div class="optim-zeile">
      <span>Optimal für max. Wohnungsbauprämie:</span>
      <strong>${formatEuro(wohnpOptimal)}/Monat</strong>
    </div>
    <div class="optim-zeile">
      <span>Optimal für max. beide Förderungen:</span>
      <strong>${formatEuro(optimalMonat)}/Monat</strong>
    </div>
    <div class="optim-zeile">
      <span>Mindestlaufzeit (Wohnungsbauprämie):</span>
      <strong>${mindestlaufzeit} Jahre</strong>
    </div>
    <div class="optim-zeile highlight">
      <span>Max. erreichbare Wohnungsbauprämie:</span>
      <strong>${formatEuro(maxWohnpraemie)}</strong>
    </div>
    <div class="optim-zeile highlight">
      <span>Max. erreichbare Arbeitnehmersparzulage:</span>
      <strong>${formatEuro(maxAnsparzulage)}</strong>
    </div>
    ${tipps.map(t => `<div class="optim-tipp">⚠️ ${t}</div>`).join('')}
  `;
}

function zeigeEmpfehlungen(risikoKey, sparBetrag, jahre, sparBetragB = null, jahreB = null) {
  const emp = ETF_EMPFEHLUNGEN[risikoKey];

  // ETF-Empfehlungen (basieren auf Szenario A Risikoprofil)
  const fondsHTML = emp.fonds.map(f => `
    <div class="produkt-item">
      <div class="produkt-name">${f.name}</div>
      <div class="produkt-meta">
        <span class="badge badge-isin">ISIN: ${f.isin}</span>
        <span class="badge badge-ter">TER: ${f.ter}</span>
      </div>
      <p class="produkt-info">${f.info}</p>
    </div>
  `).join('');

  setHTML('etf-empfehlungen-liste', `
    <p class="strategie-label">Strategie: ${emp.strategie}</p>
    ${fondsHTML}
    <div class="produkt-tipp">💡 ${emp.tipp}</div>
  `);

  // Bauspar-Optimierung Szenario A
  setHTML('bauspar-optimierung', bauOptimierungHTML(sparBetrag, jahre));

  // Bauspar-Optimierung Szenario B (nur wenn aktiv und abweichend von A)
  const wrapB = document.getElementById('bauspar-optimierung-b-wrap');
  if (szenarioBActive && sparBetragB !== null && jahreB !== null) {
    setHTML('bauspar-optimierung-b', bauOptimierungHTML(sparBetragB, jahreB));
    wrapB.classList.remove('hidden');
  } else {
    wrapB.classList.add('hidden');
  }
}

// ============================================================
// GIROKONTO-VERGLEICH
// ============================================================
function zeigeGirokonto(girokonto, etf, bauspar, jahre, inflationsRate) {
  // Sparkonto mit 0,5 % p.a. (Tagesgeld) berechnen
  const sparBetrag   = girokonto.eingezahlt / (jahre * 12);
  const monatsZins   = 0.005 / 12; // 0,5 % p.a.
  let sparkontoWert  = 0;
  for (let m = 0; m < jahre * 12; m++) {
    sparkontoWert = (sparkontoWert + sparBetrag) * (1 + monatsZins);
  }
  sparkontoWert = Math.round(sparkontoWert);

  // Balken-Höhen relativ zum ETF-Endwert (immer 100 %)
  const maxWert       = etf.endwert;
  const giroPct       = Math.round((girokonto.endwert / maxWert) * 100);
  const sparkontoPct  = Math.round((sparkontoWert      / maxWert) * 100);
  const etfPct        = 100;

  // Differenz ETF vs. Girokonto als "X-faches"
  const faktor = (etf.endwert / girokonto.endwert).toFixed(1).replace('.', ',');

  setHTML('girokonto-inhalt', `
    <p class="girokonto-intro">
      Stell dir vor, du hättest das Geld einfach auf dem Girokonto gelassen.
      Nach ${jahre} Jahren hättest du <strong>${formatEuro(girokonto.endwert)}</strong> –
      exakt das, was du eingezahlt hast. Kein Cent Gewinn, aber
      durch die Inflation (<strong>${formatProzent(inflationsRate)}/Jahr</strong>) massiv an Kaufkraft verloren.
    </p>

    <!-- 3-Balken-Chart -->
    <div class="giro-chart" aria-label="Vergleich Girokonto, Sparkonto, ETF-Sparplan">
      <div class="giro-chart-bars">

        <div class="giro-bar-col">
          <span class="giro-bar-wert">${formatEuro(girokonto.endwert)}</span>
          <div class="giro-bar giro-bar--giro" style="height: ${giroPct}%"></div>
          <div class="giro-bar-label">
            Girokonto<br>
            <span class="giro-bar-sub">0 % Zinsen</span>
          </div>
        </div>

        <div class="giro-bar-col">
          <span class="giro-bar-wert">${formatEuro(sparkontoWert)}</span>
          <div class="giro-bar giro-bar--sparkonto" style="height: ${sparkontoPct}%"></div>
          <div class="giro-bar-label">
            Tagesgeld<br>
            <span class="giro-bar-sub">0,5 % Zinsen</span>
          </div>
        </div>

        <div class="giro-bar-col giro-bar-col--highlight">
          <span class="giro-bar-wert giro-bar-wert--etf">${formatEuro(etf.endwert)}</span>
          <div class="giro-bar giro-bar--etf" style="height: ${etfPct}%"></div>
          <div class="giro-bar-label">
            ETF-Sparplan<br>
            <span class="giro-bar-sub">~${etfPct === 100 ? faktor : ''}× mehr</span>
          </div>
        </div>

      </div>
      <div class="giro-chart-baseline"></div>
    </div>

    <!-- Inflations-Erklärung -->
    <p class="giro-inflation-text">
      📉 Auf dem Girokonto verliert dein Geld durch Inflation jährlich
      <strong>${formatProzent(inflationsRate)}</strong> an Kaufkraft.
      Nach ${jahre} Jahren sind deine eingezahlten <strong>${formatEuro(girokonto.eingezahlt)}</strong>
      real nur noch <strong>${formatEuro(girokonto.realerEndwert)}</strong> wert
      – ein Kaufkraftverlust von <strong>${formatEuro(girokonto.kaufkraftverlust)}</strong>.
    </p>

    <!-- Vergleichs-Zeilen -->
    <div class="girokonto-vergleich-zeilen">
      <div class="gv-zeile">
        <span>ETF-Sparplan wäre <strong>${formatEuro(etf.endwert - girokonto.endwert)} mehr</strong> als das Girokonto</span>
        <span class="gv-badge gv-etf">+${formatProzent((etf.endwert - girokonto.endwert) / girokonto.endwert, 0)}</span>
      </div>
      <div class="gv-zeile">
        <span>Bausparvertrag wäre <strong>${formatEuro(bauspar.endwert - girokonto.endwert)} mehr</strong> als das Girokonto</span>
        <span class="gv-badge gv-bauspar">+${formatProzent((bauspar.endwert - girokonto.endwert) / girokonto.endwert, 0)}</span>
      </div>
    </div>
  `);
}

// ============================================================
// SPARTIPPS (kontextabhängig)
// ============================================================

// Gibt genau einen personalisierten Tipp zurück, basierend auf Nutzerprofil
function persönlicherTipp(risikoKey, jahre, wohnpraemie, ansparzulage) {
  // Kurze Laufzeit + hohes Risiko → Warnung
  if (risikoKey === 'wachstum' && jahre < 12) {
    return {
      icon: '⚠️',
      titel: `Dein Profil: Wachstum braucht Zeit`,
      text: `Bei ${jahre} Jahren Laufzeit und wachstumsorientiertem Risiko: ` +
            `Stelle sicher, dass du das Geld wirklich erst nach ${jahre} Jahren ` +
            `benötigst. Bei Börsencrashs kann der Depotwert vorübergehend 40–50 % ` +
            `fallen – wer dann verkaufen muss, realisiert echte Verluste.`,
      highlight: true
    };
  }

  // Förderungen aktiv → maximieren
  if (wohnpraemie || ansparzulage) {
    const aktive = [
      wohnpraemie  && 'Wohnungsbauprämie (max. 700 €/Jahr)',
      ansparzulage && 'Arbeitnehmersparzulage (max. 470 € VL/Jahr)'
    ].filter(Boolean).join(' + ');
    return {
      icon: '🎁',
      titel: 'Dein Profil: Förderungen voll ausschöpfen',
      text: `Du hast Anspruch auf: ${aktive}. ` +
            `Zahle mindestens den maximalen Förderbetrag in deinen Bausparvertrag ` +
            `ein – dieser staatliche Bonus ist risikofreie Rendite!`,
      highlight: true
    };
  }

  // Sehr lange Laufzeit → Motivation
  if (jahre >= 25) {
    return {
      icon: '⏳',
      titel: `Dein Profil: ${jahre} Jahre sind Gold wert`,
      text: `Mit ${jahre} Jahren Anlagehorizont hast du den Zinseszins-Turbo voll ` +
            `auf deiner Seite. In einer Faustformel: dein Geld verdoppelt sich bei ` +
            `7 % Rendite alle ~10 Jahre. Das bedeutet, dein ETF-Portfolio wächst ` +
            `in den letzten 10 Jahren mehr als in den ersten 20 Jahren zusammen.`,
      highlight: true
    };
  }

  // Konservatives Risiko → sanft zu mehr Mut ermutigen
  if (risikoKey === 'konservativ') {
    return {
      icon: '🌱',
      titel: 'Dein Profil: Konservativ – und das ist gut!',
      text: `Konservativ bedeutet 5 % p.a. Rendite – nicht 0 %. Das ist deutlich ` +
            `besser als Tagesgeld. Tipp: Starte konservativ und erhöhe deinen ` +
            `Risikoanteil um 10–20 % pro Jahr, wenn du dich wohler fühlst.`,
      highlight: true
    };
  }

  // Ausgewogen + mittlere Laufzeit → Standard-Tipp
  return {
    icon: '💡',
    titel: 'Dein Profil: Ausgewogener Sparplan',
    text: `Ausgewogen + ${jahre} Jahre: Du bist gut aufgestellt. Der MSCI World ` +
          `hat in jedem rollierenden 15-Jahres-Zeitraum seit 1970 eine positive ` +
          `Rendite erzielt. Kurs halten, nicht auf tägliche Nachrichten reagieren.`,
    highlight: true
  };
}

function zeigeSpartipps(risikoKey, jahre) {
  // Förderungs-Checkboxen direkt aus dem DOM lesen
  const wohnpraemie  = document.getElementById('wohnpraemie')?.checked  || false;
  const ansparzulage = document.getElementById('ansparzulage')?.checked || false;

  // Personalisierten Tipp + alle Standard-Tipps zusammenführen
  const pTipp   = persönlicherTipp(risikoKey, jahre, wohnpraemie, ansparzulage);
  const alleTipps = [pTipp, ...SPARTIPPS];

  const html = alleTipps.map((t, i) => `
    <div class="accordion-row${t.highlight ? ' accordion-row--highlight' : ''}">
      <button
        class="accordion-row-header"
        type="button"
        aria-expanded="${i === 0 ? 'true' : 'false'}"
        aria-controls="spartipp-body-${i}"
        id="spartipp-trigger-${i}"
      >
        <span class="spartipp-num${i === 0 ? ' spartipp-num--highlight' : ''}">${i === 0 ? '★' : i}</span>
        <span class="spartipp-row-icon">${t.icon}</span>
        <span class="spartipp-row-titel">${t.titel}</span>
        <span class="accordion-chevron" aria-hidden="true">›</span>
      </button>
      <div
        class="accordion-row-body"
        id="spartipp-body-${i}"
        role="region"
        aria-labelledby="spartipp-trigger-${i}"
      >
        <p class="accordion-row-text">${t.text}</p>
      </div>
    </div>
  `).join('');

  setHTML('spartipps-liste', html);
  initAccordion('#spartipps-liste', { allowMultiple: true });

  // Gamification: einmaliger Klick-Hinweis verschwindet nach erstem Öffnen
  document.getElementById('spartipps-hinweis')?.remove();
  if (!localStorage.getItem('spartipps-hinweis-gesehen')) {
    const hinweis = document.createElement('p');
    hinweis.className  = 'spartipps-hinweis';
    hinweis.id         = 'spartipps-hinweis';
    hinweis.textContent = '💡 Klicke auf einen Tipp, um mehr zu erfahren.';
    const spartippsContainer = document.getElementById('spartipps-liste');
    spartippsContainer.appendChild(hinweis);
    spartippsContainer.addEventListener('click', () => {
      const hinweisEl = document.getElementById('spartipps-hinweis');
      if (hinweisEl) {
        hinweisEl.style.opacity = '0';
        setTimeout(() => hinweisEl.remove(), 300);
        localStorage.setItem('spartipps-hinweis-gesehen', '1');
      }
    }, { once: true });
  }
}

// ============================================================
// HAUPTFUNKTION: ALLE ERGEBNISSE ANZEIGEN
// ============================================================
function zeigeErgebnisse(etf, bauspar, girokonto, sparBetrag, jahre, risikoKey, inflationsRate, etfB = null, bausparB = null, jahreB = 0) {
  // Story-Card: personalisierte Zusammenfassung ganz oben
  aktualisiereStoryCard(sparBetrag, jahre, etf, bauspar, inflationsRate);

  // Endwert-Karten
  setEl('etf-endwert', formatEuro(etf.endwert));
  setEl('etf-sub', `nach Steuern · ${formatProzent(etf.gesamtrendite)} Gesamtrendite`);
  setEl('bauspar-endwert', formatEuro(bauspar.endwert));
  setEl('bauspar-sub', `inkl. Förderungen · ${formatProzent(bauspar.gesamtrendite)} Gesamtrendite`);

  // Kennzahlen
  setEl('kz-einzahlung-etf',     formatEuro(etf.eingezahlt));
  setEl('kz-einzahlung-bauspar', formatEuro(bauspar.eingezahlt));
  setEl('kz-gewinn-etf',         formatEuro(etf.nettoGewinn));
  setEl('kz-gewinn-bauspar',     formatEuro(bauspar.nettoGewinn));
  setEl('kz-rendite-etf',        formatProzent(etf.gesamtrendite));
  setEl('kz-rendite-bauspar',    formatProzent(bauspar.gesamtrendite));
  setEl('kz-steuer-etf',         formatEuro(etf.steuer));

  // Reale Endwerte (inflationsbereinigt)
  const realETF     = calcRealerEndwert(etf.endwert,     inflationsRate, jahre);
  const realBauspar = calcRealerEndwert(bauspar.endwert, inflationsRate, jahre);
  setEl('kz-real-etf',     formatEuro(realETF));
  setEl('kz-real-bauspar', formatEuro(realBauspar));

  // Zeile + Erklärung einblenden
  document.getElementById('kz-row-real').classList.remove('hidden');
  const erklaerung = document.getElementById('inflation-erklaerung');
  erklaerung.classList.remove('hidden');
  erklaerung.textContent =
    `Bei ${formatProzent(inflationsRate)} Inflation pro Jahr sind deine ` +
    `${formatEuro(etf.endwert)} (ETF-Endwert) in ${jahre} Jahren kaufkraftbereinigt ` +
    `nur noch ${formatEuro(Math.round(realETF))} wert – also das, was du heute damit kaufen könntest.`;

  // Empfehlungsbox
  const diff = etf.endwert - bauspar.endwert;
  const box  = document.getElementById('empfehlung-box');
  box.classList.remove('winner-bauspar');

  if (diff > 0) {
    document.getElementById('empfehlung-icon').textContent = '📈';
    setEl('empfehlung-titel', 'ETF-Sparplan liegt vorne');
    setEl('empfehlung-text',
      `Der ETF-Sparplan erwirtschaftet nach ${jahre} Jahren rund ${formatEuro(diff)} mehr. ` +
      `Entscheidend ist der Zinseszinseffekt: deine Rendite erzeugt selbst wieder Rendite. ` +
      `Bedenke: ETFs schwanken – der Bausparvertrag ist kalkulierbar und risikofrei.`
    );
    zeigeZinseszins(etf);
  } else {
    box.classList.add('winner-bauspar');
    document.getElementById('empfehlung-icon').textContent = '🏠';
    setEl('empfehlung-titel', 'Bausparvertrag liegt vorne');
    setEl('empfehlung-text',
      `Der Bausparvertrag ist in diesem Szenario um ${formatEuro(Math.abs(diff))} im Vorteil – ` +
      `hauptsächlich durch staatliche Förderungen. Langfristig (> 15 Jahre) holt der ` +
      `ETF durch den Zinseszinseffekt meist auf.`
    );
    document.getElementById('zinseszins-card').classList.add('hidden');
  }

  // ── Szenario B Ergebnisse ──
  const bSection  = document.getElementById('szenario-b-results');
  const effJahreB = jahreB || jahre;

  if (etfB && bausparB) {
    setEl('etf-b-endwert',     formatEuro(etfB.endwert));
    setEl('etf-b-sub',         `nach Steuern · ${formatProzent(etfB.gesamtrendite)} · ${effJahreB} Jahre`);
    setEl('bauspar-b-endwert', formatEuro(bausparB.endwert));
    setEl('bauspar-b-sub',     `inkl. Förderungen · ${formatProzent(bausparB.gesamtrendite)} · ${effJahreB} Jahre`);
    bSection.classList.remove('hidden');

    // sparBetragB aus eingezahltem Kapital zurückrechnen
    const sparBetragB = etfB.eingezahlt / (effJahreB * 12);
    zeigeEmpfehlungen(risikoKey, sparBetrag, jahre, sparBetragB, effJahreB);
  } else {
    bSection.classList.add('hidden');
    zeigeEmpfehlungen(risikoKey, sparBetrag, jahre);
  }

  zeigeGirokonto(girokonto, etf, bauspar, jahre, inflationsRate);
  zeigeSpartipps(risikoKey, jahre);
  aktualisiereAVDPersoenlich(window.sparrechner.foerderStatus, jahre);

  // Empfehlung: AVD-Tipp kontextabhängig (ETF-Ergebnis + Förderstatus)
  document.querySelectorAll('.empfehlung-avd-tipp').forEach(el => el.remove());
  const empfehlungText = document.getElementById('empfehlung-text');
  if (empfehlungText) {
    const etfGewinnt   = diff > 0;
    const foerderStufe = window.sparrechner.foerderStatus?.stufe;
    if (etfGewinnt && foerderStufe === 'berechtigt') {
      empfehlungText.insertAdjacentHTML('afterend',
        `<p class="empfehlung-avd-tipp" style="margin-top:.6rem;font-size:.85rem;color:var(--color-success);">
          💡 <strong>Tipp:</strong> Zahle bis zu 150 €/Monat ins <strong>Altersvorsorgedepot</strong> ein (540 € Förderung/Jahr) und lege den Rest in deinen ETF-Sparplan. So kombinierst du staatliche Förderung mit maximaler Rendite.
        </p>`
      );
    } else if (etfGewinnt && (foerderStufe === 'nicht-berechtigt' || !foerderStufe)) {
      empfehlungText.insertAdjacentHTML('afterend',
        `<p class="empfehlung-avd-tipp" style="margin-top:.6rem;font-size:.85rem;color:var(--clr-text-muted);">
          Der ETF-Sparplan ist für deine Situation aktuell die optimale Wahl.
        </p>`
      );
    }
  }

  // Ergebnisbereich einblenden
  const results = document.getElementById('results');
  results.classList.remove('hidden');
  setTimeout(() => results.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

// ============================================================
// SZENARIO B – Toggle + Slider initialisieren
// ============================================================
let szenarioBActive      = false;
let szenarioBSlidersDone = false;

function initSzenarionB() {
  const toggleBtn = document.getElementById('szenario-b-toggle');
  const removeBtn = document.getElementById('szenario-b-remove');
  const section   = document.getElementById('szenario-b-section');

  // B-Formular einblenden und mit A-Werten vorbefüllen
  toggleBtn.addEventListener('click', () => {
    szenarioBActive = true;
    section.classList.remove('hidden');
    section.setAttribute('aria-hidden', 'false');
    toggleBtn.classList.add('hidden');

    // Slider nur einmalig initialisieren
    if (!szenarioBSlidersDone) {
      initSlider('sparbetrag-b',   'sparbetrag-b-val',   v => `${Math.round(v).toLocaleString('de-DE')} €`);
      initSlider('spardauer-b',    'spardauer-b-val',    v => `${v} Jahre`);
      initSlider('guthabenzins-b', 'guthabenzins-b-val', v => `${v.toFixed(1).replace('.', ',')} %`);
      szenarioBSlidersDone = true;
    }

    // A-Werte in B übernehmen (Nutzer ändert nur was sich unterscheiden soll)
    function syncSlider(idA, idB, outputId, formatFn) {
      const valA = document.getElementById(idA).value;
      const sliderB = document.getElementById(idB);
      sliderB.value = valA;
      document.getElementById(outputId).value = formatFn(parseFloat(valA));
    }
    syncSlider('sparbetrag',   'sparbetrag-b',   'sparbetrag-b-val',   v => `${Math.round(v).toLocaleString('de-DE')} €`);
    syncSlider('spardauer',    'spardauer-b',    'spardauer-b-val',    v => `${v} Jahre`);
    syncSlider('guthabenzins', 'guthabenzins-b', 'guthabenzins-b-val', v => `${v.toFixed(1).replace('.', ',')} %`);

    // Risikobereitschaft übernehmen
    const risikoA = document.querySelector('input[name="risiko"]:checked').value;
    const radioBMatch = document.querySelector(`input[name="risiko-b"][value="${risikoA}"]`);
    if (radioBMatch) radioBMatch.checked = true;

    // Förderungen übernehmen
    document.getElementById('wohnpraemie-b').checked  = document.getElementById('wohnpraemie').checked;
    document.getElementById('ansparzulage-b').checked = document.getElementById('ansparzulage').checked;

    // Hinweis anzeigen was vorbelegt wurde
    section.querySelector('.szenario-b-hint').textContent =
      'Werte aus Szenario A übernommen – ändere nur was du vergleichen möchtest, dann klicke „Jetzt vergleichen".';
  });

  // B-Formular entfernen + Chart ohne B neu rendern
  removeBtn.addEventListener('click', () => {
    szenarioBActive = false;
    section.classList.add('hidden');
    section.setAttribute('aria-hidden', 'true');
    toggleBtn.classList.remove('hidden');
    document.getElementById('szenario-b-results').classList.add('hidden');

    // Wenn Ergebnisse sichtbar: sofort neu berechnen ohne B
    if (!document.getElementById('results').classList.contains('hidden')) {
      document.getElementById('sparform').dispatchEvent(new Event('submit'));
    }
  });
}

// ============================================================
// LINK TEILEN (URL-Parameter)
// ============================================================
function teileLink() {
  const params = new URLSearchParams();

  // Alle Formularwerte als Parameter kodieren
  params.set('alter',        document.getElementById('alter').value);
  params.set('sparbetrag',   document.getElementById('sparbetrag').value);
  params.set('spardauer',    document.getElementById('spardauer').value);
  params.set('inflation',    document.getElementById('inflation').value);
  params.set('risiko',       document.querySelector('input[name="risiko"]:checked').value);
  params.set('einkommen',    document.getElementById('einkommen').value);
  params.set('familienstand', document.getElementById('familienstand').value);
  params.set('guthabenzins', document.getElementById('guthabenzins').value);
  params.set('wohnpraemie',  document.getElementById('wohnpraemie').checked  ? '1' : '0');
  params.set('ansparzulage', document.getElementById('ansparzulage').checked ? '1' : '0');

  // Szenario B-Parameter nur wenn aktiv
  if (szenarioBActive) {
    params.set('sb',           '1');
    params.set('sparbetrag-b',  document.getElementById('sparbetrag-b').value);
    params.set('spardauer-b',   document.getElementById('spardauer-b').value);
    params.set('risiko-b',      document.querySelector('input[name="risiko-b"]:checked').value);
    params.set('guthabenzins-b', document.getElementById('guthabenzins-b').value);
    params.set('wohnpraemie-b', document.getElementById('wohnpraemie-b').checked  ? '1' : '0');
    params.set('ansparzulage-b', document.getElementById('ansparzulage-b').checked ? '1' : '0');
  }

  const url = `${location.origin}${location.pathname}?${params.toString()}`;

  // In Zwischenablage kopieren
  // navigator.clipboard erfordert HTTPS oder localhost.
  // Bei file://-Protokoll (direktes Öffnen der HTML-Datei) fällt es auf prompt() zurück.
  if (navigator.clipboard && location.protocol !== 'file:') {
    navigator.clipboard.writeText(url).then(zeigeCopyBestaetigung);
  } else {
    // Fallback: Browser-Dialog zeigt den Link zum manuellen Kopieren
    prompt('Link kopieren (Strg+C / Cmd+C):', url);
    zeigeCopyBestaetigung();
  }
}

function zeigeCopyBestaetigung() {
  const el = document.getElementById('copy-bestaetigung');
  el.classList.remove('hidden');
  // Nach Animation wieder ausblenden
  setTimeout(() => el.classList.add('hidden'), 2600);
}

// ============================================================
// URL-PARAMETER BEIM LADEN EINLESEN
// ============================================================
function ladeAusURL() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('sparbetrag')) return; // Keine Parameter → nichts tun

  // Hilfsfunktion: Slider setzen + Output aktualisieren
  function setSlider(id, val) {
    if (!val) return;
    const el = document.getElementById(id);
    if (el) { el.value = val; el.dispatchEvent(new Event('input')); }
  }

  // Slider-Werte setzen
  setSlider('alter',       params.get('alter'));
  setSlider('sparbetrag',  params.get('sparbetrag'));
  setSlider('spardauer',   params.get('spardauer'));
  setSlider('inflation',   params.get('inflation'));
  setSlider('guthabenzins', params.get('guthabenzins'));

  // Risikobereitschaft
  const risiko = params.get('risiko');
  if (risiko) {
    const r = document.querySelector(`input[name="risiko"][value="${risiko}"]`);
    if (r) r.checked = true;
  }

  // Einkommen + Familienstand
  const einkommen = params.get('einkommen');
  if (einkommen) document.getElementById('einkommen').value = einkommen;

  const status = params.get('familienstand');
  if (status) {
    document.getElementById('familienstand').value = status;
    document.getElementById('toggle-single').classList.toggle('active', status === 'single');
    document.getElementById('toggle-paar').classList.toggle('active',   status === 'paar');
  }

  // Checkboxen
  document.getElementById('wohnpraemie').checked  = params.get('wohnpraemie')  === '1';
  document.getElementById('ansparzulage').checked = params.get('ansparzulage') === '1';

  // Szenario B wiederherstellen
  if (params.get('sb') === '1') {
    document.getElementById('szenario-b-toggle').click(); // öffnet + init Slider
    setTimeout(() => {
      setSlider('sparbetrag-b',   params.get('sparbetrag-b'));
      setSlider('spardauer-b',    params.get('spardauer-b'));
      setSlider('guthabenzins-b', params.get('guthabenzins-b'));

      const risikoB = params.get('risiko-b');
      if (risikoB) {
        const rB = document.querySelector(`input[name="risiko-b"][value="${risikoB}"]`);
        if (rB) rB.checked = true;
      }
      document.getElementById('wohnpraemie-b').checked  = params.get('wohnpraemie-b')  === '1';
      document.getElementById('ansparzulage-b').checked = params.get('ansparzulage-b') === '1';
    }, 50); // kurzes Delay bis Slider-Init abgeschlossen
  }

  // Automatisch berechnen
  setTimeout(() => {
    document.getElementById('sparform').dispatchEvent(new Event('submit'));
  }, 150);
}

// ============================================================
// PDF EXPORT
// ============================================================
function exportPDF() {
  window.print();
}

// ============================================================
// DARK MODE TOGGLE
// ============================================================
function initDarkMode() {
  const html       = document.documentElement;
  const btn        = document.getElementById('theme-toggle');
  const iconEl     = document.getElementById('theme-toggle-icon');

  // Gespeichertes Theme aus localStorage laden (Standard: dark)
  const gespeichert = localStorage.getItem('theme') || 'dark';
  applyTheme(gespeichert);

  btn.addEventListener('click', () => {
    const aktuell = html.getAttribute('data-theme') || 'dark';
    applyTheme(aktuell === 'dark' ? 'light' : 'dark');
  });

  function applyTheme(theme) {
    // Transition-Klasse kurz aktivieren
    html.classList.add('theme-transitioning');
    html.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Icon: Sonne im Dunkelmodus (zum Wechseln zu Hell), Mond im Hellmodus
    iconEl.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.setAttribute('aria-label',
      theme === 'dark' ? 'Zum hellen Modus wechseln' : 'Zum dunklen Modus wechseln'
    );

    // Transition nach Ablauf wieder entfernen
    setTimeout(() => html.classList.remove('theme-transitioning'), 320);
  }
}

// ============================================================
// EINKOMMEN & FÖRDERPRÜFUNG
// ============================================================

// Einkommensgrenzen je Familienstand
const GRENZEN = {
  single: { wohnpraemie: 35_000, ansparzulage: 40_000 },
  paar:   { wohnpraemie: 70_000, ansparzulage: 80_000 }
};

function pruefeFoerderungen() {
  const einkommen     = parseFloat(document.getElementById('einkommen').value) || 0;
  const status        = document.getElementById('familienstand').value;
  const grenzen       = GRENZEN[status];

  const cbWohn  = document.getElementById('wohnpraemie');
  const cbAns   = document.getElementById('ansparzulage');
  const badgeW  = document.getElementById('badge-wohnpraemie');
  const badgeA  = document.getElementById('badge-ansparzulage');

  // ── Wohnungsbauprämie ──
  const wohnBerechtigt = einkommen <= grenzen.wohnpraemie;
  cbWohn.checked = wohnBerechtigt;
  badgeW.classList.remove('hidden', 'berechtigt', 'nicht-berechtigt');
  if (wohnBerechtigt) {
    badgeW.classList.add('berechtigt');
    badgeW.textContent = `✓ Du hast Anspruch auf Wohnungsbauprämie (Grenze: ${formatEuro(grenzen.wohnpraemie)}/Jahr)`;
  } else {
    badgeW.classList.add('nicht-berechtigt');
    badgeW.textContent = `✗ Kein Anspruch – Einkommen über ${formatEuro(grenzen.wohnpraemie)}/Jahr`;
  }

  // ── Arbeitnehmersparzulage ──
  const ansBerechtigt = einkommen <= grenzen.ansparzulage;
  cbAns.checked = ansBerechtigt;
  badgeA.classList.remove('hidden', 'berechtigt', 'nicht-berechtigt');
  if (ansBerechtigt) {
    badgeA.classList.add('berechtigt');
    badgeA.textContent = `✓ Du hast Anspruch auf Arbeitnehmersparzulage (Grenze: ${formatEuro(grenzen.ansparzulage)}/Jahr)`;
  } else {
    badgeA.classList.add('nicht-berechtigt');
    badgeA.textContent = `✗ Kein Anspruch – Einkommen über ${formatEuro(grenzen.ansparzulage)}/Jahr`;
  }
}

function initFamilienstandToggle() {
  const btnSingle = document.getElementById('toggle-single');
  const btnPaar   = document.getElementById('toggle-paar');
  const hidden    = document.getElementById('familienstand');

  [btnSingle, btnPaar].forEach(btn => {
    btn.addEventListener('click', () => {
      // Aktiven Zustand setzen
      btnSingle.classList.toggle('active', btn === btnSingle);
      btnPaar.classList.toggle('active',   btn === btnPaar);
      hidden.value = btn.dataset.status;
      pruefeFoerderungen(); // Förderung sofort neu berechnen
    });
  });
}

// ============================================================
// SLIDER: Live-Beschriftung
// ============================================================
function initSlider(sliderId, outputId, formatFn) {
  const slider = document.getElementById(sliderId);
  const output = document.getElementById(outputId);
  const sync   = () => { output.value = formatFn(parseFloat(slider.value)); };
  slider.addEventListener('input', sync);
  sync();
}

// ============================================================
// FLOATING TOOLTIPS (Maus + Touch)
// ============================================================
function initTooltips() {
  const box = document.getElementById('tooltip-box');

  // Alle aktiven Tooltips schließen
  function schliesseAlleTooltips() {
    box.classList.remove('visible');
    document.querySelectorAll('.tooltip-icon.active').forEach(el => el.classList.remove('active'));
  }

  document.querySelectorAll('.tooltip-icon').forEach(icon => {
    const text = icon.dataset.tooltip;
    if (!text) return;

    // ── Maus: Hover ──
    icon.addEventListener('mouseenter', e => {
      box.textContent = text;
      box.classList.add('visible');
      icon.classList.add('active');
      positionTooltip(e.clientX, e.clientY, box);
    });
    icon.addEventListener('mousemove',  e => positionTooltip(e.clientX, e.clientY, box));
    icon.addEventListener('mouseleave', () => {
      box.classList.remove('visible');
      icon.classList.remove('active');
    });

    // ── Maus: Klick zum An-/Ausschalten ──
    icon.addEventListener('click', e => {
      e.stopPropagation();
      const isVisible = box.classList.contains('visible') && icon.classList.contains('active');
      schliesseAlleTooltips();
      if (!isVisible) {
        box.textContent = text;
        box.classList.add('visible');
        icon.classList.add('active');
        positionTooltip(e.clientX, e.clientY, box);
      }
    });

    // ── Touch: Antippen öffnet/schließt Tooltip ──
    // passive: false erlaubt preventDefault(), das den synthetischen
    // click-Event nach touchstart unterdrückt (verhindert Doppel-Trigger)
    icon.addEventListener('touchstart', e => {
      e.preventDefault();
      const isVisible = box.classList.contains('visible') && icon.classList.contains('active');
      schliesseAlleTooltips();
      if (!isVisible) {
        box.textContent = text;
        box.classList.add('visible');
        icon.classList.add('active');
        const touch = e.touches[0];
        positionTooltip(touch.clientX, touch.clientY, box);
      }
    }, { passive: false });
  });

  // Klick oder Touch außerhalb schließt alle Tooltips
  document.addEventListener('click', schliesseAlleTooltips);
  document.addEventListener('touchstart', e => {
    if (!e.target.closest('.tooltip-icon')) schliesseAlleTooltips();
  }, { passive: true });
}

// Koordinaten als Parameter statt Event-Objekt – funktioniert für
// Maus (clientX/Y) und Touch (touches[0].clientX/Y) gleichermaßen
function positionTooltip(clientX, clientY, box) {
  const gap = 12;
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  const bw  = box.offsetWidth  || 260;
  const bh  = box.offsetHeight || 80;

  let x = clientX + gap;
  let y = clientY + gap;

  // Rechter Rand: Tooltip nach links kippen
  if (x + bw > vw - gap) x = clientX - bw - gap;
  // Unterer Rand: Tooltip nach oben kippen
  if (y + bh > vh - gap) y = clientY - bh - gap;
  // Linken und oberen Rand absichern (z. B. wenn Icon ganz oben/links)
  x = Math.max(gap, x);
  y = Math.max(gap, y);

  box.style.left = `${x}px`;
  box.style.top  = `${y}px`;
}

// ============================================================
// +/− SLIDER-BUTTONS
// ============================================================
function initSliderButtons() {
  // Alle Range-Slider in beiden Formular-Cards (A + B) erfassen
  document.querySelectorAll('.form-section input[type="range"]').forEach(slider => {
    const row = slider.closest('.input-row');
    if (!row || row.dataset.btnsDone) return; // nicht doppelt initialisieren
    row.dataset.btnsDone = '1';

    const step = parseFloat(slider.step) || 1;
    const min  = parseFloat(slider.min);
    const max  = parseFloat(slider.max);

    // Minus-Button (links vom Slider)
    const btnMinus = document.createElement('button');
    btnMinus.type = 'button';
    btnMinus.className = 'slider-btn slider-btn--minus';
    btnMinus.textContent = '−';
    btnMinus.setAttribute('aria-label', 'Verringern');

    // Plus-Button (rechts vom Slider, vor dem Output-Label)
    const btnPlus = document.createElement('button');
    btnPlus.type = 'button';
    btnPlus.className = 'slider-btn slider-btn--plus';
    btnPlus.textContent = '+';
    btnPlus.setAttribute('aria-label', 'Erhöhen');

    // Im DOM platzieren: [−] [slider] [+] [output]
    row.insertBefore(btnMinus, slider);
    slider.after(btnPlus);

    // Disabled-Zustand aktualisieren
    function aktualisiereButtons() {
      const val = parseFloat(slider.value);
      btnMinus.disabled = val <= min;
      btnPlus.disabled  = val >= max;
    }

    btnMinus.addEventListener('click', () => {
      slider.value = Math.max(min, parseFloat(slider.value) - step);
      slider.dispatchEvent(new Event('input'));
      aktualisiereButtons();
    });

    btnPlus.addEventListener('click', () => {
      slider.value = Math.min(max, parseFloat(slider.value) + step);
      slider.dispatchEvent(new Event('input'));
      aktualisiereButtons();
    });

    // Auch beim manuellen Schieben Buttons aktualisieren
    slider.addEventListener('input', aktualisiereButtons);
    aktualisiereButtons(); // initialer Zustand
  });
}

// ============================================================
// STORY-CARD: Personalisierte Ergebnis-Zusammenfassung
// ============================================================
function aktualisiereStoryCard(sparBetrag, jahre, etf, bauspar, inflationsRate) {
  const alter    = parseInt(document.getElementById('alter').value, 10);
  const card     = document.getElementById('story-card');
  const emojiEl  = document.getElementById('story-emoji');
  const hauptEl  = document.getElementById('story-hauptsatz');
  const verglEl  = document.getElementById('story-vergleich');
  const inflEl   = document.getElementById('story-inflation');

  const etfWert     = etf.endwert;
  const bausparWert = bauspar.endwert;
  const differenz   = Math.abs(etfWert - bausparWert);
  const maxWert     = Math.max(etfWert, bausparWert);

  // Knapp = Unterschied unter 5 % des größeren Werts
  const knapp      = differenz / maxWert < 0.05;
  const etfGewinnt = etfWert >= bausparWert;

  // Emoji + Card-Modifier-Klasse
  card.classList.remove('story-etf-wins', 'story-bauspar-wins', 'story-knapp');
  if (knapp) {
    emojiEl.textContent = '⚖️';
    card.classList.add('story-knapp');
  } else if (etfGewinnt) {
    emojiEl.textContent = '🏆';
    card.classList.add('story-etf-wins');
  } else {
    emojiEl.textContent = '🏠';
    card.classList.add('story-bauspar-wins');
  }

  const siegerName    = etfGewinnt ? 'ETF-Sparplan' : 'Bausparvertrag';
  const verliererName = etfGewinnt ? 'Bausparvertrag' : 'ETF-Sparplan';
  const siegerWert    = etfGewinnt ? etfWert : bausparWert;

  // ── Hauptsatz ──
  const betragStr = Math.round(sparBetrag).toLocaleString('de-DE');
  if (knapp) {
    hauptEl.innerHTML =
      `Mit <strong>${alter} Jahren</strong> und <strong>${betragStr}&nbsp;€/Monat</strong> ` +
      `sind beide Sparwege nach ${jahre} Jahren nahezu gleichwertig – ` +
      `ETF <strong>${formatEuro(etfWert)}</strong> vs. Bauspar <strong>${formatEuro(bausparWert)}</strong>.`;
  } else {
    hauptEl.innerHTML =
      `Mit <strong>${alter} Jahren</strong> und <strong>${betragStr}&nbsp;€/Monat</strong> ` +
      `kannst du in <strong>${jahre} Jahren</strong> mit dem ${siegerName} ` +
      `ca. <strong>${formatEuro(siegerWert)}</strong> aufbauen.`;
  }

  // ── Vergleichssatz ──
  const JAHRESGEHALT = 20_000;
  if (knapp) {
    verglEl.textContent =
      'Bei so ähnlichen Ergebnissen lohnt es sich, Förderungen und persönliche Präferenzen zu berücksichtigen.';
  } else {
    const gehaelter = (differenz / JAHRESGEHALT).toFixed(1).replace('.', ',');
    verglEl.innerHTML =
      `Das sind ca. <strong>${formatEuro(differenz)} mehr</strong> als beim ${verliererName} – ` +
      `oder umgerechnet fast <strong>${gehaelter}&nbsp;Jahresgehälter</strong> ` +
      `bei einem Durchschnittsnettolohn von ${formatEuro(JAHRESGEHALT)}.`;
  }

  // ── Inflationssatz (nur wenn > 1 %) ──
  if (inflationsRate > 0.01) {
    const realerWert = calcRealerEndwert(siegerWert, inflationsRate, jahre);
    inflEl.textContent =
      `Inflationsbereinigt entspricht das einer heutigen Kaufkraft von ca. ${formatEuro(realerWert)}.`;
    inflEl.classList.remove('hidden');
  } else {
    inflEl.classList.add('hidden');
  }
}

// ============================================================
// FORMULAR-VOLLSTÄNDIGKEITSANZEIGE
// ============================================================
function initFormVollstaendigkeit() {
  const bar       = document.getElementById('form-vollstaendigkeit');
  const textEl    = document.getElementById('fv-text');
  const einkommen = document.getElementById('einkommen');
  if (!bar || !einkommen) return;

  function aktualisieren() {
    const wert = parseFloat(einkommen.value) || 0;
    if (wert > 0) {
      bar.className = 'form-vollstaendigkeit vollstaendig';
      textEl.textContent = 'Deine Angaben: vollständig ✓';
    } else {
      bar.className = 'form-vollstaendigkeit empfohlen';
      textEl.textContent = 'Tipp: Gib dein Einkommen ein für automatische Förderprüfung';
    }
  }

  einkommen.addEventListener('input', aktualisieren);
  aktualisieren(); // initialer Zustand (Standardwert 30.000 € → grün)
}

// ============================================================
// EINSTEIGER-QUIZ
// ============================================================
function initQuiz() {
  const quizCard    = document.getElementById('quiz-card');
  const formSection = document.querySelector('.form-section');

  // Quiz überspringen wenn URL-Parameter vorhanden (Teilen-Link)
  // oder Nutzer das Quiz schon einmal abgeschlossen hat
  if (window.location.search || localStorage.getItem('quiz-done')) {
    quizCard.classList.add('hidden');
    formSection.classList.remove('hidden'); // Form einblenden (hat hidden im HTML)
    return;
  }

  // Formular initial ausblenden – Quiz tritt an seine Stelle
  formSection.classList.add('hidden');

  const schritte   = quizCard.querySelectorAll('.quiz-step');
  const punkte     = quizCard.querySelectorAll('.quiz-dot');
  const antworten  = {};      // { alter, sparbetrag, spardauer, risiko, status }
  let aktuellerSchritt = 0;
  let animiert         = false; // verhindert Doppelklicks während Animation

  // ── Kachel-Klick: Antwort merken + automatisch weiterschalten ──
  schritte.forEach((schritt, schrittNr) => {
    schritt.querySelectorAll('.quiz-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        if (animiert || schrittNr !== aktuellerSchritt) return;

        // Selektion visuell markieren
        schritt.querySelectorAll('.quiz-tile').forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');

        // Antwort speichern (data-key = 'alter' | 'sparbetrag' | 'spardauer' | 'risiko')
        antworten[tile.dataset.key] = tile.dataset.value;

        // Kurzes Delay damit Nutzer die Auswahl sieht, dann weiter
        setTimeout(() => {
          if (schrittNr < 4) {
            schrittZeigen(schrittNr + 1);
          } else {
            schrittZeigen(5); // Abschluss-Screen
          }
        }, 280);
      });
    });
  });

  // ── "Rechner starten"-Button auf dem Abschluss-Screen ──
  document.getElementById('quiz-start-btn').addEventListener('click', quizAbschliessen);

  // ── Skip-Link: Quiz sofort überspringen, Formular zeigen ──
  document.getElementById('quiz-skip').addEventListener('click', e => {
    e.preventDefault();
    quizCard.classList.add('hidden');
    formSection.classList.remove('hidden');
    localStorage.setItem('quiz-done', '1');
  });

  // ── Spartyp-Definitionen (Gamification) ──
  const SPARTYPEN = {
    konservativ: {
      emoji: '🛡️',
      name:  'Der Sicherheitsorientierte',
      text:  'Du legst Wert auf Stabilität und planbare Ergebnisse. ' +
             'Der Bausparvertrag könnte für dich interessant sein – ' +
             'aber auch ein konservativer ETF-Sparplan schlägt ihn langfristig deutlich.'
    },
    ausgewogen: {
      emoji: '⚖️',
      name:  'Der Ausgewogene',
      text:  'Du findest die Balance zwischen Sicherheit und Rendite. ' +
             'Ein ETF-Sparplan mit globalem Index-ETF passt gut zu deinem Profil – ' +
             'solide Rendite bei überschaubarem Risiko.'
    },
    wachstum: {
      emoji: '🚀',
      name:  'Der Wachstumsorientierte',
      text:  'Du denkst langfristig und kannst mit Schwankungen leben. ' +
             'Der ETF-Sparplan ist klar deine beste Wahl – ' +
             'der Zinseszins arbeitet jahrzehntelang für dich.'
    }
  };

  // ── Abschluss-Screen mit persönlichem Spartyp befüllen ──
  function zeigeSpartyp(risiko) {
    const typ   = SPARTYPEN[risiko] || SPARTYPEN['ausgewogen'];
    const badge = document.getElementById('quiz-spartyp-badge');
    const emoji = document.getElementById('quiz-finish-emoji');
    const titel = document.getElementById('quiz-finish-titel');
    const text  = document.getElementById('quiz-finish-text');
    if (badge) badge.textContent = typ.name;
    if (emoji) emoji.textContent = typ.emoji;
    if (titel) titel.textContent = 'Dein Spartyp: ' + typ.name;
    if (text)  text.textContent  = typ.text;
  }

  // ── Schritt wechseln mit Slide-Animation ──
  function schrittZeigen(ziel) {
    animiert = true;
    const aktuellEl = schritte[aktuellerSchritt];

    // Ausblend-Animation starten
    aktuellEl.classList.add('quiz-slide-out');

    setTimeout(() => {
      aktuellEl.classList.remove('active', 'quiz-slide-out');
      aktuellerSchritt = ziel;
      schritte[aktuellerSchritt].classList.add('active');
      animiert = false;

      // Spartyp personalisieren sobald Abschluss-Screen erscheint
      if (ziel === 5) zeigeSpartyp(antworten.risiko);

      // Fortschritts-Punkte aktualisieren
      if (ziel < 5) {
        punkte.forEach((p, i) => {
          p.classList.toggle('active', i === ziel);
          p.classList.toggle('done',   i < ziel);
        });
      } else {
        // Alle Punkte als erledigt markieren beim Abschluss-Screen
        punkte.forEach(p => { p.classList.remove('active'); p.classList.add('done'); });
      }
    }, 350); // muss mit quizSlideOut-Dauer übereinstimmen
  }

  // ── Quiz abschließen: Werte ins Formular übertragen + Übergang ──
  function quizAbschliessen() {
    // Slider-Werte aus den Quiz-Antworten setzen
    ['alter', 'sparbetrag', 'spardauer'].forEach(key => {
      if (!antworten[key]) return;
      const slider = document.getElementById(key);
      if (slider) {
        slider.value = antworten[key];
        slider.dispatchEvent(new Event('input')); // Output-Label aktualisieren
      }
    });

    // Risikobereitschaft setzen
    if (antworten.risiko) {
      const radio = document.querySelector(`input[name="risiko"][value="${antworten.risiko}"]`);
      if (radio) radio.checked = true;
    }

    // Beschäftigungsstatus setzen
    if (antworten.status) {
      const radio = document.querySelector(`input[name="beschaeftigung"][value="${antworten.status}"]`);
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
      }
    }

    // Förderungen sofort neu prüfen (Standardeinkommen könnte passen)
    pruefeFoerderungen();

    // Quiz ausblenden + Formular mit Animation einblenden
    quizCard.classList.add('quiz-fade-out');
    setTimeout(() => {
      quizCard.classList.add('hidden');
      formSection.classList.remove('hidden');
      // fadeSlideUp ist die bestehende Ergebnis-Animation – passt hier auch
      formSection.style.animation = 'fadeSlideUp .5s ease both';
      setTimeout(() => { formSection.style.animation = ''; }, 500);
    }, 400); // muss mit quizFadeOut-Dauer übereinstimmen

    localStorage.setItem('quiz-done', '1');
  }
}

// ============================================================
// BESCHÄFTIGUNGSSTATUS & FÖRDERPRÜFUNG
// ============================================================

/**
 * Prüft Förderberechtigung (ANSparZulage + Wohnungsbauprämie) anhand des
 * Beschäftigungsstatus. Gibt ein Ergebnis-Objekt zurück.
 *
 * @param {string}  status         – Wert aus input[name="beschaeftigung"]
 * @param {boolean} minijobBefreit – true = pauschale Steuer vom AG übernommen
 * @returns {{ stufe: 'berechtigt'|'einschraenkung'|'nicht-berechtigt',
 *             badge: string, hinweis: string, details: string }}
 */
function pruefeFoerderberechtigung(status, minijobBefreit) {
  const alter = parseInt(document.getElementById('alter')?.value ?? '30', 10);

  switch (status) {
    case 'angestellt':
      return {
        stufe:   'berechtigt',
        badge:   '✓ Voll förderberechtigt',
        hinweis: 'Du bist sozialversicherungspflichtig beschäftigt und profitierst von allen staatlichen Förderungen.',
        details: 'Arbeitnehmer-Sparzulage: 9 % auf bis zu 470 €/Jahr (max. 42,30 €/Jahr). Wohnungsbauprämie: 8,8 % auf bis zu 700 €/Jahr (max. 61,60 €/Jahr). Beide Förderungen setzen Einkommensgrenzen voraus – diese werden über dein eingegebenes Jahreseinkommen geprüft.'
      };

    case 'ausbildung': {
      const azubiBonus = alter < 25
        ? ' Als Azubi unter 25 Jahren gilt ein erhöhter Einkommensfreibetrag – die Einkommensgrenzen werden großzügiger ausgelegt.'
        : '';
      return {
        stufe:   'berechtigt',
        badge:   '✓ Förderberechtigt (Azubi)',
        hinweis: 'Auszubildende sind rentenversicherungspflichtig und haben Anspruch auf alle Förderungen.' + azubiBonus,
        details: 'Arbeitnehmer-Sparzulage: 9 % auf bis zu 470 €/Jahr. Wohnungsbauprämie: 8,8 % auf bis zu 700 €/Jahr. Tipp: Viele Ausbildungsbetriebe bieten vermögenswirksame Leistungen (VL) an – unbedingt anfragen!'
      };
    }

    case 'student':
      return {
        stufe:   'einschraenkung',
        badge:   '⚠ Eingeschränkt förderberechtigt',
        hinweis: 'Als Student/-in ohne sozialversicherungspflichtigen Job ist die Arbeitnehmer-Sparzulage nicht zugänglich. Die Wohnungsbauprämie ist nutzbar.',
        details: 'Wohnungsbauprämie: 8,8 % auf bis zu 700 €/Jahr – auch ohne Arbeitsverhältnis möglich. Arbeitnehmer-Sparzulage: nur bei sv-pflichtiger Beschäftigung (z. B. Werkstudentenjob > 20 h/Woche über Midijob-Grenze). Empfehlung: ETF-Sparplan früh starten – der Zinseszinseffekt ist der stärkste Hebel.'
      };

    case 'minijob': {
      if (minijobBefreit) {
        return {
          stufe:   'einschraenkung',
          badge:   '⚠ Bedingt förderberechtigt',
          hinweis: 'Da dein Arbeitgeber die pauschale Lohnsteuer übernimmt, bist du aus der Rentenversicherungspflicht befreit. Die Arbeitnehmer-Sparzulage ist damit nicht zugänglich.',
          details: 'Wohnungsbauprämie: weiterhin nutzbar. Arbeitnehmer-Sparzulage: entfällt bei Befreiung von der Rentenversicherungspflicht. Tipp: Optiere in die Rentenversicherung, um alle Förderungen zu nutzen.'
        };
      }
      return {
        stufe:   'berechtigt',
        badge:   '✓ Förderberechtigt (Minijob)',
        hinweis: 'Da du rentenversicherungspflichtig bist, hast du Anspruch auf alle Förderungen.',
        details: 'Arbeitnehmer-Sparzulage: 9 % auf bis zu 470 €/Jahr. Wohnungsbauprämie: 8,8 % auf bis zu 700 €/Jahr. Einkommensgrenzen sind bei Minijobbern meist kein Problem, da das Einkommen gering ist.'
      };
    }

    case 'selbststaendig':
      return {
        stufe:   'berechtigt',
        badge:   '✅ Neu förderberechtigt ab 2027',
        hinweis: 'Selbstständige und Freiberufler sind ab 2027 erstmals förderberechtigt – das ist neu!',
        details: 'Voraussetzung: Einkünfte nach §15 oder §18 EStG und abgegebene Steuererklärung. Die Förderung muss aktiv beim Bundeszentralamt für Steuern beantragt werden (kein automatisches Arbeitgeber-Meldeverfahren). Im Zweifel Steuerberater fragen.'
      };

    case 'sonstiges':
      return {
        stufe:   'einschraenkung',
        badge:   'ℹ️ Bitte Details prüfen',
        hinweis: 'Dein Status umfasst verschiedene Fälle: Beamte & Soldaten ✅ voll berechtigt · Elternzeit (bis 3 Jahre) ✅ berechtigt · Nicht erwerbstätig ❌ nicht berechtigt (außer über förderberechtigten Ehepartner).',
        details: 'Beamte und Soldaten haben vollen Zugang zum Altersvorsorgedepot. Wer in Elternzeit ist (bis max. 3 Jahre), bleibt förderberechtigt. Dauerhaft nicht Erwerbstätige sind nicht direkt berechtigt, können aber mittelbar über einen förderberechtigten Ehepartner profitieren. Im Zweifel individuell prüfen lassen.'
      };

    default:
      return null;
  }
}

function zeigeFoerderInfoBox(ergebnis) {
  const box     = document.getElementById('foerder-info-box');
  const badge   = document.getElementById('foerder-info-badge');
  const hinweis = document.getElementById('foerder-info-hinweis');
  const details = document.getElementById('foerder-info-details');
  if (!box) return;

  if (!ergebnis) {
    box.classList.add('hidden');
    return;
  }

  box.classList.remove('hidden', 'status-berechtigt', 'status-einschraenkung', 'status-nicht-berechtigt');
  box.classList.add(`status-${ergebnis.stufe}`);
  badge.textContent   = ergebnis.badge;
  hinweis.textContent = ergebnis.hinweis;
  details.textContent = ergebnis.details;

  // Details bei Statuswechsel wieder einklappen
  const mehrBtn = document.getElementById('foerder-info-mehr');
  if (mehrBtn && details) {
    details.classList.add('hidden');
    mehrBtn.setAttribute('aria-expanded', 'false');
    mehrBtn.textContent = 'Mehr erfahren'; // CSS ::after fügt ▼/▲ hinzu
  }
}

function aktualisiereAVDPersoenlich(foerderStatus, jahre) {
  const el = document.getElementById('avd-persoenlich');
  if (!el) return;

  if (!foerderStatus) {
    el.innerHTML = '';
    return;
  }

  const { stufe, badge, hinweis, details } = foerderStatus;
  const gesamtZulage = jahre ? (540 * jahre).toLocaleString('de-DE') : '–';

  let inhalt;
  if (stufe === 'berechtigt') {
    const jahreSatz = jahre
      ? ` über deine gesamte Spardauer von <strong>${jahre} Jahren</strong>`
      : '';
    inhalt = `<div class="avd-persoenlich-box status-berechtigt" style="border:1px solid var(--color-success-border);border-radius:var(--radius-md);padding:.85rem 1rem;margin-bottom:1rem;">
      <span class="foerder-info-badge" style="background:rgba(16,185,129,.2);color:var(--color-success);border-radius:99px;padding:.2rem .6rem;font-size:.72rem;font-weight:700;">${badge}</span>
      <p style="margin:.5rem 0 0;font-size:.88rem;">🎉 <strong>Gute Nachrichten!</strong> Basierend auf deinen Angaben bist du förderberechtigt. Bei 150 €/Monat Eigenbeitrag erhältst du <strong>540 € staatliche Zulage pro Jahr</strong> – das sind <strong>${gesamtZulage} €</strong>${jahreSatz}.</p>
    </div>`;
  } else if (stufe === 'einschraenkung') {
    inhalt = `<div class="avd-persoenlich-box status-einschraenkung" style="border:1px solid var(--color-warning-border);border-radius:var(--radius-md);padding:.85rem 1rem;margin-bottom:1rem;">
      <span class="foerder-info-badge" style="background:rgba(245,158,11,.2);color:var(--color-warning);border-radius:99px;padding:.2rem .6rem;font-size:.72rem;font-weight:700;">${badge}</span>
      <p style="margin:.5rem 0 0;font-size:.88rem;">${hinweis}</p>
    </div>`;
  } else {
    inhalt = `<div class="avd-persoenlich-box status-nicht-berechtigt" style="border:1px solid var(--color-danger-border);border-radius:var(--radius-md);padding:.85rem 1rem;margin-bottom:1rem;">
      <span class="foerder-info-badge" style="background:rgba(248,113,113,.2);color:var(--color-danger);border-radius:99px;padding:.2rem .6rem;font-size:.72rem;font-weight:700;">ℹ️ Nicht direkt förderberechtigt</span>
      <p style="margin:.5rem 0 0;font-size:.88rem;">Basierend auf deinen Angaben bist du aktuell nicht direkt förderberechtigt. Das Altersvorsorgedepot kannst du trotzdem nutzen – allerdings ohne staatliche Zulage. ${details}</p>
    </div>`;
  }

  el.innerHTML = inhalt;
}

function initBeschaeftigungsstatus() {
  const radios        = document.querySelectorAll('input[name="beschaeftigung"]');
  const minijobBlock  = document.getElementById('minijob-zusatzfrage');
  const mjBtnNein     = document.getElementById('mj-btn-nein');
  const mjBtnJa       = document.getElementById('mj-btn-ja');
  const minijobInput  = document.getElementById('minijob-befreit');

  if (!radios.length) return;

  function aktualisiereAnzeige() {
    const checked = document.querySelector('input[name="beschaeftigung"]:checked');
    if (!checked) { zeigeFoerderInfoBox(null); return; }

    const status        = checked.value;
    const minijobBefreit = minijobInput?.value === 'true';

    // Minijob-Zusatzfrage ein-/ausblenden
    if (minijobBlock) {
      minijobBlock.classList.toggle('hidden', status !== 'minijob');
    }

    const ergebnis = pruefeFoerderberechtigung(status, minijobBefreit);
    window.sparrechner.foerderStatus = ergebnis ? { ...ergebnis, status } : null;
    zeigeFoerderInfoBox(ergebnis);
  }

  radios.forEach(r => r.addEventListener('change', aktualisiereAnzeige));

  // Minijob-Toggle-Buttons
  if (mjBtnNein && mjBtnJa && minijobInput) {
    [mjBtnNein, mjBtnJa].forEach(btn => {
      btn.addEventListener('click', () => {
        minijobInput.value = btn.dataset.val;
        mjBtnNein.classList.toggle('active', btn.dataset.val === 'false');
        mjBtnJa.classList.toggle('active',   btn.dataset.val === 'true');
        aktualisiereAnzeige();
      });
    });
  }

  // Mehr-/Weniger-Knopf für Details
  const mehrBtn = document.getElementById('foerder-info-mehr');
  if (mehrBtn) {
    mehrBtn.addEventListener('click', () => {
      const details = document.getElementById('foerder-info-details');
      const expanded = mehrBtn.getAttribute('aria-expanded') === 'true';
      mehrBtn.setAttribute('aria-expanded', String(!expanded));
      mehrBtn.textContent = expanded ? 'Mehr erfahren' : 'Weniger anzeigen';
      if (details) details.classList.toggle('hidden', expanded);
    });
  }

  // Initialer Zustand
  aktualisiereAnzeige();
}

// ============================================================
// ACCORDION – Interaktivität (ARIA + Tastaturnavigation)
// ============================================================
function initAccordion(containerSelector, { allowMultiple = false } = {}) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const triggers = container.querySelectorAll(
    '.accordion-header, .accordion-row-header'
  );

  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => toggle(trigger));
    trigger.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle(trigger);
      }
    });
  });

  function toggle(trigger) {
    const expanding = trigger.getAttribute('aria-expanded') !== 'true';

    if (!allowMultiple) {
      triggers.forEach(t => {
        if (t !== trigger) t.setAttribute('aria-expanded', 'false');
      });
    }

    trigger.setAttribute('aria-expanded', String(expanding));
  }
}

// ============================================================
// START
// ============================================================
document.addEventListener('DOMContentLoaded', function() {

  // ── QUIZ INITIALISIERUNG ──────────────────────────────────────
  const quizCard    = document.getElementById('quiz-card');
  const formSection = document.querySelector('.form-section');
  const quizState   = {};
  let quizSchritt   = 0;

  // Beim Laden: Quiz sichtbar, Formular hidden
  if (quizCard)    quizCard.classList.remove('hidden');
  if (formSection) formSection.classList.add('hidden');

  // Alle Quiz-Tiles mit Klick-Logik versehen
  document.querySelectorAll('.quiz-tile').forEach(function(tile) {
    tile.addEventListener('click', function() {

      // Tile als ausgewählt markieren
      const gruppe = tile.closest('.quiz-tiles');
      if (gruppe) {
        gruppe.querySelectorAll('.quiz-tile').forEach(function(t) {
          t.classList.remove('selected');
        });
      }
      tile.classList.add('selected');

      // Wert speichern (data-key / data-value vom Tile)
      quizState[tile.dataset.key] = tile.dataset.value;

      // Nach 350ms nächsten Schritt zeigen
      setTimeout(function() {
        quizSchritt++;
        zeigeQuizSchritt(quizSchritt);
      }, 350);
    });
  });

  // Schritt anzeigen und Dots aktualisieren
  function zeigeQuizSchritt(n) {
    document.querySelectorAll('.quiz-step').forEach(function(s) {
      s.classList.remove('active');
    });
    const naechster = document.querySelector('.quiz-step[data-step="' + n + '"]');
    if (naechster) naechster.classList.add('active');

    // Dots aktualisieren
    document.querySelectorAll('.quiz-dot').forEach(function(d, i) {
      d.classList.toggle('active', i === n);
      d.classList.toggle('done',   i < n);
    });

    // Abschluss-Screen: Spartyp anzeigen
    if (n === 5) zeigeSpartyp(quizState.risiko || 'ausgewogen');
  }

  // Spartyp-Definitionen für den Abschluss-Screen
  const SPARTYPEN_QUIZ = {
    konservativ: {
      emoji: '🛡️',
      name:  'Der Sicherheitsorientierte',
      text:  'Du legst Wert auf Stabilität. Auch ein konservativer ' +
             'ETF-Sparplan schlägt den Bausparvertrag langfristig deutlich.'
    },
    ausgewogen: {
      emoji: '⚖️',
      name:  'Der Ausgewogene',
      text:  'Du findest die Balance zwischen Sicherheit und Rendite. ' +
             'Ein globaler Index-ETF passt perfekt zu deinem Profil.'
    },
    wachstum: {
      emoji: '🚀',
      name:  'Der Wachstumsorientierte',
      text:  'Du denkst langfristig. Der ETF-Sparplan ist klar ' +
             'deine beste Wahl – der Zinseszins arbeitet für dich.'
    }
  };

  // Abschluss-Screen mit persönlichem Spartyp befüllen
  function zeigeSpartyp(risiko) {
    const typ   = SPARTYPEN_QUIZ[risiko] || SPARTYPEN_QUIZ['ausgewogen'];
    const badge = document.getElementById('quiz-spartyp-badge');
    const emoji = document.getElementById('quiz-finish-emoji');
    const titel = document.getElementById('quiz-finish-titel');
    const text  = document.getElementById('quiz-finish-text');
    if (badge) badge.textContent = typ.name;
    if (emoji) emoji.textContent = typ.emoji;
    if (titel) titel.textContent = 'Dein Spartyp: ' + typ.name;
    if (text)  text.textContent  = typ.text;
  }

  // Quiz → Formular: Werte übertragen und Übergang animieren
  function quizAbschliessen() {
    // Slider-Werte aus Quiz-Antworten setzen
    if (quizState.alter) {
      const s = document.getElementById('alter');
      const o = document.getElementById('alter-val');
      if (s) { s.value = quizState.alter; s.dispatchEvent(new Event('input')); }
      if (o) o.textContent = quizState.alter + ' Jahre';
    }
    if (quizState.sparbetrag) {
      const s = document.getElementById('sparbetrag');
      if (s) { s.value = quizState.sparbetrag; s.dispatchEvent(new Event('input')); }
    }
    if (quizState.spardauer) {
      const s = document.getElementById('spardauer');
      if (s) { s.value = quizState.spardauer; s.dispatchEvent(new Event('input')); }
    }
    // Risikobereitschaft setzen
    if (quizState.risiko) {
      const r = document.querySelector('input[name="risiko"][value="' + quizState.risiko + '"]');
      if (r) r.checked = true;
    }
    // Beschäftigungsstatus setzen und Förderprüfung auslösen
    if (quizState.status) {
      const b = document.querySelector('input[name="beschaeftigung"][value="' + quizState.status + '"]');
      if (b) { b.checked = true; b.dispatchEvent(new Event('change')); }
    }
    pruefeFoerderungen();

    // Übergang: Quiz ausblenden, Formular einblenden
    quizCard.style.transition = 'opacity 0.3s';
    quizCard.style.opacity    = '0';
    setTimeout(function() {
      quizCard.classList.add('hidden');
      quizCard.style.opacity    = '';
      quizCard.style.transition = '';
      formSection.classList.remove('hidden');
      formSection.style.opacity    = '0';
      formSection.style.transition = 'opacity 0.3s';
      setTimeout(function() {
        formSection.style.opacity    = '1';
        setTimeout(function() {
          formSection.style.opacity    = '';
          formSection.style.transition = '';
        }, 300);
      }, 50);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
  }

  // „Rechner starten"-Button auf dem Abschluss-Screen
  const startBtn = document.getElementById('quiz-start-btn');
  if (startBtn) startBtn.addEventListener('click', quizAbschliessen);

  // „Direkt zum Rechner"-Link überspringt Quiz sofort
  const skipLink = document.getElementById('quiz-skip');
  if (skipLink) {
    skipLink.addEventListener('click', function(e) {
      e.preventDefault();
      quizAbschliessen();
    });
  }

  // Reset-Button: Chart leeren, Ergebnisse ausblenden, Quiz neu starten
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      // Ergebnisse und Chart zurücksetzen
      const results = document.getElementById('results');
      if (results) results.classList.add('hidden');
      if (sparChart) { sparChart.destroy(); sparChart = null; }
      history.replaceState(null, '', location.pathname);

      // Quiz-Zustand zurücksetzen
      quizSchritt = 0;
      Object.keys(quizState).forEach(function(k) { delete quizState[k]; });
      document.querySelectorAll('.quiz-tile').forEach(function(t) {
        t.classList.remove('selected');
      });
      zeigeQuizSchritt(0);

      // Formular ausblenden, Quiz mit Fade einblenden
      formSection.classList.add('hidden');
      quizCard.style.opacity    = '0';
      quizCard.style.transition = 'opacity 0.3s';
      quizCard.classList.remove('hidden');
      setTimeout(function() {
        quizCard.style.opacity = '1';
        setTimeout(function() {
          quizCard.style.opacity    = '';
          quizCard.style.transition = '';
        }, 300);
      }, 50);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ── AB HIER: BESTEHENDER CODE ────────────────────────────────

  // Dark Mode zuerst initialisieren (verhindert Flackern beim Laden)
  initDarkMode();

  // initQuiz() entfernt – durch neuen Quiz-Code oben ersetzt

  // +/− Buttons für alle Slider
  initSliderButtons();

  // Formular-Vollständigkeitsanzeige
  initFormVollstaendigkeit();

  initSlider('alter',        'alter-val',        v => `${v} Jahre`);
  initSlider('sparbetrag',   'sparbetrag-val',   v => `${Math.round(v).toLocaleString('de-DE')} €`);
  initSlider('spardauer',    'spardauer-val',    v => `${v} Jahre`);
  initSlider('inflation',    'inflation-val',    v => `${v.toFixed(1).replace('.', ',')} %`);
  initSlider('guthabenzins', 'guthabenzins-val', v => `${v.toFixed(1).replace('.', ',')} %`);

  initTooltips();

  // Familienstand-Toggle + Einkommensfeld
  initFamilienstandToggle();

  // Szenario B
  initSzenarionB();
  pruefeFoerderungen(); // Startwert sofort prüfen (Standardeinkommen 30.000 €)
  document.getElementById('einkommen').addEventListener('input', pruefeFoerderungen);

  // Beschäftigungsstatus + Förderberechtigungsprüfung
  initBeschaeftigungsstatus();

  document.getElementById('sparform').addEventListener('submit', e => {
    e.preventDefault();

    // Förderstatus vor Berechnung aktualisieren (für korrekte AVD-Ausgabe)
    const statusChecked = document.querySelector('input[name="beschaeftigung"]:checked');
    if (statusChecked) {
      const mjBefreit = document.getElementById('minijob-befreit')?.value === 'true';
      const ergebnis  = pruefeFoerderberechtigung(statusChecked.value, mjBefreit);
      window.sparrechner.foerderStatus = ergebnis ? { ...ergebnis, status: statusChecked.value } : null;
    }

    const sparBetrag     = parseFloat(document.getElementById('sparbetrag').value);
    const jahre          = parseInt(document.getElementById('spardauer').value, 10);
    const risikoKey      = document.querySelector('input[name="risiko"]:checked').value;
    const zinsProzent    = parseFloat(document.getElementById('guthabenzins').value);
    const wohnpraemie    = document.getElementById('wohnpraemie').checked;
    const ansparzulage   = document.getElementById('ansparzulage').checked;
    const inflationsRate = parseFloat(document.getElementById('inflation').value) / 100;

    const etfDaten      = calcETF(sparBetrag, jahre, risikoKey);
    const bausparDaten  = calcBauspar(sparBetrag, jahre, zinsProzent, wohnpraemie, ansparzulage);
    const girokontoDate = calcGirokonto(sparBetrag, jahre, inflationsRate);

    // Szenario B (optional)
    let etfB = null, bausparB = null, jahreB = 0;
    if (szenarioBActive) {
      const sparBetragB   = parseFloat(document.getElementById('sparbetrag-b').value);
      jahreB              = parseInt(document.getElementById('spardauer-b').value, 10);
      const risikoB       = document.querySelector('input[name="risiko-b"]:checked').value;
      const zinsProzentB  = parseFloat(document.getElementById('guthabenzins-b').value);
      const wohnpraemieB  = document.getElementById('wohnpraemie-b').checked;
      const ansparzulageB = document.getElementById('ansparzulage-b').checked;

      etfB     = calcETF(sparBetragB, jahreB, risikoB);
      bausparB = calcBauspar(sparBetragB, jahreB, zinsProzentB, wohnpraemieB, ansparzulageB);
    }

    renderChart(etfDaten, bausparDaten, girokontoDate, jahre, etfB, bausparB, jahreB);
    zeigeErgebnisse(etfDaten, bausparDaten, girokontoDate, sparBetrag, jahre, risikoKey, inflationsRate, etfB, bausparB, jahreB);
  });

  // Teilen + PDF
  document.getElementById('btn-teilen').addEventListener('click', teileLink);
  document.getElementById('btn-pdf').addEventListener('click', exportPDF);

  // Accordions
  initAccordion('#altersvorsorgedepot-card', { allowMultiple: false });

  // URL-Parameter beim Laden einlesen (ganz am Ende, nach allen Initialisierungen)
  ladeAusURL();
});
