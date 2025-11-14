
import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  actionText?: string;
  onAction?: () => void;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, actionText, onAction, onClose, duration = 5000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed bottom-5 right-5 bg-slate-800 text-white py-3 px-5 rounded-lg shadow-lg flex items-center justify-between animate-in slide-in-from-bottom-5">
      <span>{message}</span>
      {actionText && onAction && (
        <button
          onClick={() => {
            onAction();
            onClose();
          }}
          className="ml-4 font-bold text-primary-400 hover:text-primary-300"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default Toast;
