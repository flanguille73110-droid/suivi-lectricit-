/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Releve, TarifConfig, AnalyseMois, ComparaisonOption } from '../types';

// Valeurs par défaut réalistes pour un contrat d'électricité en France (EDF Tarif Bleu 2025/2026)
export const DEFAULT_TARIF_CONFIG: TarifConfig = {
  type: 'HP_HC',
  prixKwhBase: 0.2516, // €/kWh en Option Base
  prixKwhHP: 0.2700,   // €/kWh Heures Pleines
  prixKwhHC: 0.2068,   // €/kWh Heures Creuses
  abonnementMensuel: 15.20, // €/mois pour une puissance de 9 kVA (courant en France)
  debut: '2024-08-01',
  fin: '',
  heureDebutHC: '22:00',
  heureFinHC: '06:00',
  taxes: {
    cta: 21.05,        // % de l'abonnement par défaut (Contribution Tarifaire d'Acheminement, ~3.20 €/mois)
    cspe: 0.0225,      // €/kWh (Accise sur l'électricité / TICFE)
    tvaReduite: 5.5,   // % de TVA sur l'abonnement et la CTA
    tvaNormale: 20.0,  // % de TVA sur l'énergie et la CSPE
    ctaType: 'pourcentage',
    cspeType: 'par_kwh',
  },
  haussePrevue: 10,    // Hausse de 10% simulée
  periodes: [
    {
      id: 'p1',
      nom: 'Tarifs Fin 2023 / Début 2024',
      debut: '2023-11-01',
      fin: '2024-01-31',
      prixKwhBase: 0.2276,
      prixKwhHP: 0.2460,
      prixKwhHC: 0.1828,
      abonnementMensuel: 13.50
    },
    {
      id: 'p2',
      nom: 'Tarifs Février 2024 à Juillet 2024',
      debut: '2024-02-01',
      fin: '2024-07-31',
      prixKwhBase: 0.2516,
      prixKwhHP: 0.2700,
      prixKwhHC: 0.2068,
      abonnementMensuel: 14.20
    },
    {
      id: 'p3',
      nom: 'Tarifs Août 2024 à Janvier 2026',
      debut: '2024-08-01',
      fin: '2026-01-31',
      prixKwhBase: 0.2516,
      prixKwhHP: 0.2700,
      prixKwhHC: 0.2068,
      abonnementMensuel: 15.20
    },
    {
      id: 'p4',
      nom: 'Tarifs Février 2026 & Actuels',
      debut: '2026-02-01',
      fin: '',
      prixKwhBase: 0.2516,
      prixKwhHP: 0.2850,
      prixKwhHC: 0.2185,
      abonnementMensuel: 15.20
    }
  ]
};

// Relevés de compteur de départ réalistes (sur un peu plus d'un an) pour pré-remplir l'application
export const DEFAULT_RELEVES: Releve[] = [
  { id: 'r1', date: '2025-06-01', indexHP: 12000, indexHC: 8000, commentaire: 'Index de départ' },
  { id: 'r2', date: '2025-07-01', indexHP: 12130, indexHC: 8090, commentaire: 'Mois de juin' },
  { id: 'r3', date: '2025-08-01', indexHP: 12255, indexHC: 8175 },
  { id: 'r4', date: '2025-09-01', indexHP: 12375, indexHC: 8255, commentaire: 'Vacances d\'été' },
  { id: 'r5', date: '2025-10-01', indexHP: 12535, indexHC: 8355 },
  { id: 'r6', date: '2025-11-01', indexHP: 12775, indexHC: 8505, commentaire: 'Retour du froid' },
  { id: 'r7', date: '2025-12-01', indexHP: 13095, indexHC: 8705 },
  { id: 'r8', date: '2026-01-01', indexHP: 13515, indexHC: 8965, commentaire: 'Hiver rigoureux' },
  { id: 'r9', date: '2026-02-01', indexHP: 13915, indexHC: 9215 },
  { id: 'r10', date: '2026-03-01', indexHP: 14285, indexHC: 9445 },
  { id: 'r11', date: '2026-04-01', indexHP: 14595, indexHC: 9635, commentaire: 'Printemps doux' },
  { id: 'r12', date: '2026-05-01', indexHP: 14825, indexHC: 9785 },
  { id: 'r13', date: '2026-06-01', indexHP: 14995, indexHC: 9895 },
  { id: 'r14', date: '2026-07-01', indexHP: 15125, indexHC: 9985, commentaire: 'Bilan d\'un an' },
];

/**
 * Calcule le coût détaillé de l'électricité (HT, taxes, TTC) pour une consommation donnée.
 */
export function calculerCoutDetails(
  consoHP: number,
  consoHC: number,
  nbMois: number,
  config: TarifConfig,
  appliquerHausse: boolean = false
) {
  const coeffHausse = appliquerHausse ? 1 + config.haussePrevue / 100 : 1;

  // Tarifs unitaires avec hausse potentielle appliquée uniquement sur la part énergie
  const tarifHP = (config.type === 'HP_HC' ? config.prixKwhHP : config.prixKwhBase) * coeffHausse;
  const tarifHC = (config.type === 'HP_HC' ? config.prixKwhHC : config.prixKwhBase) * coeffHausse;

  // Coûts Hors Taxes (HT)
  const coutEnergieHT = (consoHP * tarifHP) + (consoHC * tarifHC);
  const coutAbonnementHT = config.abonnementMensuel * nbMois;

  // Calcul de la CTA selon son type (mensuel, annuel ou pourcentage de l'abonnement)
  let coutCTAHT = 0;
  const ctaType = config.taxes.ctaType || 'pourcentage';
  if (ctaType === 'annuel') {
    coutCTAHT = (config.taxes.cta / 12) * nbMois;
  } else if (ctaType === 'pourcentage') {
    coutCTAHT = (config.taxes.cta / 100) * coutAbonnementHT;
  } else {
    // mensuel par défaut
    coutCTAHT = config.taxes.cta * nbMois;
  }

  // Calcul de la CSPE selon son type (par kWh, annuel, ou pourcentage du prix d'énergie HT)
  let coutCSPEHT = 0;
  const cspeType = config.taxes.cspeType || 'par_kwh';
  if (cspeType === 'annuel') {
    coutCSPEHT = (config.taxes.cspe / 12) * nbMois;
  } else if (cspeType === 'pourcentage') {
    coutCSPEHT = (config.taxes.cspe / 100) * coutEnergieHT;
  } else {
    // par kWh par défaut
    coutCSPEHT = (consoHP + consoHC) * config.taxes.cspe;
  }

  // Calcul de la TVA
  const tvaAbonnement = (coutAbonnementHT + coutCTAHT) * (config.taxes.tvaReduite / 100);
  const tvaConsommation = (coutEnergieHT + coutCSPEHT) * (config.taxes.tvaNormale / 100);
  const coutTVA = tvaAbonnement + tvaConsommation;

  // Coût total TTC
  const coutTotalTTC = coutEnergieHT + coutAbonnementHT + coutCTAHT + coutCSPEHT + coutTVA;

  return {
    coutEnergieHT,
    coutAbonnementHT,
    coutCTAHT,
    coutCSPEHT,
    coutTVA,
    coutTotalTTC,
  };
}

export function getConfigPourDate(dateStr: string, config: TarifConfig): TarifConfig {
  if (!config.periodes || config.periodes.length === 0) {
    return config;
  }
  
  // Normaliser la date recherchée pour éviter les soucis de fuseau horaire
  const [year, month, day] = dateStr.split('-').map(Number);
  const searchDate = new Date(year, month - 1, day);
  const searchTime = searchDate.getTime();
  
  // Trouver la période correspondante
  const periode = config.periodes.find(p => {
    const [pY, pM, pD] = p.debut.split('-').map(Number);
    const start = new Date(pY, pM - 1, pD).getTime();
    
    let end = Infinity;
    if (p.fin) {
      const [fY, fM, fD] = p.fin.split('-').map(Number);
      end = new Date(fY, fM - 1, fD).getTime();
    }
    
    return searchTime >= start && searchTime <= end;
  });
  
  if (periode) {
    return {
      ...config,
      prixKwhBase: periode.prixKwhBase,
      prixKwhHP: periode.prixKwhHP,
      prixKwhHC: periode.prixKwhHC,
      abonnementMensuel: periode.abonnementMensuel,
      taxes: {
        ...config.taxes,
        cta: periode.cta !== undefined ? periode.cta : config.taxes.cta,
        cspe: periode.cspe !== undefined ? periode.cspe : config.taxes.cspe,
        ctaType: periode.ctaType !== undefined ? periode.ctaType : config.taxes.ctaType,
        cspeType: periode.cspeType !== undefined ? periode.cspeType : config.taxes.cspeType,
      }
    };
  }
  
  return config;
}

/**
 * Algorithme d'interpolation journalière pour répartir précisément la consommation par mois civils.
 * Gère les relevés irréguliers, espacés de quelques jours ou de plusieurs mois.
 */
export function analyserRelevesParMois(releves: Releve[], config: TarifConfig): AnalyseMois[] {
  if (releves.length < 2) return [];

  // Trier les relevés par date
  const sorted = [...releves].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Structure pour accumuler la consommation par jour et ses coûts associés
  // Clé: "YYYY-MM" (ex: "2025-06")
  const consoParMois: Record<string, {
    consoHP: number;
    consoHC: number;
    jours: number;
    coutEnergieHT: number;
    coutAbonnementHT: number;
    coutCTAHT: number;
    coutCSPEHT: number;
    coutTVA: number;
    coutTotalTTC: number;
    coutAvecHausseTTC: number;
  }> = {};

  for (let i = 0; i < sorted.length - 1; i++) {
    const r1 = sorted[i];
    const r2 = sorted[i + 1];

    const d1 = new Date(r1.date);
    const d2 = new Date(r2.date);

    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) continue;

    // Consommation totale sur cette période
    // Si config.type est BASE, on traite tout en HP
    const deltaHP = r2.indexHP - r1.indexHP;
    const deltaHC = config.type === 'HP_HC' ? (r2.indexHC - r1.indexHC) : 0;

    // Consommation moyenne par jour
    const consoJournaliereHP = deltaHP / diffDays;
    const consoJournaliereHC = deltaHC / diffDays;

    // Répartir jour par jour entre les deux relevés
    const tempDate = new Date(d1);
    for (let d = 0; d < diffDays; d++) {
      // On passe au jour suivant pour attribuer la conso de ce jour
      tempDate.setDate(tempDate.getDate() + 1);
      
      const year = tempDate.getFullYear();
      const month = String(tempDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(tempDate.getDate()).padStart(2, '0');
      const moisKey = `${year}-${month}`;
      const currentDateStr = `${year}-${month}-${dayStr}`;

      if (!consoParMois[moisKey]) {
        consoParMois[moisKey] = {
          consoHP: 0,
          consoHC: 0,
          jours: 0,
          coutEnergieHT: 0,
          coutAbonnementHT: 0,
          coutCTAHT: 0,
          coutCSPEHT: 0,
          coutTVA: 0,
          coutTotalTTC: 0,
          coutAvecHausseTTC: 0,
        };
      }

      const configActive = getConfigPourDate(currentDateStr, config);

      // Calculer les coûts pour ce jour précis (prorata 1 jour, soit 1 / 30.44 mois d'abonnement)
      const detailsHT = calculerCoutDetails(consoJournaliereHP, consoJournaliereHC, 1 / 30.44, configActive, false);
      const detailsAvecHausse = calculerCoutDetails(consoJournaliereHP, consoJournaliereHC, 1 / 30.44, configActive, true);

      consoParMois[moisKey].consoHP += consoJournaliereHP;
      consoParMois[moisKey].consoHC += consoJournaliereHC;
      consoParMois[moisKey].jours += 1;
      consoParMois[moisKey].coutEnergieHT += detailsHT.coutEnergieHT;
      consoParMois[moisKey].coutAbonnementHT += detailsHT.coutAbonnementHT;
      consoParMois[moisKey].coutCTAHT += detailsHT.coutCTAHT;
      consoParMois[moisKey].coutCSPEHT += detailsHT.coutCSPEHT;
      consoParMois[moisKey].coutTVA += detailsHT.coutTVA;
      consoParMois[moisKey].coutTotalTTC += detailsHT.coutTotalTTC;
      consoParMois[moisKey].coutAvecHausseTTC += detailsAvecHausse.coutTotalTTC;
    }
  }

  // Convertir en tableau d'AnalyseMois et calculer les coûts
  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const result: AnalyseMois[] = Object.entries(consoParMois).map(([moisKey, data]) => {
    const [year, monthStr] = moisKey.split('-');
    const idxMois = parseInt(monthStr, 10) - 1;
    const moisLabel = `${moisNoms[idxMois]} ${year}`;

    return {
      moisLabel,
      consoHP: Math.round(data.consoHP * 10) / 10,
      consoHC: Math.round(data.consoHC * 10) / 10,
      consoTotale: Math.round((data.consoHP + data.consoHC) * 10) / 10,
      coutEnergieHT: Math.round(data.coutEnergieHT * 100) / 100,
      coutAbonnementHT: Math.round(data.coutAbonnementHT * 100) / 100,
      coutCTAHT: Math.round(data.coutCTAHT * 100) / 100,
      coutCSPEHT: Math.round(data.coutCSPEHT * 100) / 100,
      coutTVA: Math.round(data.coutTVA * 100) / 100,
      coutTotalTTC: Math.round(data.coutTotalTTC * 100) / 100,
      coutAvecHausseTTC: Math.round(data.coutAvecHausseTTC * 100) / 100,
      jours: data.jours,
    };
  });

  // Trier par date chronologique (moisKey)
  return result.sort((a, b) => {
    const convert = (label: string) => {
      const parts = label.split(' ');
      const mIdx = moisNoms.indexOf(parts[0]);
      return parseInt(parts[1]) * 12 + mIdx;
    };
    return convert(a.moisLabel) - convert(b.moisLabel);
  });
}

/**
 * Compare l'option tarifaire actuelle avec des alternatives
 * (ex: Option Base vs Option Heures Pleines / Heures Creuses)
 * et calcule les économies potentielles.
 */
export function comparerOptionsTarifaires(
  consoTotaleHP: number,
  consoTotaleHC: number,
  nbMoisTotal: number,
  configActuelle: TarifConfig
): ComparaisonOption[] {
  const options: ComparaisonOption[] = [];

  // 1. Option Actuelle
  const coutActuel = calculerCoutDetails(consoTotaleHP, consoTotaleHC, nbMoisTotal, configActuelle, false);
  const partEnergieActuelle = coutActuel.coutEnergieHT;
  const partAboActuelle = coutActuel.coutAbonnementHT + coutActuel.coutCTAHT + (coutActuel.coutAbonnementHT + coutActuel.coutCTAHT) * (configActuelle.taxes.tvaReduite / 100);
  const partTaxesActuelle = coutActuel.coutCSPEHT + coutActuel.coutTVA - ((coutActuel.coutAbonnementHT + coutActuel.coutCTAHT) * (configActuelle.taxes.tvaReduite / 100));

  options.push({
    optionLabel: `Option Actuelle (${configActuelle.type === 'HP_HC' ? 'Heures Pleines / Heures Creuses' : 'Base'})`,
    coutTotalTTC: Math.round(coutActuel.coutTotalTTC * 100) / 100,
    partEnergie: Math.round(partEnergieActuelle * 100) / 100,
    partAbonnement: Math.round(partAboActuelle * 100) / 100,
    partTaxes: Math.round(partTaxesActuelle * 100) / 100,
    economiePotentielle: 0,
  });

  // 2. Option Alternative
  const typeAlternative = configActuelle.type === 'HP_HC' ? 'BASE' : 'HP_HC';
  const configAlternative: TarifConfig = {
    ...configActuelle,
    type: typeAlternative,
  };

  const coutAlternative = calculerCoutDetails(
    typeAlternative === 'BASE' ? (consoTotaleHP + consoTotaleHC) : consoTotaleHP,
    typeAlternative === 'BASE' ? 0 : consoTotaleHC,
    nbMoisTotal,
    configAlternative,
    false
  );

  const partEnergieAlt = coutAlternative.coutEnergieHT;
  const partAboAlt = coutAlternative.coutAbonnementHT + coutAlternative.coutCTAHT + (coutAlternative.coutAbonnementHT + coutAlternative.coutCTAHT) * (configAlternative.taxes.tvaReduite / 100);
  const partTaxesAlt = coutAlternative.coutCSPEHT + coutAlternative.coutTVA - ((coutAlternative.coutAbonnementHT + coutAlternative.coutCTAHT) * (configAlternative.taxes.tvaReduite / 100));

  const eco = coutActuel.coutTotalTTC - coutAlternative.coutTotalTTC;

  options.push({
    optionLabel: `Alternative (${typeAlternative === 'HP_HC' ? 'Heures Pleines / Heures Creuses' : 'Option de Base'})`,
    coutTotalTTC: Math.round(coutAlternative.coutTotalTTC * 100) / 100,
    partEnergie: Math.round(partEnergieAlt * 100) / 100,
    partAbonnement: Math.round(partAboAlt * 100) / 100,
    partTaxes: Math.round(partTaxesAlt * 100) / 100,
    economiePotentielle: Math.round(eco * 100) / 100,
  });

  // 3. Option Éco-Gestes (-10% de consommation globale sur l'option actuelle)
  const coutEco = calculerCoutDetails(
    consoTotaleHP * 0.9,
    consoTotaleHC * 0.9,
    nbMoisTotal,
    configActuelle,
    false
  );

  const partEnergieEco = coutEco.coutEnergieHT;
  const partAboEco = coutEco.coutAbonnementHT + coutEco.coutCTAHT + (coutEco.coutAbonnementHT + coutEco.coutCTAHT) * (configActuelle.taxes.tvaReduite / 100);
  const partTaxesEco = coutEco.coutCSPEHT + coutEco.coutTVA - ((coutEco.coutAbonnementHT + coutEco.coutCTAHT) * (configActuelle.taxes.tvaReduite / 100));

  options.push({
    optionLabel: `Option Éco-Gestes (Réduction de 10% de la conso sur l'option actuelle)`,
    coutTotalTTC: Math.round(coutEco.coutTotalTTC * 100) / 100,
    partEnergie: Math.round(partEnergieEco * 100) / 100,
    partAbonnement: Math.round(partAboEco * 100) / 100,
    partTaxes: Math.round(partTaxesEco * 100) / 100,
    economiePotentielle: Math.round((coutActuel.coutTotalTTC - coutEco.coutTotalTTC) * 100) / 100,
  });

  return options;
}

/**
 * Calcule les statistiques de consommation et de coût pour un intervalle de dates [dateDebutStr, dateFinStr].
 * En utilisant le même algorithme d'interpolation journalière.
 */
export function calculerStatsPourIntervalle(
  releves: Releve[],
  config: TarifConfig,
  dateDebutStr: string,
  dateFinStr: string
) {
  if (releves.length < 2) {
    return {
      totalConsoHP: 0,
      totalConsoHC: 0,
      totalConso: 0,
      totalCoutTTC: 0,
      ratioHP: 50,
      nombreDeMois: 0,
      overrideAbonnement: config.abonnementMensuel,
    };
  }

  // Trier les relevés par date
  const sorted = [...releves].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 1. Déterminer tous les jours couverts par des relevés réels et calculer leur consommation quotidienne
  const coveredDays = new Map<string, { hp: number; hc: number }>();

  for (let i = 0; i < sorted.length - 1; i++) {
    const r1 = sorted[i];
    const r2 = sorted[i + 1];

    const d1 = new Date(r1.date);
    const d2 = new Date(r2.date);

    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) continue;

    const deltaHP = r2.indexHP - r1.indexHP;
    const deltaHC = config.type === 'HP_HC' ? (r2.indexHC - r1.indexHC) : 0;

    const consoJournaliereHP = deltaHP / diffDays;
    const consoJournaliereHC = deltaHC / diffDays;

    const tempDate = new Date(d1);
    for (let d = 0; d < diffDays; d++) {
      tempDate.setDate(tempDate.getDate() + 1);

      const year = tempDate.getFullYear();
      const month = String(tempDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(tempDate.getDate()).padStart(2, '0');
      const currentDateStr = `${year}-${month}-${dayStr}`;

      coveredDays.set(currentDateStr, { hp: consoJournaliereHP, hc: consoJournaliereHC });
    }
  }

  // 2. Calculer les moyennes globales et saisonnières pour l'estimation des jours non couverts
  let sumHP = 0;
  let sumHC = 0;
  coveredDays.forEach(val => {
    sumHP += val.hp;
    sumHC += val.hc;
  });
  const avgHP = coveredDays.size > 0 ? (sumHP / coveredDays.size) : 10;
  const avgHC = coveredDays.size > 0 ? (sumHC / coveredDays.size) : (config.type === 'HP_HC' ? 5 : 0);

  const monthlyAverages = Array.from({ length: 12 }, () => ({ sumHP: 0, sumHC: 0, count: 0 }));
  coveredDays.forEach((val, dateStr) => {
    const monthIndex = parseInt(dateStr.split('-')[1], 10) - 1; // 0 to 11
    if (monthIndex >= 0 && monthIndex < 12) {
      monthlyAverages[monthIndex].sumHP += val.hp;
      monthlyAverages[monthIndex].sumHC += val.hc;
      monthlyAverages[monthIndex].count += 1;
    }
  });

  const getDayEstimation = (monthIndex: number) => {
    const monthData = monthlyAverages[monthIndex];
    if (monthData && monthData.count > 0) {
      return {
        hp: monthData.sumHP / monthData.count,
        hc: monthData.sumHC / monthData.count,
      };
    }
    return {
      hp: avgHP,
      hc: avgHC,
    };
  };

  // 3. Boucler sur chaque jour de l'intervalle demandé et sommer les consommations réelles ou estimées
  let accumConsoHP = 0;
  let accumConsoHC = 0;
  let accumCoutTTC = 0;
  let accumAboBaseSum = 0;
  let joursInInterval = 0;

  const startDate = new Date(dateDebutStr);
  const endDate = new Date(dateFinStr);
  const tempDate = new Date(startDate);

  while (tempDate <= endDate) {
    const year = tempDate.getFullYear();
    const monthNum = tempDate.getMonth() + 1;
    const monthStr = String(monthNum).padStart(2, '0');
    const dayStr = String(tempDate.getDate()).padStart(2, '0');
    const currentDateStr = `${year}-${monthStr}-${dayStr}`;

    const configActive = getConfigPourDate(currentDateStr, config);

    let dayHP = 0;
    let dayHC = 0;

    if (coveredDays.has(currentDateStr)) {
      const cov = coveredDays.get(currentDateStr)!;
      dayHP = cov.hp;
      dayHC = cov.hc;
    } else {
      // Jour futur ou non couvert : on estime avec la moyenne du même mois de l'année ou globale
      const est = getDayEstimation(monthNum - 1);
      dayHP = est.hp;
      dayHC = est.hc;
    }

    const detailsHT = calculerCoutDetails(dayHP, dayHC, 1 / 30.44, configActive, false);

    accumConsoHP += dayHP;
    accumConsoHC += dayHC;
    accumCoutTTC += detailsHT.coutTotalTTC;
    accumAboBaseSum += configActive.abonnementMensuel;
    joursInInterval += 1;

    tempDate.setDate(tempDate.getDate() + 1);
  }

  const totalConso = accumConsoHP + accumConsoHC;
  const ratioHP = totalConso > 0 ? (accumConsoHP / totalConso) * 100 : 50;
  const nombreDeMois = joursInInterval / 30.44;
  const overrideAbonnement = joursInInterval > 0 ? (accumAboBaseSum / joursInInterval) : config.abonnementMensuel;

  return {
    totalConsoHP: Math.round(accumConsoHP * 10) / 10,
    totalConsoHC: Math.round(accumConsoHC * 10) / 10,
    totalConso: Math.round(totalConso * 10) / 10,
    totalCoutTTC: Math.round(accumCoutTTC * 100) / 100,
    ratioHP: Math.round(ratioHP * 10) / 10,
    nombreDeMois: Math.round(nombreDeMois * 100) / 100,
    overrideAbonnement: Math.round(overrideAbonnement * 100) / 100,
  };
}

