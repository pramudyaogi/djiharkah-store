import { create } from 'zustand';

const useLanguageStore = create((set) => ({
  language: localStorage.getItem('djiharkah-language') || 'ID',
  setLanguage: (newLanguage) => {
    localStorage.setItem('djiharkah-language', newLanguage);
    set({ language: newLanguage });
  },
}));

export default useLanguageStore;
