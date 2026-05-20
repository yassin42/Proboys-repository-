import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Package, 
  AlertTriangle, 
  Tag, 
  Trash2, 
  Edit3, 
  ChevronDown, 
  ChevronUp,
  ShoppingCart,
  Printer,
  QrCode as QrIcon,
  Bluetooth,
  Check,
  RefreshCw,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  increment,
  Timestamp 
} from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { db } from "../lib/firebase";
import { Model, Category, InventoryItem, SalesLog } from "../types";
import { cn } from "../lib/utils";
import { useBluetoothPrinter } from "../lib/bluetoothPrinter";

interface InventoryListProps {
  model: Model;
  categories: Category[];
  searchQuery: string;
}

export default function InventoryList({ model, categories, searchQuery }: InventoryListProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showQR, setShowQR] = useState<InventoryItem | null>(null);
  const [printingItem, setPrintingItem] = useState<InventoryItem | null>(null);
  const [btError, setBtError] = useState<string | null>(null);
  const [btSuccess, setBtSuccess] = useState<boolean>(false);

  // Bluetooth Direct Printer Hook
  const {
    status: btStatus,
    deviceName: btName,
    protocol: btProtocol,
    setProtocol: setBtProtocol,
    connectionType: btConnectionType,
    connectBle,
    connectSerial,
    disconnect: disconnectBt,
    print: printBt,
    printTestPage: printBtTest
  } = useBluetoothPrinter();

  const [baudRate, setBaudRate] = useState<number>(9600);

  // Form State
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    categoryId: categories[0]?.id || "",
    name: "",
    price: 0,
    quantity: 0,
    compatibilityNote: ""
  });

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "inventoryItems"), where("modelId", "==", model.id));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
    });
    return () => unsub();
  }, [model.id]);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.compatibilityNote?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedItems = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    categories.forEach(cat => {
      groups[cat.id] = filteredItems.filter(item => item.categoryId === cat.id);
    });
    // Add "Other" group for items with missing/old categories
    const other = filteredItems.filter(item => !categories.find(c => c.id === item.categoryId));
    if (other.length > 0) groups["others"] = other;
    return groups;
  }, [filteredItems, categories]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !newItem.name || !newItem.categoryId) return;
    try {
      await addDoc(collection(db, "inventoryItems"), {
        ...newItem,
        modelId: model.id,
        qrCodeData: `mobifix-item-${Date.now()}`
      });
      setIsAdding(false);
      setNewItem({
        categoryId: categories[0]?.id || "",
        name: "",
        price: 0,
        quantity: 0,
        compatibilityNote: ""
      });
    } catch (e) { console.error(e); }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !editingItem) return;
    try {
      const { id, ...data } = editingItem;
      await updateDoc(doc(db, "inventoryItems", id), data);
      setEditingItem(null);
    } catch (e) { console.error(e); }
  };

  const handleLogSale = async (item: InventoryItem) => {
    if (!db || item.quantity <= 0) return;
    try {
      // 1. Decrement Quantity
      await updateDoc(doc(db, "inventoryItems", item.id), {
        quantity: increment(-1)
      });

      // 2. Log Transaction
      await addDoc(collection(db, "salesLogs"), {
        itemId: item.id,
        itemName: item.name,
        categoryId: item.categoryId,
        salePrice: item.price,
        timestamp: new Date().toISOString(),
        stockAtSale: item.quantity - 1
      } as SalesLog);
      
      // Success feedback could be added here
    } catch (e) { console.error(e); }
  };

  const handlePrintLabel = (item: InventoryItem) => {
    // Generate a printable window for thermal label
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const qrSvg = document.getElementById(`qr-${item.id}`)?.outerHTML || "";
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Label</title>
          <style>
            @page { size: 50mm 30mm; margin: 0; }
            body { 
              font-family: sans-serif; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center;
              width: 50mm;
              height: 30mm;
              padding: 2mm;
              box-sizing: border-box;
              text-align: center;
            }
            .logo { font-weight: bold; font-size: 14px; margin-bottom: 2px; }
            .model { font-size: 12px; margin-bottom: 1px; font-weight: 600; }
            .item { font-size: 10px; margin-bottom: 3px; }
            .price { font-weight: bold; font-size: 16px; margin-top: 2px; }
            svg { width: 12mm; height: 12mm; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="logo">MobiFix</div>
          <div class="model">${model.name}</div>
          <div class="item">${item.name}</div>
          ${qrSvg}
          <div class="price">${item.price} DA</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-white">Stock for {model.name}</h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 font-semibold text-white transition-all hover:bg-blue-600 active:scale-95"
        >
          <Plus className="h-5 w-5" />
          Add Part/Item
        </button>
      </div>

      <div className="space-y-12">
        {categories.map(category => {
          const categoryItems = groupedItems[category.id] || [];
          if (categoryItems.length === 0 && !isAdding) return null;

          return (
            <div key={category.id} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-0.5 flex-1 bg-slate-800" />
                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500">{category.name}</h4>
                <div className="h-0.5 flex-1 bg-slate-800" />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {categoryItems.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    className={cn(
                      "group relative flex flex-col rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden transition-all hover:border-slate-700",
                      item.quantity <= 1 && "border-red-900/50 bg-red-950/20"
                    )}
                  >
                    {item.quantity <= 1 && (
                      <div className="flex items-center gap-2 bg-red-500/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400 border-b border-red-500/20">
                        <AlertTriangle className="h-3 w-3" />
                        Low Stock Alert
                      </div>
                    )}
                    
                    <div className="p-6">
                      <div className="mb-4 flex items-start justify-between">
                        <div>
                          <h5 className="text-lg font-bold text-white">{item.name}</h5>
                          <p className="text-sm text-slate-400">{category.name}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-brand">{item.price} DA</div>
                          <div className={cn(
                            "text-sm font-medium",
                            item.quantity === 0 ? "text-red-500" : "text-emerald-500"
                          )}>
                            Stock: {item.quantity}
                          </div>
                        </div>
                      </div>

                      {item.compatibilityNote && (
                        <div className="mb-6 rounded-xl bg-slate-950/50 p-3 ring-1 ring-slate-800">
                          <p className="text-xs italic text-slate-400">
                            <span className="font-bold text-brand not-italic">Note: </span>
                            {item.compatibilityNote}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleLogSale(item)}
                          disabled={item.quantity <= 0}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-30 active:scale-95"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Log Sold
                        </button>
                        <button 
                          onClick={() => setEditingItem(item)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => setPrintingItem(item)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <div className="hidden">
                           <QRCodeSVG id={`qr-${item.id}`} value={item.qrCodeData} size={48} level="H" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {(isAdding || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl"
          >
            <h3 className="mb-8 text-2xl font-bold text-white">
              {isAdding ? `Add Part for ${model.name}` : `Edit ${editingItem?.name}`}
            </h3>
            
            <form 
              onSubmit={isAdding ? handleAddItem : handleUpdateItem}
              className="grid grid-cols-1 gap-6 md:grid-cols-2"
            >
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Item Name</label>
                  <input 
                    required
                    type="text"
                    value={isAdding ? newItem.name : editingItem?.name}
                    onChange={(e) => isAdding ? setNewItem({...newItem, name: e.target.value}) : setEditingItem({...editingItem!, name: e.target.value})}
                    placeholder="e.g. AMOLED Screen"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Category</label>
                  <select 
                    required
                    value={isAdding ? newItem.categoryId : editingItem?.categoryId}
                    onChange={(e) => isAdding ? setNewItem({...newItem, categoryId: e.target.value}) : setEditingItem({...editingItem!, categoryId: e.target.value})}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-brand/30"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Price (DA)</label>
                    <input 
                      required
                      type="number"
                      step="0.01"
                      value={isAdding ? newItem.price : editingItem?.price}
                      onChange={(e) => isAdding ? setNewItem({...newItem, price: parseFloat(e.target.value)}) : setEditingItem({...editingItem!, price: parseFloat(e.target.value)})}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Quantity</label>
                    <input 
                      required
                      type="number"
                      value={isAdding ? newItem.quantity : editingItem?.quantity}
                      onChange={(e) => isAdding ? setNewItem({...newItem, quantity: parseInt(e.target.value)}) : setEditingItem({...editingItem!, quantity: parseInt(e.target.value)})}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-brand/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Compatibility Notes</label>
                  <textarea 
                    value={isAdding ? newItem.compatibilityNote : editingItem?.compatibilityNote}
                    onChange={(e) => isAdding ? setNewItem({...newItem, compatibilityNote: e.target.value}) : setEditingItem({...editingItem!, compatibilityNote: e.target.value})}
                    placeholder="e.g. Also fits A13 / M15 models"
                    rows={2}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </div>

              <div className="col-span-full mt-4 flex gap-4">
                {editingItem && (
                  <button 
                    type="button"
                    onClick={async () => {
                      if (confirm("Delete this item?") && db) {
                        await deleteDoc(doc(db, "inventoryItems", editingItem.id));
                        setEditingItem(null);
                      }
                    }}
                    className="rounded-xl border border-red-900 bg-red-950/20 px-6 py-3 font-semibold text-red-500 transition-colors hover:bg-red-900/40"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                <div className="flex flex-1 gap-4">
                  <button 
                    type="button"
                    onClick={() => { setIsAdding(false); setEditingItem(null); }}
                    className="flex-1 rounded-xl bg-slate-800 py-3 font-semibold text-white transition-colors hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 rounded-xl bg-brand py-3 font-semibold text-white transition-all hover:bg-blue-600"
                  >
                    {isAdding ? "Add Item" : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Direct Bluetooth Thermal labels & Custom Printing Modal */}
      <AnimatePresence>
        {printingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Printer className="h-6 w-6 text-brand" />
                  <h3 className="text-xl font-bold text-white font-sans">Print Part Label</h3>
                </div>
                <button
                  onClick={() => {
                    setPrintingItem(null);
                    setBtError(null);
                    setBtSuccess(false);
                  }}
                  className="rounded-full bg-slate-800 p-1.5 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6 rounded-2xl bg-slate-950 p-4 border border-slate-800 font-sans">
                <div className="text-xs text-slate-400 uppercase font-black tracking-widest mb-1">Target Item</div>
                <div className="text-lg font-bold text-white">{printingItem.name}</div>
                <div className="text-sm text-brand font-medium">Model: {model.name}</div>
                <div className="text-sm font-semibold text-emerald-500 mt-1">{printingItem.price.toLocaleString()} DA</div>
              </div>

              {/* Multi-Channel Printer Section */}
              <div className="mb-6 space-y-4 rounded-3xl border border-slate-800 bg-slate-950/40 p-5 ring-1 ring-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bluetooth className={cn(
                      "h-5 w-5",
                      btStatus === "CONNECTED" ? "text-emerald-500 animate-pulse" :
                      btStatus === "CONNECTING" ? "text-amber-500 animate-pulse" : "text-slate-500"
                    )} />
                    <span className="text-sm font-bold text-white uppercase tracking-wider font-sans">Label Printer Interface</span>
                  </div>
                  <span className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider",
                    btStatus === "CONNECTED" ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20" :
                    btStatus === "CONNECTING" ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 animate-pulse" :
                    "bg-slate-850 text-slate-450"
                  )}>
                    {btStatus === "CONNECTED" ? `CONNECTED` : btStatus}
                  </span>
                </div>

                {/* Connection Details */}
                {btStatus === "CONNECTED" && (
                  <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-850 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-450">Active Device:</span>
                      <span className="text-white font-bold">{btName}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-450">Connection Channel:</span>
                      <span className="text-brand font-black tracking-wider uppercase">{btConnectionType}</span>
                    </div>
                    <div className="flex justify-between text-xs items-center">
                      <span className="text-slate-450">Form Factor Style:</span>
                      <span className="text-emerald-400">Direct Command Stream</span>
                    </div>
                  </div>
                )}

                {/* Info & Select Connection Action */}
                {btStatus === "DISCONNECTED" && (
                  <div className="space-y-4">
                    <p className="text-[11px] leading-relaxed text-slate-400 font-sans">
                      Connect to your <strong>ls1 pro 6f6d02</strong> printer. Since standard OS-paired classic Bluetooth devices can register as Virtual COM channels, <strong>Web Serial is the most reliable method for PC & Mac!</strong> If on Android/iOS, use direct Web Bluetooth BLE.
                    </p>

                    {/* Channel Selector Options */}
                    <div className="space-y-3.5 pt-1">
                      {/* Web Serial Card Option */}
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-white uppercase tracking-wider">Method A: Web Serial (Highly Recommended)</span>
                          <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black px-1.5 py-0.5 rounded-md">CLASSIC BT / USB</span>
                        </div>

                        {/* Baud rate grid input */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-450 uppercase font-bold shrink-0">Baud Rate:</span>
                          <div className="grid grid-cols-3 gap-1 flex-1">
                            {[9600, 38400, 115200].map((b) => (
                              <button
                                key={b}
                                type="button"
                                onClick={() => setBaudRate(b)}
                                className={cn(
                                  "py-1 text-[11px] font-mono font-bold rounded-lg border transition-all",
                                  baudRate === b
                                    ? "bg-brand border-brand text-white"
                                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                                )}
                              >
                                {b}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            setBtError(null);
                            try {
                              await connectSerial(baudRate);
                            } catch (e: any) {
                              setBtError(e?.message || "Serial request was canceled or failed.");
                            }
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand hover:bg-blue-600 font-semibold text-white text-xs py-2.5 transition-all shadow-md"
                        >
                          <Printer className="h-4 w-4" />
                          Connect Serial COM / SPP Port
                        </button>
                      </div>

                      {/* BLE Card Option */}
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-slate-300 uppercase tracking-wider">Method B: Web Bluetooth BLE Scan</span>
                          <span className="bg-blue-500/10 text-blue-400 text-[9px] font-black px-1.5 py-0.5 rounded-md">BLE DIRECT</span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            setBtError(null);
                            try {
                              await connectBle();
                            } catch (e: any) {
                              setBtError(e?.message || "Bluetooth scan was canceled or failed.");
                            }
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-slate-200 text-xs py-2.5 transition-all border border-slate-700"
                        >
                          <Bluetooth className="h-4 w-4 text-brand" />
                          Scan Bluetooth LE Printer
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Protocol / Language selection */}
                {btStatus === "CONNECTED" && (
                  <div className="space-y-2">
                    <div className="text-[10px] text-slate-450 uppercase font-bold tracking-wider pl-1 font-sans">Printer Format language</div>
                    <div className="grid grid-cols-2 gap-3 p-1 bg-slate-950 rounded-xl border border-slate-850">
                      <button
                        type="button"
                        onClick={() => setBtProtocol("TSPL")}
                        className={cn(
                          "py-2 text-xs font-bold rounded-lg transition-all",
                          btProtocol === "TSPL" ? "bg-brand text-white shadow" : "text-slate-400 hover:text-white"
                        )}
                      >
                        TSPL (Label Sticker)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBtProtocol("ESCPOS")}
                        className={cn(
                          "py-2 text-xs font-bold rounded-lg transition-all",
                          btProtocol === "ESCPOS" ? "bg-brand text-white shadow" : "text-slate-400 hover:text-white"
                        )}
                      >
                        ESC/POS (Receipt Text)
                      </button>
                    </div>
                  </div>
                )}

                {/* Bluetooth Actions */}
                <div className="flex flex-col gap-2 pt-1">
                  {btStatus === "CONNECTED" && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          setBtError(null);
                          setBtSuccess(false);
                          try {
                            await printBt(printingItem, model.name);
                            setBtSuccess(true);
                          } catch (e: any) {
                            setBtError(e?.message || "Print write block error.");
                          }
                        }}
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs py-3.5 transition-colors shadow-lg shadow-emerald-600/10"
                      >
                        <Check className="h-4 w-4" />
                        Print Label
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setBtError(null);
                          try {
                            await printBtTest();
                            setBtSuccess(true);
                          } catch (e: any) {
                            setBtError(e?.message || "Test print failed.");
                          }
                        }}
                        className="rounded-xl border border-slate-700 hover:border-slate-600 hover:bg-slate-800/40 text-slate-300 hover:text-white text-xs py-3.5 transition-colors font-medium"
                      >
                        Self-Test Label
                      </button>
                    </div>
                  )}

                  {btStatus !== "DISCONNECTED" && (
                    <button
                      type="button"
                      onClick={() => disconnectBt()}
                      className="text-center text-[10px] font-bold text-red-400 hover:text-red-300 pt-1"
                    >
                      Disconnect & Change Mode
                    </button>
                  )}
                </div>

                {btError && (
                  <div className="rounded-2xl bg-red-500/10 p-3.5 ring-1 ring-red-500/20 text-xs text-red-400 flex flex-col gap-1.5 font-sans leading-relaxed">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                      <strong>Error details:</strong>
                    </div>
                    <div className="pl-6 text-[11px] text-red-350">{btError}</div>
                    <div className="border-t border-red-505/20 mt-2 pt-2 text-[10px] text-slate-400">
                      <strong>Troubleshooting tips:</strong>
                      <ul className="list-disc pl-4 mt-1 space-y-1">
                        <li>Ensure the <strong>ls1 pro</strong> is powered on, has paper, and is not locked by another app.</li>
                        <li><strong>For Desktop/PC:</strong> Pair first in Windows/Mac settings, then select it using Web Serial COM channel above.</li>
                        <li>If permissions are blocked (iframe sandbox issue), click the Dev or Shared URL in a new direct browser tab!</li>
                      </ul>
                    </div>
                  </div>
                )}

                {btSuccess && (
                  <div className="rounded-xl bg-emerald-500/10 p-3 ring-1 ring-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 font-sans" />
                    <span>Printed successfully! Check your printer.</span>
                  </div>
                )}
              </div>

              {/* Web Standard Fallback */}
              <div className="space-y-2">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 font-sans">Local Backup Method</div>
                <button
                  type="button"
                  onClick={() => {
                    handlePrintLabel(printingItem);
                    setPrintingItem(null);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-semibold py-3 transition-colors border border-slate-700/50"
                >
                  <ExternalLink className="h-4 w-4 text-slate-400" />
                  System Print (Standard PDF with QR Code)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
