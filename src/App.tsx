/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  TableProperties, 
  ReceiptEuro, 
  SlidersHorizontal, 
  HelpCircle,
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  Lightbulb, 
  Flame, 
  ShieldCheck,
  Zap,
  Save,
  Download,
  Calculator,
  Globe,
  GitCompare
} from 'lucide-react';

import { Releve, TarifConfig, AnalyseMois, ComparaisonOption } from './types';
import { 
  DEFAULT_RELEVES, 
  DEFAULT_TARIF_CONFIG, 
  analyserRelevesParMois, 
  comparerOptionsTarifaires,
  calculerStatsPourIntervalle
} from './utils/calc';
import { exportFullBackupExcel } from './utils/exportExcel';

import Header from './components/Header';
import RelevesTable from './components/RelevesTable';
import ContratConfig from './components/ContratConfig';
import StatsDashboard from './components/StatsDashboard';
import BudgetPrevisionnel from './components/BudgetPrevisionnel';
import Comparateur from './components/Comparateur';
import EstimationFacture from './components/EstimationFacture';
import SauvegardeExport from './components/SauvegardeExport';
import SiteMiseAJour from './components/SiteMiseAJour';

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

export default function App() {
  // Charger depuis localStorage ou utiliser les données par défaut
  const [releves, setReleves] = useState<Releve[]>(() => {
    const saved = localStorage.getItem('elec_budget_releves');
    return saved ? JSON.parse(saved) : DEFAULT_RELEVES;
  });

  const [config, setConfig] = useState<TarifConfig>(() => {
    const saved = localStorage.getItem('elec_budget_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_TARIF_CONFIG,
          ...parsed,
          puissance: parsed.puissance ?? DEFAULT_TARIF_CONFIG.puissance
        };
      } catch (e) {
        // ignore
      }
    }
    return DEFAULT_TARIF_CONFIG;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'releves' | 'budget' | 'comparateur' | 'estimation' | 'config' | 'backup' | 'sites'>('dashboard');
  const [autoOpenTurpeModal, setAutoOpenTurpeModal] = useState<boolean>(false);
  const [periodSelection, setPeriodSelection] = useState<'total' | 'annuel' | 'annuel_complet'>('annuel_complet');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // État pour stocker les statistiques filtrées/simulées de l'onglet Budget Prévisionnel
  const [filteredStats, setFilteredStats] = useState<{
    totalConso: number;
    totalCoutTTC: number;
    ratioHP: number;
    nombreDeMois: number;
    overrideAbonnement: number;
  } | null>(null);

  // Paramètres personnalisés des sélecteurs de période
  const [selectorSettings, setSelectorSettings] = useState(() => {
    const currentYear = new Date().getFullYear();
    const saved = localStorage.getItem('elec_selector_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          annuelComplet: {
            startYear: parsed.annuelComplet?.startYear ?? currentYear - 1,
            startMonth: parsed.annuelComplet?.startMonth ?? 8,
            startDay: parsed.annuelComplet?.startDay ?? 1,
            endYear: parsed.annuelComplet?.endYear ?? currentYear,
            endMonth: parsed.annuelComplet?.endMonth ?? 7,
            endDay: parsed.annuelComplet?.endDay ?? 31,
          },
          annuelConso: {
            startYear: parsed.annuelConso?.startYear ?? currentYear - 1,
            startMonth: parsed.annuelConso?.startMonth ?? 8,
            startDay: parsed.annuelConso?.startDay ?? 1,
            useTodayAsEnd: parsed.annuelConso?.useTodayAsEnd ?? true,
            endYear: parsed.annuelConso?.endYear ?? currentYear,
            endMonth: parsed.annuelConso?.endMonth ?? 12,
            endDay: parsed.annuelConso?.endDay ?? 31,
          }
        };
      } catch (e) {
        // ignore
      }
    }
    return {
      annuelComplet: {
        startYear: currentYear - 1,
        startMonth: 8, // Août
        startDay: 1,
        endYear: currentYear,
        endMonth: 7,  // Juillet
        endDay: 31,
      },
      annuelConso: {
        startYear: currentYear - 1,
        startMonth: 8, // Août
        startDay: 1,
        useTodayAsEnd: true,
        endYear: currentYear,
        endMonth: 12,
        endDay: 31,
      }
    };
  });

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState(selectorSettings);

  // Mettre à jour l'état temporaire quand on ouvre la modal
  useEffect(() => {
    if (isSettingsModalOpen) {
      setTempSettings(selectorSettings);
    }
  }, [isSettingsModalOpen, selectorSettings]);

  const dernierReleveDate = React.useMemo(() => {
    if (!releves || releves.length === 0) return null;
    const sorted = [...releves].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const lastDate = sorted[sorted.length - 1].date;
    if (!lastDate) return null;
    const parts = lastDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return lastDate;
  }, [releves]);

  // Synchroniser les paramètres avec localStorage
  useEffect(() => {
    localStorage.setItem('elec_selector_settings', JSON.stringify(selectorSettings));
  }, [selectorSettings]);

  const handleSaveSelectorSettings = () => {
    setSelectorSettings(tempSettings);
    setIsSettingsModalOpen(false);
    triggerToast('Paramètres des sélecteurs appliqués avec succès.');
  };

  const handleResetSelectorSettings = () => {
    const currentYear = new Date().getFullYear();
    const defaults = {
      annuelComplet: {
        startYear: currentYear - 1,
        startMonth: 8,
        startDay: 1,
        endYear: currentYear,
        endMonth: 7,
        endDay: 31,
      },
      annuelConso: {
        startYear: currentYear - 1,
        startMonth: 8,
        startDay: 1,
        useTodayAsEnd: true,
        endYear: currentYear,
        endMonth: 12,
        endDay: 31,
      }
    };
    setTempSettings(defaults);
    triggerToast('Valeurs par défaut chargées dans le formulaire. Cliquez sur Appliquer pour enregistrer.');
  };

  // Réinitialiser les statistiques filtrées si on quitte l'onglet budget
  useEffect(() => {
    if (activeTab !== 'budget') {
      setFilteredStats(null);
    }
  }, [activeTab]);

  // Synchroniser avec localStorage
  useEffect(() => {
    localStorage.setItem('elec_budget_releves', JSON.stringify(releves));
  }, [releves]);

  useEffect(() => {
    localStorage.setItem('elec_budget_config', JSON.stringify(config));
  }, [config]);

  // Toast helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Actions d'ajout / suppression
  const handleAddReleve = (nouveau: Omit<Releve, 'id'>) => {
    const uniqueId = `r_${Date.now()}`;
    const releveComplet: Releve = { id: uniqueId, ...nouveau };
    setReleves(prev => [...prev, releveComplet]);
    triggerToast('Le relevé a été enregistré avec succès.');
  };

  const handleDeleteReleve = (id: string) => {
    setReleves(prev => prev.filter(r => r.id !== id));
    triggerToast('Le relevé a été supprimé.');
  };

  const handleResetDefaults = () => {
    if (confirm("Voulez-vous restaurer les relevés de démonstration ? Vos modifications actuelles seront écrasées.")) {
      setReleves(DEFAULT_RELEVES);
      setConfig(DEFAULT_TARIF_CONFIG);
      triggerToast('Données de démonstration restaurées.');
    }
  };

  const handleChangeConfig = (newConfig: TarifConfig) => {
    setConfig(newConfig);
    triggerToast('La configuration du contrat a été mise à jour.');
  };

  const handleImportData = (newReleves: Releve[], newConfig: TarifConfig) => {
    setReleves(newReleves);
    setConfig(newConfig);
    triggerToast('Sauvegarde importée avec succès !');
  };

  // Traiter les données de consommation mensuelle
  const analyseMois: AnalyseMois[] = analyserRelevesParMois(releves, config);

  // Calculs agrégés pour l'en-tête (Dernier 12 mois ou période totale disponible)
  const totalConsoHP = analyseMois.reduce((acc, m) => acc + m.consoHP, 0);
  const totalConsoHC = config.type === 'HP_HC' ? analyseMois.reduce((acc, m) => acc + m.consoHC, 0) : 0;
  const totalConso = totalConsoHP + totalConsoHC;
  
  const totalCoutTTC = analyseMois.reduce((acc, m) => acc + m.coutTotalTTC, 0);
  const ratioHP = totalConso > 0 ? (totalConsoHP / totalConso) * 100 : 50;
  const nombreDeMois = analyseMois.length;

  // Calculs annuels basés sur les paramètres utilisateur pour annuelConso
  const getAnnualPeriodDates = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    const sMonth = selectorSettings.annuelConso.startMonth;
    const sDay = selectorSettings.annuelConso.startDay;
    
    let startYear = (selectorSettings.annuelConso.startYear !== undefined && !isNaN(Number(selectorSettings.annuelConso.startYear)))
      ? Number(selectorSettings.annuelConso.startYear)
      : currentYear;
    
    if (selectorSettings.annuelConso.startYear === undefined || isNaN(Number(selectorSettings.annuelConso.startYear))) {
      const startDateThisYear = new Date(currentYear, sMonth - 1, sDay);
      if (today < startDateThisYear) {
        startYear = currentYear - 1;
      }
    }
    
    const startStr = `${startYear}-${String(sMonth).padStart(2, '0')}-${String(sDay).padStart(2, '0')}`;
    
    let todayStr = '';
    if (selectorSettings.annuelConso.useTodayAsEnd) {
      todayStr = `${currentYear}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    } else {
      const eMonth = selectorSettings.annuelConso.endMonth;
      const eDay = selectorSettings.annuelConso.endDay;
      let endYear = (selectorSettings.annuelConso.endYear !== undefined && !isNaN(Number(selectorSettings.annuelConso.endYear)))
        ? Number(selectorSettings.annuelConso.endYear)
        : startYear;
      
      if (selectorSettings.annuelConso.endYear === undefined || isNaN(Number(selectorSettings.annuelConso.endYear))) {
        if (eMonth < sMonth || (eMonth === sMonth && eDay < sDay)) {
          endYear = startYear + 1;
        }
      }
      todayStr = `${endYear}-${String(eMonth).padStart(2, '0')}-${String(eDay).padStart(2, '0')}`;
    }
    
    return { startStr, todayStr, startYear };
  };

  const { startStr, todayStr, startYear } = getAnnualPeriodDates();
  
  // Vérifier si aujourd'hui est le jour exact de début de la période
  const checkIsTodayStart = () => {
    const today = new Date();
    const isSameDayMonth = today.getMonth() === (selectorSettings.annuelConso.startMonth - 1) && today.getDate() === selectorSettings.annuelConso.startDay;
    if (selectorSettings.annuelConso.startYear) {
      return isSameDayMonth && today.getFullYear() === Number(selectorSettings.annuelConso.startYear);
    }
    return isSameDayMonth;
  };
  const isTodayStart = checkIsTodayStart();

  const annualStats = isTodayStart
    ? { totalConso: 0, totalCoutTTC: 0, ratioHP: 50, nombreDeMois: 0, overrideAbonnement: config.abonnementMensuel }
    : calculerStatsPourIntervalle(releves, config, startStr, todayStr);

  // Calculs annuel complet basés sur les paramètres utilisateur pour annuelComplet
  const getFullAnnualPeriodDates = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    const sMonth = selectorSettings.annuelComplet.startMonth;
    const sDay = selectorSettings.annuelComplet.startDay;
    const eMonth = selectorSettings.annuelComplet.endMonth;
    const eDay = selectorSettings.annuelComplet.endDay;
    
    let startYear = (selectorSettings.annuelComplet.startYear !== undefined && !isNaN(Number(selectorSettings.annuelComplet.startYear)))
      ? Number(selectorSettings.annuelComplet.startYear)
      : currentYear;
    
    if (selectorSettings.annuelComplet.startYear === undefined || isNaN(Number(selectorSettings.annuelComplet.startYear))) {
      const startDateThisYear = new Date(currentYear, sMonth - 1, sDay);
      if (today < startDateThisYear) {
        startYear = currentYear - 1;
      }
    }
    
    let endYear = (selectorSettings.annuelComplet.endYear !== undefined && !isNaN(Number(selectorSettings.annuelComplet.endYear)))
      ? Number(selectorSettings.annuelComplet.endYear)
      : startYear;
    
    if (selectorSettings.annuelComplet.endYear === undefined || isNaN(Number(selectorSettings.annuelComplet.endYear))) {
      if (eMonth < sMonth || (eMonth === sMonth && eDay < sDay)) {
        endYear = startYear + 1;
      }
    }
    
    const startStr = `${startYear}-${String(sMonth).padStart(2, '0')}-${String(sDay).padStart(2, '0')}`;
    const endStr = `${endYear}-${String(eMonth).padStart(2, '0')}-${String(eDay).padStart(2, '0')}`;
    
    return { startStr, endStr, startYear, endYear };
  };

  const { startStr: fullStartStr, endStr: fullEndStr, startYear: fullStartYear, endYear: fullEndYear } = getFullAnnualPeriodDates();
  const fullAnnualStats = calculerStatsPourIntervalle(releves, config, fullStartStr, fullEndStr);

  // Déterminer s'il faut afficher les totaux filtrés (onglet budget uniquement)
  const showFiltered = activeTab === 'budget' && filteredStats !== null;

  let displayConso = totalConso;
  let displayCoutTTC = totalCoutTTC;
  let displayRatioHP = ratioHP;
  let displayNombreDeMois = nombreDeMois;
  let displayOverrideAbonnement: number | undefined = undefined;
  let displayBadgeText: string | undefined = undefined;

  if (showFiltered) {
    displayConso = filteredStats.totalConso;
    displayCoutTTC = filteredStats.totalCoutTTC;
    displayRatioHP = filteredStats.ratioHP;
    displayNombreDeMois = filteredStats.nombreDeMois;
    displayOverrideAbonnement = filteredStats.overrideAbonnement;
    displayBadgeText = 'Budget / Filtré';
  } else if (periodSelection === 'annuel_complet') {
    displayConso = fullAnnualStats.totalConso;
    displayCoutTTC = fullAnnualStats.totalCoutTTC;
    displayRatioHP = fullAnnualStats.ratioHP;
    displayNombreDeMois = fullAnnualStats.nombreDeMois;
    displayOverrideAbonnement = fullAnnualStats.overrideAbonnement;
    displayBadgeText = `Annuel (${String(selectorSettings.annuelComplet.startDay).padStart(2, '0')}/${String(selectorSettings.annuelComplet.startMonth).padStart(2, '0')}/${fullStartYear} - ${String(selectorSettings.annuelComplet.endDay).padStart(2, '0')}/${String(selectorSettings.annuelComplet.endMonth).padStart(2, '0')}/${fullEndYear})`;
  } else if (periodSelection === 'annuel') {
    displayConso = annualStats.totalConso;
    displayCoutTTC = annualStats.totalCoutTTC;
    displayRatioHP = annualStats.ratioHP;
    displayNombreDeMois = annualStats.nombreDeMois;
    displayOverrideAbonnement = annualStats.overrideAbonnement;
    const endLabel = selectorSettings.annuelConso.useTodayAsEnd 
      ? new Date().toLocaleDateString('fr-FR')
      : `${String(selectorSettings.annuelConso.endDay).padStart(2, '0')}/${String(selectorSettings.annuelConso.endMonth).padStart(2, '0')}/${new Date(todayStr).getFullYear()}`;
    displayBadgeText = `Conso annuel (${String(selectorSettings.annuelConso.startDay).padStart(2, '0')}/${String(selectorSettings.annuelConso.startMonth).padStart(2, '0')}/${startYear} - ${endLabel})`;
  } else {
    displayBadgeText = 'Période complète';
  }

  // Comparaison des différentes options tarifaires sur la période complète
  const comparaisonOptions: ComparaisonOption[] = comparerOptionsTarifaires(
    totalConsoHP,
    totalConsoHC,
    nombreDeMois / 12 || 1, // fraction d'année
    config
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800 antialiased selection:bg-blue-500 selection:text-white">
      {/* Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between h-full">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-slate-100 flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white/10" />
            </div>
            <span className="font-bold text-lg tracking-tight uppercase text-slate-900">VoltTrack</span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              id="tab-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Tableau de Bord</span>
            </button>

            <button
              id="tab-releves"
              onClick={() => setActiveTab('releves')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all cursor-pointer ${
                activeTab === 'releves'
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <TableProperties className={`w-4 h-4 ${activeTab === 'releves' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Saisie des Relevés</span>
            </button>

            <button
              id="tab-budget"
              onClick={() => setActiveTab('budget')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all cursor-pointer ${
                activeTab === 'budget'
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <ReceiptEuro className={`w-4 h-4 ${activeTab === 'budget' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Budget Prévisionnel</span>
            </button>

            <button
              id="tab-comparateur"
              onClick={() => setActiveTab('comparateur')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all cursor-pointer ${
                activeTab === 'comparateur'
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <GitCompare className={`w-4 h-4 ${activeTab === 'comparateur' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Comparateur</span>
            </button>

            <button
              id="tab-estimation"
              onClick={() => setActiveTab('estimation')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all cursor-pointer ${
                activeTab === 'estimation'
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Calculator className={`w-4 h-4 ${activeTab === 'estimation' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Estimation facture</span>
            </button>

            <button
              id="tab-config"
              onClick={() => setActiveTab('config')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all cursor-pointer ${
                activeTab === 'config'
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className={`w-4 h-4 ${activeTab === 'config' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Configuration Contrat</span>
            </button>

            <button
              id="tab-backup"
              onClick={() => setActiveTab('backup')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all cursor-pointer ${
                activeTab === 'backup'
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Save className={`w-4 h-4 ${activeTab === 'backup' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Sauvegarde et export</span>
            </button>

            <button
              id="tab-sites"
              onClick={() => setActiveTab('sites')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all cursor-pointer ${
                activeTab === 'sites'
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Globe className={`w-4 h-4 ${activeTab === 'sites' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Site de mise à jour</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Info Widget */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 mb-1.5 text-orange-600">
            <TrendingDown className="w-4 h-4 rotate-180 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Hausse Tarifaire</span>
          </div>
          <div className="text-slate-900 font-bold text-sm">
            +{config.haussePrevue}% simulés
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
            Prenez en compte les taxes de l'année.
          </p>
        </div>
      </aside>

      {/* Main Container Frame */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-md font-bold text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && "Synthèse de Consommation & Économies"}
              {activeTab === 'releves' && "Suivi & Saisie des Relevés de Compteurs"}
              {activeTab === 'budget' && "Planification Budgétaire Annuelle"}
              {activeTab === 'comparateur' && "Comparateur de Consommation & Factures"}
              {activeTab === 'estimation' && "Estimation de Facture & Calcul de la Part Fixe"}
              {activeTab === 'config' && "Paramètres de votre Abonnement Énergétique"}
              {activeTab === 'backup' && "Sauvegarde et Exportation de vos Données"}
              {activeTab === 'sites' && "Sites de Mise à Jour des Données & Tarifs"}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              {activeTab === 'dashboard' && "Visualisez votre budget annuel et identifiez des opportunités d'économies"}
              {activeTab === 'releves' && "Gérez l'historique complet de vos consommations Heures Pleines / Heures Creuses"}
              {activeTab === 'budget' && "Mensualités prévisionnelles détaillées incluant taxes et variations tarifaires"}
              {activeTab === 'comparateur' && "Comparez directement vos consommations et coûts TTC d'une année sur l'autre"}
              {activeTab === 'estimation' && "Calculez le montant exact de la part fixe et simulez vos coûts sur une période personnalisée"}
              {activeTab === 'config' && "Ajustez vos tarifs et taxes réels pour des projections d'une précision totale"}
              {activeTab === 'backup' && "Exportez l'intégralité de l'application vers un fichier Excel ou restaurez une sauvegarde précédente"}
              {activeTab === 'sites' && "Accédez aux portails officiels pour actualiser vos barèmes TURPE, relevés et taxes"}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-[11px] text-slate-500 font-medium bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-600 font-semibold">Dernier relevé enregistré le :</span>
              <span className="font-mono font-bold text-slate-800">
                {dernierReleveDate || 'Aucun'}
              </span>
            </div>

            <button
              id="btn-sauvegarder"
              onClick={() => exportFullBackupExcel(releves, config, triggerToast)}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700 active:from-pink-700 active:to-blue-800 text-white font-semibold rounded-lg text-xs transition-all shadow-xs hover:shadow-md flex items-center gap-2 cursor-pointer border border-pink-400/20"
              title="Télécharger une sauvegarde Excel complète"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sauvegarder</span>
            </button>
            <div className="h-4 w-px bg-slate-200"></div>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">
              Abo: {config.type === 'HP_HC' ? 'HP / HC' : 'Base'}
            </span>
          </div>
        </header>

        {/* Content Scrolling Pane */}
        <main className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/70">
          {activeTab !== 'estimation' && activeTab !== 'config' && activeTab !== 'backup' && activeTab !== 'sites' && activeTab !== 'comparateur' && (
            <>
              {/* Période d'analyse des indicateurs */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Période des indicateurs</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {periodSelection === 'annuel_complet'
                      ? `Affichage des données cumulées du ${String(selectorSettings.annuelComplet.startDay).padStart(2, '0')}/${String(selectorSettings.annuelComplet.startMonth).padStart(2, '0')}/${fullStartYear} au ${String(selectorSettings.annuelComplet.endDay).padStart(2, '0')}/${String(selectorSettings.annuelComplet.endMonth).padStart(2, '0')}/${fullEndYear}`
                      : periodSelection === 'annuel' 
                      ? `Affichage des données cumulées du ${String(selectorSettings.annuelConso.startDay).padStart(2, '0')}/${String(selectorSettings.annuelConso.startMonth).padStart(2, '0')}/${startYear} au ${selectorSettings.annuelConso.useTodayAsEnd ? new Date().toLocaleDateString('fr-FR') : `${String(selectorSettings.annuelConso.endDay).padStart(2, '0')}/${String(selectorSettings.annuelConso.endMonth).padStart(2, '0')}/${new Date(todayStr).getFullYear()}`}`
                      : 'Affichage de l\'intégralité des données historiques disponibles'
                    }
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 self-stretch md:self-auto w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 hover:border-slate-300 text-slate-600 hover:text-slate-800 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    title="Configurer les dates des sélecteurs"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                    <span>Paramètres des sélecteurs</span>
                  </button>
                  
                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/60 flex-1 sm:flex-initial">
                    <button
                      type="button"
                      onClick={() => setPeriodSelection('annuel_complet')}
                      className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        periodSelection === 'annuel_complet'
                          ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Annuel
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriodSelection('annuel')}
                      className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        periodSelection === 'annuel'
                          ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Conso annuel
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriodSelection('total')}
                      className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        periodSelection === 'total'
                          ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Total
                    </button>
                  </div>
                </div>
              </div>

              {/* Key Metrics Dashboard Row */}
              <Header
                config={config}
                totalConso={displayConso}
                totalCoutTTC={displayCoutTTC}
                ratioHP={displayRatioHP}
                nombreDeMois={displayNombreDeMois}
                overrideAbonnement={displayOverrideAbonnement}
                isFilteredOrSimulated={showFiltered || periodSelection !== 'total'}
                badgeText={displayBadgeText}
                releves={releves}
              />
            </>
          )}

          {/* Dynamic Interactive View */}
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'dashboard' && (
                  <StatsDashboard
                    analyseMois={analyseMois}
                    comparaisonOptions={comparaisonOptions}
                    config={config}
                  />
                )}

                {activeTab === 'releves' && (
                  <RelevesTable
                    releves={releves}
                    config={config}
                    onAddReleve={handleAddReleve}
                    onDeleteReleve={handleDeleteReleve}
                  />
                )}

                {activeTab === 'budget' && (
                  <BudgetPrevisionnel
                    analyseMois={analyseMois}
                    config={config}
                    onFilteredStatsChange={setFilteredStats}
                  />
                )}

                {activeTab === 'comparateur' && (
                  <Comparateur
                    releves={releves}
                    config={config}
                  />
                )}

                {activeTab === 'estimation' && (
                  <EstimationFacture
                    config={config}
                    releves={releves}
                    analyseMois={analyseMois}
                    autoOpenTurpeModal={autoOpenTurpeModal}
                    onTurpeModalClosed={() => setAutoOpenTurpeModal(false)}
                    onChangeConfig={handleChangeConfig}
                  />
                )}

                {activeTab === 'config' && (
                  <ContratConfig
                    config={config}
                    onChangeConfig={handleChangeConfig}
                  />
                )}

                {activeTab === 'backup' && (
                  <SauvegardeExport
                    releves={releves}
                    config={config}
                    onImportData={handleImportData}
                    triggerToast={triggerToast}
                  />
                )}

                {activeTab === 'sites' && (
                  <SiteMiseAJour
                    triggerToast={triggerToast}
                    onNavigateToTab={(tab, options) => {
                      setActiveTab(tab);
                      if (options?.openTurpeModal) {
                        setAutoOpenTurpeModal(true);
                      }
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Section FAQ / Conseils Éco-gestes interactifs */}
          <section id="eco-gestes-guide" className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2 uppercase tracking-wider">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              Guide pratique : Maîtriser sa facture d'électricité
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex gap-4">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0 h-fit">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-800">Optimiser les Heures Creuses</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    L'option HP/HC n'est rentable que si vous déplacez plus de <strong className="text-slate-700">30%</strong> de votre consommation (chauffe-eau, lave-linge, lave-vaisselle, recharge auto) pendant la nuit. Utilisez notre onglet de comparaison pour vérifier votre rentabilité !
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg shrink-0 h-fit">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-800">Chasser les consommations cachées</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Les appareils en veille (box internet, écrans, chargeurs laissés branchés) représentent jusqu'à <strong className="text-slate-700">10%</strong> de la facture d'un ménage. Des multiprises à interrupteur coupent efficacement ces pertes passives.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg shrink-0 h-fit">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-800">Réguler le chauffage électrique</h3>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Le chauffage représente près de <strong className="text-slate-700">60%</strong> de la consommation annuelle. Réduire la consigne de seulement <strong className="text-slate-700">1°C</strong> permet de réduire de <strong className="text-slate-700">7%</strong> la consommation liée au chauffage.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="text-center text-[10px] text-slate-400 font-mono flex items-center justify-center gap-2 py-4">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>VoltTrack — Application Locale Privée de Suivi Énergétique</span>
          </footer>
        </main>
      </div>

      {/* Modal Paramètres des Sélecteurs */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsModalOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-3xl bg-white rounded-2xl border border-slate-200/80 shadow-2xl overflow-hidden z-10"
            >
              {/* Header */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900">Paramètres des sélecteurs de période</h3>
                </div>
                <button
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors text-lg font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Sélecteur Annuel Complet */}
                <div className="space-y-4 bg-slate-50/50 p-5 rounded-xl border border-slate-200/70">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Sélecteur "Annuel" (Période complète de 12 mois)
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Définit la période annuelle complète pour l'analyse globale (ex: du 01/08/2025 au 31/07/2026, ou du 01/01/2026 au 31/12/2026).
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Début */}
                    <div className="space-y-1.5 bg-white p-3.5 rounded-lg border border-slate-200">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Date de début</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={tempSettings.annuelComplet.startDay}
                          onChange={(e) => setTempSettings({
                            ...tempSettings,
                            annuelComplet: {
                              ...tempSettings.annuelComplet,
                              startDay: parseInt(e.target.value)
                            }
                          })}
                          className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 font-mono focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none"
                          title="Jour de début"
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <option key={day} value={day}>{String(day).padStart(2, '0')}</option>
                          ))}
                        </select>
                        <select
                          value={tempSettings.annuelComplet.startMonth}
                          onChange={(e) => setTempSettings({
                            ...tempSettings,
                            annuelComplet: {
                              ...tempSettings.annuelComplet,
                              startMonth: parseInt(e.target.value)
                            }
                          })}
                          className="flex-1 min-w-[110px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none"
                          title="Mois de début"
                        >
                          {MOIS_FR.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="2000"
                          max="2099"
                          value={tempSettings.annuelComplet.startYear ?? ''}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : undefined;
                            setTempSettings({
                              ...tempSettings,
                              annuelComplet: {
                                ...tempSettings.annuelComplet,
                                startYear: val
                              }
                            });
                          }}
                          placeholder="Année"
                          className="w-24 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none"
                          title="Année de début"
                        />
                      </div>
                    </div>

                    {/* Fin */}
                    <div className="space-y-1.5 bg-white p-3.5 rounded-lg border border-slate-200">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Date de fin</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={tempSettings.annuelComplet.endDay}
                          onChange={(e) => setTempSettings({
                            ...tempSettings,
                            annuelComplet: {
                              ...tempSettings.annuelComplet,
                              endDay: parseInt(e.target.value)
                            }
                          })}
                          className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 font-mono focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none"
                          title="Jour de fin"
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <option key={day} value={day}>{String(day).padStart(2, '0')}</option>
                          ))}
                        </select>
                        <select
                          value={tempSettings.annuelComplet.endMonth}
                          onChange={(e) => setTempSettings({
                            ...tempSettings,
                            annuelComplet: {
                              ...tempSettings.annuelComplet,
                              endMonth: parseInt(e.target.value)
                            }
                          })}
                          className="flex-1 min-w-[110px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none"
                          title="Mois de fin"
                        >
                          {MOIS_FR.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="2000"
                          max="2099"
                          value={tempSettings.annuelComplet.endYear ?? ''}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : undefined;
                            setTempSettings({
                              ...tempSettings,
                              annuelComplet: {
                                ...tempSettings.annuelComplet,
                                endYear: val
                              }
                            });
                          }}
                          placeholder="Année"
                          className="w-24 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none"
                          title="Année de fin"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sélecteur Conso Annuel */}
                <div className="space-y-4 bg-slate-50/50 p-5 rounded-xl border border-slate-200/70">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Sélecteur "Conso annuel" (Période cumulée à date)
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Définit la période cumulée de l'année en cours (ex: du 01/08/2025 à aujourd'hui, ou jusqu'à une date fixe spécifique).
                  </p>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Début */}
                      <div className="space-y-1.5 bg-white p-3.5 rounded-lg border border-slate-200">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Date de début</label>
                        <div className="flex items-center gap-2">
                          <select
                            value={tempSettings.annuelConso.startDay}
                            onChange={(e) => setTempSettings({
                              ...tempSettings,
                              annuelConso: {
                                ...tempSettings.annuelConso,
                                startDay: parseInt(e.target.value)
                              }
                            })}
                            className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 font-mono focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none"
                            title="Jour de début"
                          >
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                              <option key={day} value={day}>{String(day).padStart(2, '0')}</option>
                            ))}
                          </select>
                          <select
                            value={tempSettings.annuelConso.startMonth}
                            onChange={(e) => setTempSettings({
                              ...tempSettings,
                              annuelConso: {
                                ...tempSettings.annuelConso,
                                startMonth: parseInt(e.target.value)
                              }
                            })}
                            className="flex-1 min-w-[110px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none"
                            title="Mois de début"
                          >
                            {MOIS_FR.map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="2000"
                            max="2099"
                            value={tempSettings.annuelConso.startYear ?? ''}
                            onChange={(e) => {
                              const val = e.target.value ? parseInt(e.target.value) : undefined;
                              setTempSettings({
                                ...tempSettings,
                                annuelConso: {
                                  ...tempSettings.annuelConso,
                                  startYear: val
                                }
                              });
                            }}
                            placeholder="Année"
                            className="w-24 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none"
                            title="Année de début"
                          />
                        </div>
                      </div>

                      {/* Fin conditionnelle */}
                      <div className="space-y-1.5 bg-white p-3.5 rounded-lg border border-slate-200">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Date de fin</label>
                        {tempSettings.annuelConso.useTodayAsEnd ? (
                          <div className="h-[34px] flex items-center justify-between px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium">
                            <span className="italic text-slate-500">Aujourd'hui (dynamique)</span>
                            <span className="font-mono text-[11px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                              {new Date().toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <select
                              value={tempSettings.annuelConso.endDay}
                              onChange={(e) => setTempSettings({
                                ...tempSettings,
                                annuelConso: {
                                  ...tempSettings.annuelConso,
                                  endDay: parseInt(e.target.value)
                                }
                              })}
                              className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 font-mono focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none"
                              title="Jour de fin"
                            >
                              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                <option key={day} value={day}>{String(day).padStart(2, '0')}</option>
                              ))}
                            </select>
                            <select
                              value={tempSettings.annuelConso.endMonth}
                              onChange={(e) => setTempSettings({
                                ...tempSettings,
                                annuelConso: {
                                  ...tempSettings.annuelConso,
                                  endMonth: parseInt(e.target.value)
                                }
                              })}
                              className="flex-1 min-w-[110px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none"
                              title="Mois de fin"
                            >
                              {MOIS_FR.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="2000"
                              max="2099"
                              value={tempSettings.annuelConso.endYear ?? ''}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) : undefined;
                                setTempSettings({
                                  ...tempSettings,
                                  annuelConso: {
                                    ...tempSettings.annuelConso,
                                    endYear: val
                                  }
                                });
                              }}
                              placeholder="Année"
                              className="w-24 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none"
                              title="Année de fin"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 bg-white p-3 rounded-lg border border-slate-200">
                      <input
                        id="checkbox-use-today"
                        type="checkbox"
                        checked={tempSettings.annuelConso.useTodayAsEnd}
                        onChange={(e) => setTempSettings({
                          ...tempSettings,
                          annuelConso: {
                            ...tempSettings.annuelConso,
                            useTodayAsEnd: e.target.checked
                          }
                        })}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded-sm focus:ring-blue-500/20 cursor-pointer"
                      />
                      <label htmlFor="checkbox-use-today" className="text-xs text-slate-700 font-medium cursor-pointer select-none">
                        Utiliser automatiquement la date du jour comme date de fin dynamique
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleResetSelectorSettings}
                  className="px-3.5 py-1.5 hover:bg-slate-200/70 text-slate-600 hover:text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-200 bg-white shadow-2xs"
                >
                  Valeurs par défaut
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(false)}
                    className="px-4 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSelectorSettings}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Appliquer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notifications Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white font-semibold text-xs py-3 px-5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-800"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
