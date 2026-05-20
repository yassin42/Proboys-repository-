import React, { useState } from "react";
import { motion } from "motion/react";
import { Smartphone, Package, Search, Plus } from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Brand } from "../types";
import { cn } from "../lib/utils";

interface DashboardProps {
  brands: Brand[];
  onBrandSelect: (brand: Brand) => void;
  searchQuery: string;
}

export default function Dashboard({ brands, onBrandSelect, searchQuery }: DashboardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");

  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim() || !db) return;
    try {
      await addDoc(collection(db, "brands"), {
        name: newBrandName.trim(),
        iconUrl: ""
      });
      setNewBrandName("");
      setIsAdding(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      {/* Universal Accessory Tile (Large) */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => onBrandSelect({ id: "universal", name: "General Accessories" })}
        className="group relative h-48 w-full cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-blue-700 p-8 shadow-xl shadow-brand/20"
      >
        <div className="relative z-10 flex h-full flex-col justify-between">
          <div>
            <h3 className="text-3xl font-bold text-white">General Accessories</h3>
            <p className="text-blue-100 opacity-80">Headsets, Cables, Bricks & more</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-white/90">
            <span>View Catalog</span>
            <Package className="h-4 w-4" />
          </div>
        </div>
        <Package className="absolute -bottom-8 -right-8 h-48 w-48 text-white/10 transition-transform group-hover:scale-110" />
      </motion.div>

      {/* Brands Grid */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filteredBrands.map((brand, index) => (
          <motion.div
            key={brand.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onBrandSelect(brand)}
            className="group flex aspect-square cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-lg transition-colors hover:border-brand/40 hover:bg-slate-800/80"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-950 p-4 shadow-inner ring-1 ring-slate-800 group-hover:ring-brand/40">
              {brand.iconUrl ? (
                <img src={brand.iconUrl} alt={brand.name} className="h-full w-full object-contain filter grayscale invert brightness-200" />
              ) : (
                <Smartphone className="h-10 w-10 text-slate-500" />
              )}
            </div>
            <span className="text-lg font-semibold text-white">{brand.name}</span>
          </motion.div>
        ))}
        
        {/* Add Brand Button */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsAdding(true)}
          className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-800 bg-slate-900/30 p-6 transition-all hover:border-brand/50 hover:bg-slate-900/50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Plus className="h-6 w-6" />
          </div>
          <span className="text-sm font-medium text-slate-400">Add Brand</span>
        </motion.div>
      </div>

      {/* Add Brand Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl"
          >
            <h3 className="mb-6 text-2xl font-bold text-white">Add New Brand</h3>
            <form onSubmit={handleAddBrand} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-400">Brand Name</label>
                <input 
                  autoFocus
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="e.g. Google, Sony, etc."
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
                  disabled={!newBrandName.trim()}
                  className="flex-1 rounded-xl bg-brand py-3 font-semibold text-white transition-all hover:bg-blue-600 disabled:opacity-50"
                >
                  Add Brand
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      
      {filteredBrands.length === 0 && searchQuery && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="mb-4 h-12 w-12 text-slate-700" />
          <p className="text-lg font-medium text-slate-500">No brands found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}
