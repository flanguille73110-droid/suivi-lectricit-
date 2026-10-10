/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Database,
  HardDrive,
  CloudUpload,
  CloudDownload,
  CheckCircle2,
  AlertCircle,
  Key,
  Link,
  RefreshCw,
  Copy,
  Check,
  Info,
} from 'lucide-react';
import { StorageSettings, SUPABASE_TABLE_NAME } from '../utils/supabaseStorage';

interface StockageProps {
  storageSettings: StorageSettings;
  onUpdateStorageSettings: (newSettings: StorageSettings) => void;
  supabaseConnected: boolean;
  supabaseTableExists: boolean;
  connectionError?: string;
  isCheckingConnection: boolean;
  isSyncing: boolean;
  onTestConnection: () => void;
  onLocalToSupabase: () => void;
  onSupabaseToLocal: () => void;
}

export default function Stockage({
  storageSettings,
  onUpdateStorageSettings,
  supabaseConnected,
  supabaseTableExists,
  connectionError,
  isCheckingConnection,
  isSyncing,
  onTestConnection,
  onLocalToSupabase,
  onSupabaseToLocal,
}: StockageProps) {
  const [copiedSql, setCopiedSql] = useState(false);

  const sqlScript = `create table if not exists public.${SUPABASE_TABLE_NAME} (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

alter table public.${SUPABASE_TABLE_NAME} enable row level security;

create policy "Autoriser lecture et ecriture publique"
  on public.${SUPABASE_TABLE_NAME}
  for all
  to anon, authenticated
  using (true)
  with check (true);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* En-tête de la page Stockage */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-md font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          Mode de Stockage des Données
        </h2>
        <p className="text-slate-500 text-xs leading-relaxed max-w-3xl">
          Choisissez où enregistrer vos données : localement dans votre navigateur (<strong>Localstorage</strong>) ou dans le cloud via <strong>Supabase</strong>.
          Lorsque Supabase est sélectionné, chaque modification est automatiquement enregistrée et envoyée vers Supabase.
        </p>
      </div>

      {/* Sélecteur Localstorage / Supabase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option 1 : Localstorage */}
        <button
          type="button"
          onClick={() =>
            onUpdateStorageSettings({
              ...storageSettings,
              mode: 'local',
            })
          }
          className={`text-left p-6 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
            storageSettings.mode === 'local'
              ? 'border-blue-600 bg-blue-50/40 shadow-sm'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div
            className={`p-3 rounded-xl shrink-0 ${
              storageSettings.mode === 'local'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            <HardDrive className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                Localstorage
              </h3>
              {storageSettings.mode === 'local' && (
                <span className="px-2.5 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[10px] font-bold uppercase">
                  Actif
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Stockage local directement dans votre navigateur web. Rapide, hors-ligne et sans configuration requise.
            </p>
          </div>
        </button>

        {/* Option 2 : Supabase */}
        <button
          type="button"
          onClick={() =>
            onUpdateStorageSettings({
              ...storageSettings,
              mode: 'supabase',
            })
          }
          className={`text-left p-6 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
            storageSettings.mode === 'supabase'
              ? 'border-emerald-600 bg-emerald-50/30 shadow-sm'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div
            className={`p-3 rounded-xl shrink-0 ${
              storageSettings.mode === 'supabase'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Database className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                Supabase
              </h3>
              {storageSettings.mode === 'supabase' && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    supabaseConnected
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {supabaseConnected ? 'Connecté' : 'Déconnecté'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Synchronisation cloud avec votre base de données Supabase. Sauvegarde automatique à chaque modification.
            </p>
          </div>
        </button>
      </div>

      {/* Configuration Supabase (affichée si Supabase est sélectionné) */}
      {storageSettings.mode === 'supabase' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                Configuration de la connexion Supabase
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Renseignez l'URL de votre projet Supabase ainsi que votre clé publiable (Anon / Publishable Key).
              </p>
            </div>

            <button
              type="button"
              onClick={onTestConnection}
              disabled={isCheckingConnection}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConnection ? 'animate-spin text-blue-600' : ''}`} />
              <span>Tester la connexion</span>
            </button>
          </div>

          {/* Les 2 champs : URL et Clé Publiable */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-blue-600" />
                URL Supabase
              </label>
              <input
                type="url"
                value={storageSettings.supabaseUrl}
                onChange={(e) =>
                  onUpdateStorageSettings({
                    ...storageSettings,
                    supabaseUrl: e.target.value,
                  })
                }
                placeholder="https://votre-projet.supabase.co"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-600" />
                Clé Publiable (Publishable / Anon Key)
              </label>
              <input
                type="password"
                value={storageSettings.supabasePublishableKey}
                onChange={(e) =>
                  onUpdateStorageSettings({
                    ...storageSettings,
                    supabasePublishableKey: e.target.value,
                  })
                }
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... ou sb_publishable_..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* État de la connexion */}
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
              supabaseConnected && supabaseTableExists
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : supabaseConnected && !supabaseTableExists
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {supabaseConnected && supabaseTableExists ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Supabase connecté :</strong> La connexion est opérationnelle. Vos modifications sont automatiquement enregistrées et envoyées vers Supabase.
                </span>
              </>
            ) : supabaseConnected && !supabaseTableExists ? (
              <>
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Connexion établie, mais table manquante :</strong> Exécutez le script SQL ci-dessous dans l'éditeur SQL de Supabase pour créer la table <code>{SUPABASE_TABLE_NAME}</code>.
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>
                  <strong>Supabase déconnecté :</strong> {connectionError || "Veuillez renseigner une URL et une clé publiable valides."}
                </span>
              </>
            )}
          </div>

          {/* Boutons de transfert : Local vers Supabase & Supabase vers Local */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Synchronisation manuelle des données
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={onLocalToSupabase}
                disabled={isSyncing || !storageSettings.supabaseUrl || !storageSettings.supabasePublishableKey}
                className="flex items-center justify-center gap-2.5 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                <CloudUpload className="w-4 h-4" />
                <span>Charger de Local vers Supabase</span>
              </button>

              <button
                type="button"
                onClick={onSupabaseToLocal}
                disabled={isSyncing || !storageSettings.supabaseUrl || !storageSettings.supabasePublishableKey}
                className="flex items-center justify-center gap-2.5 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                <CloudDownload className="w-4 h-4" />
                <span>Charger de Supabase vers Local</span>
              </button>
            </div>
          </div>

          {/* Aide SQL pour initialiser la table dans Supabase */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Script SQL d'initialisation de la table Supabase (à exécuter une seule fois dans SQL Editor)</span>
              </div>
              <button
                type="button"
                onClick={handleCopySql}
                className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copier le SQL</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-lg text-[11px] font-mono overflow-x-auto leading-relaxed">
              {sqlScript}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
