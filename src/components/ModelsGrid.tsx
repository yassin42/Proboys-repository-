import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Plus, Smartphone, Search, Trash2 } from "lucide-react";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Brand, Model } from "../types";
import { cn } from "../lib/utils";

interface ModelsGridProps {
  brand: Brand;
  onModelSelect: (model: Model) => void;
  searchQuery: string;
}

export default function ModelsGrid({ brand, onModelSelect, searchQuery }: ModelsGridProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newModelName, setNewModelName] = useState("");

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "models"), where("brandId", "==", brand.id));
    const unsub = onSnapshot(q, (snap) => {
      setModels(snap.docs.map(d => ({ id: d.id, ...d.data() } as Model)));
    });
    return () => unsub();
  }, [brand.id]);

  const filteredModels = models.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName.trim() || !db) return;
    try {
      await addDoc(collection(db, "models"), {
        brandId: brand.id,
        name: newModelName.trim()
      });
      setNewModelName("");
      setIsAdding(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {/* Models list */}
        {filteredModels.map((model, index) => (
          <motion.div
            key={model.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onModelSelect(model)}
            className="group relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center transition-all hover:border-brand/40 hover:bg-slate-800"
          >
            <Smartphone className="h-8 w-8 text-slate-500 transition-colors group-hover:text-brand" />
            <span className="text-lg font-medium text-white">{model.name}</span>
          </motion.div>
        ))}

        {/* Add Model Button */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsAdding(true)}
          className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/30 p-6 transition-all hover:border-brand/50 hover:bg-slate-900/50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Plus className="h-6 w-6" />
          </div>
          <span className="text-sm font-medium text-slate-400">Add New Model</span>
        </motion.div>
      </div>

      {/* Add Model Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl"
          >
            <h3 className="mb-6 text-2xl font-bold text-white">New {brand.name} Model</h3>
            <form onSubmit={handleAddModel} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-400">Model Name</label>
                <input 
                  autoFocus
                  type="text"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="e.g. iPhone 16 Pro Max"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none ring-brand/30 focus:ring-2"
                />
              </div>
              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 rounded-xl bg-slate-800 py-3 font-semibold text-white transition-colors hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newModelName.trim()}
                  className="flex-1 rounded-xl bg-brand py-3 font-semibold text-white transition-all hover:bg-blue-600 disabled:opacity-50"
                >
                  Create Model
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {filteredModels.length === 0 && searchQuery && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="mb-4 h-12 w-12 text-slate-700" />
          <p className="text-lg font-medium text-slate-500">No models found for "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}
