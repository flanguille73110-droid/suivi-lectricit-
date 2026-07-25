import * as XLSX from 'xlsx';
import { Releve, TarifConfig } from '../types';

export function exportFullBackupExcel(
  releves: Releve[],
  config: TarifConfig,
  triggerToast?: (msg: string) => void
) {
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
      { wch: 12 }
    ];

    XLSX.utils.book_append_sheet(wb, wsConfig, "Configuration Contrat");

    // --- ONGLET 2 : SAISIE DES RELEVÉS ---
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
