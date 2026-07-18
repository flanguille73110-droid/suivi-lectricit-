/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Calendar, FileText, ChevronDown, ChevronUp, AlertCircle, TrendingUp } from 'lucide-react';
import { Releve, TarifConfig } from '../types';

interface RelevesTableProps {
  releves: Releve[];
  config: TarifConfig;
  onAddReleve: (releve: Omit<Releve, 'id'>) => void;
  onDeleteReleve: (id: string) => void;
}

export default function RelevesTable({ releves, config, onAddReleve, onDeleteReleve }: RelevesTableProps) {
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [indexHP, setIndexHP] = useState('');
  const [indexHC, setIndexHC] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Trier les relevés par date décroissante pour l'affichage (le plus récent en premier)
  const sortedReleves = [...releves].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Obtenir le dernier relevé pour validation et préremplissage
  const dernierReleve = releves.length > 0 
    ? [...releves].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[releves.length - 1]
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedHP = parseFloat(indexHP);
    const parsedHC = config.type === 'HP_HC' ? parseFloat(indexHC || '0') : 0;

    if (isNaN(parsedHP) || parsedHP < 0) {
      setError("L'index de compteur (ou Heures Pleines) doit être un nombre positif.");
      return;
    }

    if (config.type === 'HP_HC' && (isNaN(parsedHC) || parsedHC < 0)) {
      setError("L'index Heures Creuses doit être un nombre positif.");
      return;
    }

    // Validation par rapport au dernier relevé existant
    if (dernierReleve) {
      const selectedDate = new Date(date);
      const prevDate = new Date(dernierReleve.date);

      if (selectedDate <= prevDate) {
        setError(`La date doit être postérieure au dernier relevé (${new Date(dernierReleve.date).toLocaleDateString('fr-FR')}).`);
        return;
      }

      if (parsedHP < dernierReleve.indexHP) {
        setError(`L'index Heures Pleines (${parsedHP} kWh) ne peut pas être inférieur au précédent (${dernierReleve.indexHP} kWh).`);
        return;
      }

      if (config.type === 'HP_HC' && parsedHC < dernierReleve.indexHC) {
        setError(`L'index Heures Creuses (${parsedHC} kWh) ne peut pas être inférieur au précédent (${dernierReleve.indexHC} kWh).`);
        return;
      }
    }

    onAddReleve({
      date,
      indexHP: parsedHP,
      indexHC: parsedHC,
      commentaire: commentaire.trim() || undefined,
    });

    // Reset du formulaire
    setIndexHP('');
    setIndexHC('');
    setCommentaire('');
    setDate(new Date().toISOString().split('T')[0]);
    setIsOpenForm(false);
  };

  // Calculer l'évolution de chaque ligne par rapport à la précédente chronologique
  const getEvolution = (indexCourant: number, indexPrecedent: number | undefined) => {
    if (indexPrecedent === undefined) return null;
    const diff = indexCourant - indexPrecedent;
    return diff >= 0 ? diff : 0;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-md font-bold text-slate-900 uppercase tracking-wider">Vos relevés de compteur</h2>
          <p className="text-slate-500 text-xs mt-1">Saisissez régulièrement vos index pour suivre votre consommation réelle.</p>
        </div>

        <button
          id="btn-toggle-form"
          onClick={() => setIsOpenForm(!isOpenForm)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer ${
            isOpenForm 
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200' 
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-sm'
          }`}
        >
          {isOpenForm ? (
            <>
              Fermer <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Ajouter un relevé <Plus className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Formulaire d'ajout de relevé */}
      {isOpenForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 animate-fadeIn transition-all">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Nouveau relevé d'index
          </h3>

          {error && (
            <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg mb-4 flex items-start gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date du relevé
              </label>
              <input
                id="input-releve-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {config.type === 'HP_HC' ? 'Index Heures Pleines (HP)' : 'Index Unique (Base)'} (kWh)
              </label>
              <input
                id="input-releve-hp"
                type="number"
                step="any"
                min="0"
                placeholder={dernierReleve ? `Ex: >= ${dernierReleve.indexHP}` : 'Ex: 12000'}
                value={indexHP}
                onChange={(e) => setIndexHP(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
              />
            </div>

            {config.type === 'HP_HC' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Index Heures Creuses (HC) (kWh)
                </label>
                <input
                  id="input-releve-hc"
                  type="number"
                  step="any"
                  min="0"
                  placeholder={dernierReleve ? `Ex: >= ${dernierReleve.indexHC}` : 'Ex: 8000'}
                  value={indexHC}
                  onChange={(e) => setIndexHC(e.target.value)}
                  required={config.type === 'HP_HC'}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                />
              </div>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Notes ou commentaires (optionnel)
            </label>
            <input
              id="input-releve-commentaire"
              type="text"
              placeholder="Ex: Relevé Enedis ou Emménagement"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 mt-5">
            <button
              type="button"
              onClick={() => setIsOpenForm(false)}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Annuler
            </button>
            <button
              id="btn-submit-releve"
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Enregistrer le relevé
            </button>
          </div>
        </form>
      )}

      {/* Tableau des relevés */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 font-mono text-xs uppercase border-b border-slate-200">
              <th className="py-4 px-4 font-semibold">Date</th>
              <th className="py-4 px-4 font-semibold">Index {config.type === 'HP_HC' && 'HP'}</th>
              {config.type === 'HP_HC' && <th className="py-4 px-4 font-semibold">Index HC</th>}
              <th className="py-4 px-4 font-semibold text-blue-700">Conso {config.type === 'HP_HC' && 'HP'}</th>
              {config.type === 'HP_HC' && <th className="py-4 px-4 font-semibold text-purple-700">Conso HC</th>}
              <th className="py-4 px-4 font-semibold">Total Conso</th>
              <th className="py-4 px-4 font-semibold">Notes</th>
              <th className="py-4 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {sortedReleves.length === 0 ? (
              <tr>
                <td colSpan={config.type === 'HP_HC' ? 8 : 6} className="py-12 text-center text-slate-400">
                  <div className="max-w-xs mx-auto flex flex-col items-center gap-3">
                    <AlertCircle className="w-8 h-8 text-slate-300" />
                    <span>Aucun relevé enregistré. Utilisez le bouton ci-dessus pour ajouter votre premier index.</span>
                  </div>
                </td>
              </tr>
            ) : (
              sortedReleves.map((releve, index) => {
                // Trouver le relevé chronologiquement précédent pour calculer l'évolution
                // Puisque sortedReleves est trié par date décroissante, le relevé précédent dans le temps est après dans la liste
                // Mais s'il y a des trous ou ordres complexes, on cherche sur la liste brute triée chronologiquement.
                const chronologiques = [...releves].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                const indexDansChrono = chronologiques.findIndex(r => r.id === releve.id);
                const precedentChrono = indexDansChrono > 0 ? chronologiques[indexDansChrono - 1] : undefined;

                const evoHP = getEvolution(releve.indexHP, precedentChrono?.indexHP);
                const evoHC = config.type === 'HP_HC' ? getEvolution(releve.indexHC, precedentChrono?.indexHC) : 0;
                const evoTotal = (evoHP !== null ? evoHP : 0) + (evoHC !== null ? evoHC : 0);

                return (
                  <tr key={releve.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4 font-semibold text-slate-900">
                      {new Date(releve.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-700">
                      {releve.indexHP.toLocaleString('fr-FR')} <span className="text-[10px] text-slate-400">kWh</span>
                    </td>
                    {config.type === 'HP_HC' && (
                      <td className="py-4 px-4 font-mono text-slate-700">
                        {releve.indexHC.toLocaleString('fr-FR')} <span className="text-[10px] text-slate-400">kWh</span>
                      </td>
                    )}
                    <td className="py-4 px-4 font-semibold text-blue-600">
                      {evoHP !== null ? (
                        <span>+{Math.round(evoHP).toLocaleString('fr-FR')} <span className="text-[10px] font-normal">kWh</span></span>
                      ) : (
                        <span className="text-slate-400 text-xs font-normal">—</span>
                      )}
                    </td>
                    {config.type === 'HP_HC' && (
                      <td className="py-4 px-4 font-semibold text-purple-600">
                        {evoHC !== null ? (
                          <span>+{Math.round(evoHC).toLocaleString('fr-FR')} <span className="text-[10px] font-normal">kWh</span></span>
                        ) : (
                          <span className="text-slate-400 text-xs font-normal">—</span>
                        )}
                      </td>
                    )}
                    <td className="py-4 px-4 font-bold text-slate-800">
                      {precedentChrono ? (
                        <span>{Math.round(evoTotal).toLocaleString('fr-FR')} <span className="text-[10px] font-normal text-slate-400">kWh</span></span>
                      ) : (
                        <span className="text-slate-400 text-xs font-normal italic">Premier index</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-500 max-w-xs truncate" title={releve.commentaire}>
                      {releve.commentaire || <span className="text-slate-300 italic">Aucune note</span>}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        id={`btn-delete-releve-${releve.id}`}
                        onClick={() => onDeleteReleve(releve.id)}
                        className="px-2.5 py-1 text-red-600 hover:text-white border border-red-200 hover:border-red-600 hover:bg-red-600 rounded-lg transition-all cursor-pointer font-semibold text-[10px] uppercase tracking-wider"
                        title="Supprimer le relevé"
                      >
                        Supprimer
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
  );
}
