import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X, ChevronDown, Check } from 'lucide-react';
import useCurrencyStore from '../store/useCurrencyStore';
import useLanguageStore from '../store/useLanguageStore';
import { useTranslation } from '../utils/translations';

export default function Navbar() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { currency, setCurrency } = useCurrencyStore();
  const { language, setLanguage } = useLanguageStore();
  const { t } = useTranslation();

  const currencies = [
    { code: 'IDR', name: 'Rupiah', flagCode: 'id', emoji: '🇮🇩' },
    { code: 'SGD', name: 'Dolar Singapura', flagCode: 'sg', emoji: '🇸🇬' },
    { code: 'MYR', name: 'Ringgit', flagCode: 'my', emoji: '🇲🇾' },
    { code: 'BND', name: 'Dolar Brunei', flagCode: 'bn', emoji: '🇧🇳' },
    { code: 'THB', name: 'Baht', flagCode: 'th', emoji: '🇹🇭' },
    { code: 'PHP', name: 'Peso', flagCode: 'ph', emoji: '🇵🇭' },
    { code: 'JPY', name: 'Yen', flagCode: 'jp', emoji: '🇯🇵' },
    { code: 'CNY', name: 'Yuan', flagCode: 'cn', emoji: '🇨🇳' },
    { code: 'USD', name: 'USD', flagCode: 'us', emoji: '🇺🇸' },
    { code: 'EUR', name: 'Euro', flagCode: 'eu', emoji: '🇪🇺' },
  ];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/products');
    }
  };

  const handleMobileSearch = (e) => {
    e.preventDefault();
    if (mobileSearchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(mobileSearchQuery.trim())}`);
    } else {
      navigate('/products');
    }
    setMobileMenuOpen(false);
  };

  const selectedCurrencyObj = currencies.find(c => c.code === currency) || currencies[0];

  return (
    <nav className="bg-zinc-950 sticky top-0 z-50 shadow-lg border-b border-yellow-900/30">
      {/* Top Bar for Mobile */}
      <div className="md:hidden bg-zinc-900/40 border-b border-zinc-800/30 py-1.5 px-4 flex items-center justify-between">
        {/* Left: Track Order */}
        <Link to="/track-order" className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-300 hover:text-yellow-400 transition-colors uppercase tracking-wider">
          <svg className="w-3.5 h-3.5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <span>{t('track_order')}</span>
        </Link>

        {/* Right: Currency & Language Selector */}
        <div className="flex items-center gap-2">
          {/* Currency Trigger Selector */}
          <div className="relative flex items-center gap-1 bg-zinc-900 border border-zinc-800/80 rounded-lg px-2 py-0.5 text-[10px] font-bold text-zinc-300 shadow-sm">
            <span>{selectedCurrencyObj.emoji}</span>
            <span>{selectedCurrencyObj.code}</span>
            <ChevronDown size={10} className="text-zinc-500" />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            >
              {currencies.map(c => (
                <option key={c.code} value={c.code} className="bg-zinc-900 text-white">
                  {c.emoji} {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-3 bg-zinc-850"></div>

          {/* Language Switcher */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800/80 rounded-lg p-0.5 shadow-sm">
            <button
              onClick={() => setLanguage('ID')}
              className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded-md transition-all ${
                language === 'ID'
                  ? 'bg-yellow-500 text-black shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              ID
            </button>
            <button
              onClick={() => setLanguage('EN')}
              className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded-md transition-all ${
                language === 'EN'
                  ? 'bg-yellow-500 text-black shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <img
              src="/Logo DS.png"
              alt="Djiharkah Store Logo"
              className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover shadow-md group-hover:scale-105 transition-transform duration-200"
            />
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-bold font-playfair text-white leading-none tracking-tight">Djiharkah</span>
              <span className="text-[9px] md:text-[10px] text-yellow-500 font-bold tracking-[0.3em] ml-0.5 mt-0.5 uppercase">Store</span>
            </div>
          </Link>

          {/* Search Bar - Desktop only */}
          <div className="flex-1 max-w-2xl hidden md:flex">
            <form onSubmit={handleSearch} className="flex w-full bg-zinc-800 rounded-full overflow-hidden border border-zinc-700 focus-within:border-yellow-500 focus-within:bg-zinc-700 transition-all">
              <div className="pl-5 flex items-center justify-center">
                <Search size={18} className="text-zinc-400" />
              </div>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search_placeholder')} 
                className="w-full px-4 py-3 bg-transparent text-white placeholder-zinc-400 focus:outline-none text-sm"
              />
              <button type="submit" className="bg-white hover:bg-gray-100 text-black px-6 font-bold transition-colors text-sm">
                {t('search_btn')}
              </button>
            </form>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3 md:gap-5 shrink-0">
            {/* Currency Selector - Desktop */}
            <div className="hidden md:flex items-center gap-2 relative" ref={dropdownRef}>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{t('currency_label')}</span>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="bg-zinc-900/80 text-zinc-200 border border-zinc-700/60 hover:border-yellow-500/60 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-yellow-500 transition-all cursor-pointer flex items-center gap-2 hover:bg-zinc-800 shadow-md min-w-[95px] justify-between"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={`https://flagcdn.com/w20/${selectedCurrencyObj.flagCode}.png`}
                    alt={selectedCurrencyObj.code}
                    className="w-4 h-2.5 object-cover rounded shadow-xs"
                  />
                  <span>{selectedCurrencyObj.code}</span>
                </div>
                <ChevronDown size={12} className={`text-zinc-400 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Popover */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden py-1.5 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {currencies.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => {
                          setCurrency(c.code);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-bold transition-colors ${
                          currency === c.code
                            ? 'bg-yellow-500/10 text-yellow-400 border-l-2 border-yellow-500'
                            : 'text-zinc-300 hover:bg-zinc-800 hover:text-white border-l-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={`https://flagcdn.com/w20/${c.flagCode}.png`}
                            alt={c.code}
                            className="w-4.5 h-3 object-cover rounded shadow-xs"
                          />
                          <div className="flex flex-col">
                            <span className="leading-none">{c.code}</span>
                            <span className="text-[10px] text-zinc-500 font-normal mt-0.5">{c.name}</span>
                          </div>
                        </div>
                        {currency === c.code && (
                          <Check size={14} className="text-yellow-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Language Selector - Desktop */}
            <div className="hidden md:flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-0.5 shadow-md">
              <button
                onClick={() => setLanguage('ID')}
                className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-all ${
                  language === 'ID'
                    ? 'bg-yellow-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                }`}
              >
                ID
              </button>
              <button
                onClick={() => setLanguage('EN')}
                className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-all ${
                  language === 'EN'
                    ? 'bg-yellow-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
                }`}
              >
                EN
              </button>
            </div>

            {/* Desktop Links */}
            <Link to="/track-order" className="text-sm font-bold text-zinc-300 hover:text-yellow-400 transition-colors hidden md:block">
              {t('track_order')}
            </Link>

            {/* Mobile: Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pb-3 border-t border-zinc-800 pt-3 space-y-3">
            {/* Mobile Search */}
            <form onSubmit={handleMobileSearch} className="flex bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700 focus-within:border-yellow-500 transition-all">
              <div className="pl-4 flex items-center">
                <Search size={16} className="text-zinc-400" />
              </div>
              <input 
                type="text"
                value={mobileSearchQuery}
                onChange={(e) => setMobileSearchQuery(e.target.value)}
                placeholder={t('search_mobile_placeholder')} 
                className="w-full px-3 py-2.5 bg-transparent text-white placeholder-zinc-400 focus:outline-none text-sm"
              />
              <button type="submit" className="bg-white hover:bg-gray-100 text-black px-4 font-bold transition-colors text-sm">
                {t('search_btn')}
              </button>
            </form>
            {/* Mobile Links */}
            <div className="flex flex-col gap-1">
              <Link
                to="/track-order"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-yellow-400 transition-colors"
              >
                🔍 {t('track_order')}
              </Link>
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-zinc-300 hover:bg-zinc-800 hover:text-yellow-400 transition-colors"
              >
                🛍️ {t('product_collection')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
