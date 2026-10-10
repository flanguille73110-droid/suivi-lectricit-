/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Releve, TarifConfig } from '../types';

export type StorageMode = 'local' | 'supabase';

export interface StorageSettings {
  mode: StorageMode;
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseTableName?: string;
}

export interface FullAppBackupData {
  releves: Releve[];
  config: TarifConfig;
  selectorSettings?: any;
  turpeValues?: any;
  updateSites?: any;
  mesAppareils?: any;
  updatedAt: string;
}

export const STORAGE_SETTINGS_KEY = 'elec_storage_settings';
export const SUPABASE_LAST_SYNC_KEY = 'elec_supabase_last_sync';
export const SUPABASE_TABLE_NAME = 'volttrack_suivi_electricite';
export const SUPABASE_ROW_ID = 'volttrack_elec_main';

export const DEFAULT_STORAGE_SETTINGS: StorageSettings = {
  mode: 'local',
  supabaseUrl: '',
  supabasePublishableKey: '',
  supabaseTableName: SUPABASE_TABLE_NAME,
};

export function getEffectiveTableName(tableName?: string): string {
  const cleaned = (tableName || '').trim().replace(/[^a-zA-Z0-9_]/g, '');
  return cleaned || SUPABASE_TABLE_NAME;
}

export function getStorageSettings(): StorageSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        mode: parsed.mode === 'supabase' ? 'supabase' : 'local',
        supabaseUrl: parsed.supabaseUrl || '',
        supabasePublishableKey: parsed.supabasePublishableKey || '',
        supabaseTableName: getEffectiveTableName(parsed.supabaseTableName),
      };
    }
  } catch (e) {
    console.error('Erreur lecture paramètres de stockage:', e);
  }
  return DEFAULT_STORAGE_SETTINGS;
}

export function saveStorageSettings(settings: StorageSettings): void {
  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Erreur sauvegarde paramètres de stockage:', e);
  }
}

export function getLastSupabaseSync(): number | null {
  try {
    const raw = localStorage.getItem(SUPABASE_LAST_SYNC_KEY);
    if (raw) {
      const ts = parseInt(raw, 10);
      return !isNaN(ts) ? ts : null;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export function setLastSupabaseSync(timestamp: number = Date.now()): void {
  try {
    localStorage.setItem(SUPABASE_LAST_SYNC_KEY, String(timestamp));
  } catch (e) {
    // ignore
  }
}

export function formatElapsedSyncTime(lastSyncTimestamp: number | null, now: number = Date.now()): string {
  if (!lastSyncTimestamp) {
    return '--';
  }
  const diffMs = Math.max(0, now - lastSyncTimestamp);
  const totalMinutes = Math.floor(diffMs / 60000);

  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes > 1 ? 's' : ''}`;
  }

  if (totalMinutes < 1440) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}h${String(minutes).padStart(2, '0')}`;
  }

  const days = Math.floor(totalMinutes / 1440);
  return `${days} jour${days > 1 ? 's' : ''}`;
}

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export function getSupabaseClient(url: string, key: string): SupabaseClient | null {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  const cleanKey = key.trim();
  if (!cleanUrl || !cleanKey || !cleanUrl.startsWith('http')) {
    return null;
  }
  if (cachedClient && cachedUrl === cleanUrl && cachedKey === cleanKey) {
    return cachedClient;
  }
  try {
    cachedClient = createClient(cleanUrl, cleanKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    cachedUrl = cleanUrl;
    cachedKey = cleanKey;
    return cachedClient;
  } catch (e) {
    console.error('Erreur initialisation client Supabase:', e);
    return null;
  }
}

/**
 * Teste la connexion à Supabase (vérifie l'URL, la clé publiable et l'accès à l'API REST / table).
 */
export async function checkSupabaseConnection(
  url: string,
  key: string,
  tableName?: string
): Promise<{
  connected: boolean;
  tableExists: boolean;
  error?: string;
}> {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  const cleanKey = key.trim();
  const effectiveTable = getEffectiveTableName(tableName);

  if (!cleanUrl || !cleanKey) {
    return { connected: false, tableExists: false, error: 'URL ou clé publiable manquante.' };
  }

  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    return { connected: false, tableExists: false, error: "L'URL doit commencer par https://" };
  }

  const client = getSupabaseClient(cleanUrl, cleanKey);
  if (!client) {
    return { connected: false, tableExists: false, error: 'Impossible de créer le client Supabase.' };
  }

  try {
    const { error } = await client
      .from(effectiveTable)
      .select('id')
      .eq('id', SUPABASE_ROW_ID)
      .maybeSingle();

    if (!error) {
      return { connected: true, tableExists: true };
    }

    // Si la table n'existe pas encore mais que l'authentification Supabase a fonctionné
    const errCode = (error as any)?.code || '';
    const errMsg = error.message || '';
    if (
      errCode === '42P01' ||
      errCode === 'PGRST205' ||
      errMsg.includes('relation') ||
      errMsg.includes('does not exist') ||
      errMsg.includes('schema cache')
    ) {
      return {
        connected: true,
        tableExists: false,
        error: `Connecté à Supabase, mais la table "${effectiveTable}" n'existe pas encore.`,
      };
    }

    // Si erreur d'authentification / clé invalide / réseau
    return {
      connected: false,
      tableExists: false,
      error: errMsg || 'Connexion refusée par Supabase.',
    };
  } catch (err: any) {
    return {
      connected: false,
      tableExists: false,
      error: err?.message || 'Erreur réseau lors de la connexion à Supabase.',
    };
  }
}

/**
 * Collecte toutes les données locales de l'application pour les sauvegarder.
 */
export function collectLocalData(releves: Releve[], config: TarifConfig, selectorSettings?: any): FullAppBackupData {
  const parseStorageKey = (key: string) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  };

  return {
    releves,
    config,
    selectorSettings: selectorSettings ?? parseStorageKey('elec_selector_settings'),
    turpeValues: parseStorageKey('elec_budget_turpe_values'),
    updateSites: parseStorageKey('elec_budget_update_sites'),
    mesAppareils: parseStorageKey('elec_mes_appareils_estimes'),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Envoie les données locales vers Supabase.
 */
export async function pushLocalToSupabase(
  url: string,
  key: string,
  payload: FullAppBackupData,
  tableName?: string
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(url, key);
  if (!client) {
    return { success: false, error: 'URL ou clé publiable Supabase invalide.' };
  }
  const effectiveTable = getEffectiveTableName(tableName);

  try {
    const { error } = await client
      .from(effectiveTable)
      .upsert(
        {
          id: SUPABASE_ROW_ID,
          data: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Erreur lors de l'envoi vers Supabase.",
    };
  }
}

/**
 * Charge les données depuis Supabase.
 */
export async function pullSupabaseToLocal(
  url: string,
  key: string,
  tableName?: string
): Promise<{ success: boolean; data?: FullAppBackupData; error?: string }> {
  const client = getSupabaseClient(url, key);
  if (!client) {
    return { success: false, error: 'URL ou clé publiable Supabase invalide.' };
  }
  const effectiveTable = getEffectiveTableName(tableName);

  try {
    const { data, error } = await client
      .from(effectiveTable)
      .select('data, updated_at')
      .eq('id', SUPABASE_ROW_ID)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || !data.data) {
      return {
        success: false,
        error: 'Aucune donnée enregistrée sur Supabase pour le moment.',
      };
    }

    return {
      success: true,
      data: data.data as FullAppBackupData,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erreur lors de la récupération depuis Supabase.',
    };
  }
}
