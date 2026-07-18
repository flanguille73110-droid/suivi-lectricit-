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
  Settings
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Releve, TarifConfig, TarifPeriode } from '../types';

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
    try {
      const wb = XLSX.utils.book_new();

      // --- ONGLET 1 : CONFIGURATION CONTRAT ---
      const configRows: any[][] = [
        ["CONFIGURATION DU CONTRAT & TARIFS"],
        [],
        ["Paramètre", "Valeur", "Unité", "Description"],
        ["Type de Tarif", config.type, "", "Option tarifaire active (BASE ou HP_HC)"],
        ["Abonnement Mensuel", config.abonnementMensuel, "€/mois", "Montant de l'abonnement HT actuel"],
        ["Date Début", config.debut || "", "YYYY-MM-DD", "Début de la période actuelle"],
        ["Date Fin", config.fin || "", "YYYY-MM-DD", "Fin de la période actuelle (laisser vide si en cours)"],
        ["Prix kWh Base", config.prixKwhBase, "€/kWh", "Prix HT du kWh Base"],
        ["Prix kWh HP", config.prixKwhHP, "€/kWh", "Prix HT du kWh Heures Pleines"],
        ["Prix kWh HC", config.prixKwhHC, "€/kWh", "Prix HT du kWh Heures Creuses"],
        ["CTA (Acheminement)", config.taxes.cta, "", "Contribution Tarifaire d'Acheminement actuelle"],
        ["Type de CTA", config.taxes.ctaType || "pourcentage", "", "Mode de calcul de la CTA (mensuel, annuel, pourcentage)"],
        ["CSPE (Accise)", config.taxes.cspe, "€/kWh", "Accise sur l'électricité / TICFE actuelle"],
        ["Type de CSPE", config.taxes.cspeType || "par_kwh", "", "Mode de calcul de la CSPE (par_kwh, annuel, pourcentage)"],
        ["TVA Réduite", config.taxes.tvaReduite, "%", "TVA sur l'abonnement et la CTA"],
        ["TVA Normale", config.taxes.tvaNormale, "%", "TVA sur la consommation et la CSPE"],
        ["Hausse Prévue", config.haussePrevue, "%", "Simulation de hausse pour le budget prévisionnel"],
        [],
        ["HISTORIQUE DES PÉRIODES DE TARIFS & ABONNEMENTS"],
        [],
        [
          "Nom de la Période", 
          "Date Début", 
          "Date Fin", 
          "Prix kWh Base", 
          "Prix kWh HP", 
          "Prix kWh HC", 
          "Abonnement Mensuel", 
          "CTA", 
          "Type CTA", 
          "CSPE", 
          "Type CSPE"
        ]
      ];

      // Ajouter l'historique des périodes
      if (config.periodes && config.periodes.length > 0) {
        config.periodes.forEach(p => {
          configRows.push([
            p.nom,
            p.debut,
            p.fin || "",
            p.prixKwhBase,
            p.prixKwhHP,
            p.prixKwhHC,
            p.abonnementMensuel,
            p.cta !== undefined ? p.cta : "",
            p.ctaType || "",
            p.cspe !== undefined ? p.cspe : "",
            p.cspeType || ""
          ]);
        });
      }

      const wsConfig = XLSX.utils.aoa_to_sheet(configRows);
      
      // Ajustement cosmétique de la largeur des colonnes
      wsConfig['!cols'] = [
        { wch: 30 }, // Paramètre / Nom de la Période
        { wch: 15 }, // Valeur / Date Début
        { wch: 15 }, // Unité / Date Fin
        { wch: 15 }, // Description / Prix kWh Base
        { wch: 15 }, // Prix HP
        { wch: 15 }, // Prix HC
        { wch: 20 }, // Abonnement
        { wch: 10 }, // CTA
        { wch: 12 }, // Type CTA
        { wch: 10 }, // CSPE
        { wch: 12 }  // Type CSPE
      ];

      XLSX.utils.book_append_sheet(wb, wsConfig, "Configuration Contrat");

      // --- ONGLET 2 : SAISIE DES RELEVÉS ---
      // Colonnes dans l'ordre EXACT demandé : date / Conso HC / HC index / Conso HP / HP Index / Commentaire
      const releveRows: any[][] = [
        ["Saisie des relevés : historique des relevés du compteur"],
        [],
        ["date", "Conso HC", "HC index", "Conso HP", "HP Index", "Commentaire"]
      ];

      // Trier par ordre chronologique pour calculer la consommation
      const chronologiques = [...releves].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      chronologiques.forEach((releve, index) => {
        const precedentChrono = index > 0 ? chronologiques[index - 1] : undefined;
        
        const evoHP = precedentChrono !== undefined ? Math.max(0, releve.indexHP - precedentChrono.indexHP) : 0;
        const evoHC = config.type === 'HP_HC' && precedentChrono !== undefined ? Math.max(0, releve.indexHC - precedentChrono.indexHC) : 0;
        
        releveRows.push([
          releve.date,
          config.type === 'HP_HC' ? evoHC : 0,
          releve.indexHC,
          evoHP,
          releve.indexHP,
          releve.commentaire || ""
        ]);
      });

      const wsReleves = XLSX.utils.aoa_to_sheet(releveRows);
      
      // Ajustement des largeurs
      wsReleves['!cols'] = [
        { wch: 15 }, // date
        { wch: 15 }, // Conso HC
        { wch: 15 }, // HC index
        { wch: 15 }, // Conso HP
        { wch: 15 }, // HP Index
        { wch: 30 }  // Commentaire
      ];

      XLSX.utils.book_append_sheet(wb, wsReleves, "Saisie des relevés");

      // Générer le fichier
      XLSX.writeFile(wb, "VoltTrack_Sauvegarde_Export.xlsx");
      triggerToast('Exportation Excel réussie !');
    } catch (err) {
      console.error(err);
      triggerToast("Erreur lors de l'exportation.");
    }
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
        let importedReleves: Releve[] = [];
        let hasConfigSheet = false;

        // 1. Parser l'onglet "Configuration Contrat"
        const configSheet = workbook.Sheets["Configuration Contrat"];
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
              } else if (cellA.startsWith("Abonnement Mensuel")) {
                importedConfig.abonnementMensuel = parseFloat(val) || 0;
              } else if (cellA.startsWith("Date Début")) {
                importedConfig.debut = parseExcelDate(val);
              } else if (cellA.startsWith("Date Fin")) {
                importedConfig.fin = parseExcelDate(val);
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
              // Ignorer l'en-tête de la table des périodes
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
                    cspeType: row[10] || undefined
                  });
                }
              }
            }
          }
        }

        // 2. Parser l'onglet "Saisie des relevés" (gérer accents ou absence)
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
          prixKwhBase: importedConfig.prixKwhBase !== undefined ? importedConfig.prixKwhBase : config.prixKwhBase,
          prixKwhHP: importedConfig.prixKwhHP !== undefined ? importedConfig.prixKwhHP : config.prixKwhHP,
          prixKwhHC: importedConfig.prixKwhHC !== undefined ? importedConfig.prixKwhHC : config.prixKwhHC,
          abonnementMensuel: importedConfig.abonnementMensuel !== undefined ? importedConfig.abonnementMensuel : config.abonnementMensuel,
          debut: importedConfig.debut || config.debut,
          fin: importedConfig.fin || config.fin,
          haussePrevue: importedConfig.haussePrevue !== undefined ? importedConfig.haussePrevue : config.haussePrevue,
          taxes: {
            cta: importedConfig.taxes?.cta !== undefined ? importedConfig.taxes.cta : config.taxes.cta,
            cspe: importedConfig.taxes?.cspe !== undefined ? importedConfig.taxes.cspe : config.taxes.cspe,
            tvaReduite: importedConfig.taxes?.tvaReduite !== undefined ? importedConfig.taxes.tvaReduite : config.taxes.tvaReduite,
            tvaNormale: importedConfig.taxes?.tvaNormale !== undefined ? importedConfig.taxes.tvaNormale : config.taxes.tvaNormale,
            ctaType: importedConfig.taxes?.ctaType || config.taxes.ctaType,
            cspeType: importedConfig.taxes?.cspeType || config.taxes.cspeType
          },
          periodes: importedPeriodes.length > 0 ? importedPeriodes : (config.periodes || [])
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
  );
}
