import { create } from 'zustand';

const FALLBACK_RATES = {
  IDR: 1,
  SGD: 0.000083,
  MYR: 0.00029,
  BND: 0.000083,
  THB: 0.00227,
  PHP: 0.00357,
  JPY: 0.01,
  CNY: 0.00045,
  USD: 0.0000625,
  EUR: 0.000057
};

const useCurrencyStore = create((set, get) => ({
  currency: localStorage.getItem('djiharkah-currency') || 'IDR',
  rates: JSON.parse(localStorage.getItem('djiharkah-rates')) || FALLBACK_RATES,
  isLoading: false,
  lastUpdated: localStorage.getItem('djiharkah-rates-updated') || null,

  setCurrency: (newCurrency) => {
    localStorage.setItem('djiharkah-currency', newCurrency);
    set({ currency: newCurrency });
  },

  fetchRates: async () => {
    const lastUpdated = get().lastUpdated;
    const now = Date.now();
    
    // Caching selama 6 jam agar tidak spam API pihak ketiga
    if (lastUpdated && now - Number(lastUpdated) < 6 * 60 * 60 * 1000) {
      return;
    }

    set({ isLoading: true });
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/IDR');
      const data = await res.json();
      
      if (data && data.result === 'success' && data.rates) {
        const newRates = {
          IDR: 1,
          SGD: data.rates.SGD || FALLBACK_RATES.SGD,
          MYR: data.rates.MYR || FALLBACK_RATES.MYR,
          BND: data.rates.BND || FALLBACK_RATES.BND,
          THB: data.rates.THB || FALLBACK_RATES.THB,
          PHP: data.rates.PHP || FALLBACK_RATES.PHP,
          JPY: data.rates.JPY || FALLBACK_RATES.JPY,
          CNY: data.rates.CNY || FALLBACK_RATES.CNY,
          USD: data.rates.USD || FALLBACK_RATES.USD,
          EUR: data.rates.EUR || FALLBACK_RATES.EUR
        };
        
        localStorage.setItem('djiharkah-rates', JSON.stringify(newRates));
        localStorage.setItem('djiharkah-rates-updated', String(now));
        
        set({ rates: newRates, lastUpdated: String(now) });
      }
    } catch (err) {
      console.error('Failed to fetch exchange rates:', err);
    } finally {
      set({ isLoading: false });
    }
  }
}));

export default useCurrencyStore;
