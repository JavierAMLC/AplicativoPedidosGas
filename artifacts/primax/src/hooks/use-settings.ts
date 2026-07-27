import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "primax_settings";

export interface Product {
  id: string;
  name: string;
  price: number;
}

export interface Settings {
  products: Product[];
  whatsappNumber: string; // e.g. "51987654321" with country code, or "" for no fixed number
}

const DEFAULT_SETTINGS: Settings = {
  products: [
    { id: "1", name: "Balón 10kg", price: 40 },
    { id: "2", name: "Balón 45kg", price: 45 },
    { id: "3", name: "Balón 5kg", price: 25 },
    { id: "4", name: "Gasolina", price: 0 },
  ],
  whatsappNumber: "",
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      products: parsed.products ?? DEFAULT_SETTINGS.products,
      whatsappNumber: parsed.whatsappNumber ?? DEFAULT_SETTINGS.whatsappNumber,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

// Singleton — shared across all hook instances
let _listeners: Array<() => void> = [];
let _settings: Settings = loadSettings();

function notifyAll() {
  _listeners.forEach((fn) => fn());
}

export function useSettings() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const fn = () => forceRender((n) => n + 1);
    _listeners.push(fn);
    return () => {
      _listeners = _listeners.filter((l) => l !== fn);
    };
  }, []);

  const updateSettings = useCallback((updater: (prev: Settings) => Settings) => {
    _settings = updater(_settings);
    saveSettings(_settings);
    notifyAll();
  }, []);

  return { settings: _settings, updateSettings };
}
