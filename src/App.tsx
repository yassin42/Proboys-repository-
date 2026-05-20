/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  LayoutDashboard, 
  History, 
  Settings as SettingsIcon, 
  Plus, 
  Search, 
  ArrowLeft,
  QrCode,
  Package,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  LogOut,
  User,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  Timestamp, 
  getDocs,
  setDoc,
  getDoc,
  where
} from "firebase/firestore";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { db, auth, signIn } from "./lib/firebase";
import { cn } from "./lib/utils";
import { Brand, Model, Category, InventoryItem, SalesLog, NavigationScreen } from "./types";

// --- Components ---
// I will create individual component files eventually, but for now, I'll put them here or prepare to import them
import Dashboard from "./components/Dashboard";
import ModelsGrid from "./components/ModelsGrid";
import InventoryList from "./components/InventoryList";
import AdminPanel from "./components/AdminPanel";
import Scanner from "./components/Scanner";
import ChatRoom from "./components/ChatRoom";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<NavigationScreen>(NavigationScreen.DASHBOARD);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // States for data
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeName, setStoreName] = useState("ProBoys");
  const [storeLogo, setStoreLogo] = useState("/logo.png");

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db || !user) return;

    // Listen to brands with resilient error handling
    const brandsUnsub = onSnapshot(collection(db, "brands"), 
      (snap) => {
        setBrands(snap.docs.map(d => ({ id: d.id, ...d.data() } as Brand)));
      },
      (error) => {
        console.warn("Offline or failed reading brands snapshot:", error);
      }
    );

    // Listen to categories with resilient error handling
    const categoriesUnsub = onSnapshot(collection(db, "categories"), 
      (snap) => {
        setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
      },
      (error) => {
        console.warn("Offline or failed reading categories snapshot:", error);
      }
    );

    // Listen to settings with resilient error handling
    const settingsUnsub = onSnapshot(doc(db, "settings", "app"), 
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.storeName) setStoreName(data.storeName);
          if (data.storeLogo) setStoreLogo(data.storeLogo);
        }
      },
      (error) => {
        console.warn("Offline or failed reading settings snapshot:", error);
      }
    );

    // Seeding logic (one-time check)
    const seedInitialData = async () => {
      if (!db) return;
      const brandsSnap = await getDocs(collection(db, "brands"));
      if (brandsSnap.empty) {
        console.log("Seeding brands and models...");
        const initialData = [
          { 
            brand: { name: "Apple", iconUrl: "https://www.apple.com/favicon.ico" },
            models: ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15", "iPhone 14 Plus", "iPhone 14", "iPhone 13", "iPhone 12", "iPhone 11"]
          },
          { 
            brand: { name: "Samsung", iconUrl: "https://www.samsung.com/favicon.ico" },
            models: ["Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S23 Ultra", "Galaxy S23", "Galaxy A54", "Galaxy A34", "Galaxy A15", "Galaxy M15"]
          },
          {
            brand: { name: "Xiaomi", iconUrl: "https://www.mi.com/favicon.ico" },
            models: ["Xiaomi 14 Ultra", "Xiaomi 14", "Redmi Note 13 Pro+", "Redmi Note 13", "Poco F6 Pro", "Poco X6 Pro"]
          },
          {
            brand: { name: "Huawei", iconUrl: "https://www.huawei.com/favicon.ico" },
            models: ["Pura 70 Ultra", "P60 Pro", "Mate 60 Pro", "Nova 12", "Mate Pad 11"]
          },
          {
            brand: { name: "Google", iconUrl: "https://www.google.com/favicon.ico" },
            models: ["Pixel 8 Pro", "Pixel 8", "Pixel 7a", "Pixel 7 Pro", "Pixel 6 Pro"]
          },
          {
            brand: { name: "OnePlus", iconUrl: "https://www.oneplus.com/favicon.ico" },
            models: ["OnePlus 12", "OnePlus 12R", "OnePlus Open", "Nord 3", "OnePlus 11"]
          }
        ];
        
        for (const data of initialData) {
          const brandDoc = await addDoc(collection(db, "brands"), data.brand);
          for (const m of data.models) {
            await addDoc(collection(db, "models"), { brandId: brandDoc.id, name: m });
          }
        }
      }

      const categoriesSnap = await getDocs(collection(db, "categories"));
      if (categoriesSnap.empty) {
        const initialCategories = [
          "LCD (Screens)",
          "Batteries",
          "Caches (Back Covers)",
          "CC / Charging Ports",
          "NAP / Flex Cables",
          "Speakers & Buzzers"
        ];
        for (const c of initialCategories) {
          await addDoc(collection(db, "categories"), { name: c });
        }
      }
    };

    seedInitialData();

    return () => {
      brandsUnsub();
      categoriesUnsub();
      settingsUnsub();
    };
  }, [user]);

  const handleBrandSelect = (brand: Brand) => {
    setSelectedBrand(brand);
    setCurrentScreen(NavigationScreen.MODELS);
  };

  const handleModelSelect = (model: Model) => {
    setSelectedModel(model);
    setCurrentScreen(NavigationScreen.INVENTORY);
  };

  const goBack = () => {
    if (currentScreen === NavigationScreen.INVENTORY) {
      setCurrentScreen(NavigationScreen.MODELS);
    } else if (currentScreen === NavigationScreen.MODELS) {
      setCurrentScreen(NavigationScreen.DASHBOARD);
      setSelectedBrand(null);
    } else {
      setCurrentScreen(NavigationScreen.DASHBOARD);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 border-4 border-brand border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md"
        >
          <div className="mb-8 flex justify-center">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-800 focus-within:ring-brand transition-all">
              <img src={storeLogo} className="h-16 w-16 object-contain" alt="ProBoys Logo" />
            </div>
          </div>
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-white">{storeName}</h1>
          <p className="mb-8 text-slate-400 font-medium">
            Phone Repair & Accessories
          </p>
          <button
            onClick={signIn}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-brand px-6 py-4 font-semibold text-white transition-all hover:bg-blue-600 active:scale-95"
          >
            <User className="h-5 w-5" />
            Admin Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 z-50 flex w-20 flex-col items-center border-r border-slate-800 bg-slate-900 py-8 lg:w-24">
        <div className="mb-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white p-2 text-brand ring-1 ring-slate-800 overflow-hidden">
            <img src={storeLogo} className="h-full w-full object-contain" alt="Logo" />
          </div>
        </div>
        
        <nav className="flex flex-1 flex-col gap-8">
          <NavIcon 
            icon={LayoutDashboard} 
            active={currentScreen === NavigationScreen.DASHBOARD} 
            onClick={() => {
              setCurrentScreen(NavigationScreen.DASHBOARD);
              setSelectedBrand(null);
              setSelectedModel(null);
            }} 
            label="Home"
          />
          <NavIcon 
            icon={History} 
            active={currentScreen === NavigationScreen.ADMIN} 
            onClick={() => setCurrentScreen(NavigationScreen.ADMIN)} 
            label="Logs"
          />
          <NavIcon 
            icon={QrCode} 
            active={currentScreen === NavigationScreen.SCANNER} 
            onClick={() => setCurrentScreen(NavigationScreen.SCANNER)} 
            label="Scan"
          />
          <NavIcon 
            icon={MessageSquare} 
            active={currentScreen === NavigationScreen.CHAT} 
            onClick={() => setCurrentScreen(NavigationScreen.CHAT)} 
            label="Chat"
          />
          <NavIcon 
            icon={SettingsIcon} 
            active={currentScreen === NavigationScreen.SETTINGS} 
            onClick={() => setCurrentScreen(NavigationScreen.SETTINGS)} 
            label="Settings"
          />
        </nav>

        <div className="mt-auto flex flex-col gap-6">
          <button 
            onClick={() => auth?.signOut()}
            className="group relative flex h-12 w-12 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-6 w-6" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-20 flex-1 overflow-hidden lg:ml-24">
        <header className="flex h-20 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-8 backdrop-blur-md">
          <div className="flex items-center gap-4">
            {(currentScreen !== NavigationScreen.DASHBOARD || selectedBrand) && (
              <button 
                onClick={goBack}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800/50 text-slate-400 transition-all hover:bg-slate-700 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-xl font-semibold text-white">
              {currentScreen === NavigationScreen.DASHBOARD && "ProBoys Dash"}
              {currentScreen === NavigationScreen.MODELS && `${selectedBrand?.name} Models`}
              {currentScreen === NavigationScreen.INVENTORY && `${selectedModel?.name} Stock`}
              {currentScreen === NavigationScreen.ADMIN && "Sales History"}
              {currentScreen === NavigationScreen.SETTINGS && (
                "System Settings"
              )}
              {currentScreen === NavigationScreen.CHAT && (
                "Admin Chat"
              )}
              {currentScreen === NavigationScreen.SCANNER && "QR Scanner"}
            </h2>
          </div>

          <div className="relative flex-1 max-w-md mx-8">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input 
              type="text"
              placeholder="Search brands, models, items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-800/50 py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none ring-brand/30 focus:ring-2"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900 px-4 py-1.5">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-slate-400">System Ready</span>
            </div>
            {user?.photoURL && (
              <img src={user.photoURL} className="h-10 w-10 rounded-full ring-2 ring-brand/20" alt="profile" />
            )}
          </div>
        </header>

        <div className="h-[calc(100vh-5rem)] overflow-y-auto p-8 scroll-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen + (selectedBrand?.id || "") + (selectedModel?.id || "")}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentScreen === NavigationScreen.DASHBOARD && (
                <Dashboard 
                  brands={brands} 
                  onBrandSelect={handleBrandSelect} 
                  searchQuery={searchQuery}
                />
              )}
              {currentScreen === NavigationScreen.MODELS && selectedBrand && (
                <ModelsGrid 
                  brand={selectedBrand} 
                  onModelSelect={handleModelSelect}
                  searchQuery={searchQuery}
                />
              )}
              {currentScreen === NavigationScreen.INVENTORY && selectedModel && (
                <InventoryList 
                  model={selectedModel} 
                  categories={categories}
                  searchQuery={searchQuery}
                />
              )}
              {currentScreen === NavigationScreen.ADMIN && (
                <AdminPanel 
                  categories={categories}
                  initialTab="logs"
                />
              )}
              {currentScreen === NavigationScreen.SETTINGS && (
                <AdminPanel 
                  categories={categories}
                  initialTab="settings"
                />
              )}
              {currentScreen === NavigationScreen.CHAT && (
                <ChatRoom user={user} />
              )}
              {currentScreen === NavigationScreen.SCANNER && (
                <Scanner 
                  onScan={async (result) => {
                    if (!db) return;
                    try {
                      const q = query(collection(db, "inventoryItems"), where("qrCodeData", "==", result));
                      const snap = await getDocs(q);
                      if (!snap.empty) {
                        const itemData = { id: snap.docs[0].id, ...snap.docs[0].data() } as InventoryItem;
                        
                        // Find model
                        const modelDoc = await getDoc(doc(db, "models", itemData.modelId));
                        if (modelDoc.exists()) {
                          const modelData = { id: modelDoc.id, ...modelDoc.data() } as Model;
                          
                          // Find brand for the model
                          const brandDoc = await getDoc(doc(db, "brands", modelData.brandId));
                          if (brandDoc.exists()) {
                            const brandData = { id: brandDoc.id, ...brandDoc.data() } as Brand;
                            
                            setSelectedBrand(brandData);
                            setSelectedModel(modelData);
                            setCurrentScreen(NavigationScreen.INVENTORY);
                          }
                        }
                      } else {
                        alert("Item not found in database.");
                      }
                    } catch (e) {
                      console.error("Scan error", e);
                    }
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavIcon({ icon: Icon, active, onClick, label }: { icon: any, active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all",
        active ? "bg-brand text-white shadow-lg shadow-brand/40 ring-4 ring-brand/10" : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
      )}
    >
      <Icon className="h-6 w-6" />
      <span className="absolute left-full ml-4 rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}
