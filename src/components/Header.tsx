/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Zap, Euro, Calendar, Settings, TrendingUp } from 'lucide-react';
import { TarifConfig } from '../types';

interface HeaderProps {
  config: TarifConfig;
  totalConso: number;
  totalCoutTTC: number;
  ratioHP: number; // percentage of HP
  nombreDeMois: number;
  overrideAbonnement?: number;
  isFilteredOrSimulated?: boolean;
  badgeText?: string;
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
}: HeaderProps) {
  const coutMensuelMoyen = nombreDeMois > 0 ? totalCoutTTC / nombreDeMois : 0;
  const consoMensuelleMoyenne = nombreDeMois > 0 ? totalConso / nombreDeMois : 0;
  const aboToDisplay = overrideAbonnement !== undefined ? overrideAbonnement : config.abonnementMensuel;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* Carte 1: Coût Global Estimé */}
      <div id="stat-card-cost" className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-blue-500/30 transition-all shadow-sm">
        <div className="flex justify-between items-start">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Coût Global Estimé</span>
          <span className="p-1.5 bg-blue-50 rounded text-blue-600">
            <Euro className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-slate-900">
            {totalCoutTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
          <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
            {Math.round(nombreDeMois * 10) / 10} mois
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-2 font-medium">
          <div>
            Moyenne : <span className="text-blue-600 font-bold">{coutMensuelMoyen.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} € / mois</span>
          </div>
          {Math.round(nombreDeMois) === 12 && (
            <div className="text-emerald-700 font-bold mt-1.5 bg-emerald-50 border border-emerald-100 p-1.5 rounded-lg">
              Prélèvement à prévoir : <span className="text-emerald-600">{((totalCoutTTC) / (config.nombrePrelevements || 11)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € / mois</span> <span className="text-[9px] text-emerald-400 font-mono">({config.nombrePrelevements || 11} fois)</span>
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
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Abonnement Mensuel</span>
          <span className="p-1.5 bg-blue-50 rounded text-blue-600">
            <Settings className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-2xl font-bold text-slate-900">
            {(aboToDisplay).toFixed(2)} € <span className="text-xs font-normal text-slate-400">HT</span>
          </span>
          <span className="text-[10px] text-purple-600 font-semibold bg-purple-50 px-1.5 py-0.5 rounded">
            Fixe
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-2 font-medium">
          CTA incluse : <span className="text-slate-700 font-bold">
            {(() => {
              const ctaType = config.taxes.ctaType || 'mensuel';
              if (ctaType === 'annuel') {
                return `${(config.taxes.cta / 12).toFixed(2)} € / mois (soit ${config.taxes.cta.toFixed(2)} € / an)`;
              } else if (ctaType === 'pourcentage') {
                return `${(config.taxes.cta).toFixed(1)}% (soit ${(config.taxes.cta / 100 * aboToDisplay).toFixed(2)} € / mois)`;
              } else {
                return `${(config.taxes.cta).toFixed(2)} € / mois`;
              }
            })()}
          </span>
        </div>
      </div>
    </div>
  );
}
