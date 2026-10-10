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
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  StorageSettings,
  SUPABASE_TABLE_NAME,
  getEffectiveTableName,
} from '../utils/supabaseStorage';

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
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const effectiveTable = getEffectiveTableName(storageSettings.supabaseTableName);
  const policyName = `politique_acces_${effectiveTable}`;

  const sqlScript = `-- Table dédiée uniquement à VoltTrack (Suivi Électricité)
-- N'écrase et ne modifie aucune autre table de vos autres applications
create table if not exists public.${effectiveTable} (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

alter table public.${effectiveTable} enable row level security;

drop policy if exists "${policyName}" on public.${effectiveTable};

create policy "${policyName}"
  on public.${effectiveTable}
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

          {/* Les champs : URL, Clé Publiable et Nom de la table isolée */}
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

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                Nom de la table Supabase dédiée à cette application (pour ne jamais écraser vos autres applications)
              </label>
              <input
                type="text"
                value={storageSettings.supabaseTableName ?? SUPABASE_TABLE_NAME}
                onChange={(e) =>
                  onUpdateStorageSettings({
                    ...storageSettings,
                    supabaseTableName: e.target.value.replace(/[^a-zA-Z0-9_]/g, ''),
                  })
                }
                placeholder={SUPABASE_TABLE_NAME}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Table utilisée : <code className="font-mono font-bold text-slate-700">{effectiveTable}</code> (totalement isolée des autres tables de votre compte Supabase).
              </p>
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
                  <strong>Supabase connecté :</strong> La table <code>{effectiveTable}</code> est opérationnelle. Vos modifications sont automatiquement enregistrées et envoyées vers Supabase.
                </span>
              </>
            ) : supabaseConnected && !supabaseTableExists ? (
              <>
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Connexion établie, mais table manquante :</strong> Exécutez le script SQL ci-dessous dans l'éditeur SQL de Supabase pour créer la table <code>{effectiveTable}</code>.
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
                onClick={() => setIsConfirmModalOpen(true)}
                disabled={isSyncing || !storageSettings.supabaseUrl || !storageSettings.supabasePublishableKey}
                className="flex items-center justify-center gap-2.5 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
              >
                <CloudDownload className="w-4 h-4" />
                <span>Charger de Supabase vers Local</span>
              </button>
            </div>
          </div>

          {/* Modal de confirmation pour Charger de Supabase vers Local */}
          {isConfirmModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                onClick={() => setIsConfirmModalOpen(false)}
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
              />
              <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-10">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold text-sm text-slate-900">
                      Confirmation de chargement
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsConfirmModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 space-y-3">
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    Attention : vous allez charger une autre version depuis <strong>Supabase</strong> qui remplacera vos données locales actuelles.
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Souhaitez-vous confirmer le chargement des données de Supabase vers Local ?
                  </p>
                </div>

                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsConfirmModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfirmModalOpen(false);
                      onSupabaseToLocal();
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirmer pour valider</span>
                  </button>
                </div>
              </div>
            </div>
          )}

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
