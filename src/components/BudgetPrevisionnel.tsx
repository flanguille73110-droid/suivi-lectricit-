/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Percent, ShieldAlert, ArrowUpRight, TrendingDown, Filter, X, Info } from 'lucide-react';
import { AnalyseMois, TarifConfig } from '../types';
import { calculerCoutDetails, getConfigPourDate } from '../utils/calc';

interface BudgetPrevisionnelProps {
  analyseMois: AnalyseMois[];
  config: TarifConfig;
  onFilteredStatsChange?: (stats: {
    totalConso: number;
    totalCoutTTC: number;
    ratioHP: number;
    nombreDeMois: number;
    overrideAbonnement: number;
  } | null) => void;
}

export default function BudgetPrevisionnel({ 
  analyseMois, 
  config,
  onFilteredStatsChange 
}: BudgetPrevisionnelProps) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  if (analyseMois.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
        Veuillez enregistrer au moins 2 relevés pour simuler votre budget prévisionnel mensuel.
      </div>
    );
  }

  const getYearMonth = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1]}`;
    }
    return dateStr;
  };

  const getLabelYearMonth = (label: string): string => {
    const moisNoms = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const parts = label.split(' ');
    if (parts.length < 2) return '';
    const mIdx = moisNoms.indexOf(parts[0]);
    if (mIdx === -1) return '';
    const mStr = String(mIdx + 1).padStart(2, '0');
    return `${parts[1]}-${mStr}`;
  };

  // Fonction pour lister tous les mois "YYYY-MM" d'un intervalle
  const getMonthsInInterval = (start: string, end: string): string[] => {
    const keys: string[] = [];
    if (!start || !end) return keys;
    
    const [sY, sM] = start.split('-').map(Number);
    const [eY, eM] = end.split('-').map(Number);
    
    if (isNaN(sY) || isNaN(sM) || isNaN(eY) || isNaN(eM)) return keys;
    
    // Garde-fou : si l'utilisateur est en train de saisir la date (ex: année 0001 ou 0026),
    // on ne génère rien pour éviter de bloquer l'application avec des milliers de mois.
    if (sY < 2010 || sY > 2100 || eY < 2010 || eY > 2100) return keys;
    
    let curY = sY;
    let curM = sM;
    
    // Limite stricte de sécurité (max 60 mois / 5 ans) pour éviter tout gel du navigateur
    let safetyCounter = 0;
    while ((curY < eY || (curY === eY && curM <= eM)) && safetyCounter < 120) {
      safetyCounter++;
      keys.push(`${curY}-${String(curM).padStart(2, '0')}`);
      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
    }
    return keys;
  };

  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // 1. Déterminer l'intervalle d'affichage
  const keysDeLAnalyse = analyseMois.map(m => getLabelYearMonth(m.moisLabel)).filter(Boolean) as string[];
  const defaultStart = keysDeLAnalyse.length > 0 ? keysDeLAnalyse[0] : '';
  const defaultEnd = keysDeLAnalyse.length > 0 ? keysDeLAnalyse[keysDeLAnalyse.length - 1] : '';

  const startYm = startDate ? getYearMonth(startDate) : defaultStart;
  const endYm = endDate ? getYearMonth(endDate) : defaultEnd;

  const allMonthKeys = getMonthsInInterval(
    startYm ? `${startYm}-01` : '',
    endYm ? `${endYm}-28` : ''
  );

  // Fonction pour estimer la consommation journalière d'un mois spécifique
  const getMoyennesEstimation = (targetMonthNum: number, currentMonthKey: string, currentMoisReel?: AnalyseMois) => {
    // A. Chercher d'autres années pour le même mois civil (ex: autres mois de Juillet de l'historique)
    const moisAnterieurs = analyseMois.filter(moisItem => {
      const ym = getLabelYearMonth(moisItem.moisLabel);
      if (!ym) return false;
      const [y, mNum] = ym.split('-').map(Number);
      return mNum === targetMonthNum && ym !== currentMonthKey && (moisItem.jours || 0) > 0;
    });

    if (moisAnterieurs.length > 0) {
      let totalHP = 0;
      let totalHC = 0;
      let totalJours = 0;
      moisAnterieurs.forEach(moisItem => {
        totalHP += moisItem.consoHP;
        totalHC += moisItem.consoHC;
        totalJours += moisItem.jours || 30.44;
      });
      return {
        hp: totalHP / totalJours,
        hc: totalHC / totalJours,
        methode: 'historique'
      };
    }

    // B. À défaut, si on a déjà des jours enregistrés sur ce mois en cours, on extrapole à partir d'eux
    if (currentMoisReel && (currentMoisReel.jours || 0) > 0) {
      return {
        hp: currentMoisReel.consoHP / currentMoisReel.jours,
        hc: currentMoisReel.consoHC / currentMoisReel.jours,
        methode: 'portion_en_cours'
      };
    }

    // C. À défaut, on fait la moyenne globale de tous les mois de l'historique
    let totalHP = 0;
    let totalHC = 0;
    let totalJours = 0;
    analyseMois.forEach(m => {
      totalHP += m.consoHP;
      totalHC += m.consoHC;
      totalJours += m.jours || 30.44;
    });

    if (totalJours > 0) {
      return {
        hp: totalHP / totalJours,
        hc: totalHC / totalJours,
        methode: 'globale'
      };
    }

    // D. Fallback ultime
    return {
      hp: 10,
      hc: config.type === 'HP_HC' ? 5 : 0,
      methode: 'defaut'
    };
  };

  // Traiter la liste des mois de la période
  const processedAnalyseMois = allMonthKeys.map(monthKey => {
    const [yearNum, monthNum] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate(); // Nombre exact de jours du mois civil
    const labelRecherche = `${moisNoms[monthNum - 1]} ${yearNum}`;
    const moisReel = analyseMois.find(m => m.moisLabel === labelRecherche);

    let joursReels = 0;
    let isSimulation = false;
    let isIncomplet = false;
    let explanation = '';

    let finalConsoHP = 0;
    let finalConsoHC = 0;

    if (moisReel) {
      joursReels = moisReel.jours || daysInMonth;
      // On considère comme incomplet s'il y a une différence d'au moins 0.5 jour
      if (joursReels < daysInMonth - 0.5) {
        isIncomplet = true;
        const joursRestants = daysInMonth - joursReels;
        const estimation = getMoyennesEstimation(monthNum, monthKey, moisReel);
        
        const consoEstHP = estimation.hp * joursRestants;
        const consoEstHC = estimation.hc * joursRestants;

        finalConsoHP = moisReel.consoHP + consoEstHP;
        finalConsoHC = moisReel.consoHC + consoEstHC;

        if (estimation.methode === 'historique') {
          explanation = `Mois incomplet (${Math.round(joursReels)} jours réels enregistrés). Les ${Math.round(joursRestants)} jours restants du mois sont simulés sur la base de vos mois de ${moisNoms[monthNum - 1].toLowerCase()} antérieurs (soit environ ${(estimation.hp * 30.44).toFixed(0)} kWh/mois).`;
        } else if (estimation.methode === 'portion_en_cours') {
          explanation = `Mois incomplet (${Math.round(joursReels)} jours réels enregistrés). Les ${Math.round(joursRestants)} jours restants sont extrapolés à partir des jours déjà constatés sur ce même mois (soit environ ${(estimation.hp * 30.44).toFixed(0)} kWh/mois).`;
        } else {
          explanation = `Mois incomplet (${Math.round(joursReels)} jours réels enregistrés). Les ${Math.round(joursRestants)} jours restants sont simulés à partir de votre moyenne de consommation générale.`;
        }
      } else {
        // Complet
        finalConsoHP = moisReel.consoHP;
        finalConsoHC = moisReel.consoHC;
        explanation = `Mois entier couvert par vos relevés réels (${Math.round(joursReels)} jours).`;
      }
    } else {
      // Entièrement absent ou futur
      isSimulation = true;
      const estimation = getMoyennesEstimation(monthNum, monthKey);
      finalConsoHP = estimation.hp * daysInMonth;
      finalConsoHC = estimation.hc * daysInMonth;

      if (estimation.methode === 'historique') {
        explanation = `Mois entièrement simulé (${daysInMonth} jours). Projection basée sur l'historique de vos mois de ${moisNoms[monthNum - 1].toLowerCase()} antérieurs.`;
      } else {
        explanation = `Mois entièrement simulé (${daysInMonth} jours). Projection basée sur votre moyenne de consommation générale.`;
      }
    }

    // Calcul des coûts correspondants avec les tarifs exacts actifs pour ce mois
    const dateMilieuMois = `${yearNum}-${String(monthNum).padStart(2, '0')}-15`;
    const configActive = getConfigPourDate(dateMilieuMois, config);

    const detailsHT = calculerCoutDetails(finalConsoHP, finalConsoHC, 1, configActive, false);
    const detailsAvecHausse = calculerCoutDetails(finalConsoHP, finalConsoHC, 1, configActive, true);

    return {
      moisLabel: labelRecherche,
      consoHP: finalConsoHP,
      consoHC: finalConsoHC,
      consoTotale: finalConsoHP + finalConsoHC,
      coutEnergieHT: detailsHT.coutEnergieHT,
      coutAbonnementHT: detailsHT.coutAbonnementHT,
      coutCTAHT: detailsHT.coutCTAHT,
      coutCSPEHT: detailsHT.coutCSPEHT,
      coutTVA: detailsHT.coutTVA,
      coutTotalTTC: detailsHT.coutTotalTTC,
      coutAvecHausseTTC: detailsAvecHausse.coutTotalTTC,
      jours: daysInMonth,
      joursReels,
      isIncomplet,
      isSimulation,
      explanation,
      consoMoyHPJour: finalConsoHP / daysInMonth,
      consoMoyHCJour: finalConsoHC / daysInMonth,
    };
  });

  // Calculs des totaux cumulés sur la base du tableau simulé et filtré
  const totalConsoHP = processedAnalyseMois.reduce((acc, m) => acc + m.consoHP, 0);
  const totalConsoHC = processedAnalyseMois.reduce((acc, m) => acc + m.consoHC, 0);
  const totalConsoTotale = processedAnalyseMois.reduce((acc, m) => acc + m.consoTotale, 0);
  const totalCoutHT = processedAnalyseMois.reduce((acc, m) => acc + m.coutEnergieHT, 0);
  const totalAboHT = processedAnalyseMois.reduce((acc, m) => acc + m.coutAbonnementHT, 0);
  const totalCTAHT = processedAnalyseMois.reduce((acc, m) => acc + m.coutCTAHT, 0);
  const totalCSPEHT = processedAnalyseMois.reduce((acc, m) => acc + m.coutCSPEHT, 0);
  const totalTVA = processedAnalyseMois.reduce((acc, m) => acc + m.coutTVA, 0);
  const totalCoutTTC = processedAnalyseMois.reduce((acc, m) => acc + m.coutTotalTTC, 0);
  const totalCoutAvecHausseTTC = processedAnalyseMois.reduce((acc, m) => acc + m.coutAvecHausseTTC, 0);
  const totalSurcout = Math.max(0, totalCoutAvecHausseTTC - totalCoutTTC);

  // Jours cumulés et consommations moyennes journalières globales de l'intervalle
  const totalDays = processedAnalyseMois.reduce((acc, m) => acc + m.jours, 0);
  const totalAvgHP = totalDays > 0 ? (totalConsoHP / totalDays) : 0;
  const totalAvgHC = totalDays > 0 ? (totalConsoHC / totalDays) : 0;

  // Compter le nombre de projections et simulations pour informer l'utilisateur
  const nbIncomplets = processedAnalyseMois.filter(m => m.isIncomplet).length;
  const nbSimulations = processedAnalyseMois.filter(m => m.isSimulation).length;

  // Calculer l'abonnement mensuel moyen de la période sélectionnée
  let sumAbonnement = 0;
  processedAnalyseMois.forEach(m => {
    const ym = getLabelYearMonth(m.moisLabel);
    if (ym) {
      const [yearNum, monthNum] = ym.split('-').map(Number);
      const dateMilieuMois = `${yearNum}-${String(monthNum).padStart(2, '0')}-15`;
      const configActive = getConfigPourDate(dateMilieuMois, config);
      sumAbonnement += configActive.abonnementMensuel;
    } else {
      sumAbonnement += config.abonnementMensuel;
    }
  });
  const avgAbonnement = processedAnalyseMois.length > 0 ? sumAbonnement / processedAnalyseMois.length : config.abonnementMensuel;
  const ratioHP = totalConsoTotale > 0 ? (totalConsoHP / totalConsoTotale) * 100 : 50;
  const nombreDeMois = processedAnalyseMois.length;

  useEffect(() => {
    if (onFilteredStatsChange) {
      onFilteredStatsChange({
        totalConso: totalConsoTotale,
        totalCoutTTC,
        ratioHP,
        nombreDeMois,
        overrideAbonnement: avgAbonnement
      });
    }
    return () => {
      if (onFilteredStatsChange) {
        onFilteredStatsChange(null);
      }
    };
  }, [totalConsoTotale, totalCoutTTC, ratioHP, nombreDeMois, avgAbonnement, onFilteredStatsChange]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-md font-bold text-slate-900 uppercase tracking-wider">Tableau de budgétisation annuelle</h2>
          <p className="text-slate-500 text-xs mt-1">Détail mensuel de vos coûts avec décomposition précise de vos factures et simulation de hausse de tarif.</p>
        </div>

        {config.haussePrevue > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Impact d'une hausse de <strong className="font-bold">+{config.haussePrevue}%</strong> sur les prix du kWh.</span>
          </div>
        )}
      </div>

      {/* Filtres de Période (Date Début / Date Fin) */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mb-6">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono mb-3 flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-blue-600" />
          Filtrer la période de simulation
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="budget-start-date" className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              Date de début
            </label>
            <input
              id="budget-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-mono"
            />
          </div>
          
          <div>
            <label htmlFor="budget-end-date" className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              Date de fin
            </label>
            <input
              id="budget-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            {(startDate || endDate) ? (
              <button
                type="button"
                id="btn-clear-budget-dates"
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold font-mono uppercase tracking-wider cursor-pointer transition-all"
              >
                <X className="w-3.5 h-3.5" />
                Effacer les filtres
              </button>
            ) : (
              <div className="text-[10px] text-slate-400 font-medium pb-2 italic">
                Affichage de la période complète par défaut.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Informations et alertes de simulation */}
      {(nbIncomplets > 0 || nbSimulations > 0) && (
        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 mb-6 flex gap-3 text-xs text-blue-800">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-bold">Estimation Intelligente en cours :</span>
            <p className="leading-relaxed text-blue-700">
              Pour vous donner un tarif approximatif de ce que vous allez payer à votre prochaine facture, l'application a analysé les mois incomplets ou futurs sur la période sélectionnée :
            </p>
            <ul className="list-disc pl-4 mt-1 space-y-1 text-blue-700 font-medium">
              {nbIncomplets > 0 && (
                <li>
                  <strong>{nbIncomplets} mois incomplet(s) ou en cours</strong> : Les jours manquants ont été projetés en déduisant ce que vous avez déjà consommé et en ajoutant une estimation basée sur vos mois antérieurs de même période.
                </li>
              )}
              {nbSimulations > 0 && (
                <li>
                  <strong>{nbSimulations} mois entièrement simulé(s)</strong> : Votre consommation journalière a été projetée d'après l'historique de vos mois équivalents.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {processedAnalyseMois.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
          <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-xs font-semibold">Aucun mois de relevé ne correspond à cette période.</p>
          <p className="text-[11px] text-slate-400 mt-1">Veuillez modifier vos filtres ou ajouter des relevés sur ces dates.</p>
          <button
            type="button"
            onClick={() => { setStartDate(''); setEndDate(''); }}
            className="mt-4 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold font-mono uppercase tracking-wider cursor-pointer inline-flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Tout réinitialiser
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-mono text-xs uppercase border-b border-slate-200">
                  <th className="py-4 px-4 font-semibold min-w-[170px]">Période (Mois)</th>
                  <th className="py-4 px-4 font-semibold text-slate-500 text-center">Moy. HP/J</th>
                  {config.type === 'HP_HC' && <th className="py-4 px-4 font-semibold text-slate-500 text-center">Moy. HC/J</th>}
                  <th className="py-4 px-4 font-semibold">Conso {config.type === 'HP_HC' && 'HP'} (kWh)</th>
                  {config.type === 'HP_HC' && <th className="py-4 px-4 font-semibold">Conso HC (kWh)</th>}
                  <th className="py-4 px-4 font-semibold text-slate-500">Abo. & CTA (HT)</th>
                  <th className="py-4 px-4 font-semibold text-slate-500">Énergie HT</th>
                  <th className="py-4 px-4 font-semibold text-slate-500">CSPE (HT)</th>
                  <th className="py-4 px-4 font-semibold text-slate-500">TVA Globale</th>
                  <th className="py-4 px-4 font-semibold text-slate-900 bg-slate-50/50">Total TTC Actuel</th>
                  <th className="py-4 px-4 font-semibold text-purple-900 bg-purple-50/30">Total TTC (+{config.haussePrevue}%)</th>
                  <th className="py-4 px-4 font-semibold text-amber-900 text-right">Surcoût</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {processedAnalyseMois.map((mois, index) => {
                  const surcoutMois = Math.max(0, mois.coutAvecHausseTTC - mois.coutTotalTTC);

                  return (
                    <tr key={index} className="hover:bg-slate-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 flex flex-col gap-1.5 justify-center">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{mois.moisLabel}</span>
                        </div>
                        {mois.isIncomplet && (
                          <div className="flex items-center gap-1">
                            <span 
                              className="inline-flex items-center text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full cursor-help" 
                              title={mois.explanation}
                            >
                              Projection : {Math.round(mois.joursReels)}/{mois.jours} j.
                            </span>
                          </div>
                        )}
                        {mois.isSimulation && (
                          <div className="flex items-center gap-1">
                            <span 
                              className="inline-flex items-center text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full cursor-help" 
                              title={mois.explanation}
                            >
                              Simulé : {mois.jours} j.
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-center text-slate-600 bg-slate-50/20">
                        {mois.consoMoyHPJour.toFixed(1)} <span className="text-[9px] text-slate-400">kWh/j</span>
                      </td>
                      {config.type === 'HP_HC' && (
                        <td className="py-3.5 px-4 font-mono text-center text-slate-600 bg-slate-50/20">
                          {mois.consoMoyHCJour.toFixed(1)} <span className="text-[9px] text-slate-400">kWh/j</span>
                        </td>
                      )}
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {Math.round(mois.consoHP).toLocaleString('fr-FR')}
                      </td>
                      {config.type === 'HP_HC' && (
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {Math.round(mois.consoHC).toLocaleString('fr-FR')}
                        </td>
                      )}
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {(mois.coutAbonnementHT + mois.coutCTAHT).toFixed(2)} €
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {mois.coutEnergieHT.toFixed(2)} €
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {mois.coutCSPEHT.toFixed(2)} €
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {mois.coutTVA.toFixed(2)} €
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800 bg-slate-50/30">
                        {mois.coutTotalTTC.toFixed(2)} €
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-700 bg-purple-50/20">
                        {mois.coutAvecHausseTTC.toFixed(2)} €
                      </td>
                      <td className="py-3.5 px-4 font-mono text-amber-700 text-right font-medium">
                        {surcoutMois > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-amber-600 font-bold">
                            <ArrowUpRight className="w-3 h-3 shrink-0" />
                            +{surcoutMois.toFixed(2)} €
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Ligne des Totaux Globaux */}
                <tr className="bg-slate-900 text-white font-semibold text-xs border-t-2 border-slate-950">
                  <td className="py-4 px-4 text-white font-bold uppercase tracking-wider">
                    Total Cumulé
                  </td>
                  <td className="py-4 px-4 font-mono text-center text-slate-300 bg-slate-950/20">
                    {totalAvgHP.toFixed(1)} <span className="text-[9px] font-normal text-slate-400">kWh/j</span>
                  </td>
                  {config.type === 'HP_HC' && (
                    <td className="py-4 px-4 font-mono text-center text-slate-300 bg-slate-950/20">
                      {totalAvgHC.toFixed(1)} <span className="text-[9px] font-normal text-slate-400">kWh/j</span>
                    </td>
                  )}
                  <td className="py-4 px-4 font-mono">
                    {Math.round(totalConsoHP).toLocaleString('fr-FR')} <span className="text-[9px] font-normal text-slate-400">kWh</span>
                  </td>
                  {config.type === 'HP_HC' && (
                    <td className="py-4 px-4 font-mono">
                      {Math.round(totalConsoHC).toLocaleString('fr-FR')} <span className="text-[9px] font-normal text-slate-400">kWh</span>
                    </td>
                  )}
                  <td className="py-4 px-4 font-mono text-slate-300">
                    {(totalAboHT + totalCTAHT).toFixed(2)} €
                  </td>
                  <td className="py-4 px-4 font-mono text-slate-300">
                    {totalCoutHT.toFixed(2)} €
                  </td>
                  <td className="py-4 px-4 font-mono text-slate-300">
                    {totalCSPEHT.toFixed(2)} €
                  </td>
                  <td className="py-4 px-4 font-mono text-slate-300">
                    {totalTVA.toFixed(2)} €
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-blue-300 bg-slate-950/40">
                    {totalCoutTTC.toFixed(2)} €
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-purple-300 bg-purple-950/20">
                    {totalCoutAvecHausseTTC.toFixed(2)} €
                  </td>
                  <td className="py-4 px-4 font-mono text-right text-amber-300 bg-slate-950/30 font-bold">
                    {totalSurcout > 0 ? `+${totalSurcout.toFixed(2)} €` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cartes d'indicateurs d'économie d'éco-gestes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200 flex items-start gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shrink-0 border border-blue-100">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Économie éco-geste estimée (-10%)</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  En réduisant votre consommation moyenne de <strong className="text-slate-700">10%</strong> (par exemple en éteignant la veille des appareils, ou en chauffant à 19°C), vous réduisez votre facture globale de <strong className="text-blue-600">{(totalCoutTTC * 0.1).toFixed(2)} €</strong> sur cette période filtrée et complétée.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-200 flex items-start gap-3">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg shrink-0 border border-purple-100">
                <Percent className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Sensibilité à l'inflation ({config.haussePrevue}%)</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  La hausse de <strong className="text-slate-700">+{config.haussePrevue}%</strong> de l'électricité alourdit votre budget de <strong className="text-purple-600">{totalSurcout.toFixed(2)} €</strong> sur cette période. Pour annuler cette hausse, vous devez réduire votre consommation globale de <strong className="text-purple-600">{((totalSurcout / (totalCoutTTC || 1)) * 100).toFixed(1)}%</strong>.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
