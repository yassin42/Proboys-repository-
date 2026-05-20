export interface Brand {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface Model {
  id: string;
  brandId: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface InventoryItem {
  id: string;
  modelId: string;
  categoryId: string;
  name: string;
  price: number;
  quantity: number;
  compatibilityNote?: string;
  qrCodeData: string;
}

export interface SalesLog {
  id: string;
  itemId: string;
  itemName: string;
  categoryId: string;
  salePrice: number;
  timestamp: string;
  stockAtSale: number;
}

export enum NavigationScreen {
  DASHBOARD = 'DASHBOARD',
  MODELS = 'MODELS',
  INVENTORY = 'INVENTORY',
  ADMIN = 'ADMIN',
  SCANNER = 'SCANNER',
  SETTINGS = 'SETTINGS',
  CHAT = 'CHAT'
}
