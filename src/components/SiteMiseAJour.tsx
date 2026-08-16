/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Globe, 
  ExternalLink, 
  Save, 
  RotateCcw, 
  Zap, 
  Calculator, 
  Receipt, 
  Scale,
  Upload,
  Settings,
  FileText,
  StickyNote
} from 'lucide-react';

interface UpdateSites {
  siteTurpe: string;
  noteTurpe?: string;
  siteCompteur: string;
  noteCompteur?: string;
  siteTarifs: string;
  noteTarifs?: string;
  siteTaxes: string;
  noteTaxes?: string;
  siteFacture: string;
  noteFacture?: string;
}

const DEFAULT_SITES: UpdateSites = {
  siteTurpe: 'https://www.fournisseurs-electricite.com/contrat-electricite/prix/turpe',
  noteTurpe: '',
  siteCompteur: 'https://mon-compte-client.enedis.fr',
  noteCompteur: '',
  siteTarifs: 'https://www.cre.fr/electricite/tarifs-reglementes-de-vente',
  noteTarifs: '',
  siteTaxes: 'https://www.service-public.fr/particuliers/vosdroits/F31557',
  noteTaxes: '',
  siteFacture: 'https://particulier.edf.fr',
  noteFacture: '',
};

interface SiteMiseAJourProps {
  triggerToast?: (msg: string) => void;
  onNavigateToTab?: (tab: 'dashboard' | 'releves' | 'budget' | 'estimation' | 'config' | 'backup' | 'sites', options?: { openTurpeModal?: boolean }) => void;
}

export default function SiteMiseAJour({ triggerToast, onNavigateToTab }: SiteMiseAJourProps) {
  // Sites de mise à jour persistant dans localStorage
  const [updateSites, setUpdateSites] = useState<UpdateSites>(() => {
    try {
      const saved = localStorage.getItem('elec_budget_update_sites');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          siteTurpe: parsed.siteTurpe || DEFAULT_SITES.siteTurpe,
          noteTurpe: parsed.noteTurpe ?? '',
          siteCompteur: parsed.siteCompteur || DEFAULT_SITES.siteCompteur,
          noteCompteur: parsed.noteCompteur ?? '',
          siteTarifs: parsed.siteTarifs || DEFAULT_SITES.siteTarifs,
          noteTarifs: parsed.noteTarifs ?? '',
          siteTaxes: parsed.siteTaxes || DEFAULT_SITES.siteTaxes,
          noteTaxes: parsed.noteTaxes ?? '',
          siteFacture: parsed.siteFacture || DEFAULT_SITES.siteFacture,
          noteFacture: parsed.noteFacture ?? '',
        };
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SITES;
  });

  const handleSiteChange = (key: keyof UpdateSites, value: string) => {
    const updated = { ...updateSites, [key]: value };
    setUpdateSites(updated);
    try {
      localStorage.setItem('elec_budget_update_sites', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAllSites = () => {
    try {
      localStorage.setItem('elec_budget_update_sites', JSON.stringify(updateSites));
      if (triggerToast) {
        triggerToast('Sites de mise à jour enregistrés avec succès !');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetSites = () => {
    setUpdateSites(DEFAULT_SITES);
    try {
      localStorage.setItem('elec_budget_update_sites', JSON.stringify(DEFAULT_SITES));
      if (triggerToast) {
        triggerToast('Adresses des sites réinitialisées par défaut !');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-md font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Sites de mise à jour des données et tarifs
            </h2>
            <p className="text-slate-500 text-xs leading-relaxed max-w-3xl">
              Indiquez et accédez ci-dessous aux sites officiels permettant d'actualiser vos valeurs TURPE, vos relevés de compteur communiquant, vos tarifs d'électricité et vos taxes.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetSites}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Réinitialiser</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAllSites}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Valeurs TURPE */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                  1. Valeurs TURPE
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tarif d'Utilisation des Réseaux Publics d'Électricité (mise à jour annuelle le 1er août).
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Site pour mettre à jour les valeurs TURPE :
              </label>
              <input
                type="url"
                value={updateSites.siteTurpe}
                onChange={(e) => handleSiteChange('siteTurpe', e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                <span>Note / Indication (où aller sur le site) :</span>
              </label>
              <textarea
                rows={2}
                value={updateSites.noteTurpe || ''}
                onChange={(e) => handleSiteChange('noteTurpe', e.target.value)}
                placeholder="Ex: Rechercher le barème TURPE 6 ou consulter le tableau des tarifs d'acheminement..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-amber-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onNavigateToTab?.('estimation', { openTurpeModal: true })}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Valeur TURPE</span>
            </button>

            <a
              href={updateSites.siteTurpe}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-blue-200/60"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Consulter le site TURPE</span>
            </a>
          </div>
        </div>

        {/* 2. Relevés du compteur communiquant */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                  2. Relevés du compteur communiquant
                </h3>
                <p className="text-[11px] text-slate-500">
                  Espace client Enedis / Linky ou fournisseur pour récupérer vos relevés d'index.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Site pour mettre à jour les relevés du compteur :
              </label>
              <input
                type="url"
                value={updateSites.siteCompteur}
                onChange={(e) => handleSiteChange('siteCompteur', e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                <span>Note / Indication (où aller sur le site) :</span>
              </label>
              <textarea
                rows={2}
                value={updateSites.noteCompteur || ''}
                onChange={(e) => handleSiteChange('noteCompteur', e.target.value)}
                placeholder="Ex: Se connecter > Espace Client > Suivre ma consommation > Télécharger mes données d'index..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-amber-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onNavigateToTab?.('backup')}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importer vos index</span>
            </button>

            <a
              href={updateSites.siteCompteur}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-amber-200/60"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Consulter mes relevés</span>
            </a>
          </div>
        </div>

        {/* 3. Tarifs de l'électricité */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                  3. Tarifs de l'électricité
                </h3>
                <p className="text-[11px] text-slate-500">
                  Grilles tarifaires (Option de Base, Heures Pleines / Heures Creuses, abonnements).
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Site pour mettre à jour les tarifs de l'électricité :
              </label>
              <input
                type="url"
                value={updateSites.siteTarifs}
                onChange={(e) => handleSiteChange('siteTarifs', e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                <span>Note / Indication (où aller sur le site) :</span>
              </label>
              <textarea
                rows={2}
                value={updateSites.noteTarifs || ''}
                onChange={(e) => handleSiteChange('noteTarifs', e.target.value)}
                placeholder="Ex: Télécharger la grille tarifaire Tarif Bleu EDF (Option Base et Heures Pleines / Heures Creuses)..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-amber-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onNavigateToTab?.('config')}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Mettre a jour les tarifs</span>
            </button>

            <a
              href={updateSites.siteTarifs}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-purple-200/60"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Consulter les tarifs</span>
            </a>
          </div>
        </div>

        {/* 4. Taxes */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                  4. Taxes sur l'électricité
                </h3>
                <p className="text-[11px] text-slate-500">
                  Informations réglementaires sur la CTA, la TICFE/CSPE et la TVA applicable.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Site pour mettre à jour les taxes :
              </label>
              <input
                type="url"
                value={updateSites.siteTaxes}
                onChange={(e) => handleSiteChange('siteTaxes', e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                <span>Note / Indication (où aller sur le site) :</span>
              </label>
              <textarea
                rows={2}
                value={updateSites.noteTaxes || ''}
                onChange={(e) => handleSiteChange('noteTaxes', e.target.value)}
                placeholder="Ex: Consulter les taux de la CSPE/TICFE (Accise), de la CTA et de la TVA applicables..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-amber-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onNavigateToTab?.('config')}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Mettre a jour les taxes</span>
            </button>

            <a
              href={updateSites.siteTaxes}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-200/60"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Consulter les taxes</span>
            </a>
          </div>
        </div>

        {/* 5. Ma facture */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                  5. Ma facture
                </h3>
                <p className="text-[11px] text-slate-500">
                  Espace client de votre fournisseur pour consulter et téléverser vos factures d'électricité.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Site de votre fournisseur / espace facture :
              </label>
              <input
                type="url"
                value={updateSites.siteFacture}
                onChange={(e) => handleSiteChange('siteFacture', e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5 text-amber-600" />
                <span>Note / Indication (où aller sur le site) :</span>
              </label>
              <textarea
                rows={2}
                value={updateSites.noteFacture || ''}
                onChange={(e) => handleSiteChange('noteFacture', e.target.value)}
                placeholder="Ex: Se connecter > Rubrique Mes Factures > Télécharger ma dernière facture PDF..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-amber-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
            <a
              href={updateSites.siteFacture}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-200/60"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Consulter ma facture</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
