import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export default function PopupModal({ isOpen, onClose, type = 'info', title, message, actionText, onAction, actionLink }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else if (actionLink) {
      navigate(actionLink);
    }
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="text-green-500 w-12 h-12 mb-4" />;
      case 'error':
      case 'warning':
        return <AlertCircle className="text-red-500 w-12 h-12 mb-4" />;
      default:
        return <Info className="text-yellow-500 w-12 h-12 mb-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl transform scale-100 animate-in fade-in zoom-in duration-200 flex flex-col items-center text-center">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 hover:bg-gray-100 p-2 rounded-full"
        >
          <X size={20} />
        </button>

        {getIcon()}
        
        <h3 className="text-xl font-playfair font-bold text-hitam-gelap mb-2">
          {title}
        </h3>
        
        <p className="text-gray-600 text-sm mb-8 leading-relaxed">
          {message}
        </p>

        <div className="w-full flex flex-col gap-3">
          {actionText && (
            <button 
              onClick={handleAction}
              className="w-full bg-hitam-gelap text-white font-medium py-3 rounded-xl hover:bg-black hover:shadow-lg transition-all duration-200"
            >
              {actionText}
            </button>
          )}
          <button 
            onClick={onClose}
            className={`w-full font-medium py-3 rounded-xl transition-all duration-200 ${
              actionText 
                ? 'text-gray-500 bg-gray-50 hover:bg-gray-100' 
                : 'bg-yellow-500 text-black hover:bg-yellow-400 hover:shadow-lg'
            }`}
          >
            {actionText ? 'Tutup' : 'Mengerti'}
          </button>
        </div>
      </div>
    </div>
  );
}
