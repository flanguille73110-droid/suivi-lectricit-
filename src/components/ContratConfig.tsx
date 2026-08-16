/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Settings, Info, DollarSign, Award, Percent, Plus, Trash2, Calendar, ArrowLeftRight, SlidersHorizontal } from 'lucide-react';
import { TarifConfig, TarifType, TurpePeriode } from '../types';

interface DecimalInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (val: number) => void;
}

function DecimalInput({ value, onChange, className, ...props }: DecimalInputProps) {
  const [inputValue, setInputValue] = useState<string>(() => {
    return value.toString().replace('.', ',');
  });

  const [isFocused, setIsFocused] = useState(false);

  React.useEffect(() => {
    if (!isFocused) {
      setInputValue(value.toString().replace('.', ','));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawStr = e.target.value;
    let cleanedStr = rawStr.replace(/[^0-9,.]/g, '');
    cleanedStr = cleanedStr.replace(/\./g, ',');
    
    const commaIndex = cleanedStr.indexOf(',');
    if (commaIndex !== -1) {
      cleanedStr = cleanedStr.substring(0, commaIndex + 1) + cleanedStr.substring(commaIndex + 1).replace(/,/g, '');
    }

    setInputValue(cleanedStr);

    const normalizedValue = cleanedStr.replace(',', '.');
    if (normalizedValue === '' || normalizedValue.endsWith('.')) {
      return;
    }

    const parsed = parseFloat(normalizedValue);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const normalizedValue = inputValue.replace(',', '.');
    const parsed = parseFloat(normalizedValue);
    if (isNaN(parsed)) {
      setInputValue(value.toString().replace('.', ','));
    } else {
      setInputValue(parsed.toString().replace('.', ','));
      onChange(parsed);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={inputValue}
      onChange={handleChange}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      className={className}
      {...props}
    />
  );
}

interface ContratConfigProps {
  config: TarifConfig;
  onChangeConfig: (newConfig: TarifConfig) => void;
}

export default function ContratConfig({ config, onChangeConfig }: ContratConfigProps) {
  const [modeAbonnement, setModeAbonnement] = useState<'mensuel' | 'annuel'>('annuel');
  const [modeTarifEnergie, setModeTarifEnergie] = useState<'HT' | 'TTC'>('HT');

  // Convertisseur c€/KWh <-> Application de la TVA <-> €/KWh pour remplissage rapide
  const [convCentimes, setConvCentimes] = useState<string>('');
  const [convTvaRate, setConvTvaRate] = useState<string>(() =>
    (config.taxes?.tvaNormale !== undefined ? config.taxes.tvaNormale : 20).toString().replace('.', ',')
  );
  const [convTvaReduiteRate, setConvTvaReduiteRate] = useState<string>(() =>
    (config.taxes?.tvaReduite !== undefined ? config.taxes.tvaReduite : 5.5).toString().replace('.', ',')
  );
  const [convEuros, setConvEuros] = useState<string>('');

  React.useEffect(() => {
    if (config.taxes?.tvaNormale !== undefined) {
      const formatted = config.taxes.tvaNormale.toString().replace('.', ',');
      const currentNorm = convTvaRate.replace(',', '.');
      if (parseFloat(currentNorm) !== config.taxes.tvaNormale && !(currentNorm === '' && config.taxes.tvaNormale === 0)) {
        setConvTvaRate(formatted);
      }
    }
  }, [config.taxes?.tvaNormale]);

  React.useEffect(() => {
    if (config.taxes?.tvaReduite !== undefined) {
      const formatted = config.taxes.tvaReduite.toString().replace('.', ',');
      const currentNorm = convTvaReduiteRate.replace(',', '.');
      if (parseFloat(currentNorm) !== config.taxes.tvaReduite && !(currentNorm === '' && config.taxes.tvaReduite === 0)) {
        setConvTvaReduiteRate(formatted);
      }
    }
  }, [config.taxes?.tvaReduite]);

  const handleCentimesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawStr = e.target.value;
    let cleaned = rawStr.replace(/[^0-9,.]/g, '').replace(/\./g, ',');
    const commaIndex = cleaned.indexOf(',');
    if (commaIndex !== -1) {
      cleaned = cleaned.substring(0, commaIndex + 1) + cleaned.substring(commaIndex + 1).replace(/,/g, '');
    }
    setConvCentimes(cleaned);

    const norm = cleaned.replace(',', '.');
    const tvaNorm = convTvaRate.replace(',', '.');
    const tvaVal = isNaN(Number(tvaNorm)) || tvaNorm === '' ? (config.taxes?.tvaNormale ?? 20) : parseFloat(tvaNorm);

    if (norm === '' || isNaN(Number(norm))) {
      setConvEuros('');
    } else {
      const valCentimes = parseFloat(norm);
      const valEurosHT = valCentimes / 100;
      const valEurosTTC = valEurosHT * (1 + tvaVal / 100);
      const formatted = (Math.round(valEurosTTC * 1000000) / 1000000).toString().replace('.', ',');
      setConvEuros(formatted);
    }
  };

  const handleTvaRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawStr = e.target.value;
    let cleaned = rawStr.replace(/[^0-9,.]/g, '').replace(/\./g, ',');
    const commaIndex = cleaned.indexOf(',');
    if (commaIndex !== -1) {
      cleaned = cleaned.substring(0, commaIndex + 1) + cleaned.substring(commaIndex + 1).replace(/,/g, '');
    }
    setConvTvaRate(cleaned);

    const normCentimes = convCentimes.replace(',', '.');
    const tvaNorm = cleaned.replace(',', '.');
    const tvaVal = isNaN(Number(tvaNorm)) || tvaNorm === '' ? 0 : parseFloat(tvaNorm);

    if (normCentimes !== '' && !isNaN(Number(normCentimes))) {
      const valCentimes = parseFloat(normCentimes);
      const valEurosHT = valCentimes / 100;
      const valEurosTTC = valEurosHT * (1 + tvaVal / 100);
      const formatted = (Math.round(valEurosTTC * 1000000) / 1000000).toString().replace('.', ',');
      setConvEuros(formatted);
    }

    // Mise à jour de la TVA globale dans la configuration pour impacter toute l'application
    onChangeConfig({
      ...config,
      taxes: {
        ...config.taxes,
        tvaNormale: tvaVal,
      },
    });
  };

  const handleTvaReduiteRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawStr = e.target.value;
    let cleaned = rawStr.replace(/[^0-9,.]/g, '').replace(/\./g, ',');
    const commaIndex = cleaned.indexOf(',');
    if (commaIndex !== -1) {
      cleaned = cleaned.substring(0, commaIndex + 1) + cleaned.substring(commaIndex + 1).replace(/,/g, '');
    }
    setConvTvaReduiteRate(cleaned);

    const tvaNorm = cleaned.replace(',', '.');
    const tvaVal = isNaN(Number(tvaNorm)) || tvaNorm === '' ? 0 : parseFloat(tvaNorm);

    // Mise à jour de la TVA réduite dans la configuration pour le calcul de l'abonnement et de la CTA
    onChangeConfig({
      ...config,
      taxes: {
        ...config.taxes,
        tvaReduite: tvaVal,
      },
    });
  };

  const handleEurosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawStr = e.target.value;
    let cleaned = rawStr.replace(/[^0-9,.]/g, '').replace(/\./g, ',');
    const commaIndex = cleaned.indexOf(',');
    if (commaIndex !== -1) {
      cleaned = cleaned.substring(0, commaIndex + 1) + cleaned.substring(commaIndex + 1).replace(/,/g, '');
    }
    setConvEuros(cleaned);

    const normEurosTTC = cleaned.replace(',', '.');
    const tvaNorm = convTvaRate.replace(',', '.');
    const tvaVal = isNaN(Number(tvaNorm)) || tvaNorm === '' ? (config.taxes?.tvaNormale ?? 20) : parseFloat(tvaNorm);

    if (normEurosTTC === '' || isNaN(Number(normEurosTTC))) {
      setConvCentimes('');
    } else {
      const valEurosTTC = parseFloat(normEurosTTC);
      const valEurosHT = tvaVal === -100 ? 0 : valEurosTTC / (1 + tvaVal / 100);
      const valCentimes = valEurosHT * 100;
      const formatted = (Math.round(valCentimes * 10000) / 10000).toString().replace('.', ',');
      setConvCentimes(formatted);
    }
  };
  const handleAddPeriode = () => {
    const formatDateToFR = (dateStr?: string) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    };

    let novelNom = 'Nouvelle période';
    if (config.debut && config.fin) {
      novelNom = `Du ${formatDateToFR(config.debut)} au ${formatDateToFR(config.fin)}`;
    } else if (config.debut) {
      novelNom = `Du ${formatDateToFR(config.debut)}`;
    }

    const novelPeriode = {
      id: `p_${Date.now()}`,
      nom: novelNom,
      debut: config.debut || '2024-01-01',
      fin: config.fin || '',
      prixKwhBase: config.prixKwhBase,
      prixKwhHP: config.prixKwhHP,
      prixKwhHC: config.prixKwhHC,
      abonnementMensuel: config.abonnementMensuel,
      cta: config.taxes.cta,
      cspe: config.taxes.cspe,
      tvaReduite: config.taxes.tvaReduite,
      tvaNormale: config.taxes.tvaNormale,
      ctaType: config.taxes.ctaType || 'pourcentage',
      cspeType: config.taxes.cspeType || 'par_kwh',
    };

    let nextDebutDate = config.debut || '';
    if (config.fin) {
      const parts = config.fin.split('-');
      if (parts.length === 3) {
        const yyyy = parseInt(parts[0], 10);
        const mm = parseInt(parts[1], 10) - 1;
        const dd = parseInt(parts[2], 10);
        if (!isNaN(yyyy) && !isNaN(mm) && !isNaN(dd)) {
          const dateObj = new Date(yyyy, mm, dd);
          dateObj.setDate(dateObj.getDate() + 1);
          const newY = dateObj.getFullYear();
          const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
          const newD = String(dateObj.getDate()).padStart(2, '0');
          nextDebutDate = `${newY}-${newM}-${newD}`;
        }
      }
    }
    
    onChangeConfig({
      ...config,
      debut: nextDebutDate,
      fin: '',
      periodes: [...(config.periodes || []), novelPeriode],
    });
  };

  const handleUpdatePeriode = (id: string, field: string, value: any) => {
    if (!config.periodes) return;
    const updated = config.periodes.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    });
    onChangeConfig({
      ...config,
      periodes: updated,
    });
  };

  const handleDeletePeriode = (id: string) => {
    if (!config.periodes) return;
    onChangeConfig({
      ...config,
      periodes: config.periodes.filter(p => p.id !== id),
    });
  };

  const handleAddTurpePeriode = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newTurpe: TurpePeriode = {
      id: `turpe_${Date.now()}`,
      debut: todayStr,
      fin: '',
      puissance: config.puissance ?? 15,
      turpeCG: 25.68,
      turpeCC: 23.28,
      turpeCSF: 10.80,
    };
    onChangeConfig({
      ...config,
      periodesTurpe: [...(config.periodesTurpe || []), newTurpe],
    });
  };

  const handleUpdateTurpePeriode = (id: string, field: string, value: any) => {
    if (!config.periodesTurpe) return;
    const updated = config.periodesTurpe.map(tp => {
      if (tp.id === id) {
        return { ...tp, [field]: value };
      }
      return tp;
    });
    onChangeConfig({
      ...config,
      periodesTurpe: updated,
    });
  };

  const handleDeleteTurpePeriode = (id: string) => {
    if (!config.periodesTurpe) return;
    onChangeConfig({
      ...config,
      periodesTurpe: config.periodesTurpe.filter(tp => tp.id !== id),
    });
  };
  // Préréglages EDF approximatifs réglementés (2025/2026) pour simplifier la vie de l'utilisateur
  const appliquerPresetEDFBase = () => {
    onChangeConfig({
      ...config,
      type: 'BASE',
      prixKwhBase: 0.2516,
      prixKwhHP: 0.2700,
      prixKwhHC: 0.2068,
      abonnementMensuel: 14.20, // Abo un peu plus faible en Base généralement
      taxes: {
        ...config.taxes,
        cta: 3.10,
        cspe: 0.0225,
        tvaReduite: 5.5,
        tvaNormale: 20.0,
      },
      haussePrevue: config.haussePrevue,
    });
  };

  const appliquerPresetEDFHPHC = () => {
    onChangeConfig({
      ...config,
      type: 'HP_HC',
      prixKwhBase: 0.2516,
      prixKwhHP: 0.2700,
      prixKwhHC: 0.2068,
      abonnementMensuel: 15.20,
      taxes: {
        ...config.taxes,
        cta: 3.20,
        cspe: 0.0225,
        tvaReduite: 5.5,
        tvaNormale: 20.0,
      },
      haussePrevue: config.haussePrevue,
    });
  };

  const handleChangeOption = (type: TarifType) => {
    onChangeConfig({
      ...config,
      type,
    });
  };

  const handleNumericChange = (field: keyof Omit<TarifConfig, 'type' | 'taxes'>, value: string) => {
    const numValue = parseFloat(value);
    onChangeConfig({
      ...config,
      [field]: isNaN(numValue) ? 0 : numValue,
    });
  };

  const handleTaxChange = (field: keyof typeof config.taxes, value: string) => {
    const numValue = parseFloat(value);
    onChangeConfig({
      ...config,
      taxes: {
        ...config.taxes,
        [field]: isNaN(numValue) ? 0 : numValue,
      },
    });
  };

  const handleCtaTypeChange = (newType: 'mensuel' | 'annuel' | 'pourcentage') => {
    const currentCta = config.taxes.cta;
    const currentType = config.taxes.ctaType || 'pourcentage';
    let newCtaValue = currentCta;

    if (currentType === 'mensuel' && newType === 'annuel') {
      newCtaValue = currentCta * 12;
    } else if (currentType === 'annuel' && newType === 'mensuel') {
      newCtaValue = currentCta / 12;
    } else if (currentType === 'mensuel' && newType === 'pourcentage') {
      newCtaValue = config.abonnementMensuel > 0 ? (currentCta / config.abonnementMensuel) * 100 : 27.04;
    } else if (currentType === 'pourcentage' && newType === 'mensuel') {
      newCtaValue = (currentCta / 100) * config.abonnementMensuel;
    } else if (currentType === 'annuel' && newType === 'pourcentage') {
      const mensuelCta = currentCta / 12;
      newCtaValue = config.abonnementMensuel > 0 ? (mensuelCta / config.abonnementMensuel) * 100 : 27.04;
    } else if (currentType === 'pourcentage' && newType === 'annuel') {
      const mensuelCta = (currentCta / 100) * config.abonnementMensuel;
      newCtaValue = mensuelCta * 12;
    }

    onChangeConfig({
      ...config,
      taxes: {
        ...config.taxes,
        ctaType: newType,
        cta: Math.round(newCtaValue * 10000) / 10000,
      }
    });
  };

  const handleCspeTypeChange = (newType: 'par_kwh' | 'annuel' | 'pourcentage') => {
    const currentCspe = config.taxes.cspe;
    const currentType = config.taxes.cspeType || 'par_kwh';
    let newCspeValue = currentCspe;

    if (currentType === 'par_kwh' && newType === 'pourcentage') {
      newCspeValue = 10; // Ex: 10%
    } else if (currentType === 'par_kwh' && newType === 'annuel') {
      newCspeValue = 150; // Ex: 150 €/an
    } else if (currentType === 'pourcentage' && newType === 'par_kwh') {
      newCspeValue = 0.0225;
    } else if (currentType === 'annuel' && newType === 'par_kwh') {
      newCspeValue = 0.0225;
    }

    onChangeConfig({
      ...config,
      taxes: {
        ...config.taxes,
        cspeType: newType,
        cspe: Math.round(newCspeValue * 10000) / 10000,
      }
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-md font-bold text-slate-900 uppercase tracking-wider">Configuration du contrat & tarifs</h2>
          <p className="text-slate-500 text-xs mt-1">Ajustez les prix pour correspondre précisément à votre facture d'électricité.</p>
        </div>
      </div>

      {/* Raccourcis de préréglages */}
      <div className="mb-6 p-4 bg-slate-50/50 rounded-xl border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono mb-2.5 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-blue-600" />
              Remplissage rapide : Préréglages Tarifs Réglementés (SICAÉ Somme)
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                id="btn-preset-base"
                type="button"
                onClick={appliquerPresetEDFBase}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                Option de Base (SICAÉ Somme)
              </button>
              <button
                id="btn-preset-hphc"
                type="button"
                onClick={appliquerPresetEDFHPHC}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                Option HP/HC (SICAÉ Somme)
              </button>
            </div>
          </div>

          {/* Champs TVA : 'TVA (Abo + CTA)' à gauche de 'TVA Energie' */}
          <div className="flex items-center gap-3">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-center">
              <label htmlFor="input-conv-tva-reduite" className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                TVA (Abo + CTA)
              </label>
              <div className="relative">
                <input
                  id="input-conv-tva-reduite"
                  type="text"
                  inputMode="decimal"
                  placeholder="5,5"
                  value={convTvaReduiteRate}
                  onChange={handleTvaReduiteRateChange}
                  className="w-28 rounded-lg border border-slate-200 bg-slate-50/50 pl-2.5 pr-6 py-1.5 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  %
                </span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-center">
              <label htmlFor="input-conv-tva" className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                TVA Energie
              </label>
              <div className="relative">
                <input
                  id="input-conv-tva"
                  type="text"
                  inputMode="decimal"
                  placeholder="20"
                  value={convTvaRate}
                  onChange={handleTvaRateChange}
                  className="w-28 rounded-lg border border-slate-200 bg-slate-50/50 pl-2.5 pr-6 py-1.5 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Convertisseur c€/KWh <-> €/KWh */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-3">
            <div>
              <label htmlFor="input-conv-centimes" className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                c€/KWh
              </label>
              <input
                id="input-conv-centimes"
                type="text"
                inputMode="decimal"
                placeholder="ex: 25,16"
                value={convCentimes}
                onChange={handleCentimesChange}
                className="w-24 rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
              />
            </div>

            <div className="text-slate-400 mt-4 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>

            <div>
              <label htmlFor="input-conv-euros" className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                €/KWh
              </label>
              <input
                id="input-conv-euros"
                type="text"
                inputMode="decimal"
                placeholder="ex: 0,2516"
                value={convEuros}
                onChange={handleEurosChange}
                className="w-24 rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne 1: Option Tarifaire & Abonnement */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono border-b border-slate-100 pb-2">
            Option & Abonnement
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type d'Option Tarifaire</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                id="btn-option-base"
                type="button"
                onClick={() => handleChangeOption('BASE')}
                className={`py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  config.type === 'BASE'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Base
              </button>
              <button
                id="btn-option-hphc"
                type="button"
                onClick={() => handleChangeOption('HP_HC')}
                className={`py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  config.type === 'HP_HC'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Heures Pleines / Creuses
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="select-puissance-kva" className="block text-xs font-semibold text-slate-600 mb-1.5">
              Puissance (en KVA)
            </label>
            <select
              id="select-puissance-kva"
              value={config.puissance ?? 15}
              onChange={(e) => onChangeConfig({ ...config, puissance: parseInt(e.target.value, 10) })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 cursor-pointer"
            >
              {[3, 6, 9, 12, 15, 18, 24, 30, 36].map((kva) => (
                <option key={kva} value={kva}>
                  {kva} kVA
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-600">Abonnement (HT)</label>
              <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setModeAbonnement('mensuel')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                    modeAbonnement === 'mensuel'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Mensuel
                </button>
                <button
                  type="button"
                  onClick={() => setModeAbonnement('annuel')}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                    modeAbonnement === 'annuel'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Annuel
                </button>
              </div>
            </div>

            {modeAbonnement === 'mensuel' ? (
              <div>
                <div className="relative">
                  <DecimalInput
                    id="input-config-abo"
                    value={config.abonnementMensuel}
                    onChange={(val) => handleNumericChange('abonnementMensuel', val.toString())}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-3 pr-12 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-mono"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 text-[10px] font-mono">€ / mois</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-medium">
                  Soit environ <span className="font-mono text-slate-600">{(config.abonnementMensuel * 12).toFixed(2)} € / an</span>
                </div>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <DecimalInput
                    id="input-config-abo-annuel"
                    value={Math.round(config.abonnementMensuel * 12 * 100) / 100}
                    onChange={(val) => {
                      onChangeConfig({
                        ...config,
                        abonnementMensuel: val / 12
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-3 pr-10 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-mono"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 text-[10px] font-mono font-bold">€ / an</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1 font-medium">
                  Soit environ <span className="font-mono text-slate-600">{config.abonnementMensuel.toFixed(2)} € / mois</span>
                </div>
              </div>
            )}
          </div>

          {/* Encadré Période */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <h4 className="text-xs font-bold text-slate-600 font-mono uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Période du tarif actuel
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="input-config-debut" className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Date de début</label>
                <input
                  id="input-config-debut"
                  type="date"
                  value={config.debut || ''}
                  onChange={(e) => onChangeConfig({ ...config, debut: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label htmlFor="input-config-fin" className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Date de fin</label>
                <input
                  id="input-config-fin"
                  type="date"
                  value={config.fin || ''}
                  onChange={(e) => onChangeConfig({ ...config, fin: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Colonne 2: Tarifs de l'Énergie */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
              Tarifs de l'Énergie ({modeTarifEnergie})
            </h3>
            <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setModeTarifEnergie('HT')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                  modeTarifEnergie === 'HT'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                HT
              </button>
              <button
                type="button"
                onClick={() => setModeTarifEnergie('TTC')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all cursor-pointer ${
                  modeTarifEnergie === 'TTC'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                TTC
              </button>
            </div>
          </div>

           {config.type === 'BASE' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex justify-between">
                  <span>Prix du kWh unique (Base) - {modeTarifEnergie}</span>
                  <span className="text-slate-400 font-mono">€ / kWh</span>
                </label>
                <div className="relative">
                  <DecimalInput
                    id="input-config-tarif-base"
                    value={
                      modeTarifEnergie === 'TTC'
                        ? config.prixKwhBase * (1 + config.taxes.tvaNormale / 100)
                        : config.prixKwhBase
                    }
                    onChange={(val) => {
                      const htVal = modeTarifEnergie === 'TTC'
                        ? val / (1 + config.taxes.tvaNormale / 100)
                        : val;
                      handleNumericChange('prixKwhBase', htVal.toString());
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-3 pr-12 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-mono">€/kWh</span>
                </div>
              </div>

              {/* Encadré Prélèvement en */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <h4 className="text-xs font-bold text-slate-600 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Prélèvement en
                </h4>
                <div>
                  <label htmlFor="input-config-prelevements-base" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 font-mono">Nombre de mensualités par an</label>
                  <select
                    id="input-config-prelevements-base"
                    value={config.nombrePrelevements || 10}
                    onChange={(e) => onChangeConfig({ ...config, nombrePrelevements: parseInt(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-mono cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m} {m === 1 ? 'mois' : 'mois'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex justify-between">
                  <span>Prix du kWh Heures Pleines (HP) - {modeTarifEnergie}</span>
                  <span className="text-slate-400 font-mono">€ / kWh</span>
                </label>
                <div className="relative">
                  <DecimalInput
                    id="input-config-tarif-hp"
                    value={
                      modeTarifEnergie === 'TTC'
                        ? config.prixKwhHP * (1 + config.taxes.tvaNormale / 100)
                        : config.prixKwhHP
                    }
                    onChange={(val) => {
                      const htVal = modeTarifEnergie === 'TTC'
                        ? val / (1 + config.taxes.tvaNormale / 100)
                        : val;
                      handleNumericChange('prixKwhHP', htVal.toString());
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-3 pr-12 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-mono">€/kWh</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex justify-between">
                  <span>Prix du kWh Heures Creuses (HC) - {modeTarifEnergie}</span>
                  <span className="text-slate-400 font-mono">€ / kWh</span>
                </label>
                <div className="relative">
                  <DecimalInput
                    id="input-config-tarif-hc"
                    value={
                      modeTarifEnergie === 'TTC'
                        ? config.prixKwhHC * (1 + config.taxes.tvaNormale / 100)
                        : config.prixKwhHC
                    }
                    onChange={(val) => {
                      const htVal = modeTarifEnergie === 'TTC'
                        ? val / (1 + config.taxes.tvaNormale / 100)
                        : val;
                      handleNumericChange('prixKwhHC', htVal.toString());
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-3 pr-12 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-mono">€/kWh</span>
                </div>
              </div>

              {/* Encadré Période Heures Creuses */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <h4 className="text-xs font-bold text-slate-600 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Période Heures Creuses
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="input-config-hc-debut" className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Heure de début</label>
                    <input
                      id="input-config-hc-debut"
                      type="time"
                      value={config.heureDebutHC || ''}
                      onChange={(e) => onChangeConfig({ ...config, heureDebutHC: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-config-hc-fin" className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-mono">Heure de fin</label>
                    <input
                      id="input-config-hc-fin"
                      type="time"
                      value={config.heureFinHC || ''}
                      onChange={(e) => onChangeConfig({ ...config, heureFinHC: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Encadré Prélèvement en */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <h4 className="text-xs font-bold text-slate-600 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Prélèvement en
                </h4>
                <div>
                  <label htmlFor="input-config-prelevements-hphc" className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 font-mono">Nombre de mensualités par an</label>
                  <select
                    id="input-config-prelevements-hphc"
                    value={config.nombrePrelevements || 10}
                    onChange={(e) => onChangeConfig({ ...config, nombrePrelevements: parseInt(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-mono cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m} {m === 1 ? 'mois' : 'mois'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Colonne 3: Taxes & Hausse de Tarifs */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono border-b border-slate-100 pb-2">
            Taxes & Simulateur de Hausse
          </h3>

          <div className="space-y-3">
            {/* CTA Block */}
            <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700">CTA (HT)</label>
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleCtaTypeChange('mensuel')}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${
                      (config.taxes.ctaType || 'pourcentage') === 'mensuel'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Mensuel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCtaTypeChange('annuel')}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${
                      (config.taxes.ctaType || 'pourcentage') === 'annuel'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Annuel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCtaTypeChange('pourcentage')}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${
                      (config.taxes.ctaType || 'pourcentage') === 'pourcentage'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    %
                  </button>
                </div>
              </div>
              <div className="relative">
                <DecimalInput
                  id="input-config-tax-cta"
                  value={config.taxes.cta}
                  onChange={(val) => handleTaxChange('cta', val.toString())}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-3 pr-14 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                />
                <span className="absolute right-3 top-2.5 text-slate-400 text-[10px] font-mono font-bold">
                  {(config.taxes.ctaType || 'pourcentage') === 'mensuel' ? '€/mois' : (config.taxes.ctaType || 'pourcentage') === 'annuel' ? '€/an' : '%'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-medium">
                {(config.taxes.ctaType || 'pourcentage') === 'annuel' && (
                  <span>Soit environ <span className="font-mono text-slate-600">{(config.taxes.cta / 12).toFixed(2)} € / mois</span></span>
                )}
                {(config.taxes.ctaType || 'pourcentage') === 'pourcentage' && (
                  <span>Soit environ <span className="font-mono text-slate-600">{(config.taxes.cta / 100 * config.abonnementMensuel).toFixed(2)} € / mois</span></span>
                )}
                {(config.taxes.ctaType || 'pourcentage') === 'mensuel' && (
                  <span>Soit environ <span className="font-mono text-slate-600">{(config.taxes.cta * 12).toFixed(2)} € / an</span></span>
                )}
              </div>
            </div>

            {/* CSPE Block */}
            <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Accise (CSPE) HT</label>
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleCspeTypeChange('par_kwh')}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${
                      (config.taxes.cspeType || 'par_kwh') === 'par_kwh'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    kWh
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCspeTypeChange('annuel')}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${
                      (config.taxes.cspeType || 'par_kwh') === 'annuel'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Annuel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCspeTypeChange('pourcentage')}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${
                      (config.taxes.cspeType || 'par_kwh') === 'pourcentage'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    %
                  </button>
                </div>
              </div>
              <div className="relative">
                <DecimalInput
                  id="input-config-tax-cspe"
                  value={config.taxes.cspe}
                  onChange={(val) => handleTaxChange('cspe', val.toString())}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-3 pr-14 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                />
                <span className="absolute right-3 top-2.5 text-slate-400 text-[10px] font-mono font-bold">
                  {(config.taxes.cspeType || 'par_kwh') === 'par_kwh' ? '€/kWh' : (config.taxes.cspeType || 'par_kwh') === 'annuel' ? '€/an' : '%'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-medium">
                {(config.taxes.cspeType || 'par_kwh') === 'par_kwh' && (
                  <span>Taxe proportionnelle calculée par kWh consommé.</span>
                )}
                {(config.taxes.cspeType || 'par_kwh') === 'annuel' && (
                  <span>Soit environ <span className="font-mono text-slate-600">{(config.taxes.cspe / 12).toFixed(2)} € / mois</span></span>
                )}
                {(config.taxes.cspeType || 'par_kwh') === 'pourcentage' && (
                  <span>Taxe calculée en % du coût total de l'énergie.</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-purple-700 mb-1 flex justify-between items-center">
              <span className="flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-purple-600" />
                Hausse de Tarif Simulée
              </span>
              <span className="text-purple-600 font-bold font-mono">+{config.haussePrevue}%</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                id="slider-config-hausse"
                type="range"
                min="0"
                max="50"
                step="1"
                value={config.haussePrevue}
                onChange={(e) => handleNumericChange('haussePrevue', e.target.value)}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <span className="text-xs text-slate-500 w-10 text-right font-semibold font-mono">{config.haussePrevue}%</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 flex items-start gap-1">
              <Info className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
              <span>Simule une hausse réglementée ou inflationniste appliquée uniquement sur la part énergie (kWh) du contrat.</span>
            </p>
            <div className="mt-3">
              <button
                type="button"
                onClick={handleAddPeriode}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter à l'historique
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Gestion des périodes de tarifs */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Historique des périodes de tarifs & abonnements
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              Configurez des plages temporelles de tarifs pour que l'application calcule votre consommation historique exacte (par ex. hausses d'EDF en Février ou en Août).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-mono text-[11px] uppercase border-b border-slate-200">
                <th className="py-3 px-3 font-semibold w-1/4">Nom de la période</th>
                <th className="py-3 px-3 font-semibold">Date de début</th>
                <th className="py-3 px-3 font-semibold">Date de fin</th>
                <th className="py-3 px-3 font-semibold w-24 text-right">
                  {modeAbonnement === 'mensuel' ? 'Abo (€/mois)' : 'Abo (€/an)'}
                </th>
                <th className="py-3 px-3 font-semibold w-24 text-right">CTA (HT)</th>
                <th className="py-3 px-3 font-semibold w-24 text-right">Accise (HT)</th>
                <th className="py-3 px-3 font-semibold w-24 text-right">TVA Abo+CTA (%)</th>
                <th className="py-3 px-3 font-semibold w-24 text-right">TVA Énergie (%)</th>
                {config.type === 'BASE' ? (
                  <th className="py-3 px-3 font-semibold w-28 text-right">Prix Base ({modeTarifEnergie}) (€/kWh)</th>
                ) : (
                  <>
                    <th className="py-3 px-3 font-semibold w-28 text-right">Prix HP ({modeTarifEnergie}) (€/kWh)</th>
                    <th className="py-3 px-3 font-semibold w-28 text-right">Prix HC ({modeTarifEnergie}) (€/kWh)</th>
                  </>
                )}
                <th className="py-3 px-3 font-semibold text-right w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs">
              {(!config.periodes || config.periodes.length === 0) ? (
                <tr>
                  <td colSpan={config.type === 'BASE' ? 10 : 11} className="py-8 text-center text-slate-400">
                    Aucune période configurée. Les calculs historiques utiliseront les valeurs par défaut du contrat.
                  </td>
                </tr>
              ) : (
                config.periodes.map((p) => {
                  const pTvaNormale = p.tvaNormale !== undefined ? p.tvaNormale : 20.0;
                  const pTvaReduite = p.tvaReduite !== undefined ? p.tvaReduite : 5.5;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={p.nom}
                          onChange={(e) => handleUpdatePeriode(p.id, 'nom', e.target.value)}
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                          placeholder="Ex: Hiver 2023"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="date"
                          value={p.debut}
                          onChange={(e) => handleUpdatePeriode(p.id, 'debut', e.target.value)}
                          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono w-[115px]"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="date"
                            value={p.fin}
                            disabled={!p.fin}
                            onChange={(e) => handleUpdatePeriode(p.id, 'fin', e.target.value)}
                            className={`rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono w-[115px] ${!p.fin ? 'opacity-40 bg-slate-50' : ''}`}
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdatePeriode(p.id, 'fin', p.fin ? '' : new Date().toISOString().split('T')[0])}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[10px] text-slate-600 font-semibold cursor-pointer whitespace-nowrap"
                          >
                            {p.fin ? 'En cours' : 'Définir fin'}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {modeAbonnement === 'mensuel' ? (
                          <DecimalInput
                            value={p.abonnementMensuel}
                            onChange={(val) => handleUpdatePeriode(p.id, 'abonnementMensuel', val)}
                            className="w-full text-right rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                          />
                        ) : (
                          <DecimalInput
                            value={Math.round(p.abonnementMensuel * 12 * 100) / 100}
                            onChange={(val) => handleUpdatePeriode(p.id, 'abonnementMensuel', val / 12)}
                            className="w-full text-right rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                          />
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1 items-end min-w-[80px]">
                          <DecimalInput
                            value={p.cta !== undefined ? p.cta : config.taxes.cta}
                            onChange={(val) => handleUpdatePeriode(p.id, 'cta', val)}
                            className="w-full text-right rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                          />
                          <select
                            value={p.ctaType || config.taxes.ctaType || 'pourcentage'}
                            onChange={(e) => handleUpdatePeriode(p.id, 'ctaType', e.target.value)}
                            className="text-[9px] bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-slate-600 font-semibold font-mono outline-none cursor-pointer w-full"
                          >
                            <option value="mensuel">€/mois</option>
                            <option value="annuel">€/an</option>
                            <option value="pourcentage">%</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1 items-end min-w-[80px]">
                          <DecimalInput
                            value={p.cspe !== undefined ? p.cspe : config.taxes.cspe}
                            onChange={(val) => handleUpdatePeriode(p.id, 'cspe', val)}
                            className="w-full text-right rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                          />
                          <select
                            value={p.cspeType || config.taxes.cspeType || 'par_kwh'}
                            onChange={(e) => handleUpdatePeriode(p.id, 'cspeType', e.target.value)}
                            className="text-[9px] bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-slate-600 font-semibold font-mono outline-none cursor-pointer w-full"
                          >
                            <option value="par_kwh">€/kWh</option>
                            <option value="annuel">€/an</option>
                            <option value="pourcentage">%</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="relative min-w-[70px]">
                          <DecimalInput
                            value={pTvaReduite}
                            onChange={(val) => handleUpdatePeriode(p.id, 'tvaReduite', val)}
                            className="w-full text-right rounded border border-slate-200 bg-white pr-4 pl-1.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                          />
                          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="relative min-w-[70px]">
                          <DecimalInput
                            value={pTvaNormale}
                            onChange={(val) => handleUpdatePeriode(p.id, 'tvaNormale', val)}
                            className="w-full text-right rounded border border-slate-200 bg-white pr-4 pl-1.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                          />
                          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">%</span>
                        </div>
                      </td>
                      {config.type === 'BASE' ? (
                        <td className="py-3 px-3">
                          <DecimalInput
                            value={
                              modeTarifEnergie === 'TTC'
                                ? p.prixKwhBase * (1 + pTvaNormale / 100)
                                : p.prixKwhBase
                            }
                            onChange={(val) => {
                              const htVal = modeTarifEnergie === 'TTC'
                                ? val / (1 + pTvaNormale / 100)
                                : val;
                              handleUpdatePeriode(p.id, 'prixKwhBase', htVal);
                            }}
                            className="w-full text-right rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </td>
                      ) : (
                        <>
                          <td className="py-3 px-3">
                            <DecimalInput
                              value={
                                modeTarifEnergie === 'TTC'
                                  ? p.prixKwhHP * (1 + pTvaNormale / 100)
                                  : p.prixKwhHP
                              }
                              onChange={(val) => {
                                const htVal = modeTarifEnergie === 'TTC'
                                  ? val / (1 + pTvaNormale / 100)
                                  : val;
                                handleUpdatePeriode(p.id, 'prixKwhHP', htVal);
                              }}
                              className="w-full text-right rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <DecimalInput
                              value={
                                modeTarifEnergie === 'TTC'
                                  ? p.prixKwhHC * (1 + pTvaNormale / 100)
                                  : p.prixKwhHC
                              }
                              onChange={(val) => {
                                const htVal = modeTarifEnergie === 'TTC'
                                  ? val / (1 + pTvaNormale / 100)
                                  : val;
                                handleUpdatePeriode(p.id, 'prixKwhHC', htVal);
                              }}
                              className="w-full text-right rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                            />
                          </td>
                        </>
                      )}
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeletePeriode(p.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer"
                          title="Supprimer la période"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Encadré Historique TURPE */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              Historique TURPE
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              Historique des valeurs et composantes du tarif d'utilisation des réseaux publics d'électricité (TURPE).
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddTurpePeriode}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter à l'historique TURPE
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-mono text-[11px] uppercase border-b border-slate-200">
                <th className="py-3 px-3 font-semibold">Date de début</th>
                <th className="py-3 px-3 font-semibold">Date de fin</th>
                <th className="py-3 px-3 font-semibold text-right">Puissance souscrite (en kVA)</th>
                <th className="py-3 px-3 font-semibold text-right">Composante de gestion (CG)</th>
                <th className="py-3 px-3 font-semibold text-right">Composante de comptage (CC)</th>
                <th className="py-3 px-3 font-semibold text-right">Part fixe de la composante de soutirage (CSF)</th>
                <th className="py-3 px-3 font-semibold text-right">Calcul CSF (automatique)</th>
                <th className="py-3 px-3 font-semibold text-right w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs">
              {(!config.periodesTurpe || config.periodesTurpe.length === 0) ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Aucun historique TURPE enregistré. Utilisez le bouton ci-dessus ou le bouton "Enregistrer et envoyer a l'historique" dans le modal Valeurs TURPE de la page Estimation facture.
                  </td>
                </tr>
              ) : (
                config.periodesTurpe.map((p) => {
                  const puissanceVal = p.puissance !== undefined ? p.puissance : (config.puissance ?? 15);
                  const cgVal = p.turpeCG !== undefined ? p.turpeCG : 25.68;
                  const ccVal = p.turpeCC !== undefined ? p.turpeCC : 23.28;
                  const csfVal = p.turpeCSF !== undefined ? p.turpeCSF : 10.80;
                  const calculCsfAuto = puissanceVal * csfVal;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3">
                        <input
                          type="date"
                          value={p.debut}
                          onChange={(e) => handleUpdateTurpePeriode(p.id, 'debut', e.target.value)}
                          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono w-[115px]"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="date"
                            value={p.fin}
                            disabled={!p.fin}
                            onChange={(e) => handleUpdateTurpePeriode(p.id, 'fin', e.target.value)}
                            className={`rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono w-[115px] ${!p.fin ? 'opacity-40 bg-slate-50' : ''}`}
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateTurpePeriode(p.id, 'fin', p.fin ? '' : new Date().toISOString().split('T')[0])}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[10px] text-slate-600 font-semibold cursor-pointer whitespace-nowrap"
                          >
                            {p.fin ? 'En cours' : 'Définir fin'}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <DecimalInput
                          value={puissanceVal}
                          onChange={(val) => handleUpdateTurpePeriode(p.id, 'puissance', val)}
                          className="w-20 text-right rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                        />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DecimalInput
                            value={cgVal}
                            onChange={(val) => handleUpdateTurpePeriode(p.id, 'turpeCG', val)}
                            className="w-24 text-right rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                          />
                          <span className="text-[10px] text-slate-400 font-mono">€/an</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DecimalInput
                            value={ccVal}
                            onChange={(val) => handleUpdateTurpePeriode(p.id, 'turpeCC', val)}
                            className="w-24 text-right rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                          />
                          <span className="text-[10px] text-slate-400 font-mono">€/an</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DecimalInput
                            value={csfVal}
                            onChange={(val) => handleUpdateTurpePeriode(p.id, 'turpeCSF', val)}
                            className="w-24 text-right rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                          />
                          <span className="text-[10px] text-slate-400 font-mono">€/kVA/an</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-700 bg-blue-50/30">
                        {calculCsfAuto.toFixed(2).replace('.', ',')} €/an
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteTurpePeriode(p.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer"
                          title="Supprimer la période TURPE"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Petit récapitulatif fiscal explicatif */}
      <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
        <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-500 leading-relaxed">
          <strong className="text-slate-700">Méthode de calcul des taxes (Conforme facture de l'état français) :</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>La <span className="font-semibold text-slate-700">TVA (Abo + CTA) à {config.taxes.tvaReduite}%</span> s'applique sur l'abonnement et la Contribution d'Acheminement (CTA).</li>
            <li>La <span className="font-semibold text-slate-700">TVA Energie à {config.taxes.tvaNormale}%</span> s'applique sur l'énergie consommée et l'Accise sur l'électricité (CSPE).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
