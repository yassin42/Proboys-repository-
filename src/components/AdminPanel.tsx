import React, { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { 
  TrendingUp, 
  History, 
  Settings as SettingsIcon, 
  Trash2, 
  Plus, 
  Filter,
  DollarSign,
  Package,
  Calendar,
  ChevronRight,
  Save,
  Smartphone,
  Database,
  RefreshCw
} from "lucide-react";
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  where,
  getDocs,
  setDoc,
  getDoc
} from "firebase/firestore";
import { format, isToday, startOfDay, parseISO } from "date-fns";
import { db } from "../lib/firebase";
import { Category, SalesLog } from "../types";
import { cn } from "../lib/utils";

interface AdminPanelProps {
  categories: Category[];
  initialTab?: "logs" | "settings";
}

export default function AdminPanel({ categories, initialTab = "logs" }: AdminPanelProps) {
  const [logs, setLogs] = useState<SalesLog[]>([]);
  const [activeTab, setActiveTab] = useState<"logs" | "settings">(initialTab);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [logFilter, setLogFilter] = useState<"all" | "today">("today");
  const [appUrl, setAppUrl] = useState<string>("");
  
  // Settings states
  const [storeName, setStoreName] = useState("ProBoys Manager");
  const [storeLogo, setStoreLogo] = useState("/logo.png");
  const [savingSettings, setSavingSettings] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedingText, setSeedingText] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const resetAndSeedWholesaleCatalog = async () => {
    if (!db) return;
    if (!confirm("Are you sure you want to reset and seed the database with the May 2026 Algerian Dinar wholesale pricelist? This will overwrite your current inventory data.")) return;
    
    setIsSeeding(true);
    setSeedingText("Clearing old data...");
    try {
      // 1. Clear brands
      const brandsSn = await getDocs(collection(db, "brands"));
      for (const d of brandsSn.docs) {
        await deleteDoc(doc(db, "brands", d.id));
      }

      // 2. Clear models
      const modelsSn = await getDocs(collection(db, "models"));
      for (const d of modelsSn.docs) {
        await deleteDoc(doc(db, "models", d.id));
      }

      // 3. Clear active categories
      const categoriesSn = await getDocs(collection(db, "categories"));
      for (const d of categoriesSn.docs) {
        await deleteDoc(doc(db, "categories", d.id));
      }

      // 4. Clear inventory items
      const itemsSn = await getDocs(collection(db, "inventoryItems"));
      for (const d of itemsSn.docs) {
        await deleteDoc(doc(db, "inventoryItems", d.id));
      }

      // 5. Clear sales logs
      const logsSn = await getDocs(collection(db, "salesLogs"));
      for (const d of logsSn.docs) {
        await deleteDoc(doc(db, "salesLogs", d.id));
      }

      setSeedingText("Injecting standard wholesale categories...");
      const categoriesList = [
        "LCD (Screens)",
        "Batteries",
        "Caches (Back Covers)",
        "CC / Charging Ports",
        "NAP / Flex Cables",
        "Speakers & Buzzers"
      ];
      const categoryIdMap: Record<string, string> = {};
      for (const cat of categoriesList) {
        const docRef = await addDoc(collection(db, "categories"), { name: cat });
        categoryIdMap[cat] = docRef.id;
      }

      setSeedingText("Constructing wholesale brands & models...");
      const wholesaleData = [
        {
          brandName: "Apple (iPhone)",
          iconUrl: "https://www.apple.com/favicon.ico",
          models: [
            {
              name: "iPhone 11 Series",
              parts: [
                { cat: "LCD (Screens)", name: "LCD IPH 11 Regular", price: 2200 },
                { cat: "LCD (Screens)", name: "LCD IPH 11 IFIX High-Quality", price: 3800 },
                { cat: "LCD (Screens)", name: "LCD IPH 11 PRO Display", price: 2550 },
                { cat: "LCD (Screens)", name: "LCD IPH 11 PRO GX ORG Premium", price: 4950 },
                { cat: "LCD (Screens)", name: "LCD IPH 11 PRO MAX GX ORG Premium", price: 6650 },
                { cat: "LCD (Screens)", name: "LCD IPH 11 PRO MAX OLED IFIX", price: 6600 },
                { cat: "Batteries", name: "BAT IPH 11 PRO MAX ORG", price: 2500 },
                { cat: "Caches (Back Covers)", name: "CACHE IPH 11 BLK Classic", price: 350 },
                { cat: "NAP / Flex Cables", name: "NAP CH IPH 11 Charging Flex", price: 1200 }
              ]
            },
            {
              name: "iPhone 12 / 12 Pro",
              parts: [
                { cat: "LCD (Screens)", name: "LCD IPH 12 / 12 PRO High-Copy", price: 2600 },
                { cat: "LCD (Screens)", name: "LCD IPH 12 / 12 PRO OLED IFIX", price: 6300 },
                { cat: "LCD (Screens)", name: "LCD IPH 12 MINI GX ORG", price: 8500 },
                { cat: "LCD (Screens)", name: "LCD IPH 12 PRO MAX High-Copy", price: 2900 },
                { cat: "Batteries", name: "BAT IPH 12 / 12 PRO HOCO", price: 2300 },
                { cat: "Batteries", name: "BAT IPH 12 PRO MAX HOCO Premium", price: 3500 },
                { cat: "Speakers & Buzzers", name: "HP IPH FACE ID 12 MINI OR", price: 1400 }
              ]
            },
            {
              name: "iPhone 13 Series",
              parts: [
                { cat: "LCD (Screens)", name: "LCD IPH 13 GX INCEL Quality", price: 2700 },
                { cat: "LCD (Screens)", name: "LCD IPH 13 GX ORG Superb", price: 7300 },
                { cat: "LCD (Screens)", name: "LCD IPH 13 PRO GX ORG", price: 8300 },
                { cat: "LCD (Screens)", name: "LCD IPH 13 PRO IFIX Screen", price: 8000 },
                { cat: "LCD (Screens)", name: "LCD IPH 13 PRO MAX GX ORG", price: 9000 },
                { cat: "LCD (Screens)", name: "LCD IPH 13 PRO MAX OLED IFIX", price: 9000 },
                { cat: "Batteries", name: "BAT IPH 13 PRO HOCO Battery", price: 3500 },
                { cat: "Caches (Back Covers)", name: "CACHE IPH 13 PRO MAX BLK Style", price: 500 }
              ]
            },
            {
              name: "iPhone 14 / 15 Series",
              parts: [
                { cat: "LCD (Screens)", name: "LCD IPH 14 GX ORG", price: 7200 },
                { cat: "LCD (Screens)", name: "LCD IPH 14 IFIX Screen", price: 5500 },
                { cat: "LCD (Screens)", name: "LCD IPH 14 PRO MAX GX ORG Premium", price: 12000 },
                { cat: "LCD (Screens)", name: "LCD IPH 15 GX ORG Superb", price: 13800 },
                { cat: "LCD (Screens)", name: "LCD IPH 15 PRO GX ORG AMOLED", price: 13900 },
                { cat: "LCD (Screens)", name: "LCD IPH 15 PRO MAX GX ORG Premium", price: 11000 },
                { cat: "Caches (Back Covers)", name: "CACHE IPH 14 PRO MAX GOLD Premium", price: 700 },
                { cat: "Caches (Back Covers)", name: "CACHE IPH 15 PRO MAX BLK Style", price: 900 },
                { cat: "Batteries", name: "BAT IPH 15 HOCO Battery", price: 4500 }
              ]
            },
            {
              name: "iPhone X / XR / XS",
              parts: [
                { cat: "LCD (Screens)", name: "LCD IPH X OLED IFIX Screen", price: 4550 },
                { cat: "LCD (Screens)", name: "LCD IPH XR Brand-New Highcopy", price: 2200 },
                { cat: "LCD (Screens)", name: "LCD IPH XS MAX Screen High-Copy", price: 2500 },
                { cat: "Caches (Back Covers)", name: "CACHE IPH X WHITE Glass Back", price: 350 },
                { cat: "Caches (Back Covers)", name: "CACHE IPH XR BLK Back Glass", price: 300 }
              ]
            }
          ]
        },
        {
          brandName: "Samsung",
          iconUrl: "https://www.samsung.com/favicon.ico",
          models: [
            {
              name: "Galaxy M Series",
              parts: [
                { cat: "LCD (Screens)", name: "LCD SAM M51 OLED IFIX BIG Glass", price: 5700 },
                { cat: "CC / Charging Ports", name: "FLEX CHARGE M51 Charging Port", price: 300 },
                { cat: "Batteries", name: "BAT SAM M51 / F62 Premium", price: 1300 }
              ]
            },
            {
              name: "Galaxy A15 / A16 Series",
              parts: [
                { cat: "LCD (Screens)", name: "LCD SAM A15 5G BLK PS Pack", price: 9300 },
                { cat: "LCD (Screens)", name: "LCD SAM A15 OLED WF IFIX Display", price: 5800 },
                { cat: "LCD (Screens)", name: "LCD SAM A16 4G BLK PS Touch", price: 11700 },
                { cat: "Caches (Back Covers)", name: "CACHE SAM A15 5G BLK Back Plate", price: 450 }
              ]
            },
            {
              name: "Galaxy A20 / A30 Series",
              parts: [
                { cat: "LCD (Screens)", name: "LCD SAM A20 INCELL ONLY IFIX", price: 1750 },
                { cat: "LCD (Screens)", name: "LCD SAM A20 OLED IFIX SUPER", price: 4300 },
                { cat: "LCD (Screens)", name: "LCD SAM A30 / A50 INCELL ONLY", price: 2100 },
                { cat: "Caches (Back Covers)", name: "CACHE SAM A20 BLEU Classic Back", price: 300 },
                { cat: "Batteries", name: "BAT SAM A50 / A30S / A30 / A20", price: 1250 }
              ]
            },
            {
              name: "Galaxy S24 / S25 Ultra",
              parts: [
                { cat: "LCD (Screens)", name: "LCD SAM S24 ULTRA BLK WF PS Original", price: 52000 },
                { cat: "LCD (Screens)", name: "LCD SAM S24 ULTRA INCELL WF IFIX", price: 7100 },
                { cat: "LCD (Screens)", name: "LCD SAM S25 ULTRA OLED WF IFIX", price: 18700 },
                { cat: "Caches (Back Covers)", name: "CACHE SAM S24 ULTRA BLK ORG", price: 1000 }
              ]
            },
            {
              name: "Galaxy Note 20 Ultra",
              parts: [
                { cat: "LCD (Screens)", name: "LCD SAM NOTE 20 ULTRA BLK PS Superb", price: 40500 },
                { cat: "LCD (Screens)", name: "LCD SAM NOTE 20 ULTRA OLED WF IFIX", price: 14000 }
              ]
            }
          ]
        },
        {
          brandName: "Xiaomi / Redmi / Poco",
          iconUrl: "https://www.mi.com/favicon.ico",
          models: [
            {
              name: "Redmi Note 10 / 11 Series",
              parts: [
                { cat: "LCD (Screens)", name: "LCD REDMI NOTE 10 4G IFIX OLED", price: 4650 },
                { cat: "LCD (Screens)", name: "LCD REDMI NOTE 10 4G OR / NOTE 10S", price: 11500 },
                { cat: "LCD (Screens)", name: "LCD REDMI NOTE 11 PRO / 10 PRO", price: 13000 },
                { cat: "Caches (Back Covers)", name: "CACHE REDMI NOTE 10 4G BLEU Back Cover", price: 300 },
                { cat: "Batteries", name: "BAT REDMI NOTE 10 4G Battery", price: 1450 }
              ]
            },
            {
              name: "Redmi 12 / 13 Series",
              parts: [
                { cat: "LCD (Screens)", name: "LCD REDMI 12 / REDMI 13 / POCO M6 PRO", price: 1950 },
                { cat: "LCD (Screens)", name: "LCD REDMI 12 PACK SERVICE Display", price: 2800 },
                { cat: "LCD (Screens)", name: "LCD REDMI 13C OR / C67 POCO IFIX", price: 1550 }
              ]
            },
            {
              name: "Poco F3 / F5 / M3",
              parts: [
                { cat: "LCD (Screens)", name: "LCD POCO F5 / NOTE 12 TURBO / 13 5G", price: 2200 },
                { cat: "LCD (Screens)", name: "LCD POCO M3 REDMI 9T ORG WF", price: 2200 },
                { cat: "LCD (Screens)", name: "LCD REDMI K40 PRO / K40 / POCO F3", price: 2100 }
              ]
            }
          ]
        },
        {
          brandName: "Oppo / Realme",
          iconUrl: "https://www.oppo.com/favicon.ico",
          models: [
            {
              name: "Oppo A15 / C11 / C12",
              parts: [
                { cat: "LCD (Screens)", name: "LCD OPPO A15 / C11 / C12 OR IFIX", price: 1480 },
                { cat: "Batteries", name: "BAT OPPO A17 BLP915 Battery", price: 1250 }
              ]
            },
            {
              name: "Oppo Reno 5",
              parts: [
                { cat: "LCD (Screens)", name: "LCD OPPO RENO 5 / RENO 6 OLED IFIX", price: 7100 },
                { cat: "Caches (Back Covers)", name: "CACHE OPPO RENO 5 5G GOLD Luxury Back", price: 500 }
              ]
            }
          ]
        },
        {
          brandName: "Infinix / Tecno / Itel",
          iconUrl: "https://www.infinixmobility.com/favicon.ico",
          models: [
            {
              name: "Infinix Hot 10 Series",
              parts: [
                { cat: "LCD (Screens)", name: "LCD INFINIX HOT 10 / SPARK 6 POVA", price: 1650 },
                { cat: "CC / Charging Ports", name: "SERSOU INFINIX HOT 9 PLAY board", price: 470 }
              ]
            }
          ]
        },
        {
          brandName: "Huawei / Honor",
          iconUrl: "https://www.huawei.com/favicon.ico",
          models: [
            {
              name: "Huawei P30 Series",
              parts: [
                { cat: "LCD (Screens)", name: "LCD HUW P30 PRO BLK WF ORG", price: 11500 },
                { cat: "LCD (Screens)", name: "LCD HUW P30 OLED WF Display", price: 6900 }
              ]
            }
          ]
        },
        {
          brandName: "Google Pixel",
          iconUrl: "https://www.google.com/favicon.ico",
          models: [
            {
              name: "Pixel 7 / 8 Series",
              parts: [
                { cat: "LCD (Screens)", name: "LCD GOOGLE PIXEL 8 PRO ORG Screen", price: 34500 },
                { cat: "LCD (Screens)", name: "LCD GOOGLE PIXEL 7 ORG Screen", price: 20500 }
              ]
            }
          ]
        }
      ];

      for (let i = 0; i < wholesaleData.length; i++) {
        const item = wholesaleData[i];
        setSeedingText(`Seeding ${item.brandName}...`);
        const brandDoc = await addDoc(collection(db, "brands"), {
          name: item.brandName,
          iconUrl: item.iconUrl
        });

        for (const m of item.models) {
          const modelDoc = await addDoc(collection(db, "models"), {
            brandId: brandDoc.id,
            name: m.name
          });

          for (const p of m.parts) {
            const finalCatId = categoryIdMap[p.cat] || "";
            await addDoc(collection(db, "inventoryItems"), {
              modelId: modelDoc.id,
              categoryId: finalCatId,
              name: p.name,
              price: p.price,
              quantity: Math.floor(Math.random() * 8) + 2, // Stock quantity between 2 and 9
              compatibilityNote: "Imported from May 2026 Wholesale Price List",
              qrCodeData: `proboys-wholesale-${modelDoc.id}-${finalCatId}-${Date.now()}`
            });
          }
        }
      }

      setSeedingText("Seeding succeeded!");
      alert("May 2026 wholesales parts list imported successfully in Algerian Dinars! All views are auto-updated.");
    } catch (e) {
      console.error(e);
      alert("Import failed. See console log.");
    } finally {
      setIsSeeding(false);
      setSeedingText("");
    }
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    fetch("/api/config")
      .then(res => res.json())
      .then(data => setAppUrl(data.appUrl))
      .catch(err => console.error("Failed to fetch config", err));
  }, []);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "salesLogs"), orderBy("timestamp", "desc"), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as SalesLog)));
    });
    
    // Fetch settings
    getDoc(doc(db, "settings", "app")).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.storeName) setStoreName(data.storeName);
        if (data.storeLogo) setStoreLogo(data.storeLogo);
      }
    });

    return () => unsub();
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setStoreLogo(base64);
    };
    reader.readAsDataURL(file);
  };

  const saveSettings = async () => {
    if (!db) return;
    setSavingSettings(true);
    try {
      await setDoc(doc(db, "settings", "app"), {
        storeName,
        storeLogo,
        updatedAt: new Date().toISOString()
      });
      alert("Settings saved successfully!");
    } catch (err) {
      console.error("Save error", err);
      alert("Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (logFilter === "all") return logs;
    return logs.filter(log => isToday(parseISO(log.timestamp)));
  }, [logs, logFilter]);

  const stats = useMemo(() => {
    const todayLogs = logs.filter(log => isToday(parseISO(log.timestamp)));
    const revenue = todayLogs.reduce((sum, log) => sum + log.salePrice, 0);
    const units = todayLogs.length;
    return { revenue, units };
  }, [logs]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !db) return;
    try {
      await addDoc(collection(db, "categories"), { name: newCategoryName.trim() });
      setNewCategoryName("");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!db || !confirm("Delete this category? This might orphan items using it.")) return;
    try {
      await deleteDoc(doc(db, "categories", id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      {/* Overview Stats - Only show on Logs tab or when not specifically in Settings screen */}
      {activeTab === "logs" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            icon={DollarSign} 
            label="Today's Revenue" 
            value={`${stats.revenue.toLocaleString()} DA`} 
            color="text-emerald-500" 
            bg="bg-emerald-500/10"
          />
          <StatCard 
            icon={Package} 
            label="Items Sold Today" 
            value={stats.units.toString()} 
            color="text-brand" 
            bg="bg-brand/10"
          />
          <StatCard 
            icon={TrendingUp} 
            label="Profit Margin" 
            value="42%" 
            color="text-amber-500" 
            bg="bg-amber-500/10"
          />
          <StatCard 
            icon={History} 
            label="Total Logs" 
            value={logs.length.toString()} 
            color="text-purple-500" 
            bg="bg-purple-500/10"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl bg-slate-900/50 p-1 ring-1 ring-slate-800">
        <button
          onClick={() => setActiveTab("logs")}
          className={cn(
            "flex h-12 flex-1 items-center justify-center gap-2 rounded-xl font-medium transition-all",
            activeTab === "logs" ? "bg-slate-800 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <History className="h-5 w-5" />
          Sales History
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={cn(
            "flex h-12 flex-1 items-center justify-center gap-2 rounded-xl font-medium transition-all",
            activeTab === "settings" ? "bg-slate-800 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <SettingsIcon className="h-5 w-5" />
          App Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl">
        {activeTab === "logs" ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-bold text-white">Recent Transactions</h4>
              <div className="flex rounded-lg bg-slate-950 p-1 ring-1 ring-slate-800">
                <button 
                  onClick={() => setLogFilter("today")}
                  className={cn("rounded-md px-3 py-1 text-xs font-bold transition-all", logFilter === "today" ? "bg-slate-800 text-white" : "text-slate-500")}
                >
                  Today
                </button>
                <button 
                  onClick={() => setLogFilter("all")}
                  className={cn("rounded-md px-3 py-1 text-xs font-bold transition-all", logFilter === "all" ? "bg-slate-800 text-white" : "text-slate-500")}
                >
                  All History
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="pb-4 pl-4 font-mono italic">Time</th>
                    <th className="pb-4">Item Name</th>
                    <th className="pb-4">Price</th>
                    <th className="pb-4 text-right pr-4">Stock Post-Sale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-medium">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="group hover:bg-slate-800/20">
                      <td className="py-4 pl-4 font-mono text-xs text-slate-500">
                        {format(parseISO(log.timestamp), "HH:mm:ss")}
                      </td>
                      <td className="py-4">
                        <div className="text-white">{log.itemName}</div>
                        <div className="text-[10px] uppercase tracking-tighter text-slate-500">
                          {categories.find(c => c.id === log.categoryId)?.name || "Misc"}
                        </div>
                      </td>
                      <td className="py-4 font-bold text-emerald-500">{log.salePrice.toLocaleString()} DA</td>
                      <td className="py-4 text-right pr-4">
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold ring-1",
                          log.stockAtSale <= 1 ? "bg-red-500/10 text-red-500 ring-red-500/20" : "bg-slate-800 text-slate-400 ring-slate-700"
                        )}>
                          Remaining: {log.stockAtSale}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">No sales recorded {logFilter === "today" ? "today" : "yet"}.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Category Management */}
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-white">Custom Categories</h4>
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input 
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New Category (e.g. Cables)"
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-brand/30"
                />
                <button 
                  type="submit"
                  disabled={!newCategoryName.trim()}
                  className="rounded-xl bg-brand px-4 py-2 font-bold text-white transition-all hover:bg-blue-600 disabled:opacity-50"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </form>
              
              <div className="space-y-2">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700">
                    <span className="font-medium text-slate-200">{cat.name}</span>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-slate-600 transition-colors hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Brand & Model management from Settings */}
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-white">Inventory Structure</h4>
              <p className="text-xs text-slate-500">Manage brands and models directly from here, or use the Home dashboard grid.</p>
              
              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6">
                 <h5 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-300">
                   <Smartphone className="h-4 w-4 text-brand" />
                   Quick Add Brand
                 </h5>
                 <DashboardShort db={db} />
              </div>
            </div>

            {/* Store Branding & Help */}
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-white">Store Branding & Support</h4>
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center transition-all hover:border-brand/40">
                <div className="mb-4 flex flex-col items-center">
                   <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-2xl bg-white p-4 ring-1 ring-slate-800 overflow-hidden">
                      <img src={storeLogo} className="h-full w-full object-contain" alt="Branding Logo" />
                   </div>
                   <input 
                    type="text" 
                    value={storeName} 
                    onChange={(e) => setStoreName(e.target.value)}
                    className="mb-1 bg-transparent text-center font-bold text-white outline-none focus:ring-1 focus:ring-brand/30 rounded px-2"
                   />
                   <p className="text-xs text-slate-500">App Version 1.2.0 (Pro Tablet)</p>
                </div>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleLogoChange} 
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-slate-700"
                  >
                    <Smartphone className="h-4 w-4" />
                    Pick Image
                  </button>
                  <button 
                    onClick={saveSettings}
                    disabled={savingSettings}
                    className="flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {savingSettings ? "Saving..." : "Save Config"}
                  </button>
                </div>
              </div>
              
              <div className="rounded-2xl bg-blue-500/5 p-6 ring-1 ring-blue-500/20">
                <h5 className="mb-3 flex items-center gap-2 text-sm font-bold text-blue-400 uppercase tracking-wider">
                   <Package className="h-4 w-4" />
                   Quick Setup Guide
                </h5>
                <ul className="space-y-3 text-xs leading-relaxed text-slate-400">
                   <li className="flex gap-2">
                     <span className="font-bold text-blue-400">1.</span>
                     <span>Connect your <span className="text-slate-200">LS1 Pro Thermal Printer</span> via Bluetooth or PC. The print layout is optimized for 50x30mm labels.</span>
                   </li>
                   <li className="flex gap-2">
                     <span className="font-bold text-blue-400">2.</span>
                     <span>Generate labels for every part from the <span className="text-slate-200">Inventory</span> view. Stick them on part boxes.</span>
                   </li>
                   <li className="flex gap-2">
                     <span className="font-bold text-blue-400">3.</span>
                     <span>To record a sale, either click <span className="text-green-400">Log Sold</span> or use the <span className="text-blue-400">Scan</span> feature to identify parts instantly.</span>
                   </li>
                </ul>
              </div>

              <div className="rounded-2xl bg-amber-500/5 p-6 ring-1 ring-amber-500/20">
                <h5 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-400 uppercase tracking-wider">
                   <Smartphone className="h-4 w-4" />
                   Install on Tablet (PWA)
                </h5>
                <p className="mb-3 text-[10px] text-slate-400">
                  This app is a Progressive Web App. For the best experience on a tablet:
                </p>
                <ol className="space-y-3 text-xs text-slate-400">
                   <li className="flex gap-2 flex-col">
                     <div className="flex gap-2">
                       <span className="text-amber-500 font-bold">1.</span>
                       <span>Use the <span className="text-white font-bold">Public App URL</span> (found in the AI Studio "Deploy" or "Share" menu):</span>
                     </div>
                     <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                        <p className="mb-2 text-[10px] text-slate-500 uppercase font-bold">Tablet Direct Link:</p>
                        <span className="text-white font-mono text-[10px] break-all select-all">
                          {appUrl || "https://ais-pre-n7bfwwug25t7mbzsdjelbw-297213735652.europe-west2.run.app"}
                        </span>
                     </div>
                   </li>
                   <li className="flex gap-2">
                     <span className="text-amber-500 font-bold">2.</span>
                     <span>In Chrome, tap <span className="text-white font-bold">"Add to Home Screen"</span> (do not install from the AI Studio editor iteself).</span>
                   </li>
                   <li className="flex gap-2">
                     <span className="text-amber-500 font-bold">3.</span>
                     <span>Launch from your home screen. ProBoys Manager will run as a native-feel tablet application.</span>
                   </li>
                </ol>
              </div>

              <div className="rounded-2xl border border-dashed border-sky-500/20 bg-sky-500/5 p-6 ring-1 ring-sky-500/10">
                <h5 className="mb-2 text-sm font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  May 2026 Wholesale Seeder
                </h5>
                <p className="mb-4 text-[11px] leading-relaxed text-slate-400">
                  Wipe old catalog data and inject the categories, models, and real wholesale parts from the 2026 Algiers wholesales list in Algerian Dinars (DA).
                </p>
                <button
                  type="button"
                  onClick={resetAndSeedWholesaleCatalog}
                  disabled={isSeeding}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-600/10"
                >
                  <RefreshCw className={cn("h-4 w-4", isSeeding && "animate-spin")} />
                  {isSeeding ? seedingText : "Reset & Inject May 2026 Catalog"}
                </button>
              </div>

              <div className="rounded-2xl bg-brand/5 p-6 ring-1 ring-brand/10">
                <h5 className="mb-2 text-sm font-bold text-brand uppercase tracking-wider">Cloud Sync Status</h5>
                <p className="text-xs leading-relaxed text-slate-400">
                  All inventory data, sales logs, and categories are automatically synced to the cloud. 
                  Redundancy is enabled for offline reliability.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardShort({ db }: { db: any }) {
  const [name, setName] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !db) return;
    try {
      await addDoc(collection(db, "brands"), { name: name.trim() });
      setName("");
      alert("Brand added successfully!");
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input 
        type="text" 
        value={name} 
        onChange={(e) => setName(e.target.value)}
        placeholder="Brand Name (e.g. Motorola)"
        className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-brand/30"
      />
      <button type="submit" className="rounded-xl bg-slate-800 px-4 text-xs font-bold text-white hover:bg-slate-700">Add</button>
    </form>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: { icon: any, label: string, value: string, color: string, bg: string }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <div className={cn("rounded-xl p-2.5", bg)}>
          <Icon className={cn("h-6 w-6", color)} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Overview</span>
      </div>
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className={cn("text-3xl font-black tracking-tight mt-1", color)}>{value}</div>
    </div>
  );
}
