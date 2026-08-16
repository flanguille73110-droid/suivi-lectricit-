/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Tv, 
  Flame, 
  Wind, 
  Shirt, 
  Plus, 
  Trash2, 
  HelpCircle, 
  Info, 
  Calculator, 
  RotateCcw, 
  Check, 
  Laptop, 
  Wifi, 
  Clock, 
  Coins, 
  Sparkles,
  TrendingUp,
  Sliders,
  Calendar,
  Layers,
  ChevronDown,
  CheckSquare,
  Square
} from 'lucide-react';
import { TarifConfig } from '../types';

interface EstimerAppareilProps {
  config: TarifConfig;
}

interface AppareilItem {
  id: string;
  nom: string;
  puissanceWatts: number;
  heuresParJour: number;
  joursParSemaine: number;
  moisActifs?: number[]; // indices 0 à 11 pour Janvier à Décembre
  pourcentageHP: number; // 0 à 100, le reste en HC (si HP_HC)
  categorie?: string;
}

const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const MOIS_NOMS_COURTS = [
  'Janv', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'
];

const APPAREILS_PRESETS: Array<{
  nom: string;
  puissanceWatts: number;
  heuresParJour: number;
  joursParSemaine: number;
  moisActifs?: number[];
  categorie: string;
  iconName: string;
}> = [
  { nom: 'Réfrigérateur avec congélateur', puissanceWatts: 150, heuresParJour: 24, joursParSemaine: 7, moisActifs: [0,1,2,3,4,5,6,7,8,9,10,11], categorie: 'Froid', iconName: 'Wind' },
  { nom: 'Lave-linge (Cycle éco)', puissanceWatts: 2000, heuresParJour: 1, joursParSemaine: 4, moisActifs: [0,1,2,3,4,5,6,7,8,9,10,11], categorie: 'Lavage', iconName: 'Shirt' },
  { nom: 'Sèche-linge à condensation', puissanceWatts: 2500, heuresParJour: 1.5, joursParSemaine: 3, moisActifs: [0,1,2,3,4,5,6,7,8,9,10,11], categorie: 'Lavage', iconName: 'Shirt' },
  { nom: 'Lave-vaisselle', puissanceWatts: 1200, heuresParJour: 1.5, joursParSemaine: 7, moisActifs: [0,1,2,3,4,5,6,7,8,9,10,11], categorie: 'Lavage', iconName: 'Shirt' },
  { nom: 'Chauffe-eau électrique (Cumulus 200L)', puissanceWatts: 2200, heuresParJour: 3.5, joursParSemaine: 7, moisActifs: [0,1,2,3,4,5,6,7,8,9,10,11], categorie: 'Eau chaude', iconName: 'Flame' },
  { nom: 'Radiateur électrique (Inertie 1500W)', puissanceWatts: 1500, heuresParJour: 8, joursParSemaine: 7, moisActifs: [10,11,0,1,2,3], categorie: 'Chauffage', iconName: 'Flame' },
  { nom: 'Pompe à chaleur (PAC air-air)', puissanceWatts: 2500, heuresParJour: 10, joursParSemaine: 7, moisActifs: [10,11,0,1,2,3], categorie: 'Chauffage', iconName: 'Flame' },
  { nom: 'Climatiseur mobile (Été)', puissanceWatts: 2000, heuresParJour: 6, joursParSemaine: 7, moisActifs: [5,6,7,8], categorie: 'Froid', iconName: 'Wind' },
  { nom: 'Plaque de cuisson induction', puissanceWatts: 2000, heuresParJour: 0.75, joursParSemaine: 7, moisActifs: [0,1,2,3,4,5,6,7,8,9,10,11], categorie: 'Cuisine', iconName: 'Zap' },
  { nom: 'Four électrique encastrable', puissanceWatts: 2500, heuresParJour: 0.5, joursParSemaine: 5, moisActifs: [0,1,2,3,4,5,6,7,8,9,10,11], categorie: 'Cuisine', iconName: 'Zap' },
  { nom: 'Téléviseur 4K LED 55"', puissanceWatts: 110, heuresParJour: 5, joursParSemaine: 7, moisActifs: [0,1,2,3,4,5,6,7,8,9,10,11], categorie: 'High-Tech', iconName: 'Tv' },
  { nom: 'Pompe de piscine', puissanceWatts: 1000, heuresParJour: 10, joursParSemaine: 7, moisActifs: [4,5,6,7,8], categorie: 'Extérieur', iconName: 'Zap' },
];

export default function EstimerAppareil({ config }: EstimerAppareilProps) {
  // Calcul des prix du kWh TTC
  const tvaNormaleRate = (config.taxes?.tvaNormale ?? 20) / 100;
  const prixKwhBaseTTC = config.prixKwhBase * (1 + tvaNormaleRate);
  const prixKwhHPTTC = config.prixKwhHP * (1 + tvaNormaleRate);
  const prixKwhHCTTC = config.prixKwhHC * (1 + tvaNormaleRate);

  // État du calculateur d'un appareil individuel
  const [nomAppareil, setNomAppareil] = useState('Mon Appareil');
  const [puissanceInput, setPuissanceInput] = useState<string>('1000');
  const [unitePuissance, setUnitePuissance] = useState<'W' | 'kW'>('W');
  const [heuresParJour, setHeuresParJour] = useState<number>(4);
  const [minutesParJour, setMinutesParJour] = useState<number>(0);
  const [joursParSemaine, setJoursParSemaine] = useState<number>(7);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([0,1,2,3,4,5,6,7,8,9,10,11]);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState<boolean>(false);
  const [pourcentageHP, setPourcentageHP] = useState<number>(60); // 60% HP / 40% HC par défaut si HP_HC

  const monthDropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown au clic à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Liste des appareils enregistrés dans la maison
  const [mesAppareils, setMesAppareils] = useState<AppareilItem[]>(() => {
    const saved = localStorage.getItem('elec_mes_appareils_estimes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: '1', nom: 'Réfrigérateur', puissanceWatts: 150, heuresParJour: 24, joursParSemaine: 7, moisActifs: [0,1,2,3,4,5,6,7,8,9,10,11], pourcentageHP: 60, categorie: 'Froid' },
      { id: '2', nom: 'Téléviseur Salon', puissanceWatts: 120, heuresParJour: 5, joursParSemaine: 7, moisActifs: [0,1,2,3,4,5,6,7,8,9,10,11], pourcentageHP: 80, categorie: 'High-Tech' },
      { id: '3', nom: 'Radiateur Chambre', puissanceWatts: 1500, heuresParJour: 8, joursParSemaine: 7, moisActifs: [10,11,0,1,2,3], pourcentageHP: 50, categorie: 'Chauffage' },
    ];
  });

  // Sauvegarder la liste
  useEffect(() => {
    localStorage.setItem('elec_mes_appareils_estimes', JSON.stringify(mesAppareils));
  }, [mesAppareils]);

  // Conversion puissance en Watts
  const valPuissance = parseFloat(puissanceInput.replace(',', '.')) || 0;
  const puissanceWatts = unitePuissance === 'kW' ? valPuissance * 1000 : valPuissance;

  // Calcul du temps total quotidien en heures décimales
  const dureeQuotidienneHeures = Math.max(0, heuresParJour + (minutesParJour / 60));

  // --- CALCULS INDIVIDUELS ---
  // Consommation en kWh par jour d'utilisation
  const kwhParJourUtilisation = (puissanceWatts * dureeQuotidienneHeures) / 1000;
  
  // Consommation en kWh par jour moyen lissé sur la semaine
  const kwhParJourLisse = kwhParJourUtilisation * (joursParSemaine / 7);

  // Nombre de mois actifs sélectionnés (0 à 12)
  const nbMoisActifs = selectedMonths.length;

  // Consommation mensuelle moyenne pendant les mois d'utilisation (~30.4167 jours par mois)
  const kwhParMois = kwhParJourLisse * (365 / 12);

  // Consommation annuelle en tenant compte du nombre de mois d'utilisation sélectionnés
  const kwhParAn = kwhParJourLisse * (nbMoisActifs / 12) * 365;

  // Fonction de calcul du prix moyen par kWh TTC pour un appareil donné
  const getPrixMoyenKwhTTC = (pctHP: number) => {
    if (config.type === 'BASE') {
      return prixKwhBaseTTC;
    }
    const ratioHP = Math.min(100, Math.max(0, pctHP)) / 100;
    const ratioHC = 1 - ratioHP;
    return (prixKwhHPTTC * ratioHP) + (prixKwhHCTTC * ratioHC);
  };

  const prixMoyenKwhAppareil = getPrixMoyenKwhTTC(pourcentageHP);

  // Coûts financiers pour l'appareil courant
  const coutParJour = kwhParJourLisse * prixMoyenKwhAppareil;
  const coutParMois = kwhParMois * prixMoyenKwhAppareil;
  const coutParAn = kwhParAn * prixMoyenKwhAppareil;

  // Toggle un mois
  const toggleMonth = (monthIndex: number) => {
    setSelectedMonths(prev => {
      if (prev.includes(monthIndex)) {
        return prev.filter(m => m !== monthIndex).sort((a, b) => a - b);
      } else {
        return [...prev, monthIndex].sort((a, b) => a - b);
      }
    });
  };

  // Appliquer un preset
  const handleSelectPreset = (preset: typeof APPAREILS_PRESETS[0]) => {
    setNomAppareil(preset.nom);
    if (preset.puissanceWatts >= 1000 && preset.puissanceWatts % 500 === 0) {
      setPuissanceInput((preset.puissanceWatts / 1000).toString());
      setUnitePuissance('kW');
    } else {
      setPuissanceInput(preset.puissanceWatts.toString());
      setUnitePuissance('W');
    }
    const hInt = Math.floor(preset.heuresParJour);
    const mInt = Math.round((preset.heuresParJour - hInt) * 60);
    setHeuresParJour(hInt);
    setMinutesParJour(mInt);
    setJoursParSemaine(preset.joursParSemaine);
    if (preset.moisActifs) {
      setSelectedMonths(preset.moisActifs);
    } else {
      setSelectedMonths([0,1,2,3,4,5,6,7,8,9,10,11]);
    }
  };

  // Ajouter l'appareil actuel à la liste "Mes appareils"
  const handleAjouterALaListe = () => {
    if (!nomAppareil.trim() || puissanceWatts <= 0) return;
    const newItem: AppareilItem = {
      id: `app_${Date.now()}`,
      nom: nomAppareil.trim(),
      puissanceWatts,
      heuresParJour: dureeQuotidienneHeures,
      joursParSemaine,
      moisActifs: selectedMonths.length > 0 ? selectedMonths : [0,1,2,3,4,5,6,7,8,9,10,11],
      pourcentageHP,
    };
    setMesAppareils(prev => [...prev, newItem]);
  };

  const handleSupprimerAppareil = (id: string) => {
    setMesAppareils(prev => prev.filter(item => item.id !== id));
  };

  // Calculs totaux de la liste d'appareils
  const totalListKwhJour = mesAppareils.reduce((acc, item) => {
    const kwhJourUtil = (item.puissanceWatts * item.heuresParJour) / 1000;
    return acc + (kwhJourUtil * (item.joursParSemaine / 7));
  }, 0);

  const totalListCoutAn = mesAppareils.reduce((acc, item) => {
    const kwhJourLisse = ((item.puissanceWatts * item.heuresParJour) / 1000) * (item.joursParSemaine / 7);
    const mois = item.moisActifs && item.moisActifs.length > 0 ? item.moisActifs.length : 12;
    const kwhAn = kwhJourLisse * (mois / 12) * 365;
    const prixKwh = getPrixMoyenKwhTTC(item.pourcentageHP);
    return acc + (kwhAn * prixKwh);
  }, 0);

  // Formater le libellé des mois sélectionnés
  const renderSelectedMonthsText = () => {
    if (selectedMonths.length === 12) {
      return 'Toute l\'année (12 mois / 12)';
    }
    if (selectedMonths.length === 0) {
      return 'Aucun mois sélectionné';
    }
    if (selectedMonths.length <= 4) {
      return selectedMonths.map(m => MOIS_NOMS[m]).join(', ');
    }
    return `${selectedMonths.length} mois sélectionnés (${selectedMonths.map(m => MOIS_NOMS_COURTS[m]).join(', ')})`;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* En-tête principal */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Estimer la consommation d'un appareil
                </h1>
                <p className="text-slate-500 text-xs mt-0.5">
                  Calculez exactement la consommation en kWh par jour, mois et an de vos équipements électriques et leur coût réel.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/60 text-xs text-slate-600 font-mono">
            <span>Tarif kWh TTC appliqué :</span>
            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {config.type === 'BASE' 
                ? `${prixKwhBaseTTC.toFixed(4)} €/kWh` 
                : `${prixKwhHPTTC.toFixed(4)} € (HP) / ${prixKwhHCTTC.toFixed(4)} € (HC)`
              }
            </span>
          </div>
        </div>
      </div>

      {/* Grille principale : Calculateur + Résultats clés */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Colonne Gauche : Formulaire de saisie (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                Paramètres de l'appareil
              </h2>
              <button
                type="button"
                onClick={() => {
                  setNomAppareil('Nouvel appareil');
                  setPuissanceInput('1000');
                  setUnitePuissance('W');
                  setHeuresParJour(2);
                  setMinutesParJour(0);
                  setJoursParSemaine(7);
                  setSelectedMonths([0,1,2,3,4,5,6,7,8,9,10,11]);
                  setPourcentageHP(60);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Réinitialiser
              </button>
            </div>

            {/* Nom de l'appareil */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nom ou désignation de l'appareil
              </label>
              <input
                type="text"
                value={nomAppareil}
                onChange={(e) => setNomAppareil(e.target.value)}
                placeholder="Ex: Radiateur salon, Sèche-linge..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
              />
            </div>

            {/* Puissance électrique (Watts / kW) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Puissance électrique
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={puissanceInput}
                    onChange={(e) => setPuissanceInput(e.target.value)}
                    placeholder="Ex: 2000"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-mono font-bold"
                  />
                </div>
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setUnitePuissance('W')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      unitePuissance === 'W'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Watts (W)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitePuissance('kW')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      unitePuissance === 'kW'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    kiloWatts (kW)
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {unitePuissance === 'kW' 
                  ? `${valPuissance} kW équivaut à ${(valPuissance * 1000).toLocaleString('fr-FR')} Watts.`
                  : `${valPuissance} Watts équivaut à ${(valPuissance / 1000).toFixed(3)} kW.`
                }
              </p>
            </div>

            {/* Durée d'utilisation par jour */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Durée d'utilisation par jour d'usage</span>
                <span className="font-mono text-blue-600 font-bold">
                  {heuresParJour}h {minutesParJour > 0 ? `${minutesParJour}min` : ''} ({dureeQuotidienneHeures.toFixed(2)} h/jour)
                </span>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Heures (0 à 24)</span>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="1"
                    value={heuresParJour}
                    onChange={(e) => setHeuresParJour(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>0h</span>
                    <span>6h</span>
                    <span>12h</span>
                    <span>18h</span>
                    <span>24h</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Minutes (0 à 45)</span>
                  <select
                    value={minutesParJour}
                    onChange={(e) => setMinutesParJour(parseInt(e.target.value, 10))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500"
                  >
                    <option value={0}>0 min</option>
                    <option value={15}>15 min (+0,25 h)</option>
                    <option value={30}>30 min (+0,50 h)</option>
                    <option value={45}>45 min (+0,75 h)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Jours d'utilisation par semaine */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Fréquence d'utilisation hebdomadaire</span>
                <span className="font-mono text-blue-600 font-bold">{joursParSemaine} jour{joursParSemaine > 1 ? 's' : ''} / semaine</span>
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setJoursParSemaine(num)}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      joursParSemaine === num
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {num}d
                  </button>
                ))}
              </div>
            </div>

            {/* Mois d'utilisation dans l'année (Demandé par l'utilisateur sous la fréquence hebdomadaire) */}
            <div ref={monthDropdownRef} className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Mois d'utilisation dans l'année
                </span>
                <span className="font-mono text-blue-600 font-bold">
                  {selectedMonths.length === 12
                    ? '12 mois / 12'
                    : `${selectedMonths.length} mois / 12`}
                </span>
              </label>

              {/* Bouton de déclenchement du menu déroulant */}
              <button
                type="button"
                onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                className={`w-full flex items-center justify-between rounded-xl border bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 transition-all cursor-pointer ${
                  isMonthDropdownOpen 
                    ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-2 h-2 rounded-full ${selectedMonths.length > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="truncate text-slate-900 font-medium">
                    {renderSelectedMonthsText()}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isMonthDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
              </button>

              {/* Menu Déroulant avec cases à cocher multiples */}
              {isMonthDropdownOpen && (
                <div className="absolute z-30 mt-2 w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-4 space-y-3 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                      Cochez les mois d'activité :
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedMonths([0,1,2,3,4,5,6,7,8,9,10,11])}
                        className="text-blue-600 font-bold hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        Tout cocher
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMonths([])}
                        className="text-slate-500 font-bold hover:text-slate-700 hover:underline cursor-pointer"
                      >
                        Tout décocher
                      </button>
                    </div>
                  </div>

                  {/* Raccourcis saisonniers rapides */}
                  <div className="flex items-center gap-1.5 pb-1">
                    <span className="text-[10px] text-slate-400 font-semibold mr-1">Raccourcis :</span>
                    <button
                      type="button"
                      onClick={() => setSelectedMonths([10,11,0,1,2,3])}
                      className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[10px] font-semibold border border-blue-200 cursor-pointer"
                    >
                      Hiver (Nov-Avr)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMonths([4,5,6,7,8,9])}
                      className="px-2 py-0.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded text-[10px] font-semibold border border-amber-200 cursor-pointer"
                    >
                      Été / Beau temps (Mai-Oct)
                    </button>
                  </div>

                  {/* Grille des 12 mois avec cases à cocher */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pt-1">
                    {MOIS_NOMS.map((nomMois, index) => {
                      const isChecked = selectedMonths.includes(index);
                      return (
                        <label
                          key={index}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all cursor-pointer select-none ${
                            isChecked
                              ? 'bg-blue-50/80 border-blue-300 text-blue-900 font-bold shadow-xs'
                              : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMonth(index)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer accent-blue-600"
                          />
                          <span className="text-xs">{nomMois}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Option HP / HC si contrat HP_HC */}
            {config.type === 'HP_HC' && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2">
                <label className="block text-xs font-semibold text-slate-800 flex items-center justify-between">
                  <span>Répartition Heures Pleines / Heures Creuses</span>
                  <span className="font-mono text-xs font-bold text-blue-700">
                    {pourcentageHP}% HP / {100 - pourcentageHP}% HC
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={pourcentageHP}
                  onChange={(e) => setPourcentageHP(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>100% HC (Nuit)</span>
                  <span>50% / 50%</span>
                  <span>100% HP (Jour)</span>
                </div>
              </div>
            )}

            {/* Bouton d'action pour enregistrer dans la liste */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAjouterALaListe}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all cursor-pointer shadow-sm active:scale-[0.99]"
              >
                <Plus className="w-4 h-4 text-blue-400" />
                Ajouter cet appareil à ma liste de la maison
              </button>
            </div>
          </div>
        </div>

        {/* Colonne Droite : Cartes de résultats kWh et Coûts (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Carte Résultat Principal : Consommation Journalière */}
          <div className="bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Consommation par Jour
              </span>
              <span className="text-[10px] bg-blue-500/20 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full font-mono">
                {dureeQuotidienneHeures}h / jour
              </span>
            </div>

            {/* Valeur kWh / Jour mise en avant */}
            <div className="mb-4">
              <div className="text-4xl lg:text-5xl font-black font-mono tracking-tight text-white flex items-baseline gap-2">
                {kwhParJourLisse.toFixed(3)}
                <span className="text-lg font-bold text-blue-300">kWh / jour</span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {joursParSemaine < 7 
                  ? `(Soit ${kwhParJourUtilisation.toFixed(3)} kWh le jour d'utilisation × ${joursParSemaine}j/semaine)`
                  : `(Soit ${(puissanceWatts).toLocaleString()} Watts × ${dureeQuotidienneHeures}h)`
                }
              </p>
            </div>

            {/* Coût journalier estimé */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-slate-300">Coût estimé par jour :</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                {coutParJour < 0.01 ? '< 0,01 €' : `${coutParJour.toFixed(3)} € / jour`}
              </span>
            </div>
          </div>

          {/* Table d'extrapolation temporelle (Mois & Année) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Extrapolation sur le Mois et l'Année
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Carte Mois */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Par Mois actif (~30j)
                </span>
                <div className="text-xl font-black font-mono text-slate-900">
                  {kwhParMois.toFixed(1)} <span className="text-xs font-normal text-slate-500">kWh</span>
                </div>
                <div className="text-xs font-bold text-blue-700 font-mono mt-1">
                  {coutParMois.toFixed(2)} € / mois
                </div>
              </div>

              {/* Carte Année */}
              <div className="bg-blue-50/60 rounded-xl p-3.5 border border-blue-100">
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block mb-1">
                  Par An ({nbMoisActifs} mois)
                </span>
                <div className="text-xl font-black font-mono text-blue-950">
                  {Math.round(kwhParAn).toLocaleString('fr-FR')} <span className="text-xs font-normal text-blue-700">kWh</span>
                </div>
                <div className="text-xs font-bold text-blue-800 font-mono mt-1">
                  {coutParAn.toFixed(2)} € / an
                </div>
              </div>
            </div>

            {/* Note sur les mois d'utilisation */}
            {nbMoisActifs < 12 && (
              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200/80 text-[11px] text-amber-800 font-medium flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  L'estimation annuelle prend en compte vos <strong>{nbMoisActifs} mois d'utilisation</strong> sélectionnés.
                </span>
              </div>
            )}

            {/* Note pédagogique sur le calcul */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-800">Formule de calcul :</strong>
                <p className="font-mono text-[10px] text-slate-700 mt-0.5">
                  Consommation (kWh/jour) = (Puissance en W × Heures/jour) ÷ 1 000
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Catalogue de Presets Rapides */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Sélection rapide d'appareils courants
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Cliquez sur un équipement pour charger directement sa puissance, sa durée d'utilisation et sa saisonnalité.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {APPAREILS_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className="flex flex-col items-start p-3 bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-200 rounded-xl transition-all cursor-pointer text-left group"
            >
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1 bg-white px-1.5 py-0.5 rounded border border-slate-200/60">
                {preset.categorie}
              </span>
              <span className="text-xs font-bold text-slate-800 group-hover:text-blue-900 line-clamp-2 min-h-[32px]">
                {preset.nom}
              </span>
              <div className="mt-2 flex items-center justify-between w-full text-[10px] text-slate-500 font-mono">
                <span>{preset.puissanceWatts} W</span>
                <span>
                  {preset.moisActifs && preset.moisActifs.length < 12 
                    ? `${preset.moisActifs.length} mois` 
                    : `${preset.heuresParJour} h/j`}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Section : Liste des appareils enregistrés dans la maison */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Ma liste d'appareils de la maison
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Cumulez vos équipements pour évaluer la part de chaque appareil dans votre facture annuelle.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-xs font-mono">
            <div>
              <span className="text-slate-500">Total kWh/jour : </span>
              <span className="font-bold text-slate-900">{totalListKwhJour.toFixed(2)} kWh</span>
            </div>
            <div className="h-4 w-px bg-slate-300" />
            <div>
              <span className="text-slate-500">Coût total/an : </span>
              <span className="font-bold text-blue-700">{totalListCoutAn.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        {mesAppareils.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            Aucun appareil enregistré dans votre liste. Utilisez le bouton "Ajouter cet appareil à ma liste" ci-dessus.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-mono uppercase text-[10px] border-b border-slate-200">
                  <th className="py-3 px-3">Nom de l'appareil</th>
                  <th className="py-3 px-3 text-right">Puissance</th>
                  <th className="py-3 px-3 text-right">Utilisation</th>
                  <th className="py-3 px-3 text-center">Mois d'activité</th>
                  <th className="py-3 px-3 text-right">Consommation / jour</th>
                  <th className="py-3 px-3 text-right">Consommation / an</th>
                  <th className="py-3 px-3 text-right">Coût estimé / an</th>
                  <th className="py-3 px-3 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {mesAppareils.map((item) => {
                  const kwhJourLisse = ((item.puissanceWatts * item.heuresParJour) / 1000) * (item.joursParSemaine / 7);
                  const moisCount = item.moisActifs && item.moisActifs.length > 0 ? item.moisActifs.length : 12;
                  const kwhAn = kwhJourLisse * (moisCount / 12) * 365;
                  const coutAn = kwhAn * getPrixMoyenKwhTTC(item.pourcentageHP);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {item.nom}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {item.puissanceWatts >= 1000 
                          ? `${(item.puissanceWatts / 1000).toFixed(2)} kW` 
                          : `${item.puissanceWatts} W`}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {item.heuresParJour}h/j ({item.joursParSemaine}j/7)
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          moisCount === 12 
                            ? 'bg-slate-100 text-slate-700' 
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {moisCount === 12 ? '12 mois / 12' : `${moisCount} mois / 12`}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {kwhJourLisse.toFixed(3)} kWh
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-800">
                        {Math.round(kwhAn).toLocaleString('fr-FR')} kWh
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-700">
                        {coutAn.toFixed(2)} €
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleSupprimerAppareil(item.id)}
                          className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Supprimer l'appareil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
