/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Zap, Euro, Calendar, Settings, TrendingUp, AlertTriangle } from 'lucide-react';
import { TarifConfig, Releve } from '../types';

interface HeaderProps {
  config: TarifConfig;
  totalConso: number;
  totalCoutTTC: number;
  ratioHP: number; // percentage of HP
  nombreDeMois: number;
  overrideAbonnement?: number;
  isFilteredOrSimulated?: boolean;
  badgeText?: string;
  releves?: Releve[];
}

export default function Header({
  config,
  totalConso,
  totalCoutTTC,
  ratioHP,
  nombreDeMois,
  overrideAbonnement,
  isFilteredOrSimulated,
  badgeText,
  releves = [],
}: HeaderProps) {
  // Calcul du nombre de jours de relevés manquants jusqu'à aujourd'hui
  const daysMissing = useMemo(() => {
    if (!releves || releves.length === 0) return 0;
    let maxDate: Date | null = null;
    for (const r of releves) {
      if (!r.date) continue;
      const parts = r.date.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
        if (!isNaN(d.getTime())) {
          if (!maxDate || d > maxDate) {
            maxDate = d;
          }
        }
      }
    }
    if (!maxDate) return 0;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);

    const diffTime = today.getTime() - maxDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [releves]);

  const coutMensuelMoyen = nombreDeMois > 0 ? totalCoutTTC / nombreDeMois : 0;
  const consoMensuelleMoyenne = nombreDeMois > 0 ? totalConso / nombreDeMois : 0;
  const aboToDisplay = overrideAbonnement !== undefined ? overrideAbonnement : config.abonnementMensuel;

  const ctaMonthlyHT = (() => {
    const ctaType = config.taxes?.ctaType || 'pourcentage';
    if (ctaType === 'annuel') {
      return (config.taxes?.cta ?? 0) / 12;
    } else if (ctaType === 'pourcentage') {
      return ((config.taxes?.cta ?? 0) / 100) * aboToDisplay;
    } else {
      return config.taxes?.cta ?? 0;
    }
  })();
  const tvaRateReduite = (config.taxes?.tvaReduite ?? 5.5) / 100;
  const aboTTC = (aboToDisplay + ctaMonthlyHT) * (1 + tvaRateReduite);

  return (
    <div className="space-y-4 w-full">
      {/* Bandeau défilant d'alerte si des relevés sont manquants */}
      {daysMissing > 0 && (
        <div className="w-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white rounded-xl shadow-md border border-red-400/50 overflow-hidden py-2.5 px-4 flex items-center gap-3 relative">
          <style>{`
            @keyframes marquee-ticker {
              0% { transform: translateX(0%); }
              100% { transform: translateX(-50%); }
            }
            .animate-marquee-smooth {
              display: flex;
              white-space: nowrap;
              animation: marquee-ticker 22s linear infinite;
              width: max-content;
            }
            .animate-marquee-smooth:hover {
              animation-play-state: paused;
            }
          `}</style>

          <div className="flex items-center gap-1.5 shrink-0 bg-red-900/90 text-amber-300 px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase shadow-xs z-10 border border-amber-400/40">
            <AlertTriangle className="w-4 h-4 text-amber-300 animate-bounce" />
            <span>Alerte Relevés</span>
          </div>

          <div className="overflow-hidden whitespace-nowrap flex-1 relative flex items-center">
            <div className="animate-marquee-smooth font-extrabold text-xs tracking-wide text-white drop-shadow-xs">
              <span className="px-6 flex items-center gap-2">
                ⚠️ Veuillez mettre à jour vos index de compteur, il manque {daysMissing} {daysMissing > 1 ? 'jours' : 'jour'} de relevés
              </span>
              <span className="px-6 flex items-center gap-2">
                ⚠️ Veuillez mettre à jour vos index de compteur, il manque {daysMissing} {daysMissing > 1 ? 'jours' : 'jour'} de relevés
              </span>
              <span className="px-6 flex items-center gap-2">
                ⚠️ Veuillez mettre à jour vos index de compteur, il manque {daysMissing} {daysMissing > 1 ? 'jours' : 'jour'} de relevés
              </span>
              <span className="px-6 flex items-center gap-2">
                ⚠️ Veuillez mettre à jour vos index de compteur, il manque {daysMissing} {daysMissing > 1 ? 'jours' : 'jour'} de relevés
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* Carte 1: Coût Global Estimé */}
      <div id="stat-card-cost" className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-blue-500/30 transition-all shadow-sm">
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Coût Global Estimé (TTC)</span>
          <span className="p-1.5 bg-blue-50 rounded text-blue-600">
            <Euro className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-slate-900">
            {totalCoutTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € <span className="text-xs font-normal text-slate-400">TTC</span>
          </span>
          <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
            {Math.round(nombreDeMois * 10) / 10} mois
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-2 font-medium">
          <div>
            Moyenne : <span className="text-blue-600 font-bold">{coutMensuelMoyen.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} € TTC / mois</span>
          </div>
          {Math.round(nombreDeMois) === 12 && (
            <div className="text-emerald-700 font-bold mt-1.5 bg-emerald-50 border border-emerald-100 p-1.5 rounded-lg">
              Prélèvement à prévoir : <span className="text-emerald-600">{((totalCoutTTC) / (config.nombrePrelevements || 10)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € TTC / mois</span> <span className="text-[9px] text-emerald-400 font-mono">({config.nombrePrelevements || 10} fois)</span>
            </div>
          )}
        </div>
      </div>

      {/* Carte 2: Consommation Totale */}
      <div id="stat-card-conso" className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-blue-500/30 transition-all shadow-sm">
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Consommation Totale</span>
          <span className="p-1.5 bg-blue-50 rounded text-blue-600">
            <Zap className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-slate-900">
            {Math.round(totalConso).toLocaleString('fr-FR')} <span className="text-sm font-normal text-slate-400">kWh</span>
          </span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
            isFilteredOrSimulated 
              ? 'text-blue-600 bg-blue-50' 
              : 'text-emerald-600 bg-emerald-50'
          }`}>
            {badgeText || (isFilteredOrSimulated ? 'Estimé / Filtré' : 'Réel')}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-2 font-medium">
          Moyenne : <span className="text-slate-700 font-bold">{Math.round(consoMensuelleMoyenne).toLocaleString('fr-FR')} kWh / mois</span>
        </div>
      </div>

      {/* Carte 3: Répartition HP/HC */}
      <div id="stat-card-ratio" className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-blue-500/30 transition-all shadow-sm">
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Répartition HP / HC</span>
          <span className="p-1.5 bg-blue-50 rounded text-blue-600">
            <Calendar className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-4">
          {config.type === 'HP_HC' ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900">
                  {Math.round(ratioHP)}%
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {Math.round(100 - ratioHP)}% HC
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden flex">
                <div className="bg-blue-600 h-full" style={{ width: `${ratioHP}%` }} title="Heures Pleines" />
                <div className="bg-cyan-400 h-full flex-1" title="Heures Creuses" />
              </div>
            </>
          ) : (
            <div className="text-sm font-bold text-slate-700 mt-1">
              Option de Base (100% unique)
            </div>
          )}
        </div>
        <div className="text-[11px] text-slate-400 mt-2 font-medium">
          Mode : <span className="text-purple-600 font-bold">{config.type === 'HP_HC' ? 'Heures Pleines/Creuses' : 'Base'}</span>
        </div>
      </div>

      {/* Carte 4: Option Tarifaire & Abonnements */}
      <div id="stat-card-config" className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-blue-500/30 transition-all shadow-sm">
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Abonnement Mensuel (TTC)</span>
          <span className="p-1.5 bg-blue-50 rounded text-blue-600">
            <Settings className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-slate-900">
            {aboTTC.toFixed(2)} € <span className="text-xs font-normal text-slate-400">TTC</span>
          </span>
          <span className="text-[10px] text-purple-600 font-semibold bg-purple-50 px-1.5 py-0.5 rounded">
            Fixe
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-2 font-medium">
          <div>
            Abonnement HT : <span className="text-slate-700 font-bold">{aboToDisplay.toFixed(2)} € / mois</span>
          </div>
          <div className="mt-0.5">
            CTA (HT) : <span className="text-slate-700 font-bold">{ctaMonthlyHT.toFixed(2)} € / mois</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
