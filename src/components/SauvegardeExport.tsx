/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  AlertCircle, 
  CheckCircle, 
  Info,
  Calendar,
  Layers,
  Settings,
  Globe,
  ExternalLink,
  Save,
  RotateCcw,
  Zap,
  Calculator,
  Receipt,
  Scale
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Releve, TarifConfig, TarifPeriode, TurpePeriode } from '../types';
import { exportFullBackupExcel } from '../utils/exportExcel';

interface UpdateSites {
  siteTurpe: string;
  siteCompteur: string;
  siteTarifs: string;
  siteTaxes: string;
}

const DEFAULT_SITES: UpdateSites = {
  siteTurpe: 'https://www.fournisseurs-electricite.com/contrat-electricite/prix/turpe',
  siteCompteur: 'https://mon-compte-client.enedis.fr',
  siteTarifs: 'https://www.cre.fr/electricite/tarifs-reglementes-de-vente',
  siteTaxes: 'https://www.service-public.fr/particuliers/vosdroits/F31557',
};

interface SauvegardeExportProps {
  releves: Releve[];
  config: TarifConfig;
  onImportData: (releves: Releve[], config: TarifConfig) => void;
  triggerToast: (msg: string) => void;
}

export default function SauvegardeExport({ releves, config, onImportData, triggerToast }: SauvegardeExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [mergeMode, setMergeMode] = useState(true);

  // Sous-onglet dans Sauvegarde & Export
  const [subTab, setSubTab] = useState<'backup' | 'sites'>('backup');

  // Sites de mise à jour persistant dans localStorage
  const [updateSites, setUpdateSites] = useState<UpdateSites>(() => {
    try {
      const saved = localStorage.getItem('elec_budget_update_sites');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          siteTurpe: parsed.siteTurpe || DEFAULT_SITES.siteTurpe,
          siteCompteur: parsed.siteCompteur || DEFAULT_SITES.siteCompteur,
          siteTarifs: parsed.siteTarifs || DEFAULT_SITES.siteTarifs,
          siteTaxes: parsed.siteTaxes || DEFAULT_SITES.siteTaxes,
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
      triggerToast('Sites de mise à jour enregistrés avec succès !');
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetSites = () => {
    setUpdateSites(DEFAULT_SITES);
    try {
      localStorage.setItem('elec_budget_update_sites', JSON.stringify(DEFAULT_SITES));
      triggerToast('Adresses des sites réinitialisées par défaut !');
    } catch (e) {
      console.error(e);
    }
  };

  // Helper pour parser tous les types de dates d'Excel (chaîne, format FR, ou nombre de série)
  const parseExcelDate = (val: any): string => {
    if (val === undefined || val === null || val === '') return '';
    
    // Si c'est un nombre (date de série Excel)
    const num = Number(val);
    if (!isNaN(num) && typeof val !== 'string') {
      // Ajustement pour le bug bissextile de 1900 d'Excel et le décalage temporel
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    
    const str = String(val).trim();
    if (!str) return '';
    
    // Si format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    
    // Si format DD/MM/YYYY
    const partsFr = str.split('/');
    if (partsFr.length === 3) {
      const d = partsFr[0].padStart(2, '0');
      const m = partsFr[1].padStart(2, '0');
      let y = partsFr[2];
      if (y.length === 2) {
        y = '20' + y;
      }
      return `${y}-${m}-${d}`;
    }

    // Tenter de parser comme date JS standard
    const parsedDate = new Date(str);
    if (!isNaN(parsedDate.getTime())) {
      const y = parsedDate.getFullYear();
      const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const d = String(parsedDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    
    return str;
  };

  const handleExportExcel = () => {
    exportFullBackupExcel(releves, config, triggerToast);
  };

  const handleImportExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Nouvel état importé
        let importedConfig: Partial<TarifConfig> = { taxes: {} as any };
        let importedPeriodes: TarifPeriode[] = [];
        let importedPeriodesTurpe: TurpePeriode[] = [];
        let importedReleves: Releve[] = [];
        let hasConfigSheet = false;

        // 1. Parser l'onglet "Configuration Contrat"
        const configSheet = workbook.Sheets["Configuration Contrat"] || workbook.Sheets["Configuration & Tarifs"];
        if (configSheet) {
          hasConfigSheet = true;
          const configJson = XLSX.utils.sheet_to_json<any[]>(configSheet, { header: 1 });
          let parsingPeriods = false;

          for (let r = 0; r < configJson.length; r++) {
            const row = configJson[r];
            if (!row || row.length === 0) continue;

            const cellA = String(row[0] || '').trim();

            if (cellA.includes("HISTORIQUE DES PÉRIODES")) {
              parsingPeriods = true;
              continue;
            }

            if (!parsingPeriods) {
              const val = row[1];
              if (cellA.startsWith("Type de Tarif")) {
                importedConfig.type = (String(val).toUpperCase() === 'BASE' ? 'BASE' : 'HP_HC');
              } else if (cellA.startsWith("Puissance")) {
                importedConfig.puissance = parseInt(val, 10) || 15;
              } else if (cellA.startsWith("Abonnement Mensuel")) {
                importedConfig.abonnementMensuel = parseFloat(val) || 0;
              } else if (cellA.startsWith("Date Début")) {
                importedConfig.debut = parseExcelDate(val);
              } else if (cellA.startsWith("Date Fin")) {
                importedConfig.fin = parseExcelDate(val);
              } else if (cellA.startsWith("Heure Début HC")) {
                importedConfig.heureDebutHC = String(val).trim();
              } else if (cellA.startsWith("Heure Fin HC")) {
                importedConfig.heureFinHC = String(val).trim();
              } else if (cellA.startsWith("Prix kWh Base")) {
                importedConfig.prixKwhBase = parseFloat(val) || 0;
              } else if (cellA.startsWith("Prix kWh HP")) {
                importedConfig.prixKwhHP = parseFloat(val) || 0;
              } else if (cellA.startsWith("Prix kWh HC")) {
                importedConfig.prixKwhHC = parseFloat(val) || 0;
              } else if (cellA.startsWith("CTA (Acheminement)")) {
                if (!importedConfig.taxes) importedConfig.taxes = {} as any;
                importedConfig.taxes.cta = parseFloat(val) || 0;
              } else if (cellA.startsWith("Type de CTA")) {
                if (!importedConfig.taxes) importedConfig.taxes = {} as any;
                importedConfig.taxes.ctaType = val as any;
              } else if (cellA.startsWith("CSPE (Accise)")) {
                if (!importedConfig.taxes) importedConfig.taxes = {} as any;
                importedConfig.taxes.cspe = parseFloat(val) || 0;
              } else if (cellA.startsWith("Type de CSPE")) {
                if (!importedConfig.taxes) importedConfig.taxes = {} as any;
                importedConfig.taxes.cspeType = val as any;
              } else if (cellA.startsWith("TVA Réduite")) {
                if (!importedConfig.taxes) importedConfig.taxes = {} as any;
                importedConfig.taxes.tvaReduite = parseFloat(val) || 0;
              } else if (cellA.startsWith("TVA Normale")) {
                if (!importedConfig.taxes) importedConfig.taxes = {} as any;
                importedConfig.taxes.tvaNormale = parseFloat(val) || 0;
              } else if (cellA.startsWith("Hausse Prévue")) {
                importedConfig.haussePrevue = parseFloat(val) || 0;
              }
            } else {
              // Mode historique des périodes
              if (cellA === "Nom de la Période" || cellA.startsWith("Nom")) {
                continue;
              }
              if (row.length >= 2) {
                const pNom = String(row[0] || '').trim();
                if (pNom && !pNom.startsWith("HISTORIQUE") && !pNom.startsWith("Nom de la Période")) {
                  importedPeriodes.push({
                    id: `p_imp_${r}_${Date.now()}`,
                    nom: pNom,
                    debut: parseExcelDate(row[1]),
                    fin: parseExcelDate(row[2]) || '',
                    prixKwhBase: parseFloat(row[3]) || 0,
                    prixKwhHP: parseFloat(row[4]) || 0,
                    prixKwhHC: parseFloat(row[5]) || 0,
                    abonnementMensuel: parseFloat(row[6]) || 0,
                    cta: row[7] !== undefined && row[7] !== '' ? parseFloat(row[7]) : undefined,
                    ctaType: row[8] || undefined,
                    cspe: row[9] !== undefined && row[9] !== '' ? parseFloat(row[9]) : undefined,
                    cspeType: row[10] || undefined,
                    tvaReduite: row[11] !== undefined && row[11] !== '' ? parseFloat(row[11]) : undefined,
                    tvaNormale: row[12] !== undefined && row[12] !== '' ? parseFloat(row[12]) : undefined
                  });
                }
              }
            }
          }
        }

        // 2. Parser l'onglet "Historique TURPE"
        const turpeSheet = workbook.Sheets["Historique TURPE"] || workbook.Sheets["TURPE"];
        let importedTurpeValues: any = {};

        if (turpeSheet) {
          hasConfigSheet = true;
          const turpeJson = XLSX.utils.sheet_to_json<any[]>(turpeSheet, { header: 1 });
          let parsingTurpeHistory = false;

          for (let r = 0; r < turpeJson.length; r++) {
            const row = turpeJson[r];
            if (!row || row.length === 0) continue;

            const cellA = String(row[0] || '').trim();

            if (cellA.includes("HISTORIQUE TURPE")) {
              parsingTurpeHistory = true;
              continue;
            }

            if (!parsingTurpeHistory) {
              const val = row[1];
              if (cellA.includes("Composante de Gestion")) {
                importedTurpeValues.turpeCG = parseFloat(val) || 25.68;
              } else if (cellA.includes("Composante de Comptage")) {
                importedTurpeValues.turpeCC = parseFloat(val) || 23.28;
              } else if (cellA.includes("Part fixe Soutirage")) {
                importedTurpeValues.turpeCSF = parseFloat(val) || 10.80;
              } else if (cellA.includes("Date de début TURPE")) {
                importedTurpeValues.turpeDebut = parseExcelDate(val);
              } else if (cellA.includes("Date de fin TURPE")) {
                importedTurpeValues.turpeFin = parseExcelDate(val);
              }
            } else {
              // Mode Historique TURPE
              if (cellA === "Date de début" || cellA.startsWith("Date de d")) {
                continue;
              }
              if (row.length >= 3) {
                const dDebut = parseExcelDate(row[0]);
                if (dDebut && !dDebut.toLowerCase().startsWith("date")) {
                  importedPeriodesTurpe.push({
                    id: `turpe_imp_${r}_${Date.now()}`,
                    debut: dDebut,
                    fin: parseExcelDate(row[1]) || '',
                    puissance: parseFloat(row[2]) || 15,
                    turpeCG: parseFloat(row[3]) || 25.68,
                    turpeCC: parseFloat(row[4]) || 23.28,
                    turpeCSF: parseFloat(row[5]) || 10.80,
                  });
                }
              }
            }
          }

          // Enregistrer les valeurs actuelles du modal TURPE
          if (Object.keys(importedTurpeValues).length > 0) {
            try {
              const saved = localStorage.getItem('elec_budget_turpe_values');
              const existing = saved ? JSON.parse(saved) : {};
              const newTurpeVals = { ...existing, ...importedTurpeValues };
              localStorage.setItem('elec_budget_turpe_values', JSON.stringify(newTurpeVals));
            } catch (e) {
              console.error(e);
            }
          }
        }

        // 3. Parser l'onglet "Sites & Notes de Mise à Jour"
        const sitesSheet = workbook.Sheets["Sites & Notes de Mise à Jour"] || workbook.Sheets["Sites & Notes"] || workbook.Sheets["Sites de Mise à Jour"] || workbook.Sheets["Sites"];
        if (sitesSheet) {
          hasConfigSheet = true;
          const sitesJson = XLSX.utils.sheet_to_json<any[]>(sitesSheet, { header: 1 });
          const updatedSitesObj: any = { ...updateSites };

          for (let r = 0; r < sitesJson.length; r++) {
            const row = sitesJson[r];
            if (!row || row.length < 3) continue;

            const catOrKey = String(row[0] || '').trim();
            const key = String(row[1] || '').trim();
            const url = String(row[2] || '').trim();
            const note = row[3] !== undefined ? String(row[3]).trim() : '';

            if (key === 'siteTurpe' || catOrKey.includes('TURPE')) {
              if (url && url.startsWith('http')) updatedSitesObj.siteTurpe = url;
              updatedSitesObj.noteTurpe = note;
            } else if (key === 'siteCompteur' || catOrKey.includes('Compteur')) {
              if (url && url.startsWith('http')) updatedSitesObj.siteCompteur = url;
              updatedSitesObj.noteCompteur = note;
            } else if (key === 'siteTarifs' || catOrKey.includes('Réglementés')) {
              if (url && url.startsWith('http')) updatedSitesObj.siteTarifs = url;
              updatedSitesObj.noteTarifs = note;
            } else if (key === 'siteTaxes' || catOrKey.includes('Taxes')) {
              if (url && url.startsWith('http')) updatedSitesObj.siteTaxes = url;
              updatedSitesObj.noteTaxes = note;
            } else if (key === 'siteFacture' || catOrKey.includes('Facture')) {
              if (url && url.startsWith('http')) updatedSitesObj.siteFacture = url;
              updatedSitesObj.noteFacture = note;
            }
          }

          setUpdateSites(updatedSitesObj);
          try {
            localStorage.setItem('elec_budget_update_sites', JSON.stringify(updatedSitesObj));
          } catch (e) {
            console.error(e);
          }
        }

        // 4. Parser l'onglet "Saisie des relevés" (gérer accents ou absence)
        const relevesSheet = workbook.Sheets["Saisie des relevés"] || workbook.Sheets["Saisie des releves"];
        if (relevesSheet) {
          const relevesJson = XLSX.utils.sheet_to_json<any[]>(relevesSheet, { header: 1 });
          
          let headerIndex = -1;
          for (let r = 0; r < relevesJson.length; r++) {
            const row = relevesJson[r];
            if (!row) continue;
            
            const hasDate = row.some(c => String(c || '').toLowerCase().includes("date"));
            const hasHP = row.some(c => String(c || '').toLowerCase().includes("hp index") || String(c || '').toLowerCase().includes("hp_index"));
            if (hasDate || hasHP) {
              headerIndex = r;
              break;
            }
          }

          if (headerIndex !== -1) {
            const headers = relevesJson[headerIndex].map(h => String(h || '').trim().toLowerCase());
            
            const dateCol = headers.indexOf("date");
            const hcIndexCol = headers.findIndex(h => h.includes("hc index") || h.includes("hc_index") || h.includes("index hc") || h.includes("indexhc"));
            const hpIndexCol = headers.findIndex(h => h.includes("hp index") || h.includes("hp_index") || h.includes("index hp") || h.includes("indexhp") || h.includes("index unique") || h.includes("index_hp"));
            const commCol = headers.findIndex(h => h.includes("commentaire") || h.includes("commentaires") || h.includes("notes") || h.includes("note"));

            for (let r = headerIndex + 1; r < relevesJson.length; r++) {
              const row = relevesJson[r];
              if (!row || row.length === 0) continue;

              const rawDate = dateCol !== -1 ? row[dateCol] : undefined;
              if (rawDate === undefined || rawDate === null || rawDate === '') continue;

              const parsedDate = parseExcelDate(rawDate);
              if (!parsedDate) continue;

              const indexHP = hpIndexCol !== -1 ? parseFloat(row[hpIndexCol]) : 0;
              const indexHC = hcIndexCol !== -1 ? parseFloat(row[hcIndexCol]) : 0;
              const commentaire = commCol !== -1 && row[commCol] ? String(row[commCol]).trim() : undefined;

              if (!isNaN(indexHP)) {
                importedReleves.push({
                  id: `r_imp_${r}_${Date.now()}`,
                  date: parsedDate,
                  indexHP,
                  indexHC: isNaN(indexHC) ? 0 : indexHC,
                  commentaire
                });
              }
            }
          }
        }

        // Valider l'importation minimum
        if (importedReleves.length === 0 && !hasConfigSheet) {
          setImportStatus({
            success: false,
            message: "Aucun relevé ni configuration valide n'a pu être extrait. Veuillez utiliser le modèle généré par l'application."
          });
          return;
        }

        // Compléter la configuration avec les valeurs d'origine pour éviter les champs undefined
        const finalConfig: TarifConfig = {
          type: importedConfig.type || config.type,
          puissance: importedConfig.puissance !== undefined ? importedConfig.puissance : (config.puissance || 15),
          prixKwhBase: importedConfig.prixKwhBase !== undefined ? importedConfig.prixKwhBase : config.prixKwhBase,
          prixKwhHP: importedConfig.prixKwhHP !== undefined ? importedConfig.prixKwhHP : config.prixKwhHP,
          prixKwhHC: importedConfig.prixKwhHC !== undefined ? importedConfig.prixKwhHC : config.prixKwhHC,
          abonnementMensuel: importedConfig.abonnementMensuel !== undefined ? importedConfig.abonnementMensuel : config.abonnementMensuel,
          debut: importedConfig.debut || config.debut,
          fin: importedConfig.fin || config.fin,
          heureDebutHC: importedConfig.heureDebutHC || config.heureDebutHC,
          heureFinHC: importedConfig.heureFinHC || config.heureFinHC,
          haussePrevue: importedConfig.haussePrevue !== undefined ? importedConfig.haussePrevue : config.haussePrevue,
          taxes: {
            cta: importedConfig.taxes?.cta !== undefined ? importedConfig.taxes.cta : config.taxes.cta,
            cspe: importedConfig.taxes?.cspe !== undefined ? importedConfig.taxes.cspe : config.taxes.cspe,
            tvaReduite: importedConfig.taxes?.tvaReduite !== undefined ? importedConfig.taxes.tvaReduite : config.taxes.tvaReduite,
            tvaNormale: importedConfig.taxes?.tvaNormale !== undefined ? importedConfig.taxes.tvaNormale : config.taxes.tvaNormale,
            ctaType: importedConfig.taxes?.ctaType || config.taxes.ctaType,
            cspeType: importedConfig.taxes?.cspeType || config.taxes.cspeType
          },
          periodes: importedPeriodes.length > 0 ? importedPeriodes : (config.periodes || []),
          periodesTurpe: importedPeriodesTurpe.length > 0 ? importedPeriodesTurpe : (config.periodesTurpe || [])
        };

        let finalReleves = [...releves];

        if (importedReleves.length > 0) {
          if (mergeMode) {
            // Fusionner sans doublon de date
            const map = new Map<string, Releve>();
            // Ajouter d'abord les relevés existants
            releves.forEach(r => map.set(r.date, r));
            // Ajouter / écraser avec les relevés importés
            importedReleves.forEach(r => {
              const existing = map.get(r.date);
              if (existing) {
                map.set(r.date, {
                  ...existing,
                  indexHP: r.indexHP,
                  indexHC: r.indexHC,
                  commentaire: r.commentaire !== undefined ? r.commentaire : existing.commentaire
                });
              } else {
                map.set(r.date, r);
              }
            });
            finalReleves = Array.from(map.values());
          } else {
            // Remplacer complètement
            finalReleves = importedReleves;
          }
        }

        // Trier les relevés par date chronologique
        finalReleves.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Effectuer l'importation réelle
        onImportData(finalReleves, finalConfig);
        
        // Déterminer le message de statut
        let msg = "";
        if (hasConfigSheet && importedReleves.length > 0) {
          msg = `Données importées avec succès ! La configuration du contrat a été mise à jour et ${importedReleves.length} relevé(s) ont été importés (mode : ${mergeMode ? 'fusion à la suite' : 'remplacement'}).`;
        } else if (importedReleves.length > 0) {
          msg = `Relevés importés avec succès ! ${importedReleves.length} relevé(s) ont été importés (mode : ${mergeMode ? 'fusion à la suite' : 'remplacement'}). La configuration du contrat est restée inchangée.`;
        } else if (hasConfigSheet) {
          msg = "Configuration du contrat importée avec succès ! Aucun relevé n'a été trouvé dans le fichier.";
        }

        setImportStatus({
          success: true,
          message: msg
        });
        triggerToast('Données Excel importées avec succès !');

      } catch (err) {
        console.error(err);
        setImportStatus({
          success: false,
          message: "Une erreur est survenue lors de l'analyse du fichier. Vérifiez le format."
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImportExcel(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImportExcel(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation entre sous-onglets : Sauvegarde & Export vs Site de mise à jour */}
      <div className="flex border-b border-slate-200 gap-2 pb-px">
        <button
          type="button"
          onClick={() => setSubTab('backup')}
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wide flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            subTab === 'backup'
              ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-2xs border-t border-x border-slate-200'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 rounded-t-xl'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Sauvegarde & Exportation</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('sites')}
          className={`px-4 py-2.5 font-bold text-xs uppercase tracking-wide flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            subTab === 'sites'
              ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl shadow-2xs border-t border-x border-slate-200'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60 rounded-t-xl'
          }`}
        >
          <Globe className="w-4 h-4 text-blue-600" />
          <span>Site de mise à jour</span>
        </button>
      </div>

      {subTab === 'backup' ? (
        <div className="space-y-8">
          {/* Introduction Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-md font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Sauvegarde, Export et Import complet
            </h2>
            <p className="text-slate-500 text-xs leading-relaxed max-w-3xl">
              Sécurisez vos données en exportant l'intégralité de l'application dans un unique fichier Excel multi-onglets. 
              Vous pouvez modifier vos relevés ou vos tarifs directement dans Excel puis réimporter le fichier pour mettre à jour instantanément VoltTrack.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Colonne 1: Export */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-950 mb-4 font-mono uppercase tracking-wider flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-600" />
                  Exporter vers Excel
                </h3>
                
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  Génère un fichier de sauvegarde standardisé au format <strong className="text-slate-700">.xlsx</strong> contenant deux onglets structurés :
                </p>

                <div className="space-y-4 mb-8">
                  <div className="flex gap-3">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0 h-fit">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">Onglet 1 : Configuration Contrat</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Contient l'ensemble des paramètres de facturation (tarifs d'énergie actuels, taxes, TVA, mode de calcul) ainsi que l'historique complet des périodes tarifaires et des abonnements.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg shrink-0 h-fit">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">Onglet 2 : Saisie des relevés</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Contient l'historique chronologique de vos relevés de compteur configuré dans l'ordre de colonnes demandé : 
                        <span className="font-mono bg-slate-50 border border-slate-100 rounded px-1 text-slate-600 ml-1">date / Conso HC / HC index / Conso HP / HP Index / Commentaire</span>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                id="btn-export-excel"
                onClick={handleExportExcel}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Télécharger la sauvegarde Excel
              </button>
            </div>

            {/* Colonne 2: Import */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-950 mb-4 font-mono uppercase tracking-wider flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  Importer depuis Excel
                </h3>
                
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Sélectionnez ou glissez le fichier Excel pour recharger vos données de relevés, de tarifs ou les deux à la fois.
                </p>

                {/* Option de fusion ou remplacement */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mb-5">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={mergeMode}
                      onChange={(e) => setMergeMode(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800">Ajouter à la suite des relevés existants</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                        Décochez cette case si vous souhaitez remplacer l'intégralité des relevés actuels par ceux du fichier Excel. Cochée, elle fusionne les listes sans écraser les dates différentes.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Zone de Drag and Drop */}
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px] ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50/50' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".xlsx" 
                    onChange={onFileChange}
                    className="hidden" 
                  />
                  <FileSpreadsheet className={`w-8 h-8 mb-2.5 ${dragActive ? 'text-blue-500' : 'text-slate-400'}`} />
                  <p className="text-xs font-bold text-slate-700">Glissez-déposez votre fichier .xlsx</p>
                  <p className="text-[10px] text-slate-400 mt-1">Ou cliquez pour parcourir vos fichiers</p>
                </div>

                {/* Statut de l'import */}
                {importStatus && (
                  <div className={`mt-4 p-3 rounded-lg border text-xs flex gap-2.5 items-start ${
                    importStatus.success 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-red-50 text-red-800 border-red-200'
                  }`}>
                    {importStatus.success ? (
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    )}
                    <span>{importStatus.message}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2.5 items-start text-[10px] text-slate-400 leading-relaxed font-medium">
                <Info className="w-4 h-4 shrink-0 text-slate-400" />
                <span>
                  Astuce : Pour un import optimal, conservez la structure de l'export d'origine. Les formats de dates reconnus sont l'ISO (AAAA-MM-JJ), le format français (JJ/MM/AAAA) et le format natif d'Excel.
                </span>
              </div>
            </div>
          </div>

          {/* Spécification de format technique */}
          <div className="bg-slate-100/50 border border-slate-200 rounded-xl p-5">
            <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider font-mono mb-3">
              Spécification de l'ordre des colonnes des relevés (Onglet "Saisie des relevés")
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px] font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold">
                    <th className="pb-2">Colonne A</th>
                    <th className="pb-2">Colonne B</th>
                    <th className="pb-2">Colonne C</th>
                    <th className="pb-2">Colonne D</th>
                    <th className="pb-2">Colonne E</th>
                    <th className="pb-2">Colonne F</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-slate-800 font-bold">
                    <td className="py-2">date</td>
                    <td className="py-2 text-blue-600">Conso HC</td>
                    <td className="py-2">HC index</td>
                    <td className="py-2 text-purple-600">Conso HP</td>
                    <td className="py-2">HP Index</td>
                    <td className="py-2 text-slate-400">Commentaire</td>
                  </tr>
                  <tr className="text-slate-500">
                    <td className="py-1">2025-08-01</td>
                    <td className="py-1">120</td>
                    <td className="py-1">8120</td>
                    <td className="py-1">180</td>
                    <td className="py-1">12180</td>
                    <td className="py-1">Relevé été</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Page / Sous-onglet "Site de mise a jour" */
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
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <a
                  href={updateSites.siteTurpe}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-blue-200/60"
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
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <a
                  href={updateSites.siteCompteur}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-amber-200/60"
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
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <a
                  href={updateSites.siteTarifs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-purple-200/60"
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
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <a
                  href={updateSites.siteTaxes}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-200/60"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Consulter les taxes</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
