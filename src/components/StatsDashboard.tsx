/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Sparkles, TrendingDown, RefreshCw, Layers } from 'lucide-react';
import { AnalyseMois, ComparaisonOption, TarifConfig } from '../types';

interface StatsDashboardProps {
  analyseMois: AnalyseMois[];
  comparaisonOptions: ComparaisonOption[];
  config: TarifConfig;
}

export default function StatsDashboard({ analyseMois, comparaisonOptions, config }: StatsDashboardProps) {
  if (analyseMois.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-150 p-12 text-center text-slate-400">
        Veuillez enregistrer au moins 2 relevés de compteur pour générer l'analyse et les graphiques comparatifs.
      </div>
    );
  }

  // Couleurs pour la répartition des coûts de la facture (Camembert)
  const COUT_COLORS = {
    partEnergie: '#06b6d4',      // Cyan (Énergie)
    partAbonnement: '#10b981',   // Émeraude (Abonnement + CTA)
    partTaxes: '#f43f5e',        // Rose (Taxes & TVA correspondantes)
  };

  // Préparer les données pour le camembert (répartition des coûts cumulés)
  const totalCoutCumule = analyseMois.reduce((acc, m) => acc + m.coutTotalTTC, 0);
  const totalPartEnergie = analyseMois.reduce((acc, m) => acc + m.coutEnergieHT, 0);
  // Pour l'abonnement et la CTA (part fixe avec leur TVA de 5.5%)
  const totalPartAbo = analyseMois.reduce(
    (acc, m) => acc + m.coutAbonnementHT + m.coutCTAHT + (m.coutAbonnementHT + m.coutCTAHT) * (config.taxes.tvaReduite / 100),
    0
  );
  // Le reste correspond aux taxes (CSPE + TVA de 20% correspondante)
  const totalPartTaxes = Math.max(0, totalCoutCumule - totalPartEnergie - totalPartAbo);

  const pieData = [
    { name: 'Énergie HT', value: totalPartEnergie },
    { name: 'Abonnement & Fixe (TTC)', value: totalPartAbo },
    { name: 'Taxes & Taxes-TVA', value: totalPartTaxes },
  ];

  // Trouver l'alternative la plus économique
  const meilleureAlternative = comparaisonOptions
    .filter(opt => opt.economiePotentielle > 0)
    .sort((a, b) => b.economiePotentielle - a.economiePotentielle)[0];

  // Tooltips personnalisés pour un aspect ultra-pro
  const CustomTooltipConso = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-xl font-mono text-xs">
          <p className="font-bold mb-1.5 text-slate-300">{label}</p>
          {payload.map((p: any) => (
            <div key={p.name} className="flex justify-between gap-6 py-0.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}:
              </span>
              <span className="font-bold">{Math.round(p.value).toLocaleString('fr-FR')} kWh</span>
            </div>
          ))}
          <div className="border-t border-slate-800 mt-2 pt-1.5 flex justify-between gap-6">
            <span className="text-yellow-400 font-semibold">Total :</span>
            <span className="text-yellow-400 font-bold">
              {Math.round(payload.reduce((acc: number, p: any) => acc + p.value, 0)).toLocaleString('fr-FR')} kWh
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipCout = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-xl font-mono text-xs">
          <p className="font-bold mb-1.5 text-slate-300">{label}</p>
          {payload.map((p: any) => (
            <div key={p.name} className="flex justify-between gap-6 py-0.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}:
              </span>
              <span className="font-bold">{p.value.toFixed(2)} €</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Panneau de conseils & Éco-économies en haut */}
      <div id="savings-advice-panel" className="bg-blue-50/50 rounded-xl p-5 border border-blue-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-blue-100/50 border border-blue-200 text-blue-600 rounded-lg shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-blue-950">Analyseur d'économies d'énergie</h3>
            <p className="text-slate-600 text-[11px] mt-1 max-w-xl leading-relaxed">
              {meilleureAlternative ? (
                <span>
                  En basculant vers l'option <strong className="text-blue-800">{meilleureAlternative.optionLabel.includes('Base') ? 'Base' : 'Heures Pleines / Heures Creuses'}</strong>, vous pourriez économiser environ <strong className="text-emerald-600">{meilleureAlternative.economiePotentielle.toFixed(2)} €</strong> sur cette période !
                </span>
              ) : (
                <span>
                  Votre formule contractuelle actuelle est <strong className="text-emerald-600">parfaitement optimisée</strong> par rapport à votre répartition de consommation. Pour économiser davantage, concentrez-vous sur les éco-gestes (-10% de consommation économisera <strong className="text-blue-800">{comparaisonOptions.find(o => o.optionLabel.includes('Éco-Gestes'))?.economiePotentielle.toFixed(2)} €</strong>).
                </span>
              )}
            </p>
          </div>
        </div>

        {comparaisonOptions.find(o => o.optionLabel.includes('Éco-Gestes')) && (
          <div className="bg-white border border-blue-100 rounded-lg p-3 px-5 font-mono text-xs shrink-0 self-stretch md:self-auto flex flex-col justify-center">
            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-semibold">Potentiel Éco-Geste</span>
            <span className="text-lg font-bold text-blue-700 mt-1 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-emerald-500" />
              -{comparaisonOptions.find(o => o.optionLabel.includes('Éco-Gestes'))?.economiePotentielle.toFixed(2)} €
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Graphique 1: Évolution mensuelle de la consommation */}
        <div id="chart-conso-history" className="bg-white rounded-2xl shadow-sm border border-slate-150 p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="text-md font-bold text-slate-800">Historique de consommation</h3>
            <p className="text-slate-500 text-xs mt-0.5">Visualisez vos kWh consommés mois par mois en heures pleines et creuses.</p>
          </div>

          <div className="h-72 w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyseMois} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                  </linearGradient>
                  {config.type === 'HP_HC' && (
                    <linearGradient id="colorHC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  )}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="moisLabel" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip content={<CustomTooltipConso />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Area
                  type="monotone"
                  name={config.type === 'HP_HC' ? 'Heures Pleines (kWh)' : 'Consommation (kWh)'}
                  dataKey="consoHP"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorHP)"
                />
                {config.type === 'HP_HC' && (
                  <Area
                    type="monotone"
                    name="Heures Creuses (kWh)"
                    dataKey="consoHC"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorHC)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique 2: Répartition des coûts de la facture (Camembert) */}
        <div id="chart-invoice-breakdown" className="bg-white rounded-2xl shadow-sm border border-slate-150 p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="text-md font-bold text-slate-800">Où va votre argent ?</h3>
            <p className="text-slate-500 text-xs mt-0.5">Répartition du budget cumulé entre la consommation d'énergie pure, l'abonnement et l'État (Taxes + TVA).</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center flex-1">
            {/* Camembert */}
            <div className="h-56 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill={COUT_COLORS.partEnergie} />
                    <Cell fill={COUT_COLORS.partAbonnement} />
                    <Cell fill={COUT_COLORS.partTaxes} />
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value.toFixed(2)} €`, 'Cumulé']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-400 font-mono uppercase">Total Payé</span>
                <span className="text-lg font-bold text-slate-800">{totalCoutCumule.toFixed(0)} €</span>
              </div>
            </div>

            {/* Légende détaillée */}
            <div className="space-y-3.5 pr-2">
              <div className="flex items-start gap-2.5">
                <span className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: COUT_COLORS.partEnergie }} />
                <div>
                  <div className="text-xs font-bold text-slate-800">Part Énergie HT ({((totalPartEnergie / totalCoutCumule) * 100 || 0).toFixed(0)}%)</div>
                  <div className="text-xs text-slate-500">{totalPartEnergie.toFixed(2)} € — Consommation pure de vos appareils.</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: COUT_COLORS.partAbonnement }} />
                <div>
                  <div className="text-xs font-bold text-slate-800">Part Abonnement & CTA ({((totalPartAbo / totalCoutCumule) * 100 || 0).toFixed(0)}%)</div>
                  <div className="text-xs text-slate-500">{totalPartAbo.toFixed(2)} € — Part fixe nécessaire (TTC, inclut la TVA de 5.5%).</div>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: COUT_COLORS.partTaxes }} />
                <div>
                  <div className="text-xs font-bold text-slate-800">Part Taxes de l'État ({((totalPartTaxes / totalCoutCumule) * 100 || 0).toFixed(0)}%)</div>
                  <div className="text-xs text-slate-500">{totalPartTaxes.toFixed(2)} € — CSPE (TICFE) et la TVA globale de 20% sur la part énergie.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Graphique 3: Comparatif scénarios de budgets */}
        <div id="chart-budget-scenarios" className="bg-white rounded-2xl shadow-sm border border-slate-150 p-6 lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-md font-bold text-slate-800">Comparateur de budgets & Simulations</h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Simulez l'impact financier de la hausse de {config.haussePrevue}% configurée, comparez l'autre option tarifaire ou observez l'économie d'éco-gestes.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* Graphique en barres */}
            <div className="h-64 lg:col-span-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparaisonOptions} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} stroke="#f1f5f9" />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10 }} unit=" €" />
                  <YAxis type="category" dataKey="optionLabel" width={110} tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 500 }} />
                  <Tooltip content={<CustomTooltipCout />} />
                  <Bar dataKey="coutTotalTTC" name="Coût global TTC" radius={[0, 8, 8, 0]} maxBarSize={30}>
                    {comparaisonOptions.map((entry, index) => {
                      let color = '#0284c7'; // Couleur par défaut
                      if (entry.optionLabel.includes('Actuelle')) color = '#3b82f6';
                      else if (entry.optionLabel.includes('Alternative')) color = entry.economiePotentielle > 0 ? '#10b981' : '#f43f5e';
                      else if (entry.optionLabel.includes('Éco-Gestes')) color = '#22d3ee';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Analyse textuelle des options */}
            <div className="space-y-4 bg-slate-50 border border-slate-200/50 rounded-2xl p-4.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-600" />
                Bilan des Simulations
              </h4>

              <div className="space-y-3 font-mono text-xs text-slate-600">
                {comparaisonOptions.map((opt, i) => {
                  let badgeColor = "bg-slate-100 text-slate-700";
                  let note = "";

                  if (opt.optionLabel.includes('Actuelle')) {
                    badgeColor = "bg-blue-50 text-blue-700 border border-blue-150";
                    note = "Votre base de calcul";
                  } else if (opt.optionLabel.includes('Alternative')) {
                    if (opt.economiePotentielle > 0) {
                      badgeColor = "bg-emerald-50 text-emerald-700 border border-emerald-150";
                      note = `Optimisation recommandée !`;
                    } else {
                      badgeColor = "bg-red-50 text-red-700 border border-red-150";
                      note = `Option plus coûteuse (+${Math.abs(opt.economiePotentielle).toFixed(1)} €)`;
                    }
                  } else if (opt.optionLabel.includes('Éco-Gestes')) {
                    badgeColor = "bg-cyan-50 text-cyan-700 border border-cyan-150";
                    note = "Économies via petits gestes";
                  }

                  return (
                    <div key={i} className="flex flex-col gap-1 pb-2 border-b border-slate-200/60 last:border-none last:pb-0">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800 text-[10px] truncate max-w-[130px]" title={opt.optionLabel}>
                          {opt.optionLabel.split('(')[0]}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeColor}`}>
                          {opt.coutTotalTTC.toFixed(2)} €
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 italic font-sans">{note}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
