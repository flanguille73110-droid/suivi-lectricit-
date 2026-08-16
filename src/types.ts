/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TarifType = 'BASE' | 'HP_HC';

export interface TaxesConfig {
  cta: number; // Contribution Tarifaire d'Acheminement (€/mois)
  cspe: number; // Taxe intérieure sur la consommation finale d'électricité (€/kWh)
  tvaReduite: number; // TVA 5.5% sur l'abonnement et la CTA (en %)
  tvaNormale: number; // TVA 20% sur la consommation et la CSPE (en %)
  ctaType?: 'mensuel' | 'annuel' | 'pourcentage'; // Mode de calcul de la CTA
  cspeType?: 'par_kwh' | 'annuel' | 'pourcentage'; // Mode de calcul de la CSPE
}

export interface TarifPeriode {
  id: string;
  nom: string;
  debut: string; // YYYY-MM-DD
  fin: string;   // YYYY-MM-DD (vide si période en cours/actuelle)
  prixKwhBase: number;
  prixKwhHP: number;
  prixKwhHC: number;
  abonnementMensuel: number;
  cta?: number;
  cspe?: number;
  tvaReduite?: number;
  tvaNormale?: number;
  ctaType?: 'mensuel' | 'annuel' | 'pourcentage';
  cspeType?: 'par_kwh' | 'annuel' | 'pourcentage';
}

export interface TurpePeriode {
  id: string;
  debut: string; // YYYY-MM-DD
  fin: string;   // YYYY-MM-DD (vide si période en cours/actuelle)
  puissance: number; // kVA (3, 6, 9, 12, 15, 18, 24, 30, 36)
  turpeCG: number;   // Composante de Gestion (€/an)
  turpeCC: number;   // Composante de Comptage (€/an)
  turpeCSF: number;  // Part fixe de la composante de soutirage (€/kVA/an)
}

export interface TarifConfig {
  type: TarifType;
  puissance?: number; // kVA (3, 6, 9, 12, 15, 18, 24, 30, 36)
  prixKwhBase: number; // €/kWh
  prixKwhHP: number;   // €/kWh (Heures Pleines)
  prixKwhHC: number;   // €/kWh (Heures Creuses)
  abonnementMensuel: number; // €/mois
  taxes: TaxesConfig;
  haussePrevue: number; // Hausse de tarif future simulée (en %)
  periodes?: TarifPeriode[];
  periodesTurpe?: TurpePeriode[];
  debut?: string; // YYYY-MM-DD
  fin?: string;   // YYYY-MM-DD
  heureDebutHC?: string; // HH:MM
  heureFinHC?: string;   // HH:MM
  nombrePrelevements?: number; // Nombre de prélèvements par an (1 à 12)
}

export interface Releve {
  id: string;
  date: string; // YYYY-MM-DD
  indexHP: number; // kWh (Heures Pleines, ou Index unique si tarif de base)
  indexHC: number; // kWh (Heures Creuses, à 0 si tarif de base)
  commentaire?: string;
}

export interface AnalyseMois {
  moisLabel: string; // ex: "Janvier" or "01/2026"
  consoHP: number; // kWh
  consoHC: number; // kWh
  consoTotale: number; // kWh
  coutEnergieHT: number; // €
  coutAbonnementHT: number; // €
  coutCTAHT: number; // €
  coutCSPEHT: number; // €
  coutTVA: number; // €
  coutTotalTTC: number; // €
  coutAvecHausseTTC: number; // €
  jours?: number; // Nombre de jours réels de consommation dans le mois
}

export interface ComparaisonOption {
  optionLabel: string;
  coutTotalTTC: number;
  partEnergie: number;
  partAbonnement: number;
  partTaxes: number;
  economiePotentielle: number;
}
