/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  GitCompare, 
  Calendar, 
  Zap, 
  Euro, 
  TrendingUp, 
  TrendingDown, 
  Info, 
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  Scale
} from 'lucide-react';
import { Releve, TarifConfig } from '../types';
import { getConfigPourDate, calculerCoutDetails } from '../utils/calc';

interface ComparateurProps {
  releves: Releve[];
  config: TarifConfig;
}

const MOIS_FR = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' }
];

interface PeriodStats {
  startIso: string;
  endIso: string;
  nbJours: number;
  consoHP: number;
  consoHC: number;
  consoTotale: number;
  coutEnergieHT: number;
  coutAbonnementHT: number;
  coutCTAHT: number;
  coutCSPEHT: number;
  totalTaxesHT: number;
  coutTVA: number;
  coutTotalTTC: number;
  prixMoyenKwhTTC: number;
  consoMoyenneJour: number;
  coutMoyenJourTTC: number;
  nbJoursReels: number;
  nbJoursEstimes: number;
}

interface TariffSummaryItem {
  id: string;
  name: string;
  debut: string;
  fin: string;
  prixKwhBase: number;
  prixKwhHP: number;
  prixKwhHC: number;
  abonnementMensuel: number;
  cta: number;
  cspe: number;
  tvaReduite: number;
  tvaNormale: number;
  ctaType: string;
  cspeType: string;
}

function getActiveTariffSummary(startIso: string, endIso: string, config: TarifConfig): TariffSummaryItem[] {
  if (!startIso || !endIso || startIso > endIso) return [];
  const map = new Map<string, TariffSummaryItem>();

  const [sY, sM, sD] = startIso.split('-').map(Number);
  const [eY, eM, eD] = endIso.split('-').map(Number);
  const startDate = new Date(sY, sM - 1, sD, 12, 0, 0);
  const endDate = new Date(eY, eM - 1, eD, 12, 0, 0);
  const tempDate = new Date(startDate);

  while (tempDate <= endDate) {
    const year = tempDate.getFullYear();
    const monthStr = String(tempDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(tempDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;

    const configActive = getConfigPourDate(dateStr, config);

    const matched = (config.periodes || []).find(p => {
      const debut = p.debut;
      const fin = p.fin && p.fin.trim() !== '' ? p.fin : '9999-12-31';
      return dateStr >= debut && dateStr <= fin;
    });

    const key = matched ? (matched.id || `${matched.debut}_${matched.fin}`) : 'default_config';

    if (!map.has(key)) {
      map.set(key, {
        id: key,
        name: matched ? (matched.nom || 'Période Historique') : 'Configuration Contrat (Tarif Actuel)',
        debut: matched ? matched.debut : (config.debut || startIso),
        fin: matched ? (matched.fin || 'Actuel') : (config.fin || 'Actuel'),
        prixKwhBase: configActive.prixKwhBase,
        prixKwhHP: configActive.prixKwhHP,
        prixKwhHC: configActive.prixKwhHC,
        abonnementMensuel: configActive.abonnementMensuel,
        cta: configActive.taxes.cta,
        cspe: configActive.taxes.cspe,
        tvaReduite: configActive.taxes.tvaReduite,
        tvaNormale: configActive.taxes.tvaNormale,
        ctaType: configActive.taxes.ctaType || 'pourcentage',
        cspeType: configActive.taxes.cspeType || 'par_kwh',
      });
    }

    tempDate.setDate(tempDate.getDate() + 1);
  }

  return Array.from(map.values());
}

export default function Comparateur({ releves, config }: ComparateurProps) {
  // Déterminer les années disponibles dans l'historique
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set<number>([currentYear - 1, currentYear]);
    releves.forEach(r => {
      const y = parseInt(r.date.split('-')[0], 10);
      if (!isNaN(y)) {
        yearsSet.add(y);
        yearsSet.add(y - 1);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [releves]);

  // État du mode de comparaison : 'mois' (Mois & Année) ou 'periode' (Dates de début et fin)
  const [comparisonMode, setComparisonMode] = useState<'mois' | 'periode'>('mois');

  // État pour le mode 'mois'
  const defaultYear = availableYears[0] || new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<number>(1); // Janvier par défaut
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);

  // État pour le mode 'periode'
  const defaultStart = `${defaultYear}-01-01`;
  const defaultEnd = `${defaultYear}-01-31`;
  const [dateDebut, setDateDebut] = useState<string>(defaultStart);
  const [dateFin, setDateFin] = useState<string>(defaultEnd);

  // Helper pour formater une date ISO au format FR
  const toFrenchDate = (isoStr: string) => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length !== 3) return isoStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Calcul des intervalles exacts N (sélection) et N-1 (année précédente)
  const { periodN, periodN1, labelN, labelN1 } = useMemo(() => {
    if (comparisonMode === 'mois') {
      const monthStr = String(selectedMonth).padStart(2, '0');
      
      // Période N
      const startN = `${selectedYear}-${monthStr}-01`;
      const lastDayN = new Date(selectedYear, selectedMonth, 0).getDate();
      const endN = `${selectedYear}-${monthStr}-${String(lastDayN).padStart(2, '0')}`;

      // Période N-1
      const prevYear = selectedYear - 1;
      const startN1 = `${prevYear}-${monthStr}-01`;
      const lastDayN1 = new Date(prevYear, selectedMonth, 0).getDate();
      const endN1 = `${prevYear}-${monthStr}-${String(lastDayN1).padStart(2, '0')}`;

      const monthName = MOIS_FR.find(m => m.value === selectedMonth)?.label || '';

      return {
        periodN: { start: startN, end: endN },
        periodN1: { start: startN1, end: endN1 },
        labelN: `${monthName} ${selectedYear}`,
        labelN1: `${monthName} ${prevYear}`
      };
    } else {
      // Mode période personnalisée par dates
      const startN = dateDebut || `${defaultYear}-01-01`;
      const endN = dateFin || `${defaultYear}-01-31`;

      // Décaler de -1 an
      const shiftMinusOneYear = (isoStr: string) => {
        const [y, m, d] = isoStr.split('-').map(Number);
        const prevY = y - 1;
        const maxD = new Date(prevY, m, 0).getDate();
        const safeD = Math.min(d, maxD);
        return `${prevY}-${String(m).padStart(2, '0')}-${String(safeD).padStart(2, '0')}`;
      };

      const startN1 = shiftMinusOneYear(startN);
      const endN1 = shiftMinusOneYear(endN);

      return {
        periodN: { start: startN, end: endN },
        periodN1: { start: startN1, end: endN1 },
        labelN: `Période du ${toFrenchDate(startN)} au ${toFrenchDate(endN)}`,
        labelN1: `Période du ${toFrenchDate(startN1)} au ${toFrenchDate(endN1)} (N-1)`
      };
    }
  }, [comparisonMode, selectedMonth, selectedYear, dateDebut, dateFin, defaultYear]);

  // Fonction de calcul des statistiques détaillées pour un intervalle [startIso, endIso]
  const calculateIntervalStats = (startIso: string, endIso: string): PeriodStats => {
    if (!startIso || !endIso || startIso > endIso || releves.length < 2) {
      return {
        startIso,
        endIso,
        nbJours: 0,
        consoHP: 0,
        consoHC: 0,
        consoTotale: 0,
        coutEnergieHT: 0,
        coutAbonnementHT: 0,
        coutCTAHT: 0,
        coutCSPEHT: 0,
        totalTaxesHT: 0,
        coutTVA: 0,
        coutTotalTTC: 0,
        prixMoyenKwhTTC: 0,
        consoMoyenneJour: 0,
        coutMoyenJourTTC: 0,
        nbJoursReels: 0,
        nbJoursEstimes: 0,
      };
    }

    const sorted = [...releves].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const lastReleveDate = sorted[sorted.length - 1].date;

    // 1. Map des jours couverts par les relevés réels
    const coveredDays = new Map<string, { hp: number; hc: number }>();
    for (let i = 0; i < sorted.length - 1; i++) {
      const r1 = sorted[i];
      const r2 = sorted[i + 1];
      const d1 = new Date(r1.date);
      const d2 = new Date(r2.date);
      const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) continue;

      const deltaHP = r2.indexHP - r1.indexHP;
      const deltaHC = config.type === 'HP_HC' ? (r2.indexHC - r1.indexHC) : 0;
      const dailyHP = deltaHP / diffDays;
      const dailyHC = deltaHC / diffDays;

      const tempDate = new Date(d1);
      for (let d = 0; d < diffDays; d++) {
        tempDate.setDate(tempDate.getDate() + 1);
        const year = tempDate.getFullYear();
        const month = String(tempDate.getMonth() + 1).padStart(2, '0');
        const day = String(tempDate.getDate()).padStart(2, '0');
        coveredDays.set(`${year}-${month}-${day}`, { hp: dailyHP, hc: dailyHC });
      }
    }

    // 2. Moyennes mensuelles pour les jours estimatifs
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
      const monthIdx = parseInt(dateStr.split('-')[1], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        monthlyAverages[monthIdx].sumHP += val.hp;
        monthlyAverages[monthIdx].sumHC += val.hc;
        monthlyAverages[monthIdx].count += 1;
      }
    });

    const getDayEstimation = (monthIdx: number) => {
      const mData = monthlyAverages[monthIdx];
      if (mData && mData.count > 0) {
        return { hp: mData.sumHP / mData.count, hc: mData.sumHC / mData.count };
      }
      return { hp: avgHP, hc: avgHC };
    };

    // 3. Boucler sur chaque jour de l'intervalle [startIso, endIso]
    let accumHP = 0;
    let accumHC = 0;
    let accumEnergieHT = 0;
    let accumAbonnementHT = 0;
    let accumCTAHT = 0;
    let accumCSPEHT = 0;
    let accumTVA = 0;
    let accumTotalTTC = 0;
    let nbJours = 0;
    let nbJoursReels = 0;
    let nbJoursEstimes = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    const [sY, sM, sD] = startIso.split('-').map(Number);
    const [eY, eM, eD] = endIso.split('-').map(Number);
    const startDate = new Date(sY, sM - 1, sD, 12, 0, 0);
    const endDate = new Date(eY, eM - 1, eD, 12, 0, 0);
    const tempDate = new Date(startDate);

    while (tempDate <= endDate) {
      const year = tempDate.getFullYear();
      const monthNum = tempDate.getMonth() + 1;
      const monthStr = String(monthNum).padStart(2, '0');
      const dayStr = String(tempDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const isReal = coveredDays.has(dateStr);
      const isEstime = Boolean((lastReleveDate && dateStr > lastReleveDate) || dateStr > todayStr || !isReal);

      if (isReal && !isEstime) {
        nbJoursReels++;
      } else {
        nbJoursEstimes++;
      }

      let dayHP = 0;
      let dayHC = 0;

      if (isReal) {
        const cov = coveredDays.get(dateStr)!;
        dayHP = cov.hp;
        dayHC = cov.hc;
      } else {
        const est = getDayEstimation(monthNum - 1);
        dayHP = est.hp;
        dayHC = est.hc;
      }

      const configActive = getConfigPourDate(dateStr, config);
      const details = calculerCoutDetails(dayHP, dayHC, 1 / 30.4375, configActive, false);

      accumHP += dayHP;
      accumHC += dayHC;
      accumEnergieHT += details.coutEnergieHT;
      accumAbonnementHT += details.coutAbonnementHT;
      accumCTAHT += details.coutCTAHT;
      accumCSPEHT += details.coutCSPEHT;
      accumTVA += details.coutTVA;
      accumTotalTTC += details.coutTotalTTC;
      nbJours++;

      tempDate.setDate(tempDate.getDate() + 1);
    }

    const consoTotale = accumHP + accumHC;
    const totalTaxesHT = accumCTAHT + accumCSPEHT;
    const prixMoyenKwhTTC = consoTotale > 0 ? accumTotalTTC / consoTotale : 0;
    const consoMoyenneJour = nbJours > 0 ? consoTotale / nbJours : 0;
    const coutMoyenJourTTC = nbJours > 0 ? accumTotalTTC / nbJours : 0;

    return {
      startIso,
      endIso,
      nbJours,
      consoHP: Math.round(accumHP * 10) / 10,
      consoHC: Math.round(accumHC * 10) / 10,
      consoTotale: Math.round(consoTotale * 10) / 10,
      coutEnergieHT: Math.round(accumEnergieHT * 100) / 100,
      coutAbonnementHT: Math.round(accumAbonnementHT * 100) / 100,
      coutCTAHT: Math.round(accumCTAHT * 100) / 100,
      coutCSPEHT: Math.round(accumCSPEHT * 100) / 100,
      totalTaxesHT: Math.round(totalTaxesHT * 100) / 100,
      coutTVA: Math.round(accumTVA * 100) / 100,
      coutTotalTTC: Math.round(accumTotalTTC * 100) / 100,
      prixMoyenKwhTTC: Math.round(prixMoyenKwhTTC * 10000) / 10000,
      consoMoyenneJour: Math.round(consoMoyenneJour * 10) / 10,
      coutMoyenJourTTC: Math.round(coutMoyenJourTTC * 100) / 100,
      nbJoursReels,
      nbJoursEstimes,
    };
  };

  // Helper pour extraire les tarifs et taxes applicables depuis Configuration Contrat et l'Historique des Périodes
  const activeTariffsN1 = useMemo(() => {
    return getActiveTariffSummary(periodN1.start, periodN1.end, config);
  }, [periodN1, config]);

  const activeTariffsN = useMemo(() => {
    return getActiveTariffSummary(periodN.start, periodN.end, config);
  }, [periodN, config]);

  // Calcul des statistiques pour l'année précédente (N-1) et la sélection (N)
  const statsN1 = useMemo(() => calculateIntervalStats(periodN1.start, periodN1.end), [periodN1, releves, config]);
  const statsN = useMemo(() => calculateIntervalStats(periodN.start, periodN.end), [periodN, releves, config]);

  // Calculs des écarts / deltas (N vs N-1)
  const deltaConso = Math.round((statsN.consoTotale - statsN1.consoTotale) * 10) / 10;
  const percentConso = statsN1.consoTotale > 0 ? ((statsN.consoTotale - statsN1.consoTotale) / statsN1.consoTotale) * 100 : 0;

  const deltaCoutTTC = Math.round((statsN.coutTotalTTC - statsN1.coutTotalTTC) * 100) / 100;
  const percentCoutTTC = statsN1.coutTotalTTC > 0 ? ((statsN.coutTotalTTC - statsN1.coutTotalTTC) / statsN1.coutTotalTTC) * 100 : 0;

  const deltaPrixKwh = Math.round((statsN.prixMoyenKwhTTC - statsN1.prixMoyenKwhTTC) * 10000) / 10000;
  const percentPrixKwh = statsN1.prixMoyenKwhTTC > 0 ? ((statsN.prixMoyenKwhTTC - statsN1.prixMoyenKwhTTC) / statsN1.prixMoyenKwhTTC) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* En-tête et Sélecteurs de Comparaison */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-600" />
              Comparateur de Consommation & Factures
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Comparez votre consommation en kWh et vos coûts TTC entre la sélection choisie et l'année précédente (N-1).
            </p>
          </div>

          {/* Mode Switch Button */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setComparisonMode('mois')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                comparisonMode === 'mois'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Par mois civil</span>
            </button>
            <button
              type="button"
              onClick={() => setComparisonMode('periode')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                comparisonMode === 'periode'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Par plage de dates</span>
            </button>
          </div>
        </div>

        {/* Formulaire de Sélection */}
        {comparisonMode === 'mois' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end bg-slate-50/80 p-4 rounded-xl border border-slate-200/60">
            <div>
              <label htmlFor="select-comparateur-mois" className="block text-xs font-bold text-slate-700 mb-1.5">
                Mois à comparer
              </label>
              <select
                id="select-comparateur-mois"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
              >
                {MOIS_FR.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="select-comparateur-annee" className="block text-xs font-bold text-slate-700 mb-1.5">
                Année de sélection (N)
              </label>
              <select
                id="select-comparateur-annee"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Année {yr} (vs {yr - 1})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-600 bg-blue-50/80 border border-blue-200/80 p-2.5 rounded-lg flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Comparaison directe du mois de <strong>{labelN}</strong> avec le même mois de l'année précédente (<strong>{labelN1}</strong>).
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end bg-slate-50/80 p-4 rounded-xl border border-slate-200/60">
            <div>
              <label htmlFor="input-comparateur-date-debut" className="block text-xs font-bold text-slate-700 mb-1.5">
                Date de début (jj/mm/aaaa)
              </label>
              <input
                id="input-comparateur-date-debut"
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
              />
            </div>

            <div>
              <label htmlFor="input-comparateur-date-fin" className="block text-xs font-bold text-slate-700 mb-1.5">
                Date de fin (jj/mm/aaaa)
              </label>
              <input
                id="input-comparateur-date-fin"
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
              />
            </div>

            <div className="text-xs text-slate-600 bg-blue-50/80 border border-blue-200/80 p-2.5 rounded-lg flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                La période sélectionnée sera comparée automatiquement avec la même période décalée de 1 an.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Cartes d'indications / Synthèse des Ecarts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {/* Carte 1 : Nombre de kWh comparé */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Nombre de kWh comparé
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Zap className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {statsN.consoTotale.toLocaleString('fr-FR')} kWh
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                (N)
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Année N-1 : <strong className="font-mono text-slate-700">{statsN1.consoTotale.toLocaleString('fr-FR')} kWh</strong>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Écart :</span>
            <span
              className={`px-2.5 py-1 rounded-lg font-mono font-bold flex items-center gap-1 ${
                deltaConso < 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                  : deltaConso > 0
                  ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {deltaConso < 0 ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : deltaConso > 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : null}
              {deltaConso > 0 ? `+${deltaConso.toFixed(1)}` : deltaConso.toFixed(1)} kWh ({percentConso > 0 ? `+${percentConso.toFixed(1)}` : percentConso.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Carte 2 : Total en TTC */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total en TTC
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Euro className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {statsN.coutTotalTTC.toFixed(2).replace('.', ',')} €
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                TTC (N)
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Année N-1 : <strong className="font-mono text-slate-700">{statsN1.coutTotalTTC.toFixed(2).replace('.', ',')} € TTC</strong>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Écart :</span>
            <span
              className={`px-2.5 py-1 rounded-lg font-mono font-bold flex items-center gap-1 ${
                deltaCoutTTC < 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                  : deltaCoutTTC > 0
                  ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {deltaCoutTTC < 0 ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : deltaCoutTTC > 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : null}
              {deltaCoutTTC > 0 ? `+${deltaCoutTTC.toFixed(2).replace('.', ',')}` : deltaCoutTTC.toFixed(2).replace('.', ',')} € ({percentCoutTTC > 0 ? `+${percentCoutTTC.toFixed(1)}` : percentCoutTTC.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Carte 3 : Hausse Tarifaire */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Hausse Tarifaire
            </span>
            <div className={`p-2 rounded-xl ${
              percentPrixKwh > 0
                ? 'bg-rose-50 text-rose-600'
                : percentPrixKwh < 0
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-slate-50 text-slate-600'
            }`}>
              {percentPrixKwh < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono tracking-tight ${
                percentPrixKwh > 0
                  ? 'text-rose-600'
                  : percentPrixKwh < 0
                  ? 'text-emerald-600'
                  : 'text-slate-900'
              }`}>
                {percentPrixKwh > 0 ? `+${percentPrixKwh.toFixed(2).replace('.', ',')}%` : `${percentPrixKwh.toFixed(2).replace('.', ',')}%`}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                percentPrixKwh > 0
                  ? 'bg-rose-100 text-rose-800'
                  : percentPrixKwh < 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {percentPrixKwh > 0 ? 'Hausse' : percentPrixKwh < 0 ? 'Baisse' : 'Stable'}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Écart kWh TTC : <strong className="font-mono text-slate-700">{deltaPrixKwh > 0 ? `+${deltaPrixKwh.toFixed(4).replace('.', ',')}` : deltaPrixKwh.toFixed(4).replace('.', ',')} €/kWh</strong>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Tarif moyen N-1 → N :</span>
            <span className="font-mono font-bold text-slate-700 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
              {statsN1.prixMoyenKwhTTC.toFixed(3).replace('.', ',')} € → {statsN.prixMoyenKwhTTC.toFixed(3).replace('.', ',')} €
            </span>
          </div>
        </div>

        {/* Carte 4 : Prix moyen kWh TTC */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Prix moyen kWh TTC
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {statsN.prixMoyenKwhTTC.toFixed(4).replace('.', ',')} €
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                /kWh
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Année N-1 : <strong className="font-mono text-slate-700">{statsN1.prixMoyenKwhTTC.toFixed(4).replace('.', ',')} €/kWh</strong>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Variation :</span>
            <span className="font-mono font-bold text-slate-700 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
              {deltaPrixKwh > 0 ? `+${deltaPrixKwh.toFixed(4).replace('.', ',')}` : deltaPrixKwh.toFixed(4).replace('.', ',')} €/kWh ({percentPrixKwh > 0 ? `+${percentPrixKwh.toFixed(1)}` : percentPrixKwh.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Carte 5 : Moyenne journalière */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Moyenne par jour
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {statsN.consoMoyenneJour.toFixed(1)} kWh/j
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Coût quotidien : <strong className="font-mono text-slate-700">{statsN.coutMoyenJourTTC.toFixed(2).replace('.', ',')} €/j</strong>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Écart conso :</span>
            <span className="font-mono font-bold text-slate-700 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
              {(statsN.consoMoyenneJour - statsN1.consoMoyenneJour) > 0 ? `+${(statsN.consoMoyenneJour - statsN1.consoMoyenneJour).toFixed(1)}` : (statsN.consoMoyenneJour - statsN1.consoMoyenneJour).toFixed(1)} kWh/j
            </span>
          </div>
        </div>
      </div>

      {/* Bandeau d'information sur la provenance des tarifs et taxes */}
      <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50/60 rounded-2xl border border-blue-200/80 p-4 shadow-2xs flex items-start gap-3 text-xs text-slate-700">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-900">
            Source des tarifs des kW, abonnement, taxes et TVA :
          </p>
          <p className="leading-relaxed">
            Pour chaque jour comparé, les tarifs du kWh (Base, HP, HC), de l'abonnement mensuel, des taxes (CTA, CSPE/Accise) et des taux de TVA (5,5% et 20%) sont extraits directement des paramètres de <strong>Configuration Contrat</strong>, de <strong>Configuration du contrat & tarifs</strong> ainsi que de l'<strong>Historique des périodes de tarifs & abonnements</strong>.
          </p>
        </div>
      </div>

      {/* 2 Tableaux côte à côte */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tableau de GAUCHE : Année précédente (N-1) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 text-white flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider bg-slate-700/80 text-slate-200 px-2.5 py-0.5 rounded-md border border-slate-600">
                  Année Précédente (N-1)
                </span>
              </div>
              <h3 className="text-sm font-bold mt-1 text-white">
                {labelN1}
              </h3>
            </div>
            <div className="text-right font-mono text-xs text-slate-300">
              <div>Période : {toFrenchDate(statsN1.startIso)}</div>
              <div>au {toFrenchDate(statsN1.endIso)}</div>
            </div>
          </div>

          <div className="p-4 flex-1 space-y-4">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase font-bold text-slate-400 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Indicateur</th>
                  <th className="py-2.5 px-3 text-right">Valeur N-1</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-700">Durée de la période</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{statsN1.nbJours} jours</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-700">Type de données</td>
                  <td className="py-2.5 px-3 text-right text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                      {statsN1.nbJoursReels}j réels • {statsN1.nbJoursEstimes}j estimés
                    </span>
                  </td>
                </tr>

                {config.type === 'HP_HC' && (
                  <>
                    <tr className="bg-blue-50/30">
                      <td className="py-2.5 px-3 font-semibold text-blue-900">Consommation HP (Heures Pleines)</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">{statsN1.consoHP.toLocaleString('fr-FR')} kWh</td>
                    </tr>
                    <tr className="bg-indigo-50/30">
                      <td className="py-2.5 px-3 font-semibold text-indigo-900">Consommation HC (Heures Creuses)</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900">{statsN1.consoHC.toLocaleString('fr-FR')} kWh</td>
                    </tr>
                  </>
                )}

                <tr className="bg-slate-50/80 font-bold border-y border-slate-200">
                  <td className="py-3 px-3 text-slate-900">TOTAL CONSOMMATION (kWh)</td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-slate-900">{statsN1.consoTotale.toLocaleString('fr-FR')} kWh</td>
                </tr>

                <tr>
                  <td className="py-2.5 px-3 text-slate-600">Coût Énergie (kWh) HT</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">{statsN1.coutEnergieHT.toFixed(2).replace('.', ',')} €</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-slate-600">Part Abonnement (Fixe) HT</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">{statsN1.coutAbonnementHT.toFixed(2).replace('.', ',')} €</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-slate-600">Taxes & Contributions HT (CTA, CSPE/Accise)</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">{statsN1.totalTaxesHT.toFixed(2).replace('.', ',')} €</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-slate-600">TVA Totale (5,5% et 20%)</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">{statsN1.coutTVA.toFixed(2).replace('.', ',')} €</td>
                </tr>

                <tr className="bg-slate-900 text-white font-bold text-sm">
                  <td className="py-3.5 px-3 rounded-l-xl">TOTAL FACTURE (TTC)</td>
                  <td className="py-3.5 px-3 text-right font-mono rounded-r-xl text-emerald-400 font-black">
                    {statsN1.coutTotalTTC.toFixed(2).replace('.', ',')} €
                  </td>
                </tr>

                <tr className="pt-2">
                  <td className="py-2 px-3 text-slate-500">Moyenne quotidienne (kWh/j)</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">{statsN1.consoMoyenneJour.toFixed(1)} kWh/j</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-500">Moyenne quotidienne (€ TTC/j)</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">{statsN1.coutMoyenJourTTC.toFixed(2).replace('.', ',')} €/j</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-500">Coût unitaire moyen du kWh TTC</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">{statsN1.prixMoyenKwhTTC.toFixed(4).replace('.', ',')} €/kWh</td>
                </tr>
              </tbody>
            </table>

            {/* Détail des tarifs & taxes appliqués pour N-1 */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <h4 className="text-[11px] uppercase font-extrabold tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-600" />
                Tarifs, Taxes & TVA appliqués (N-1)
              </h4>
              <div className="space-y-2">
                {activeTariffsN1.map((item) => (
                  <div key={item.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>{item.name}</span>
                      <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {toFrenchDate(item.debut)} au {toFrenchDate(item.fin)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1.5 border-t border-slate-200/60">
                      <div>
                        {config.type === 'HP_HC' ? (
                          <>
                            <div>HP : <strong className="font-mono text-slate-800">{item.prixKwhHP.toFixed(4).replace('.', ',')} €/kWh</strong></div>
                            <div>HC : <strong className="font-mono text-slate-800">{item.prixKwhHC.toFixed(4).replace('.', ',')} €/kWh</strong></div>
                          </>
                        ) : (
                          <div>Base : <strong className="font-mono text-slate-800">{item.prixKwhBase.toFixed(4).replace('.', ',')} €/kWh</strong></div>
                        )}
                        <div>Abonnement : <strong className="font-mono text-slate-800">{item.abonnementMensuel.toFixed(2).replace('.', ',')} €/mois</strong></div>
                      </div>
                      <div>
                        <div>CTA : <strong className="font-mono text-slate-800">{item.cta}{item.ctaType === 'pourcentage' ? '%' : ' €'}</strong></div>
                        <div>CSPE : <strong className="font-mono text-slate-800">{item.cspe} €/kWh</strong></div>
                        <div>TVA : <strong className="font-mono text-slate-800">{item.tvaReduite}% / {item.tvaNormale}%</strong></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tableau de DROITE : Sélection (N) */}
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden flex flex-col ring-1 ring-blue-500/20">
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-4 text-white flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider bg-blue-500/40 text-blue-100 px-2.5 py-0.5 rounded-md border border-blue-400/30">
                  Sélection (N)
                </span>
              </div>
              <h3 className="text-sm font-bold mt-1 text-white">
                {labelN}
              </h3>
            </div>
            <div className="text-right font-mono text-xs text-blue-200">
              <div>Période : {toFrenchDate(statsN.startIso)}</div>
              <div>au {toFrenchDate(statsN.endIso)}</div>
            </div>
          </div>

          <div className="p-4 flex-1 space-y-4">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase font-bold text-blue-900 bg-blue-50/60 border-b border-blue-200/80">
                <tr>
                  <th className="py-2.5 px-3">Indicateur</th>
                  <th className="py-2.5 px-3 text-right">Valeur N</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-700">Durée de la période</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{statsN.nbJours} jours</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-700">Type de données</td>
                  <td className="py-2.5 px-3 text-right text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-medium border border-blue-200/60">
                      {statsN.nbJoursReels}j réels • {statsN.nbJoursEstimes}j estimés
                    </span>
                  </td>
                </tr>

                {config.type === 'HP_HC' && (
                  <>
                    <tr className="bg-blue-50/30">
                      <td className="py-2.5 px-3 font-semibold text-blue-900">Consommation HP (Heures Pleines)</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">{statsN.consoHP.toLocaleString('fr-FR')} kWh</td>
                    </tr>
                    <tr className="bg-indigo-50/30">
                      <td className="py-2.5 px-3 font-semibold text-indigo-900">Consommation HC (Heures Creuses)</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900">{statsN.consoHC.toLocaleString('fr-FR')} kWh</td>
                    </tr>
                  </>
                )}

                <tr className="bg-blue-50/80 font-bold border-y border-blue-200">
                  <td className="py-3 px-3 text-blue-950">TOTAL CONSOMMATION (kWh)</td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-blue-950">{statsN.consoTotale.toLocaleString('fr-FR')} kWh</td>
                </tr>

                <tr>
                  <td className="py-2.5 px-3 text-slate-600">Coût Énergie (kWh) HT</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">{statsN.coutEnergieHT.toFixed(2).replace('.', ',')} €</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-slate-600">Part Abonnement (Fixe) HT</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">{statsN.coutAbonnementHT.toFixed(2).replace('.', ',')} €</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-slate-600">Taxes & Contributions HT (CTA, CSPE/Accise)</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">{statsN.totalTaxesHT.toFixed(2).replace('.', ',')} €</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-slate-600">TVA Totale (5,5% et 20%)</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">{statsN.coutTVA.toFixed(2).replace('.', ',')} €</td>
                </tr>

                <tr className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white font-bold text-sm">
                  <td className="py-3.5 px-3 rounded-l-xl">TOTAL FACTURE (TTC)</td>
                  <td className="py-3.5 px-3 text-right font-mono rounded-r-xl text-emerald-300 font-black">
                    {statsN.coutTotalTTC.toFixed(2).replace('.', ',')} €
                  </td>
                </tr>

                <tr className="pt-2">
                  <td className="py-2 px-3 text-slate-500">Moyenne quotidienne (kWh/j)</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">{statsN.consoMoyenneJour.toFixed(1)} kWh/j</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-500">Moyenne quotidienne (€ TTC/j)</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">{statsN.coutMoyenJourTTC.toFixed(2).replace('.', ',')} €/j</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-slate-500">Coût unitaire moyen du kWh TTC</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">{statsN.prixMoyenKwhTTC.toFixed(4).replace('.', ',')} €/kWh</td>
                </tr>
              </tbody>
            </table>

            {/* Détail des tarifs & taxes appliqués pour N */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <h4 className="text-[11px] uppercase font-extrabold tracking-wider text-blue-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Tarifs, Taxes & TVA appliqués (N)
              </h4>
              <div className="space-y-2">
                {activeTariffsN.map((item) => (
                  <div key={item.id} className="bg-blue-50/50 rounded-xl p-3 border border-blue-200/80 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-blue-950">
                      <span>{item.name}</span>
                      <span className="text-[10px] font-mono text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                        {toFrenchDate(item.debut)} au {toFrenchDate(item.fin)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 pt-1.5 border-t border-blue-200/60">
                      <div>
                        {config.type === 'HP_HC' ? (
                          <>
                            <div>HP : <strong className="font-mono text-blue-950">{item.prixKwhHP.toFixed(4).replace('.', ',')} €/kWh</strong></div>
                            <div>HC : <strong className="font-mono text-blue-950">{item.prixKwhHC.toFixed(4).replace('.', ',')} €/kWh</strong></div>
                          </>
                        ) : (
                          <div>Base : <strong className="font-mono text-blue-950">{item.prixKwhBase.toFixed(4).replace('.', ',')} €/kWh</strong></div>
                        )}
                        <div>Abonnement : <strong className="font-mono text-blue-950">{item.abonnementMensuel.toFixed(2).replace('.', ',')} €/mois</strong></div>
                      </div>
                      <div>
                        <div>CTA : <strong className="font-mono text-blue-950">{item.cta}{item.ctaType === 'pourcentage' ? '%' : ' €'}</strong></div>
                        <div>CSPE : <strong className="font-mono text-blue-950">{item.cspe} €/kWh</strong></div>
                        <div>TVA : <strong className="font-mono text-blue-950">{item.tvaReduite}% / {item.tvaNormale}%</strong></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
