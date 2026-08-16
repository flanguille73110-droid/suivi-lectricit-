import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, 
  Receipt, 
  Euro, 
  Clock, 
  Info, 
  Calculator, 
  Zap, 
  FileSpreadsheet, 
  Layers,
  ArrowRight,
  TrendingUp,
  Percent,
  ShieldCheck,
  SlidersHorizontal,
  Download,
  X
} from 'lucide-react';
import jsPDF from 'jspdf';
import { TarifConfig, Releve, AnalyseMois, TurpePeriode } from '../types';
import { getConfigPourDate, calculerStatsPourIntervalle } from '../utils/calc';

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

interface EstimationFactureProps {
  config: TarifConfig;
  releves?: Releve[];
  analyseMois?: AnalyseMois[];
  autoOpenTurpeModal?: boolean;
  onTurpeModalClosed?: () => void;
  onChangeConfig?: (newConfig: TarifConfig) => void;
}

export default function EstimationFacture({ 
  config, 
  releves = [], 
  analyseMois = [],
  autoOpenTurpeModal,
  onTurpeModalClosed,
  onChangeConfig
}: EstimationFactureProps) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
  const currentDay = String(today.getDate()).padStart(2, '0');
  const todayStr = `${currentYear}-${currentMonth}-${currentDay}`;

  // Par défaut : du 1er du mois précédent au dernier jour du mois en cours, ou 1 an
  const defaultStart = `${currentYear}-01-01`;
  const defaultEnd = `${currentYear}-${currentMonth}-${currentDay}`;

  const [dateDebut, setDateDebut] = useState<string>(defaultStart);
  const [dateFin, setDateFin] = useState<string>(defaultEnd);
  const [appliquerHausse, setAppliquerHausse] = useState<boolean>(true);

  const isDateFinFuture = Boolean(dateFin && dateFin > todayStr);

  // Modal Valeurs TURPE (persistant dans localStorage)
  const [isTurpeModalOpen, setIsTurpeModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (autoOpenTurpeModal) {
      setIsTurpeModalOpen(true);
      if (onTurpeModalClosed) {
        onTurpeModalClosed();
      }
    }
  }, [autoOpenTurpeModal, onTurpeModalClosed]);
  const [turpeCG, setTurpeCG] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('elec_budget_turpe_values');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.turpeCG === 'number') return parsed.turpeCG;
      }
    } catch (e) {
      console.error(e);
    }
    return 25.68;
  });
  const [turpeCC, setTurpeCC] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('elec_budget_turpe_values');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.turpeCC === 'number') return parsed.turpeCC;
      }
    } catch (e) {
      console.error(e);
    }
    return 23.28;
  });
  const [turpeCSF, setTurpeCSF] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('elec_budget_turpe_values');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.turpeCSF === 'number') return parsed.turpeCSF;
      }
    } catch (e) {
      console.error(e);
    }
    return 10.80;
  });

  const [turpeDebut, setTurpeDebut] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('elec_budget_turpe_values');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.turpeDebut === 'string') return parsed.turpeDebut;
      }
    } catch (e) {
      console.error(e);
    }
    return `${currentYear}-08-01`;
  });

  const [turpeFin, setTurpeFin] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('elec_budget_turpe_values');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.turpeFin === 'string') return parsed.turpeFin;
      }
    } catch (e) {
      console.error(e);
    }
    return '';
  });

  const [turpeSuccessMsg, setTurpeSuccessMsg] = useState<string>('');

  // Sauvegarde automatique des valeurs TURPE dans localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        'elec_budget_turpe_values',
        JSON.stringify({ turpeCG, turpeCC, turpeCSF, turpeDebut, turpeFin })
      );
    } catch (e) {
      console.error(e);
    }
  }, [turpeCG, turpeCC, turpeCSF, turpeDebut, turpeFin]);

  const handleSaveAndSendToTurpeHistory = () => {
    const newTurpe: TurpePeriode = {
      id: `turpe_${Date.now()}`,
      debut: turpeDebut || `${currentYear}-08-01`,
      fin: turpeFin || '',
      puissance: config.puissance ?? 15,
      turpeCG,
      turpeCC,
      turpeCSF,
    };

    const updatedTurpePeriodes = [...(config.periodesTurpe || []), newTurpe];
    const updatedConfig: TarifConfig = {
      ...config,
      periodesTurpe: updatedTurpePeriodes,
    };

    if (onChangeConfig) {
      onChangeConfig(updatedConfig);
    } else {
      localStorage.setItem('elec_budget_config', JSON.stringify(updatedConfig));
    }

    setTurpeSuccessMsg("Enregistré et envoyé à l'historique TURPE !");
    setTimeout(() => {
      setTurpeSuccessMsg('');
    }, 4000);
  };

  // Saisie manuelle de consommation optionnelle pour estimation complète
  const [consoEstimeeHP, setConsoEstimeeHP] = useState<string>('');
  const [consoEstimeeHC, setConsoEstimeeHC] = useState<string>('');
  const [consoEstimeeBase, setConsoEstimeeBase] = useState<string>('');

  // Conversion helper YYYY-MM-DD vers JJ/MM/AAAA
  const toFrenchDate = (isoStr: string) => {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  };

  // Calcul du nombre de jours et de mois entre dateDebut et dateFin
  const { nbJours, nbMois, isValidInterval } = useMemo(() => {
    if (!dateDebut || !dateFin) {
      return { nbJours: 0, nbMois: 0, isValidInterval: false };
    }
    const [y1, m1, d1] = dateDebut.split('-').map(Number);
    const [y2, m2, d2] = dateFin.split('-').map(Number);
    const date1 = new Date(y1, m1 - 1, d1, 12, 0, 0);
    const date2 = new Date(y2, m2 - 1, d2, 12, 0, 0);

    if (isNaN(date1.getTime()) || isNaN(date2.getTime()) || date1 > date2) {
      return { nbJours: 0, nbMois: 0, isValidInterval: false };
    }

    const diffTime = date2.getTime() - date1.getTime();
    const days = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusif
    const months = days / 30.4375; // moyenne exacte de jours par mois

    return {
      nbJours: days,
      nbMois: Math.round(months * 100) / 100,
      isValidInterval: true
    };
  }, [dateDebut, dateFin]);

  // Calcul de la décomposition de la Part Fixe par périodes tarifaires (avec découpage mois par mois et mention ESTIMATIF pour les périodes sans relevés)
  const { 
    periodesSlices, 
    totalPartFixeHT, 
    totalNbJours, 
    totalNbMois, 
    tarifAnnuelMoyen,
    dateDernierReleve,
    hasPeriodeEstimee 
  } = useMemo(() => {
    if (!isValidInterval || nbJours === 0) {
      return {
        periodesSlices: [],
        totalPartFixeHT: 0,
        totalNbJours: 0,
        totalNbMois: 0,
        tarifAnnuelMoyen: Math.round(config.abonnementMensuel * 12 * 100) / 100,
        dateDernierReleve: '',
        hasPeriodeEstimee: false
      };
    }

    // Date du dernier relevé de compteur
    let lastReleveDate = '';
    if (releves && releves.length > 0) {
      const sortedReleves = [...releves].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      lastReleveDate = sortedReleves[sortedReleves.length - 1].date;
    }

    interface DayInfo {
      dateStr: string;
      periodeId: string;
      nom: string;
      isHistorique: boolean;
      isEstime: boolean;
      monthKey: string;
      abonnementMensuel: number;
      aboAnnuel: number;
      dayAboHT: number;
    }

    const days: DayInfo[] = [];
    const [sY, sM, sD] = dateDebut.split('-').map(Number);
    const [eY, eM, eD] = dateFin.split('-').map(Number);
    const startDate = new Date(sY, sM - 1, sD, 12, 0, 0);
    const endDate = new Date(eY, eM - 1, eD, 12, 0, 0);
    const tempDate = new Date(startDate);

    let hasAnyEstime = false;

    while (tempDate <= endDate) {
      const year = tempDate.getFullYear();
      const monthStr = String(tempDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(tempDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      const monthKey = `${year}-${monthStr}`;

      // Un jour est considéré estimé s'il est strictement postérieur à la date du dernier relevé
      const isEstime = Boolean(lastReleveDate && dateStr > lastReleveDate);
      if (isEstime) hasAnyEstime = true;

      // Recherche dans l'historique des périodes
      const matchedPeriode = (config.periodes || []).find((p) => {
        const pDebut = p.debut;
        const pFin = p.fin && p.fin.trim() !== '' ? p.fin : '9999-12-31';
        return dateStr >= pDebut && dateStr <= pFin;
      });

      if (matchedPeriode) {
        const aboAnnuel = Math.round(matchedPeriode.abonnementMensuel * 12 * 100) / 100;
        const dayAboHT = (matchedPeriode.abonnementMensuel * 12) / 365.25;
        days.push({
          dateStr,
          periodeId: matchedPeriode.id,
          nom: matchedPeriode.nom || 'Période historique',
          isHistorique: true,
          isEstime,
          monthKey,
          abonnementMensuel: matchedPeriode.abonnementMensuel,
          aboAnnuel,
          dayAboHT
        });
      } else {
        // Configuration du contrat & tarifs actuelle
        const aboAnnuel = Math.round(config.abonnementMensuel * 12 * 100) / 100;
        const dayAboHT = (config.abonnementMensuel * 12) / 365.25;
        days.push({
          dateStr,
          periodeId: '__current_contract__',
          nom: 'Configuration du contrat & tarifs',
          isHistorique: false,
          isEstime,
          monthKey,
          abonnementMensuel: config.abonnementMensuel,
          aboAnnuel,
          dayAboHT
        });
      }

      tempDate.setDate(tempDate.getDate() + 1);
    }

    // Regroupement en tranches consécutives : pour les périodes estimées, on découpe mois par mois
    interface Slice {
      id: string;
      nom: string;
      isHistorique: boolean;
      isEstime: boolean;
      dateDebut: string;
      dateFin: string;
      aboAnnuel: number;
      abonnementMensuel: number;
      nbJours: number;
      nbMois: number;
      montantHT: number;
    }

    const slices: Slice[] = [];
    let currentSlice: {
      id: string;
      nom: string;
      isHistorique: boolean;
      isEstime: boolean;
      monthKey: string;
      dateDebut: string;
      dateFin: string;
      aboAnnuel: number;
      abonnementMensuel: number;
      nbJours: number;
      sumMontantHT: number;
    } | null = null;

    for (const d of days) {
      if (!currentSlice) {
        currentSlice = {
          id: d.periodeId,
          nom: d.nom,
          isHistorique: d.isHistorique,
          isEstime: d.isEstime,
          monthKey: d.monthKey,
          dateDebut: d.dateStr,
          dateFin: d.dateStr,
          aboAnnuel: d.aboAnnuel,
          abonnementMensuel: d.abonnementMensuel,
          nbJours: 1,
          sumMontantHT: d.dayAboHT
        };
      } else {
        // Condition de continuité :
        // Pour les jours réels : même période et même tarif
        // Pour les jours estimés : même période, même tarif, même statut estimé ET même mois calendaire (découpage mois par mois)
        const canGroup = currentSlice.id === d.periodeId &&
          Math.abs(currentSlice.aboAnnuel - d.aboAnnuel) < 0.001 &&
          currentSlice.isEstime === d.isEstime &&
          (!d.isEstime || currentSlice.monthKey === d.monthKey);

        if (canGroup) {
          currentSlice.dateFin = d.dateStr;
          currentSlice.nbJours += 1;
          currentSlice.sumMontantHT += d.dayAboHT;
        } else {
          // Nouvelle tranche
          slices.push({
            id: `${currentSlice.id}-${currentSlice.dateDebut}-${currentSlice.isEstime ? 'est' : 'reel'}`,
            nom: currentSlice.nom,
            isHistorique: currentSlice.isHistorique,
            isEstime: currentSlice.isEstime,
            dateDebut: currentSlice.dateDebut,
            dateFin: currentSlice.dateFin,
            aboAnnuel: currentSlice.aboAnnuel,
            abonnementMensuel: currentSlice.abonnementMensuel,
            nbJours: currentSlice.nbJours,
            nbMois: Math.round((currentSlice.nbJours / 30.4375) * 100) / 100,
            montantHT: Math.round(currentSlice.sumMontantHT * 100) / 100
          });

          currentSlice = {
            id: d.periodeId,
            nom: d.nom,
            isHistorique: d.isHistorique,
            isEstime: d.isEstime,
            monthKey: d.monthKey,
            dateDebut: d.dateStr,
            dateFin: d.dateStr,
            aboAnnuel: d.aboAnnuel,
            abonnementMensuel: d.abonnementMensuel,
            nbJours: 1,
            sumMontantHT: d.dayAboHT
          };
        }
      }
    }

    if (currentSlice) {
      slices.push({
        id: `${currentSlice.id}-${currentSlice.dateDebut}-${currentSlice.isEstime ? 'est' : 'reel'}`,
        nom: currentSlice.nom,
        isHistorique: currentSlice.isHistorique,
        isEstime: currentSlice.isEstime,
        dateDebut: currentSlice.dateDebut,
        dateFin: currentSlice.dateFin,
        aboAnnuel: currentSlice.aboAnnuel,
        abonnementMensuel: currentSlice.abonnementMensuel,
        nbJours: currentSlice.nbJours,
        nbMois: Math.round((currentSlice.nbJours / 30.4375) * 100) / 100,
        montantHT: Math.round(currentSlice.sumMontantHT * 100) / 100
      });
    }

    const sumHT = slices.reduce((acc, s) => acc + s.montantHT, 0);
    const sumJours = slices.reduce((acc, s) => acc + s.nbJours, 0);
    const sumMois = sumJours / 30.4375;
    const fractionAnnee = sumJours / 365.25;
    const moyenAnnuel = fractionAnnee > 0 ? sumHT / fractionAnnee : (config.abonnementMensuel * 12);

    return {
      periodesSlices: slices,
      totalPartFixeHT: Math.round(sumHT * 100) / 100,
      totalNbJours: sumJours,
      totalNbMois: Math.round(sumMois * 100) / 100,
      tarifAnnuelMoyen: Math.round(moyenAnnuel * 100) / 100,
      dateDernierReleve: lastReleveDate,
      hasPeriodeEstimee: hasAnyEstime
    };
  }, [dateDebut, dateFin, config, releves, isValidInterval, nbJours]);

  // Calcul de la décomposition de la Part Variable (Consommation) par tranches tarifaires
  // Avec estimation automatique mois par mois basée sur l'historique des années précédentes
  const { variableRows, totalConsoVariableHP, totalConsoVariableHC, totalConsoVariableTotale, totalPartVariableHT } = useMemo(() => {
    if (!isValidInterval || nbJours === 0) {
      return {
        variableRows: [],
        totalConsoVariableHP: 0,
        totalConsoVariableHC: 0,
        totalConsoVariableTotale: 0,
        totalPartVariableHT: 0
      };
    }

    // Date du dernier relevé
    let lastReleveDate = '';
    if (releves && releves.length > 0) {
      const sortedReleves = [...releves].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      lastReleveDate = sortedReleves[sortedReleves.length - 1].date;
    }

    // 1. Interpolation journalière des consommations réelles depuis les relevés de compteurs
    const dailyConsoMap = new Map<string, { hp: number; hc: number }>();
    if (releves && releves.length >= 2) {
      const sorted = [...releves].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      for (let i = 0; i < sorted.length - 1; i++) {
        const r1 = sorted[i];
        const r2 = sorted[i + 1];
        const [y1, m1, d1] = r1.date.split('-').map(Number);
        const [y2, m2, d2] = r2.date.split('-').map(Number);
        const date1 = new Date(y1, m1 - 1, d1, 12, 0, 0);
        const date2 = new Date(y2, m2 - 1, d2, 12, 0, 0);

        const diffDays = Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) continue;

        const deltaHP = r2.indexHP - r1.indexHP;
        const deltaHC = config.type === 'HP_HC' ? (r2.indexHC - r1.indexHC) : 0;
        const consoJournaliereHP = deltaHP / diffDays;
        const consoJournaliereHC = deltaHC / diffDays;

        const temp = new Date(date1);
        for (let d = 0; d < diffDays; d++) {
          temp.setDate(temp.getDate() + 1);
          const yr = temp.getFullYear();
          const mo = String(temp.getMonth() + 1).padStart(2, '0');
          const da = String(temp.getDate()).padStart(2, '0');
          const dateStr = `${yr}-${mo}-${da}`;
          dailyConsoMap.set(dateStr, { hp: consoJournaliereHP, hc: consoJournaliereHC });
        }
      }
    }

    // Calcul de la moyenne globale journalière en repli
    let sumCoveredHP = 0;
    let sumCoveredHC = 0;
    dailyConsoMap.forEach((v) => {
      sumCoveredHP += v.hp;
      sumCoveredHC += v.hc;
    });
    const avgDailyHP = dailyConsoMap.size > 0 ? sumCoveredHP / dailyConsoMap.size : 0;
    const avgDailyHC = dailyConsoMap.size > 0 ? sumCoveredHC / dailyConsoMap.size : 0;

    // Helper d'estimation journalière basée sur les années précédentes (MM-DD)
    const getEstimatedConsoForDate = (dateStr: string): { hp: number; hc: number } => {
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const mmdd = `${parts[1]}-${parts[2]}`;

      // Chercher dans l'ordre N-1, N-2, N-3...
      for (let offset = 1; offset <= 5; offset++) {
        const pastYear = year - offset;
        const pastDateStr = `${pastYear}-${mmdd}`;
        if (dailyConsoMap.has(pastDateStr)) {
          return dailyConsoMap.get(pastDateStr)!;
        }
      }

      // Si pas trouvé pour ce jour exact, chercher sur le même mois de l'année précédente
      const pastMonthValues: { hp: number; hc: number }[] = [];
      for (let offset = 1; offset <= 5; offset++) {
        const pastYear = year - offset;
        const prefix = `${pastYear}-${parts[1]}-`;
        dailyConsoMap.forEach((val, key) => {
          if (key.startsWith(prefix)) {
            pastMonthValues.push(val);
          }
        });
        if (pastMonthValues.length > 0) {
          const sHP = pastMonthValues.reduce((acc, v) => acc + v.hp, 0);
          const sHC = pastMonthValues.reduce((acc, v) => acc + v.hc, 0);
          return { hp: sHP / pastMonthValues.length, hc: sHC / pastMonthValues.length };
        }
      }

      // Repli ultime : moyenne globale journalière
      return { hp: avgDailyHP, hc: avgDailyHC };
    };

    // 2. Attribution jour par jour du tarif HP / HC ou Base et de la consommation
    interface DayVarInfo {
      dateStr: string;
      periodeId: string;
      nom: string;
      isHistorique: boolean;
      isEstime: boolean;
      monthKey: string;
      prixHP: number;
      prixHC: number;
      prixBase: number;
      consoHP: number;
      consoHC: number;
    }

    const daysVar: DayVarInfo[] = [];
    const [sY, sM, sD] = dateDebut.split('-').map(Number);
    const [eY, eM, eD] = dateFin.split('-').map(Number);
    const startDate = new Date(sY, sM - 1, sD, 12, 0, 0);
    const endDate = new Date(eY, eM - 1, eD, 12, 0, 0);
    const tempDate = new Date(startDate);

    while (tempDate <= endDate) {
      const year = tempDate.getFullYear();
      const monthStr = String(tempDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(tempDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      const monthKey = `${year}-${monthStr}`;

      const matchedPeriode = (config.periodes || []).find((p) => {
        const pDebut = p.debut;
        const pFin = p.fin && p.fin.trim() !== '' ? p.fin : '9999-12-31';
        return dateStr >= pDebut && dateStr <= pFin;
      });

      const isEstime = Boolean((lastReleveDate && dateStr > lastReleveDate) || dateStr > todayStr);

      const coeffHausse = (isDateFinFuture && appliquerHausse && isEstime)
        ? (1 + (config.haussePrevue || 0) / 100)
        : 1;

      const basePrixHP = matchedPeriode ? matchedPeriode.prixKwhHP : config.prixKwhHP;
      const basePrixHC = matchedPeriode ? matchedPeriode.prixKwhHC : config.prixKwhHC;
      const basePrixBase = matchedPeriode ? matchedPeriode.prixKwhBase : config.prixKwhBase;

      const prixHP = basePrixHP * coeffHausse;
      const prixHC = basePrixHC * coeffHausse;
      const prixBase = basePrixBase * coeffHausse;

      // Si le jour est couvert par un relevé réel, on utilise la conso du relevé
      // Sinon (si c'est un jour estimé), on estime à partir des années précédentes
      let dayConso = dailyConsoMap.get(dateStr);
      if (!dayConso || isEstime) {
        dayConso = isEstime ? getEstimatedConsoForDate(dateStr) : (dayConso || { hp: avgDailyHP, hc: avgDailyHC });
      }

      if (matchedPeriode) {
        daysVar.push({
          dateStr,
          periodeId: matchedPeriode.id,
          nom: matchedPeriode.nom || 'Période historique',
          isHistorique: true,
          isEstime,
          monthKey,
          prixHP,
          prixHC,
          prixBase,
          consoHP: dayConso.hp,
          consoHC: dayConso.hc
        });
      } else {
        daysVar.push({
          dateStr,
          periodeId: '__current_contract__',
          nom: 'Configuration du contrat & tarifs',
          isHistorique: false,
          isEstime,
          monthKey,
          prixHP,
          prixHC,
          prixBase,
          consoHP: dayConso.hp,
          consoHC: dayConso.hc
        });
      }

      tempDate.setDate(tempDate.getDate() + 1);
    }

    // 3. Regroupement par tranches temporelles de tarifs (avec découpage mois par mois si estimé)
    interface VarSlice {
      id: string;
      nom: string;
      isHistorique: boolean;
      isEstime: boolean;
      dateDebut: string;
      dateFin: string;
      prixHP: number;
      prixHC: number;
      prixBase: number;
      nbJours: number;
      sumConsoHP: number;
      sumConsoHC: number;
    }

    const slicesVar: VarSlice[] = [];
    let currentSliceVar: {
      id: string;
      nom: string;
      isHistorique: boolean;
      isEstime: boolean;
      monthKey: string;
      dateDebut: string;
      dateFin: string;
      prixHP: number;
      prixHC: number;
      prixBase: number;
      nbJours: number;
      sumConsoHP: number;
      sumConsoHC: number;
    } | null = null;

    for (const d of daysVar) {
      if (!currentSliceVar) {
        currentSliceVar = {
          id: d.periodeId,
          nom: d.nom,
          isHistorique: d.isHistorique,
          isEstime: d.isEstime,
          monthKey: d.monthKey,
          dateDebut: d.dateStr,
          dateFin: d.dateStr,
          prixHP: d.prixHP,
          prixHC: d.prixHC,
          prixBase: d.prixBase,
          nbJours: 1,
          sumConsoHP: d.consoHP,
          sumConsoHC: d.consoHC
        };
      } else {
        const canGroup = currentSliceVar.id === d.periodeId &&
          Math.abs(currentSliceVar.prixHP - d.prixHP) < 0.00001 &&
          Math.abs(currentSliceVar.prixHC - d.prixHC) < 0.00001 &&
          currentSliceVar.isEstime === d.isEstime &&
          (!d.isEstime || currentSliceVar.monthKey === d.monthKey);

        if (canGroup) {
          currentSliceVar.dateFin = d.dateStr;
          currentSliceVar.nbJours += 1;
          currentSliceVar.sumConsoHP += d.consoHP;
          currentSliceVar.sumConsoHC += d.consoHC;
        } else {
          slicesVar.push({
            id: `${currentSliceVar.id}-${currentSliceVar.dateDebut}-${currentSliceVar.isEstime ? 'est' : 'reel'}`,
            nom: currentSliceVar.nom,
            isHistorique: currentSliceVar.isHistorique,
            isEstime: currentSliceVar.isEstime,
            dateDebut: currentSliceVar.dateDebut,
            dateFin: currentSliceVar.dateFin,
            prixHP: currentSliceVar.prixHP,
            prixHC: currentSliceVar.prixHC,
            prixBase: currentSliceVar.prixBase,
            nbJours: currentSliceVar.nbJours,
            sumConsoHP: currentSliceVar.sumConsoHP,
            sumConsoHC: currentSliceVar.sumConsoHC
          });

          currentSliceVar = {
            id: d.periodeId,
            nom: d.nom,
            isHistorique: d.isHistorique,
            isEstime: d.isEstime,
            monthKey: d.monthKey,
            dateDebut: d.dateStr,
            dateFin: d.dateStr,
            prixHP: d.prixHP,
            prixHC: d.prixHC,
            prixBase: d.prixBase,
            nbJours: 1,
            sumConsoHP: d.consoHP,
            sumConsoHC: d.consoHC
          };
        }
      }
    }

    if (currentSliceVar) {
      slicesVar.push({
        id: `${currentSliceVar.id}-${currentSliceVar.dateDebut}-${currentSliceVar.isEstime ? 'est' : 'reel'}`,
        nom: currentSliceVar.nom,
        isHistorique: currentSliceVar.isHistorique,
        isEstime: currentSliceVar.isEstime,
        dateDebut: currentSliceVar.dateDebut,
        dateFin: currentSliceVar.dateFin,
        prixHP: currentSliceVar.prixHP,
        prixHC: currentSliceVar.prixHC,
        prixBase: currentSliceVar.prixBase,
        nbJours: currentSliceVar.nbJours,
        sumConsoHP: currentSliceVar.sumConsoHP,
        sumConsoHC: currentSliceVar.sumConsoHC
      });
    }

    // 4. Génération des lignes détaillées (HP et HC distinctes pour chaque période, ou Base)
    interface VariableRow {
      id: string;
      periodeLabel: string;
      periodeDetails: string;
      typePoste: 'HP' | 'HC' | 'BASE';
      nomType: string;
      dateDebut: string;
      dateFin: string;
      isEstime: boolean;
      nbJours: number;
      consoKw: number;
      tarifKwh: number;
      montantHT: number;
    }

    const rows: VariableRow[] = [];
    let sumConsoHP = 0;
    let sumConsoHC = 0;
    let sumMontantHT = 0;

    for (const slice of slicesVar) {
      const isHausseAppliquee = isDateFinFuture && appliquerHausse && slice.isEstime && config.haussePrevue > 0;
      const estimLabel = slice.isEstime ? (isHausseAppliquee ? `ESTIMATIF (+${config.haussePrevue}% hausse) ` : 'ESTIMATIF (base historique) ') : '';
      const estimDetail = slice.isEstime ? ` • Estimé par rapport aux années précédentes${isHausseAppliquee ? ` (avec hausse de +${config.haussePrevue}%)` : ''}` : '';

      if (config.type === 'HP_HC') {
        const roundedHP = Math.round(slice.sumConsoHP);
        const montantHP = Math.round(roundedHP * slice.prixHP * 100) / 100;
        sumConsoHP += roundedHP;
        sumMontantHT += montantHP;

        rows.push({
          id: `${slice.id}-HP`,
          periodeLabel: `${estimLabel}Du ${toFrenchDate(slice.dateDebut)} au ${toFrenchDate(slice.dateFin)} - Heures Pleines (HP)`,
          periodeDetails: `${slice.isHistorique && slice.nom ? `${slice.nom} • ` : ''}${slice.nbJours} jours${estimDetail}`,
          typePoste: 'HP',
          nomType: 'Heures Pleines (HP)',
          dateDebut: slice.dateDebut,
          dateFin: slice.dateFin,
          isEstime: slice.isEstime,
          nbJours: slice.nbJours,
          consoKw: roundedHP,
          tarifKwh: slice.prixHP,
          montantHT: montantHP
        });

        const roundedHC = Math.round(slice.sumConsoHC);
        const montantHC = Math.round(roundedHC * slice.prixHC * 100) / 100;
        sumConsoHC += roundedHC;
        sumMontantHT += montantHC;

        rows.push({
          id: `${slice.id}-HC`,
          periodeLabel: `${estimLabel}Du ${toFrenchDate(slice.dateDebut)} au ${toFrenchDate(slice.dateFin)} - Heures Creuses (HC)`,
          periodeDetails: `${slice.isHistorique && slice.nom ? `${slice.nom} • ` : ''}${slice.nbJours} jours${estimDetail}`,
          typePoste: 'HC',
          nomType: 'Heures Creuses (HC)',
          dateDebut: slice.dateDebut,
          dateFin: slice.dateFin,
          isEstime: slice.isEstime,
          nbJours: slice.nbJours,
          consoKw: roundedHC,
          tarifKwh: slice.prixHC,
          montantHT: montantHC
        });
      } else {
        // Option Base
        const roundedBase = Math.round(slice.sumConsoHP + slice.sumConsoHC);
        const montantBase = Math.round(roundedBase * slice.prixBase * 100) / 100;
        sumConsoHP += roundedBase;
        sumMontantHT += montantBase;

        rows.push({
          id: `${slice.id}-BASE`,
          periodeLabel: `${estimLabel}Du ${toFrenchDate(slice.dateDebut)} au ${toFrenchDate(slice.dateFin)} - Option Base`,
          periodeDetails: `${slice.isHistorique && slice.nom ? `${slice.nom} • ` : ''}${slice.nbJours} jours${estimDetail}`,
          typePoste: 'BASE',
          nomType: 'Option Base',
          dateDebut: slice.dateDebut,
          dateFin: slice.dateFin,
          isEstime: slice.isEstime,
          nbJours: slice.nbJours,
          consoKw: roundedBase,
          tarifKwh: slice.prixBase,
          montantHT: montantBase
        });
      }
    }

    return {
      variableRows: rows,
      totalConsoVariableHP: sumConsoHP,
      totalConsoVariableHC: sumConsoHC,
      totalConsoVariableTotale: sumConsoHP + sumConsoHC,
      totalPartVariableHT: Math.round(sumMontantHT * 100) / 100
    };
  }, [dateDebut, dateFin, config, releves, isValidInterval, nbJours, isDateFinFuture, appliquerHausse, todayStr]);

  // Calcul de la décomposition des Taxes & Contributions (Accise et CTA par période)
  const { taxesRows, totalTaxesHT } = useMemo(() => {
    if (!isValidInterval || nbJours === 0) {
      return { taxesRows: [], totalTaxesHT: 0 };
    }

    // 1. Interpolation journalière des consommations réelles
    const dailyConsoMap = new Map<string, number>();
    if (releves && releves.length >= 2) {
      const sorted = [...releves].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      for (let i = 0; i < sorted.length - 1; i++) {
        const r1 = sorted[i];
        const r2 = sorted[i + 1];
        const [y1, m1, d1] = r1.date.split('-').map(Number);
        const [y2, m2, d2] = r2.date.split('-').map(Number);
        const date1 = new Date(y1, m1 - 1, d1, 12, 0, 0);
        const date2 = new Date(y2, m2 - 1, d2, 12, 0, 0);

        const diffDays = Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) continue;

        const deltaTotal = (r2.indexHP - r1.indexHP) + (config.type === 'HP_HC' ? (r2.indexHC - r1.indexHC) : 0);
        const consoJournaliere = deltaTotal / diffDays;

        const temp = new Date(date1);
        for (let d = 0; d < diffDays; d++) {
          temp.setDate(temp.getDate() + 1);
          const yr = temp.getFullYear();
          const mo = String(temp.getMonth() + 1).padStart(2, '0');
          const da = String(temp.getDate()).padStart(2, '0');
          const dateStr = `${yr}-${mo}-${da}`;
          dailyConsoMap.set(dateStr, consoJournaliere);
        }
      }
    }

    let sumCovered = 0;
    dailyConsoMap.forEach((v) => {
      sumCovered += v;
    });
    const avgDailyTotal = dailyConsoMap.size > 0 ? sumCovered / dailyConsoMap.size : 0;

    // 2. Attribution jour par jour pour chaque taxe (Accise et CTA)
    interface DayTaxInfo {
      dateStr: string;
      periodeId: string;
      nom: string;
      isHistorique: boolean;
      acciseTaux: number;
      ctaTaux: number;
      ctaType: 'pourcentage' | 'mensuel' | 'annuel';
      consoKw: number;
    }

    const daysTax: DayTaxInfo[] = [];
    const [sY, sM, sD] = dateDebut.split('-').map(Number);
    const [eY, eM, eD] = dateFin.split('-').map(Number);
    const startDate = new Date(sY, sM - 1, sD, 12, 0, 0);
    const endDate = new Date(eY, eM - 1, eD, 12, 0, 0);
    const tempDate = new Date(startDate);

    while (tempDate <= endDate) {
      const year = tempDate.getFullYear();
      const monthStr = String(tempDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(tempDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const matchedPeriode = (config.periodes || []).find((p) => {
        const pDebut = p.debut;
        const pFin = p.fin && p.fin.trim() !== '' ? p.fin : '9999-12-31';
        return dateStr >= pDebut && dateStr <= pFin;
      });

      const dayConso = dailyConsoMap.get(dateStr) ?? avgDailyTotal;
      const acciseTaux = matchedPeriode && matchedPeriode.cspe !== undefined
        ? matchedPeriode.cspe
        : config.taxes.cspe;

      const ctaTaux = matchedPeriode && matchedPeriode.cta !== undefined
        ? matchedPeriode.cta
        : config.taxes.cta;

      const ctaType = matchedPeriode && matchedPeriode.ctaType
        ? matchedPeriode.ctaType
        : (config.taxes.ctaType || 'pourcentage');

      if (matchedPeriode) {
        daysTax.push({
          dateStr,
          periodeId: matchedPeriode.id,
          nom: matchedPeriode.nom || 'Période historique',
          isHistorique: true,
          acciseTaux,
          ctaTaux,
          ctaType,
          consoKw: dayConso
        });
      } else {
        daysTax.push({
          dateStr,
          periodeId: '__current_contract__',
          nom: 'Configuration du contrat & tarifs',
          isHistorique: false,
          acciseTaux,
          ctaTaux,
          ctaType,
          consoKw: dayConso
        });
      }

      tempDate.setDate(tempDate.getDate() + 1);
    }

    // 3. Regroupement en tranches d'Accise homogènes
    interface AcciseSlice {
      id: string;
      nom: string;
      isHistorique: boolean;
      dateDebut: string;
      dateFin: string;
      acciseTaux: number;
      nbJours: number;
      sumConsoKw: number;
    }

    const slicesAccise: AcciseSlice[] = [];
    let currentSliceAccise: AcciseSlice | null = null;

    for (const d of daysTax) {
      if (!currentSliceAccise) {
        currentSliceAccise = {
          id: d.periodeId,
          nom: d.nom,
          isHistorique: d.isHistorique,
          dateDebut: d.dateStr,
          dateFin: d.dateStr,
          acciseTaux: d.acciseTaux,
          nbJours: 1,
          sumConsoKw: d.consoKw
        };
      } else if (
        currentSliceAccise.id === d.periodeId &&
        Math.abs(currentSliceAccise.acciseTaux - d.acciseTaux) < 0.00001
      ) {
        currentSliceAccise.dateFin = d.dateStr;
        currentSliceAccise.nbJours += 1;
        currentSliceAccise.sumConsoKw += d.consoKw;
      } else {
        slicesAccise.push({
          id: `${currentSliceAccise.id}-${currentSliceAccise.dateDebut}`,
          nom: currentSliceAccise.nom,
          isHistorique: currentSliceAccise.isHistorique,
          dateDebut: currentSliceAccise.dateDebut,
          dateFin: currentSliceAccise.dateFin,
          acciseTaux: currentSliceAccise.acciseTaux,
          nbJours: currentSliceAccise.nbJours,
          sumConsoKw: currentSliceAccise.sumConsoKw
        });

        currentSliceAccise = {
          id: d.periodeId,
          nom: d.nom,
          isHistorique: d.isHistorique,
          dateDebut: d.dateStr,
          dateFin: d.dateStr,
          acciseTaux: d.acciseTaux,
          nbJours: 1,
          sumConsoKw: d.consoKw
        };
      }
    }

    if (currentSliceAccise) {
      slicesAccise.push({
        id: `${currentSliceAccise.id}-${currentSliceAccise.dateDebut}`,
        nom: currentSliceAccise.nom,
        isHistorique: currentSliceAccise.isHistorique,
        dateDebut: currentSliceAccise.dateDebut,
        dateFin: currentSliceAccise.dateFin,
        acciseTaux: currentSliceAccise.acciseTaux,
        nbJours: currentSliceAccise.nbJours,
        sumConsoKw: currentSliceAccise.sumConsoKw
      });
    }

    // 4. Regroupement en tranches de CTA homogènes
    interface CtaSlice {
      id: string;
      nom: string;
      isHistorique: boolean;
      dateDebut: string;
      dateFin: string;
      ctaTaux: number;
      ctaType: 'pourcentage' | 'mensuel' | 'annuel';
      nbJours: number;
    }

    const slicesCta: CtaSlice[] = [];
    let currentSliceCta: CtaSlice | null = null;

    for (const d of daysTax) {
      if (!currentSliceCta) {
        currentSliceCta = {
          id: d.periodeId,
          nom: d.nom,
          isHistorique: d.isHistorique,
          dateDebut: d.dateStr,
          dateFin: d.dateStr,
          ctaTaux: d.ctaTaux,
          ctaType: d.ctaType,
          nbJours: 1
        };
      } else if (
        currentSliceCta.id === d.periodeId &&
        Math.abs(currentSliceCta.ctaTaux - d.ctaTaux) < 0.00001 &&
        currentSliceCta.ctaType === d.ctaType
      ) {
        currentSliceCta.dateFin = d.dateStr;
        currentSliceCta.nbJours += 1;
      } else {
        slicesCta.push({
          id: `${currentSliceCta.id}-${currentSliceCta.dateDebut}`,
          nom: currentSliceCta.nom,
          isHistorique: currentSliceCta.isHistorique,
          dateDebut: currentSliceCta.dateDebut,
          dateFin: currentSliceCta.dateFin,
          ctaTaux: currentSliceCta.ctaTaux,
          ctaType: currentSliceCta.ctaType,
          nbJours: currentSliceCta.nbJours
        });

        currentSliceCta = {
          id: d.periodeId,
          nom: d.nom,
          isHistorique: d.isHistorique,
          dateDebut: d.dateStr,
          dateFin: d.dateStr,
          ctaTaux: d.ctaTaux,
          ctaType: d.ctaType,
          nbJours: 1
        };
      }
    }

    if (currentSliceCta) {
      slicesCta.push({
        id: `${currentSliceCta.id}-${currentSliceCta.dateDebut}`,
        nom: currentSliceCta.nom,
        isHistorique: currentSliceCta.isHistorique,
        dateDebut: currentSliceCta.dateDebut,
        dateFin: currentSliceCta.dateFin,
        ctaTaux: currentSliceCta.ctaTaux,
        ctaType: currentSliceCta.ctaType,
        nbJours: currentSliceCta.nbJours
      });
    }

    // 5. Construction des lignes du tableau Taxes & contributions
    interface TaxRow {
      id: string;
      designation: string;
      details: string;
      assiette: string;
      assietteVal: number;
      taux: string;
      montantHT: number;
      typeTaxe: 'ACCISE' | 'CTA';
    }

    const rows: TaxRow[] = [];
    let sumTaxesHT = 0;

    // A. Lignes Accise
    for (const slice of slicesAccise) {
      const roundedKw = Math.round(slice.sumConsoKw);
      const montant = Math.round(roundedKw * slice.acciseTaux * 100) / 100;
      sumTaxesHT += montant;

      rows.push({
        id: `accise-${slice.id}`,
        designation: `Accise (CSPE) du ${toFrenchDate(slice.dateDebut)} au ${toFrenchDate(slice.dateFin)}`,
        details: `${slice.isHistorique && slice.nom ? `${slice.nom} • ` : ''}${slice.nbJours} jours`,
        assiette: `${roundedKw.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} kWh`,
        assietteVal: roundedKw,
        taux: `${slice.acciseTaux.toFixed(4).replace('.', ',')} € / kWh`,
        montantHT: montant,
        typeTaxe: 'ACCISE'
      });
    }

    // B. Lignes CTA (sous les lignes Accise, par période)
    const puissanceKva = config.puissance ?? 15;
    const calculCsfVal = puissanceKva * turpeCSF;
    const turpeFixeTotalAnnuel = turpeCG + turpeCC + calculCsfVal;

    for (const slice of slicesCta) {
      // Formule demandée : ((CG + CC + Calcul CSF) * (nombre de jours de la période / 365)) = assiette CTA
      const assietteCta = (turpeFixeTotalAnnuel * slice.nbJours) / 365;
      
      let montantCta = 0;
      let tauxAffiche = '';

      if (slice.ctaType === 'pourcentage') {
        montantCta = Math.round(assietteCta * (slice.ctaTaux / 100) * 100) / 100;
        tauxAffiche = `${slice.ctaTaux.toString().replace('.', ',')} %`;
      } else if (slice.ctaType === 'mensuel') {
        // En montant mensuel fixe
        montantCta = Math.round((slice.ctaTaux * (slice.nbJours / 30.4375)) * 100) / 100;
        tauxAffiche = `${slice.ctaTaux.toFixed(2).replace('.', ',')} € / mois`;
      } else {
        // En montant annuel fixe
        montantCta = Math.round((slice.ctaTaux * (slice.nbJours / 365)) * 100) / 100;
        tauxAffiche = `${slice.ctaTaux.toFixed(2).replace('.', ',')} € / an`;
      }

      sumTaxesHT += montantCta;

      rows.push({
        id: `cta-${slice.id}`,
        designation: `Contribution Tarifaire d'Acheminement (CTA) du ${toFrenchDate(slice.dateDebut)} au ${toFrenchDate(slice.dateFin)}`,
        details: `${slice.isHistorique && slice.nom ? `${slice.nom} • ` : ''}${slice.nbJours} jours • Formule TURPE`,
        assiette: `${assietteCta.toFixed(2).replace('.', ',')} €`,
        assietteVal: assietteCta,
        taux: tauxAffiche,
        montantHT: montantCta,
        typeTaxe: 'CTA'
      });
    }

    return {
      taxesRows: rows,
      slicesAccise,
      slicesCta,
      totalTaxesHT: Math.round(sumTaxesHT * 100) / 100
    };
  }, [dateDebut, dateFin, config, releves, isValidInterval, nbJours, turpeCG, turpeCC, turpeCSF]);

  // Calcul des lignes du tableau Calcul TVA par période
  const { tvaRows, totalTvaMontant } = useMemo(() => {
    if (!isValidInterval || nbJours === 0) {
      return { tvaRows: [], totalTvaMontant: 0 };
    }

    // 1. Décomposition jour par jour de la TVA (Abo+CTA et Énergie) et des montants journaliers HT (Part Fixe, Part Variable, Accise, CTA)
    interface DayTvaInfo {
      dateStr: string;
      periodeId: string;
      nom: string;
      isHistorique: boolean;
      tvaAboCta: number;
      tvaEnergie: number;
      partFixeHT: number;
      partVarHT: number;
      acciseHT: number;
      ctaHT: number;
    }

    const puissanceKva = config.puissance ?? 15;
    const calculCsfVal = puissanceKva * turpeCSF;
    const turpeFixeTotalAnnuel = turpeCG + turpeCC + calculCsfVal;
    const assietteCtaJour = turpeFixeTotalAnnuel / 365;

    // Conso journalière map
    const dailyConsoMap = new Map<string, { hp: number; hc: number }>();
    if (releves && releves.length >= 2) {
      const sorted = [...releves].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      for (let i = 0; i < sorted.length - 1; i++) {
        const r1 = sorted[i];
        const r2 = sorted[i + 1];
        const [y1, m1, d1] = r1.date.split('-').map(Number);
        const [y2, m2, d2] = r2.date.split('-').map(Number);
        const date1 = new Date(y1, m1 - 1, d1, 12, 0, 0);
        const date2 = new Date(y2, m2 - 1, d2, 12, 0, 0);

        const diffDays = Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 0) continue;

        const deltaHP = r2.indexHP - r1.indexHP;
        const deltaHC = config.type === 'HP_HC' ? (r2.indexHC - r1.indexHC) : 0;
        const consoJournaliereHP = deltaHP / diffDays;
        const consoJournaliereHC = deltaHC / diffDays;

        const temp = new Date(date1);
        for (let d = 0; d < diffDays; d++) {
          temp.setDate(temp.getDate() + 1);
          const yr = temp.getFullYear();
          const mo = String(temp.getMonth() + 1).padStart(2, '0');
          const da = String(temp.getDate()).padStart(2, '0');
          const dateStr = `${yr}-${mo}-${da}`;
          dailyConsoMap.set(dateStr, { hp: consoJournaliereHP, hc: consoJournaliereHC });
        }
      }
    }

    let sumCoveredHP = 0;
    let sumCoveredHC = 0;
    dailyConsoMap.forEach((v) => {
      sumCoveredHP += v.hp;
      sumCoveredHC += v.hc;
    });
    const avgDailyHP = dailyConsoMap.size > 0 ? sumCoveredHP / dailyConsoMap.size : 0;
    const avgDailyHC = dailyConsoMap.size > 0 ? sumCoveredHC / dailyConsoMap.size : 0;

    let lastReleveDate = '';
    if (releves && releves.length > 0) {
      const sortedReleves = [...releves].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      lastReleveDate = sortedReleves[sortedReleves.length - 1].date;
    }

    const daysTva: DayTvaInfo[] = [];
    const [sY, sM, sD] = dateDebut.split('-').map(Number);
    const [eY, eM, eD] = dateFin.split('-').map(Number);
    const startDate = new Date(sY, sM - 1, sD, 12, 0, 0);
    const endDate = new Date(eY, eM - 1, eD, 12, 0, 0);
    const tempDate = new Date(startDate);

    while (tempDate <= endDate) {
      const year = tempDate.getFullYear();
      const monthStr = String(tempDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(tempDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const matchedPeriode = (config.periodes || []).find((p) => {
        const pDebut = p.debut;
        const pFin = p.fin && p.fin.trim() !== '' ? p.fin : '9999-12-31';
        return dateStr >= pDebut && dateStr <= pFin;
      });

      const dayConso = dailyConsoMap.get(dateStr) || { hp: avgDailyHP, hc: avgDailyHC };

      const tvaAboCta = matchedPeriode && matchedPeriode.tvaReduite !== undefined
        ? matchedPeriode.tvaReduite
        : (config.taxes.tvaReduite !== undefined ? config.taxes.tvaReduite : 5.5);

      const tvaEnergie = matchedPeriode && matchedPeriode.tvaNormale !== undefined
        ? matchedPeriode.tvaNormale
        : (config.taxes.tvaNormale !== undefined ? config.taxes.tvaNormale : 20.0);

      const dayAboHT = matchedPeriode
        ? (matchedPeriode.abonnementMensuel * 12) / 365.25
        : (config.abonnementMensuel * 12) / 365.25;

      const isEstime = Boolean((lastReleveDate && dateStr > lastReleveDate) || dateStr > todayStr);
      const coeffHausse = (isDateFinFuture && appliquerHausse && isEstime)
        ? (1 + (config.haussePrevue || 0) / 100)
        : 1;

      let dayVarHT = 0;
      if (config.type === 'HP_HC') {
        const prixHP = (matchedPeriode ? matchedPeriode.prixKwhHP : config.prixKwhHP) * coeffHausse;
        const prixHC = (matchedPeriode ? matchedPeriode.prixKwhHC : config.prixKwhHC) * coeffHausse;
        dayVarHT = (dayConso.hp * prixHP) + (dayConso.hc * prixHC);
      } else {
        const prixBase = (matchedPeriode ? matchedPeriode.prixKwhBase : config.prixKwhBase) * coeffHausse;
        dayVarHT = (dayConso.hp + dayConso.hc) * prixBase;
      }

      const acciseTaux = matchedPeriode && matchedPeriode.cspe !== undefined
        ? matchedPeriode.cspe
        : config.taxes.cspe;
      const dayConsoTotale = dayConso.hp + dayConso.hc;
      const dayAcciseHT = dayConsoTotale * acciseTaux;

      const ctaTaux = matchedPeriode && matchedPeriode.cta !== undefined
        ? matchedPeriode.cta
        : config.taxes.cta;
      const ctaType = matchedPeriode && matchedPeriode.ctaType
        ? matchedPeriode.ctaType
        : (config.taxes.ctaType || 'pourcentage');

      let dayCtaHT = 0;
      if (ctaType === 'pourcentage') {
        dayCtaHT = assietteCtaJour * (ctaTaux / 100);
      } else if (ctaType === 'mensuel') {
        dayCtaHT = ctaTaux / 30.4375;
      } else {
        dayCtaHT = ctaTaux / 365;
      }

      if (matchedPeriode) {
        daysTva.push({
          dateStr,
          periodeId: matchedPeriode.id,
          nom: matchedPeriode.nom || 'Période historique',
          isHistorique: true,
          tvaAboCta,
          tvaEnergie,
          partFixeHT: dayAboHT,
          partVarHT: dayVarHT,
          acciseHT: dayAcciseHT,
          ctaHT: dayCtaHT
        });
      } else {
        daysTva.push({
          dateStr,
          periodeId: '__current_contract__',
          nom: 'Configuration du contrat & tarifs',
          isHistorique: false,
          tvaAboCta,
          tvaEnergie,
          partFixeHT: dayAboHT,
          partVarHT: dayVarHT,
          acciseHT: dayAcciseHT,
          ctaHT: dayCtaHT
        });
      }

      tempDate.setDate(tempDate.getDate() + 1);
    }

    // 2. Regroupement par tranches temporelles de TVA
    interface TvaSlice {
      id: string;
      nom: string;
      isHistorique: boolean;
      dateDebut: string;
      dateFin: string;
      tvaAboCta: number;
      tvaEnergie: number;
      nbJours: number;
      sumPartFixeHT: number;
      sumPartVarHT: number;
      sumAcciseHT: number;
      sumCtaHT: number;
    }

    const slicesTva: TvaSlice[] = [];
    let currentSliceTva: TvaSlice | null = null;

    for (const d of daysTva) {
      if (!currentSliceTva) {
        currentSliceTva = {
          id: d.periodeId,
          nom: d.nom,
          isHistorique: d.isHistorique,
          dateDebut: d.dateStr,
          dateFin: d.dateStr,
          tvaAboCta: d.tvaAboCta,
          tvaEnergie: d.tvaEnergie,
          nbJours: 1,
          sumPartFixeHT: d.partFixeHT,
          sumPartVarHT: d.partVarHT,
          sumAcciseHT: d.acciseHT,
          sumCtaHT: d.ctaHT
        };
      } else if (
        currentSliceTva.id === d.periodeId &&
        Math.abs(currentSliceTva.tvaAboCta - d.tvaAboCta) < 0.00001 &&
        Math.abs(currentSliceTva.tvaEnergie - d.tvaEnergie) < 0.00001
      ) {
        currentSliceTva.dateFin = d.dateStr;
        currentSliceTva.nbJours += 1;
        currentSliceTva.sumPartFixeHT += d.partFixeHT;
        currentSliceTva.sumPartVarHT += d.partVarHT;
        currentSliceTva.sumAcciseHT += d.acciseHT;
        currentSliceTva.sumCtaHT += d.ctaHT;
      } else {
        slicesTva.push({
          id: `${currentSliceTva.id}-${currentSliceTva.dateDebut}`,
          nom: currentSliceTva.nom,
          isHistorique: currentSliceTva.isHistorique,
          dateDebut: currentSliceTva.dateDebut,
          dateFin: currentSliceTva.dateFin,
          tvaAboCta: currentSliceTva.tvaAboCta,
          tvaEnergie: currentSliceTva.tvaEnergie,
          nbJours: currentSliceTva.nbJours,
          sumPartFixeHT: currentSliceTva.sumPartFixeHT,
          sumPartVarHT: currentSliceTva.sumPartVarHT,
          sumAcciseHT: currentSliceTva.sumAcciseHT,
          sumCtaHT: currentSliceTva.sumCtaHT
        });

        currentSliceTva = {
          id: d.periodeId,
          nom: d.nom,
          isHistorique: d.isHistorique,
          dateDebut: d.dateStr,
          dateFin: d.dateStr,
          tvaAboCta: d.tvaAboCta,
          tvaEnergie: d.tvaEnergie,
          nbJours: 1,
          sumPartFixeHT: d.partFixeHT,
          sumPartVarHT: d.partVarHT,
          sumAcciseHT: d.acciseHT,
          sumCtaHT: d.ctaHT
        };
      }
    }

    if (currentSliceTva) {
      slicesTva.push({
        id: `${currentSliceTva.id}-${currentSliceTva.dateDebut}`,
        nom: currentSliceTva.nom,
        isHistorique: currentSliceTva.isHistorique,
        dateDebut: currentSliceTva.dateDebut,
        dateFin: currentSliceTva.dateFin,
        tvaAboCta: currentSliceTva.tvaAboCta,
        tvaEnergie: currentSliceTva.tvaEnergie,
        nbJours: currentSliceTva.nbJours,
        sumPartFixeHT: currentSliceTva.sumPartFixeHT,
        sumPartVarHT: currentSliceTva.sumPartVarHT,
        sumAcciseHT: currentSliceTva.sumAcciseHT,
        sumCtaHT: currentSliceTva.sumCtaHT
      });
    }

    // 3. Construction des lignes de TVA
    interface TvaRow {
      id: string;
      designation: string;
      details: string;
      assiette: string;
      assietteVal: number;
      taux: string;
      montantTVA: number;
    }

    const rows: TvaRow[] = [];
    let sumTotalTva = 0;

    for (const slice of slicesTva) {
      const partFixeArrondi = Math.round(slice.sumPartFixeHT * 100) / 100;
      const partVarArrondi = Math.round(slice.sumPartVarHT * 100) / 100;
      const acciseArrondi = Math.round(slice.sumAcciseHT * 100) / 100;
      const ctaArrondi = Math.round(slice.sumCtaHT * 100) / 100;
      const totalHTSlice = Math.round((partFixeArrondi + partVarArrondi) * 100) / 100;

      const dateLabel = `du ${toFrenchDate(slice.dateDebut)} au ${toFrenchDate(slice.dateFin)}`;
      const detailsPrefix = slice.isHistorique && slice.nom ? `${slice.nom} • ${slice.nbJours} jours` : `${slice.nbJours} jours`;

      // Cas 1 : Les 2 taux sont identiques
      if (Math.abs(slice.tvaAboCta - slice.tvaEnergie) < 0.001) {
        // Une seule ligne pour les 2 : Assiette = Total HT + montant en € des Accise + montant en € des CTA
        const assiette = Math.round((totalHTSlice + acciseArrondi + ctaArrondi) * 100) / 100;
        const montant = Math.round(assiette * (slice.tvaAboCta / 100) * 100) / 100;
        sumTotalTva += montant;

        rows.push({
          id: `tva-unique-${slice.id}`,
          designation: `TVA globale (Abonnement, CTA & Énergie) ${dateLabel}`,
          details: `${detailsPrefix} • Total HT + Accise + CTA`,
          assiette: `${assiette.toFixed(2).replace('.', ',')} €`,
          assietteVal: assiette,
          taux: `${slice.tvaAboCta.toString().replace('.', ',')} %`,
          montantTVA: montant
        });
      }
      // Cas 2 : TVA (Abo + CTA) < TVA Énergie
      else if (slice.tvaAboCta < slice.tvaEnergie) {
        // Ligne 1 : TVA (Abo + CTA) réduite
        // Assiette = Montant en € HT de part fixe selon la période + montant en € des CTA concernant la période
        const assietteAboCta = Math.round((partFixeArrondi + ctaArrondi) * 100) / 100;
        const montantAboCta = Math.round(assietteAboCta * (slice.tvaAboCta / 100) * 100) / 100;
        sumTotalTva += montantAboCta;

        rows.push({
          id: `tva-abo-cta-reduite-${slice.id}`,
          designation: `TVA (Abo + CTA) réduite ${dateLabel}`,
          details: `${detailsPrefix} • Part Fixe HT + CTA`,
          assiette: `${assietteAboCta.toFixed(2).replace('.', ',')} €`,
          assietteVal: assietteAboCta,
          taux: `${slice.tvaAboCta.toString().replace('.', ',')} %`,
          montantTVA: montantAboCta
        });

        // Ligne 2 : TVA Énergie
        // Assiette = ((total HT + Accise + CTA) - Assiette TVA (Abo + CTA)) = partVarArrondi + acciseArrondi
        const assietteGlobale = Math.round((totalHTSlice + acciseArrondi + ctaArrondi) * 100) / 100;
        const assietteEnergie = Math.round((assietteGlobale - assietteAboCta) * 100) / 100;
        const montantEnergie = Math.round(assietteEnergie * (slice.tvaEnergie / 100) * 100) / 100;
        sumTotalTva += montantEnergie;

        rows.push({
          id: `tva-energie-${slice.id}`,
          designation: `TVA Énergie ${dateLabel}`,
          details: `${detailsPrefix} • Part Variable HT + Accise (CSPE)`,
          assiette: `${assietteEnergie.toFixed(2).replace('.', ',')} €`,
          assietteVal: assietteEnergie,
          taux: `${slice.tvaEnergie.toString().replace('.', ',')} %`,
          montantTVA: montantEnergie
        });
      }
      // Cas 3 : TVA Énergie < TVA Abo + CTA
      else {
        // Ligne 1 : TVA Énergie réduite
        // Assiette = TOTAL PART VARIABLE (HT) + montant en € Accise
        const assietteEnergieReduite = Math.round((partVarArrondi + acciseArrondi) * 100) / 100;
        const montantEnergieReduite = Math.round(assietteEnergieReduite * (slice.tvaEnergie / 100) * 100) / 100;
        sumTotalTva += montantEnergieReduite;

        rows.push({
          id: `tva-energie-reduite-${slice.id}`,
          designation: `TVA Énergie réduite ${dateLabel}`,
          details: `${detailsPrefix} • Part Variable HT + Accise (CSPE)`,
          assiette: `${assietteEnergieReduite.toFixed(2).replace('.', ',')} €`,
          assietteVal: assietteEnergieReduite,
          taux: `${slice.tvaEnergie.toString().replace('.', ',')} %`,
          montantTVA: montantEnergieReduite
        });

        // Ligne 2 : TVA Abo + CTA
        // Assiette = montant en € de part fixe + montant en € CTA
        const assietteAboCtaNormale = Math.round((partFixeArrondi + ctaArrondi) * 100) / 100;
        const montantAboCtaNormale = Math.round(assietteAboCtaNormale * (slice.tvaAboCta / 100) * 100) / 100;
        sumTotalTva += montantAboCtaNormale;

        rows.push({
          id: `tva-abo-cta-${slice.id}`,
          designation: `TVA (Abo + CTA) ${dateLabel}`,
          details: `${detailsPrefix} • Part Fixe HT + CTA`,
          assiette: `${assietteAboCtaNormale.toFixed(2).replace('.', ',')} €`,
          assietteVal: assietteAboCtaNormale,
          taux: `${slice.tvaAboCta.toString().replace('.', ',')} %`,
          montantTVA: montantAboCtaNormale
        });
      }
    }

    return {
      tvaRows: rows,
      totalTvaMontant: Math.round(sumTotalTva * 100) / 100
    };
  }, [dateDebut, dateFin, config, releves, isValidInterval, nbJours, turpeCG, turpeCC, turpeCSF, isDateFinFuture, appliquerHausse, todayStr]);

  // Fonction de génération et téléchargement du PDF d'estimation de facture
  const handleDownloadPdf = () => {
    if (!isValidInterval || nbJours === 0) return;

    const cleanPdfText = (str: string) => (str || '').replace(/[\u00a0\u202f]/g, ' ');

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // Bandeau d'en-tête
    doc.setFillColor(30, 58, 138); // Bleu foncé #1e3a8a
    doc.rect(10, y, pageWidth - 20, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("ESTIMATION DE FACTURE D'ÉLECTRICITÉ", 15, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(cleanPdfText(`Période du ${toFrenchDate(dateDebut)} au ${toFrenchDate(dateFin)} (${nbJours} jours / ${nbMois.toFixed(2).replace('.', ',')} mois)`), 15, y + 17);

    y += 28;

    // Bloc Métadonnées (Contrat & Dates)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(10, y, pageWidth - 20, 22, 2, 2, 'FD');

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Date de l'estimation :`, 14, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(cleanPdfText(`${new Date().toLocaleDateString('fr-FR')}`), 50, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.text(`Option tarifaire :`, 14, y + 15);
    doc.setFont('helvetica', 'normal');
    const typeOption = config.type === 'HP_HC' ? 'Heures Pleines / Heures Creuses (HP/HC)' : 'Option Base';
    doc.text(cleanPdfText(`${typeOption} (${config.puissance || 9} kVA)`), 50, y + 15);

    doc.setFont('helvetica', 'bold');
    doc.text(`Nombre de mensualités :`, 115, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(cleanPdfText(`${config.nombrePrelevements || 10} mois / an`), 155, y + 7);

    y += 26;

    // Encadré Total Général TTC
    const totalHTGlobal = totalPartFixeHT + totalPartVariableHT;
    const totalTTC = Math.round((totalHTGlobal + totalTaxesHT + totalTvaMontant) * 100) / 100;
    const nbPrelevements = config.nombrePrelevements || 10;
    const mensualiteTTC = Math.round((totalTTC / nbPrelevements) * 100) / 100;

    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(10, y, pageWidth - 20, 28, 3, 3, 'FD');

    doc.setTextColor(30, 27, 75);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text("TOTAL ESTIMÉ DE LA FACTURE TTC", 15, y + 7);

    doc.setTextColor(29, 78, 216);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(cleanPdfText(`${totalTTC.toFixed(2).replace('.', ',')} € TTC`), 15, y + 16);

    doc.setTextColor(5, 150, 105);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(cleanPdfText(`Mensualité : ${mensualiteTTC.toFixed(2).replace('.', ',')} € / mois (${nbPrelevements} prélèvements/an)`), 15, y + 23);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(cleanPdfText(`(HT : ${totalHTGlobal.toFixed(2).replace('.', ',')} € | Taxes : ${totalTaxesHT.toFixed(2).replace('.', ',')} € | TVA : ${totalTvaMontant.toFixed(2).replace('.', ',')} €)`), 105, y + 16);

    y += 34;

    const addSectionTitle = (title: string) => {
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y, pageWidth - 20, 7, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(cleanPdfText(title), 13, y + 5);
      y += 9;
    };

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > 275) {
        doc.addPage();
        y = 15;
      }
    };

    // 1. Part Fixe
    checkPageBreak(35);
    addSectionTitle("1. PART FIXE (ABONNEMENT)");

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text("Période / Décomposition", 14, y);
    doc.text("Durée", 110, y);
    doc.text("Tarif mensuel", 140, y);
    doc.text("Montant HT", 175, y);
    y += 3;
    doc.setDrawColor(203, 213, 225);
    doc.line(10, y, pageWidth - 10, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    for (const p of periodesSlices) {
      checkPageBreak(7);
      const dateStr = `Du ${toFrenchDate(p.dateDebut)} au ${toFrenchDate(p.dateFin)}`;
      const label = `${p.nom || 'Période'}${p.isEstime ? ' (Estime)' : ''} - ${dateStr}`;
      doc.text(cleanPdfText(label.substring(0, 68)), 14, y);
      doc.text(cleanPdfText(`${p.nbJours || 0} j (${(p.nbMois || 0).toFixed(2).replace('.', ',')} m)`), 110, y);
      doc.text(cleanPdfText(`${(p.abonnementMensuel || 0).toFixed(2).replace('.', ',')} €/m`), 140, y);
      doc.text(cleanPdfText(`${(p.montantHT || 0).toFixed(2).replace('.', ',')} €`), 175, y);
      y += 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(cleanPdfText(`Sous-total Part Fixe HT :`), 120, y + 1);
    doc.text(cleanPdfText(`${totalPartFixeHT.toFixed(2).replace('.', ',')} € HT`), 175, y + 1);
    y += 8;

    // 2. Part Variable
    checkPageBreak(35);
    addSectionTitle("2. PART VARIABLE (CONSOMMATION ÉNERGIE)");

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text("Tranche / Période", 14, y);
    doc.text("Volume (kWh)", 110, y);
    doc.text("Prix unitaire HT", 140, y);
    doc.text("Montant HT", 175, y);
    y += 3;
    doc.line(10, y, pageWidth - 10, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    for (const vr of variableRows) {
      checkPageBreak(7);
      const label = vr.periodeLabel || '';
      doc.text(cleanPdfText(label.substring(0, 68)), 14, y);
      doc.text(cleanPdfText(`${(vr.consoKw || 0).toFixed(2).replace('.', ',')} kWh`), 110, y);
      doc.text(cleanPdfText(`${(vr.tarifKwh || 0).toFixed(5).replace('.', ',')} €/kWh`), 140, y);
      doc.text(cleanPdfText(`${(vr.montantHT || 0).toFixed(2).replace('.', ',')} €`), 175, y);
      y += 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(cleanPdfText(`Sous-total Consommation HT (${totalConsoVariableTotale.toFixed(2).replace('.', ',')} kWh) :`), 75, y + 1);
    doc.text(cleanPdfText(`${totalPartVariableHT.toFixed(2).replace('.', ',')} € HT`), 175, y + 1);
    y += 8;

    // 3. Taxes & Contributions
    checkPageBreak(35);
    addSectionTitle("3. TAXES ET CONTRIBUTIONS RÉGLEMENTAIRES (HT)");

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text("Désignation de la taxe", 14, y);
    doc.text("Assiette", 110, y);
    doc.text("Taux", 145, y);
    doc.text("Montant HT", 175, y);
    y += 3;
    doc.line(10, y, pageWidth - 10, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    for (const tr of taxesRows) {
      checkPageBreak(7);
      const label = tr.designation || '';
      doc.text(cleanPdfText(label.substring(0, 65)), 14, y);
      doc.text(cleanPdfText(tr.assiette || ''), 110, y);
      doc.text(cleanPdfText(tr.taux || ''), 145, y);
      doc.text(cleanPdfText(`${(tr.montantHT || 0).toFixed(2).replace('.', ',')} €`), 175, y);
      y += 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(cleanPdfText(`Sous-total Taxes & Contributions HT :`), 100, y + 1);
    doc.text(cleanPdfText(`${totalTaxesHT.toFixed(2).replace('.', ',')} € HT`), 175, y + 1);
    y += 8;

    // 4. TVA
    checkPageBreak(35);
    addSectionTitle("4. TAXE SUR LA VALEUR AJOUTÉE (TVA)");

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text("Désignation de la TVA", 14, y);
    doc.text("Assiette HT", 110, y);
    doc.text("Taux TVA", 145, y);
    doc.text("Montant TVA", 175, y);
    y += 3;
    doc.line(10, y, pageWidth - 10, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);

    for (const tvr of tvaRows) {
      checkPageBreak(7);
      const label = tvr.designation || '';
      doc.text(cleanPdfText(label.substring(0, 65)), 14, y);
      doc.text(cleanPdfText(tvr.assiette || ''), 110, y);
      doc.text(cleanPdfText(tvr.taux || ''), 145, y);
      doc.text(cleanPdfText(`${(tvr.montantTVA || 0).toFixed(2).replace('.', ',')} €`), 175, y);
      y += 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(cleanPdfText(`Total TVA :`), 130, y + 1);
    doc.text(cleanPdfText(`${totalTvaMontant.toFixed(2).replace('.', ',')} €`), 175, y + 1);
    y += 10;

    // Pied de page
    checkPageBreak(20);
    doc.setDrawColor(203, 213, 225);
    doc.line(10, y, pageWidth - 10, y);
    y += 5;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text("Ce document est un relevé d'estimation de facture à titre indicatif calculé par l'application Gestion Budget Électricité.", 10, y);
    doc.text(cleanPdfText(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`), 10, y + 4);

    const fileName = `Estimation_Facture_${dateDebut}_au_${dateFin}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="space-y-6">
      {/* Bandeau de contrôle et sélection de la période */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-800 tracking-tight">
                Estimation de facture - Période de calcul
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Sélectionnez une période de début et de fin pour calculer la part fixe et estimer le coût de votre abonnement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!isValidInterval || nbJours === 0}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all border border-blue-700 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              title="Télécharger l'estimation au format PDF pour les dates sélectionnées"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger l'estimation</span>
            </button>

            <button
              type="button"
              onClick={() => setIsTurpeModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/90 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-bold transition-all border border-slate-200 cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
              <span>Valeurs TURPE</span>
            </button>
          </div>
        </div>

        {/* Formulaire des dates Début et Fin (jj/mm/aaaa) */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Champ Date Début */}
          <div>
            <label htmlFor="estim-date-debut" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Date de début (jj/mm/aaaa)
            </label>
            <div className="relative">
              <input
                id="estim-date-debut"
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 shadow-2xs"
              />
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              Format : {toFrenchDate(dateDebut) || 'JJ/MM/AAAA'}
            </div>
          </div>

          {/* Champ Date Fin */}
          <div>
            <label htmlFor="estim-date-fin" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Date de fin (jj/mm/aaaa)
            </label>
            <div className="relative">
              <input
                id="estim-date-fin"
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 shadow-2xs"
              />
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              Format : {toFrenchDate(dateFin) || 'JJ/MM/AAAA'}
            </div>
          </div>

          {/* Indicateur : Nombre de jours */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Durée calculée</span>
            <div className="text-sm font-mono font-bold text-slate-800 mt-0.5 flex items-baseline gap-1">
              <span>{isValidInterval ? nbJours : 0}</span>
              <span className="text-[11px] font-medium text-slate-500">jours</span>
            </div>
          </div>

          {/* Indicateur : Nombre de mois */}
          <div className="bg-blue-50/60 p-2.5 rounded-lg border border-blue-100 flex flex-col justify-center">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Nombre de mois</span>
            <div className="text-sm font-mono font-bold text-blue-900 mt-0.5 flex items-baseline gap-1">
              <span>{isValidInterval ? nbMois.toFixed(2).replace('.', ',') : '0,00'}</span>
              <span className="text-[11px] font-medium text-blue-600">mois</span>
            </div>
          </div>
        </div>

        {isValidInterval && isDateFinFuture && (
          <div className="mt-4 pt-3.5 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-200/80">
            <label htmlFor="checkbox-appliquer-hausse" className="flex items-center gap-3 cursor-pointer select-none">
              <input
                id="checkbox-appliquer-hausse"
                type="checkbox"
                checked={appliquerHausse}
                onChange={(e) => setAppliquerHausse(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer accent-purple-600 shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  Appliquer la hausse tarifaire
                </span>
                <span className="text-[11px] text-purple-800">
                  Simule la hausse de <strong className="font-bold">+{config.haussePrevue || 0}%</strong> (définie dans Configuration Contrat) sur les jours et mois estimés.
                </span>
              </div>
            </label>
            <div className="text-xs font-mono font-bold text-purple-800 bg-purple-100/90 px-3 py-1 rounded-lg border border-purple-200 shrink-0">
              {appliquerHausse ? `+${config.haussePrevue || 0}% appliqué sur le kWh` : 'Hausse non appliquée'}
            </div>
          </div>
        )}

        {!isValidInterval && (
          <div className="mt-3 p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>Veuillez sélectionner une date de début antérieure ou égale à la date de fin.</span>
          </div>
        )}

        {isValidInterval && hasPeriodeEstimee && (
          <div className="mt-3 p-3 bg-amber-50/90 text-amber-900 text-xs rounded-xl border border-amber-200/80 flex items-start gap-2.5 shadow-2xs">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-amber-950">Période estimée sans relevé de compteur :</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Les relevés enregistrés s'arrêtent au <strong>{toFrenchDate(dateDernierReleve)}</strong>. Les jours postérieurs sont automatiquement estimés mois par mois dans les tableaux ci-dessous (abonnements au prorata et consommations basées sur l'historique des années précédentes).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Carte d'indicateur Total facture en TTC sous l'encadré Estimation de facture - Période de calcul */}
      {(() => {
        const totalHTGlobal = totalPartFixeHT + totalPartVariableHT;
        const totalTTC = Math.round((totalHTGlobal + totalTaxesHT + totalTvaMontant) * 100) / 100;
        const nbPrelevements = config.nombrePrelevements || 10;
        const mensualiteTTC = Math.round((totalTTC / nbPrelevements) * 100) / 100;

        return (
          <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 p-5 rounded-2xl text-white shadow-md border border-blue-600/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                  Total facture en TTC
                </span>
                <span className="text-[11px] bg-white/15 text-blue-100 font-medium px-2 py-0.5 rounded-full">
                  Calcul automatique
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
                {totalTTC.toFixed(2).replace('.', ',')} € TTC
              </div>
              <div className="text-[11px] text-blue-200/90 font-mono">
                TOTAL HT ({totalHTGlobal.toFixed(2).replace('.', ',')} €) + TOTAL TAXES & CONTRIBUTIONS (HT) ({totalTaxesHT.toFixed(2).replace('.', ',')} €) + TOTAL TVA ({totalTvaMontant.toFixed(2).replace('.', ',')} €)
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-emerald-300 font-bold">Mensualité par mois :</span>
                <span className="font-mono font-extrabold text-xs sm:text-sm text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-lg border border-emerald-400/30">
                  {mensualiteTTC.toFixed(2).replace('.', ',')} € / mois
                </span>
                <span className="text-[10px] sm:text-[11px] text-blue-200/80">
                  ({nbPrelevements} prélèvements/an selon Configuration Contrat)
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={!isValidInterval || nbJours === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer border border-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger l'estimation PDF</span>
              </button>
              <div className="p-3 bg-white/10 rounded-xl border border-white/15 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
                <Receipt className="w-6 h-6 text-emerald-300" />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tableau Part Fixe */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Détail de la Part Fixe sur la période ({toFrenchDate(dateDebut)} au {toFrenchDate(dateFin)})</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Montants contractuels de l'abonnement calculés au prorata temporis du nombre de mois.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-1 rounded-full">
              {nbMois.toFixed(2).replace('.', ',')} mois facturés
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4 font-bold">Part Fixe</th>
                <th className="py-3 px-4 font-bold text-right">€/an</th>
                <th className="py-3 px-4 font-bold text-right">nb de mois</th>
                <th className="py-3 px-4 font-bold text-right">Montant en € HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs">
              {periodesSlices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    Aucune période à afficher pour les dates sélectionnées.
                  </td>
                </tr>
              ) : (
                periodesSlices.map((slice, idx) => (
                  <tr key={slice.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${slice.isEstime ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                        <span>{slice.isEstime ? 'Abonnement "ESTIMATIF"' : 'Abonnement'} du {toFrenchDate(slice.dateDebut)} au {toFrenchDate(slice.dateFin)}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 ml-4 mt-0.5">
                        {slice.isHistorique && slice.nom ? `${slice.nom} • ` : ''}
                        {slice.nbJours} jours • {slice.abonnementMensuel.toFixed(2).replace('.', ',')} €/mois HT{slice.isEstime ? ' • Période estimée sans relevé' : ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700">
                      {slice.aboAnnuel.toFixed(2).replace('.', ',')} €/an
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      {slice.nbMois.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {slice.montantHT.toFixed(2).replace('.', ',')} €
                    </td>
                  </tr>
                ))
              )}

              {/* Ligne : Total Part Fixe HT */}
              <tr className="bg-slate-50/80 font-bold border-t-2 border-slate-200">
                <td className="py-3.5 px-4 text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
                  <span>TOTAL PART FIXE (HT)</span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-slate-900">
                  {tarifAnnuelMoyen.toFixed(2).replace('.', ',')} €/an
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                  {totalNbMois.toFixed(2).replace('.', ',')}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-sm text-blue-700">
                  {totalPartFixeHT.toFixed(2).replace('.', ',')} € HT
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tableau Part Variable */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Part Variable ({toFrenchDate(dateDebut)} au {toFrenchDate(dateFin)})</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Consommations réelles en kWh valorisées selon les tarifs de chaque période historique ou contractuelle.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-full">
              {totalConsoVariableTotale.toLocaleString('fr-FR')} kWh consommés
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4 font-bold">Période</th>
                <th className="py-3 px-4 font-bold text-right">Nombres kW</th>
                <th className="py-3 px-4 font-bold text-right">Tarif € / kW</th>
                <th className="py-3 px-4 font-bold text-right">Montant € HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs">
              {variableRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    Aucune donnée de consommation disponible pour les dates sélectionnées.
                  </td>
                </tr>
              ) : (
                variableRows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          row.typePoste === 'HP' ? 'bg-amber-500' :
                          row.typePoste === 'HC' ? 'bg-indigo-500' : 'bg-emerald-500'
                        }`}></span>
                        <span>{row.periodeLabel}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 ml-4 mt-0.5">
                        {row.periodeDetails}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800">
                      {row.consoKw.toLocaleString('fr-FR')} kWh
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      {row.tarifKwh.toFixed(4).replace('.', ',')} € / kWh
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {row.montantHT.toFixed(2).replace('.', ',')} €
                    </td>
                  </tr>
                ))
              )}

              {/* Ligne : Total Part Variable HT */}
              <tr className="bg-slate-50/80 font-bold border-t-2 border-slate-200">
                <td className="py-3.5 px-4 text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
                  <span>TOTAL PART VARIABLE (HT)</span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-slate-900">
                  {totalConsoVariableTotale.toLocaleString('fr-FR')} kWh
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                  {totalConsoVariableTotale > 0 ? (totalPartVariableHT / totalConsoVariableTotale).toFixed(4).replace('.', ',') : '0,0000'} € / kWh
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-sm text-amber-700">
                  {totalPartVariableHT.toFixed(2).replace('.', ',')} € HT
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Encadré TOTAL HT */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Euro className="w-4 h-4 text-emerald-600" />
              <span>TOTAL HT ({toFrenchDate(dateDebut)} au {toFrenchDate(dateFin)})</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Somme cumulée de la Part Fixe (abonnements) et de la Part Variable (consommations d'énergie).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full font-mono">
              Total HT : {(totalPartFixeHT + totalPartVariableHT).toFixed(2).replace('.', ',')} €
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4 font-bold">Désignation</th>
                <th className="py-3 px-4 font-bold text-right">Détails / Base de calcul</th>
                <th className="py-3 px-4 font-bold text-right">Montant € HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs">
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>TOTAL PART FIXE (HT)</span>
                  </div>
                  <div className="text-[10px] text-slate-400 ml-4 mt-0.5">
                    Abonnement calculé au prorata temporis
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                  {totalNbMois.toFixed(2).replace('.', ',')} mois ({totalNbJours} jours)
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                  {totalPartFixeHT.toFixed(2).replace('.', ',')} €
                </td>
              </tr>

              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-slate-800 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>TOTAL PART VARIABLE (HT)</span>
                  </div>
                  <div className="text-[10px] text-slate-400 ml-4 mt-0.5">
                    Consommations valorisées aux tarifs unitaires du kWh
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                  {totalConsoVariableTotale.toLocaleString('fr-FR')} kWh consommés
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                  {totalPartVariableHT.toFixed(2).replace('.', ',')} €
                </td>
              </tr>

              {/* Ligne TOTAL HT */}
              <tr className="bg-emerald-50/70 font-bold border-t-2 border-emerald-200">
                <td className="py-4 px-4 text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  <span className="text-sm text-emerald-950 font-bold">TOTAL HT</span>
                </td>
                <td className="py-4 px-4 text-right font-mono text-slate-700 text-xs">
                  Part Fixe + Part Variable
                </td>
                <td className="py-4 px-4 text-right font-mono text-base text-emerald-800 font-extrabold">
                  {(totalPartFixeHT + totalPartVariableHT).toFixed(2).replace('.', ',')} € HT
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Encadré Taxes & contributions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Taxes & contributions ({toFrenchDate(dateDebut)} au {toFrenchDate(dateFin)})</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Accises (CSPE) et contributions applicables selon les périodes tarifaires sélectionnées.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-purple-100 text-purple-800 font-bold px-3 py-1 rounded-full font-mono">
              Total Taxes HT : {totalTaxesHT.toFixed(2).replace('.', ',')} €
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4 font-bold">Désignation</th>
                <th className="py-3 px-4 font-bold text-right">Assiette</th>
                <th className="py-3 px-4 font-bold text-right">Taux</th>
                <th className="py-3 px-4 font-bold text-right">Montant en €</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs">
              {taxesRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    Aucune taxe calculable pour la période sélectionnée.
                  </td>
                </tr>
              ) : (
                taxesRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${row.typeTaxe === 'CTA' ? 'bg-indigo-500' : 'bg-purple-500'}`}></span>
                        <span>{row.designation}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 ml-4 mt-0.5">
                        {row.details}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 font-semibold">
                      {row.assiette}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      {row.taux}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {row.montantHT.toFixed(2).replace('.', ',')} €
                    </td>
                  </tr>
                ))
              )}

              {/* Ligne TOTAL TAXES & CONTRIBUTIONS (HT) */}
              <tr className="bg-purple-50/60 font-bold border-t-2 border-purple-200">
                <td className="py-3.5 px-4 text-purple-950 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-700"></span>
                  <span className="font-bold">TOTAL TAXES & CONTRIBUTIONS (HT)</span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-purple-900 text-xs">
                  {totalConsoVariableTotale.toLocaleString('fr-FR')} kWh
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-purple-800 text-xs">
                  {totalConsoVariableTotale > 0 ? (totalTaxesHT / totalConsoVariableTotale).toFixed(4).replace('.', ',') : '0,0000'} € / kWh
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-sm text-purple-900 font-extrabold">
                  {totalTaxesHT.toFixed(2).replace('.', ',')} € HT
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Encadré Calcul TVA */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Percent className="w-4 h-4 text-emerald-600" />
              <span>Calcul TVA ({toFrenchDate(dateDebut)} au {toFrenchDate(dateFin)})</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Ventilation de la TVA sur l'abonnement, la CTA et l'énergie selon les taux applicables par période.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full font-mono">
              Total TVA : {totalTvaMontant.toFixed(2).replace('.', ',')} €
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4 font-bold">Désignation</th>
                <th className="py-3 px-4 font-bold text-right">Assiette</th>
                <th className="py-3 px-4 font-bold text-right">Taux</th>
                <th className="py-3 px-4 font-bold text-right">Montant en €</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs">
              {tvaRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    Aucun calcul de TVA disponible pour la période sélectionnée.
                  </td>
                </tr>
              ) : (
                tvaRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>{row.designation}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 ml-4 mt-0.5">
                        {row.details}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 font-semibold">
                      {row.assiette}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      {row.taux}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {row.montantTVA.toFixed(2).replace('.', ',')} €
                    </td>
                  </tr>
                ))
              )}

              {/* Ligne TOTAL TVA */}
              <tr className="bg-emerald-50/60 font-bold border-t-2 border-emerald-200">
                <td className="py-3.5 px-4 text-emerald-950 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-700"></span>
                  <span className="font-bold">TOTAL TVA</span>
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-emerald-900 text-xs">
                  Assiettes ventilées
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-emerald-800 text-xs">
                  TVA applicable
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-sm text-emerald-900 font-extrabold">
                  {totalTvaMontant.toFixed(2).replace('.', ',')} €
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Valeurs TURPE */}
      {isTurpeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Valeurs TURPE</h3>
                  <p className="text-[11px] text-slate-400">Paramètres et composantes du tarif d'acheminement</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTurpeModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content / 5 Champs */}
            <div className="p-5 space-y-4 text-xs">
              {/* Encadré Rappel */}
              <div className="p-3.5 bg-blue-50/80 text-blue-900 text-xs rounded-xl border border-blue-200/80 flex items-start gap-2.5 shadow-2xs">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-blue-950 uppercase tracking-wider text-[11px]">
                    Rappel
                  </span>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Pensez à mettre à jour les montants du TURPE tous les <strong>01/08</strong>. Vous pouvez consulter les barèmes à jour sur le site{' '}
                    <a
                      href="https://www.fournisseurs-electricite.com/contrat-electricite/prix/turpe"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline text-blue-700 hover:text-blue-900 transition-colors"
                    >
                      https://www.fournisseurs-electricite.com/contrat-electricite/prix/turpe
                    </a>.
                  </p>
                </div>
              </div>

              {/* Dates de la période TURPE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label htmlFor="turpe-input-debut" className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Date de début
                  </label>
                  <input
                    id="turpe-input-debut"
                    type="date"
                    value={turpeDebut}
                    onChange={(e) => setTurpeDebut(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="turpe-input-fin" className="block font-bold text-slate-700 uppercase tracking-wider mb-1 flex justify-between items-center">
                    <span>Date de fin</span>
                    <button
                      type="button"
                      onClick={() => setTurpeFin(turpeFin ? '' : new Date().toISOString().split('T')[0])}
                      className="text-[10px] text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      {turpeFin ? 'En cours' : 'Définir fin'}
                    </button>
                  </label>
                  <input
                    id="turpe-input-fin"
                    type="date"
                    value={turpeFin}
                    disabled={!turpeFin}
                    onChange={(e) => setTurpeFin(e.target.value)}
                    className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 ${!turpeFin ? 'opacity-40 bg-slate-100' : ''}`}
                  />
                </div>
              </div>

              {/* 1. Puissance souscrite */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  1. Puissance souscrite (en kVA)
                </label>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between font-mono">
                  <span className="text-slate-600">Configuration Contrat & tarifs</span>
                  <span className="font-bold text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded text-xs">
                    {config.puissance ?? 15} kVA
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Valeur automatiquement reprise du contrat ({config.puissance ?? 15} kVA).
                </p>
              </div>

              {/* 2. Composante de gestion (CG) */}
              <div>
                <label htmlFor="turpe-input-cg" className="block font-bold text-slate-700 uppercase tracking-wider mb-1 flex justify-between">
                  <span>2. Composante de gestion (CG)</span>
                  <span className="text-slate-400 font-mono">€ / an</span>
                </label>
                <div className="relative">
                  <DecimalInput
                    id="turpe-input-cg"
                    value={turpeCG}
                    onChange={(val) => setTurpeCG(val)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-mono text-xs">€/an</span>
                </div>
              </div>

              {/* 3. Composante de comptage (CC) */}
              <div>
                <label htmlFor="turpe-input-cc" className="block font-bold text-slate-700 uppercase tracking-wider mb-1 flex justify-between">
                  <span>3. Composante de comptage (CC)</span>
                  <span className="text-slate-400 font-mono">€ / an</span>
                </label>
                <div className="relative">
                  <DecimalInput
                    id="turpe-input-cc"
                    value={turpeCC}
                    onChange={(val) => setTurpeCC(val)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-mono text-xs">€/an</span>
                </div>
              </div>

              {/* 4. Part fixe de la composante de soutirage (CSF) */}
              <div>
                <label htmlFor="turpe-input-csf" className="block font-bold text-slate-700 uppercase tracking-wider mb-1 flex justify-between">
                  <span>4. Part fixe de la composante de soutirage (CSF)</span>
                  <span className="text-slate-400 font-mono">€ / kVA / an</span>
                </label>
                <div className="relative">
                  <DecimalInput
                    id="turpe-input-csf"
                    value={turpeCSF}
                    onChange={(val) => setTurpeCSF(val)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-mono text-xs">€/kVA/an</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  En courte utilisation.
                </p>
              </div>

              {/* 5. Calcul CSF (Automatique) */}
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-150 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-blue-900 uppercase tracking-wider text-[11px]">
                    5. Calcul CSF (automatique)
                  </span>
                  <span className="font-mono font-extrabold text-sm text-blue-800">
                    {((config.puissance ?? 15) * turpeCSF).toFixed(2).replace('.', ',')} € / an
                  </span>
                </div>
                <p className="text-[10px] text-blue-600 font-mono">
                  Puissance souscrite ({config.puissance ?? 15} kVA) × Part fixe CSF ({turpeCSF.toFixed(2).replace('.', ',')} €/kVA/an)
                </p>
              </div>

              {/* Encadré Formule de calcul de l'assiette CTA */}
              {(() => {
                const puissanceKva = config.puissance ?? 15;
                const calculCsfVal = puissanceKva * turpeCSF;
                const turpeFixeTotalAnnuel = turpeCG + turpeCC + calculCsfVal;
                const daysCount = nbJours > 0 ? nbJours : 365;
                const assietteCtaCalculee = (turpeFixeTotalAnnuel * daysCount) / 365;
                const assietteCtaParJour = turpeFixeTotalAnnuel / 365;

                return (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                      <Calculator className="w-4 h-4 text-emerald-600" />
                      <span>Formule de calcul</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-[11px] text-slate-700 space-y-1">
                      <div className="font-bold text-emerald-700">
                        ((CG + CC + Calcul CSF) / nombre de jours de la période/365 = assiette CTA)
                      </div>
                      <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                        = (({turpeCG.toFixed(2)} + {turpeCC.toFixed(2)} + {calculCsfVal.toFixed(2)}) €/an × {daysCount} j) / 365 j
                      </div>
                      <div className="text-xs font-bold text-slate-900 pt-1 flex justify-between">
                        <span>Assiette CTA estimée :</span>
                        <span className="font-mono text-emerald-800 font-extrabold">
                          {assietteCtaCalculee.toFixed(2).replace('.', ',')} €
                          <span className="text-[10px] font-normal text-slate-500 ml-1">
                            ({assietteCtaParJour.toFixed(4).replace('.', ',')} €/j)
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              {turpeSuccessMsg ? (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  {turpeSuccessMsg}
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">
                  Transférez ces paramètres dans le tableau Historique TURPE.
                </span>
              )}
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleSaveAndSendToTurpeHistory}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  Enregistrer et envoyer a l'historique
                </button>
                <button
                  type="button"
                  onClick={() => setIsTurpeModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
