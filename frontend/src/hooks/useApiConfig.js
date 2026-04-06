import { useState, useEffect } from 'react';

const STORAGE_KEY = 'clausr_apiconfig';

const defaultApiConfig = {
  provider: 'anthropic',
  keys: { anthropic: '', gemini: '', openai: '', mistral: '', nvidia: '' }
};

export function useApiConfig() {
  const [apiConfig, setApiConfigState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    // Try legacy keys as fallback for backward compatibility
    try {
      const legacy1 = localStorage.getItem('contractfix-settings');
      if (legacy1) return JSON.parse(legacy1);
      const legacy2 = localStorage.getItem('contractfix_apiconfig');
      if (legacy2) return JSON.parse(legacy2);
    } catch (e) {}
    
    return defaultApiConfig;
  });

  const setApiConfig = (newConfig) => {
    const valueToStore = newConfig instanceof Function ? newConfig(apiConfig) : newConfig;
    setApiConfigState(valueToStore);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(valueToStore));
    } catch (e) {}
  };

  return [apiConfig, setApiConfig];
}
