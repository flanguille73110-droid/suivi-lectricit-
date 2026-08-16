import * as XLSX from 'xlsx';
import { Releve, TarifConfig, TurpePeriode } from '../types';

export function exportFullBackupExcel(
  releves: Releve[],
  config: TarifConfig,
  triggerToast?: (msg: string) => void
) {
  try {
    const wb = XLSX.utils.book_new();

    // ----------------------------------------------------
    // --- ONGLET 1 : CONFIGURATION DU CONTRAT & TARIFS ---
    // ----------------------------------------------------
    const configRows: any[][] = [
      ["CONFIGURATION DU CONTRAT & TARIFS (ACTUELS)"],
      [],
      ["Paramètre", "Valeur", "Unité", "Description"],
      ["Type de Tarif", config.type, "", "Option tarifaire active (BASE ou HP_HC)"],
      ["Puissance (kVA)", config.puissance || 15, "kVA", "Puissance souscrite du compteur (3, 6, 9, 12, 15, 18, 24, 30, 36 kVA)"],
      ["Abonnement Mensuel", config.abonnementMensuel, "€/mois", "Montant de l'abonnement HT actuel"],
      ["Date Début", config.debut || "", "YYYY-MM-DD", "Début de la période actuelle"],
      ["Date Fin", config.fin || "", "YYYY-MM-DD", "Fin de la période actuelle (laisser vide si en cours)"],
      ["Heure Début HC", config.heureDebutHC || "22:00", "HH:MM", "Heure de début des Heures Creuses (si Option HP/HC)"],
      ["Heure Fin HC", config.heureFinHC || "06:00", "HH:MM", "Heure de fin des Heures Creuses (si Option HP/HC)"],
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
        "Type CSPE",
        "TVA Réduite (%)",
        "TVA Normale (%)"
      ]
    ];

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
          p.cspeType || "",
          p.tvaReduite !== undefined ? p.tvaReduite : 5.5,
          p.tvaNormale !== undefined ? p.tvaNormale : 20.0
        ]);
      });
    }

    const wsConfig = XLSX.utils.aoa_to_sheet(configRows);
    wsConfig['!cols'] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, wsConfig, "Configuration Contrat");

    // -------------------------------------------------------
    // --- ONGLET 2 : VALEURS ACTUELLES & HISTORIQUE TURPE ---
    // -------------------------------------------------------
    let currentTurpeVals = {
      turpeCG: 25.68,
      turpeCC: 23.28,
      turpeCSF: 10.80,
      turpeDebut: `${new Date().getFullYear()}-08-01`,
      turpeFin: ''
    };

    try {
      const savedTurpe = localStorage.getItem('elec_budget_turpe_values');
      if (savedTurpe) {
        const parsed = JSON.parse(savedTurpe);
        if (typeof parsed.turpeCG === 'number') currentTurpeVals.turpeCG = parsed.turpeCG;
        if (typeof parsed.turpeCC === 'number') currentTurpeVals.turpeCC = parsed.turpeCC;
        if (typeof parsed.turpeCSF === 'number') currentTurpeVals.turpeCSF = parsed.turpeCSF;
        if (typeof parsed.turpeDebut === 'string') currentTurpeVals.turpeDebut = parsed.turpeDebut;
        if (typeof parsed.turpeFin === 'string') currentTurpeVals.turpeFin = parsed.turpeFin;
      }
    } catch (e) {
      console.error(e);
    }

    const turpeRows: any[][] = [
      ["VALEURS ACTUELLES DU MODAL VALEURS TURPE"],
      [],
      ["Paramètre", "Valeur", "Unité", "Description"],
      ["Composante de Gestion (CG)", currentTurpeVals.turpeCG, "€/an", "Frais de gestion du réseau TURPE"],
      ["Composante de Comptage (CC)", currentTurpeVals.turpeCC, "€/an", "Frais de comptage/relevé du compteur Linky"],
      ["Part fixe Soutirage (CSF)", currentTurpeVals.turpeCSF, "€/kVA/an", "Part fixe de soutirage par kVA souscrit"],
      ["Date de début TURPE", currentTurpeVals.turpeDebut, "YYYY-MM-DD", "Date d'application des valeurs TURPE actuelles"],
      ["Date de fin TURPE", currentTurpeVals.turpeFin || "", "YYYY-MM-DD", "Date de fin des valeurs TURPE actuelles (vide si en cours)"],
      [],
      ["HISTORIQUE TURPE"],
      [],
      [
        "Date de début",
        "Date de fin",
        "Puissance souscrite (en kVA)",
        "Composante de gestion (CG)",
        "Composante de comptage (CC)",
        "Part fixe de la composante de soutirage (CSF)",
        "Calcul CSF (automatique)"
      ]
    ];

    if (config.periodesTurpe && config.periodesTurpe.length > 0) {
      config.periodesTurpe.forEach(p => {
        const puissanceVal = p.puissance !== undefined ? p.puissance : (config.puissance || 15);
        const cgVal = p.turpeCG !== undefined ? p.turpeCG : 25.68;
        const ccVal = p.turpeCC !== undefined ? p.turpeCC : 23.28;
        const csfVal = p.turpeCSF !== undefined ? p.turpeCSF : 10.80;
        const autoCsf = puissanceVal * csfVal;

        turpeRows.push([
          p.debut,
          p.fin || "",
          puissanceVal,
          cgVal,
          ccVal,
          csfVal,
          autoCsf
        ]);
      });
    }

    const wsTurpe = XLSX.utils.aoa_to_sheet(turpeRows);
    wsTurpe['!cols'] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 28 },
      { wch: 28 },
      { wch: 28 },
      { wch: 45 },
      { wch: 25 }
    ];

    XLSX.utils.book_append_sheet(wb, wsTurpe, "Historique TURPE");

    // ----------------------------------------------------
    // --- ONGLET 3 : SITES DE MISE À JOUR ET NOTES -------
    // ----------------------------------------------------
    let updateSitesData = {
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

    try {
      const savedSites = localStorage.getItem('elec_budget_update_sites');
      if (savedSites) {
        const parsed = JSON.parse(savedSites);
        updateSitesData = {
          siteTurpe: parsed.siteTurpe || updateSitesData.siteTurpe,
          noteTurpe: parsed.noteTurpe ?? '',
          siteCompteur: parsed.siteCompteur || updateSitesData.siteCompteur,
          noteCompteur: parsed.noteCompteur ?? '',
          siteTarifs: parsed.siteTarifs || updateSitesData.siteTarifs,
          noteTarifs: parsed.noteTarifs ?? '',
          siteTaxes: parsed.siteTaxes || updateSitesData.siteTaxes,
          noteTaxes: parsed.noteTaxes ?? '',
          siteFacture: parsed.siteFacture || updateSitesData.siteFacture,
          noteFacture: parsed.noteFacture ?? '',
        };
      }
    } catch (e) {
      console.error(e);
    }

    const sitesRows: any[][] = [
      ["SITES DE MISE À JOUR DES DONNÉES ET TARIFS & NOTES DANS LES ENCADRÉS"],
      [],
      ["Catégorie", "Clé Identifiante", "Adresse URL du Site", "Note / Remarque dans l'encadré"],
      ["Tarifs TURPE", "siteTurpe", updateSitesData.siteTurpe, updateSitesData.noteTurpe],
      ["Compteur Enedis", "siteCompteur", updateSitesData.siteCompteur, updateSitesData.noteCompteur],
      ["Tarifs Réglementés CRE", "siteTarifs", updateSitesData.siteTarifs, updateSitesData.noteTarifs],
      ["Taxes & Réglementation", "siteTaxes", updateSitesData.siteTaxes, updateSitesData.noteTaxes],
      ["Facture EDF / Fournisseur", "siteFacture", updateSitesData.siteFacture, updateSitesData.noteFacture]
    ];

    const wsSites = XLSX.utils.aoa_to_sheet(sitesRows);
    wsSites['!cols'] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 65 },
      { wch: 60 }
    ];

    XLSX.utils.book_append_sheet(wb, wsSites, "Sites & Notes de Mise à Jour");

    // ----------------------------------------------------
    // --- ONGLET 4 : SAISIE DES RELEVÉS ------------------
    // ----------------------------------------------------
    const releveRows: any[][] = [
      ["Saisie des relevés : historique des relevés du compteur"],
      [],
      ["date", "Conso HC", "HC index", "Conso HP", "HP Index", "Commentaire"]
    ];

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
    wsReleves['!cols'] = [
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 30 }
    ];

    XLSX.utils.book_append_sheet(wb, wsReleves, "Saisie des relevés");

    XLSX.writeFile(wb, "VoltTrack_Sauvegarde_Export.xlsx");
    if (triggerToast) triggerToast('Exportation Excel de sauvegarde réussie !');
  } catch (err) {
    console.error(err);
    if (triggerToast) triggerToast("Erreur lors de l'exportation.");
  }
}

