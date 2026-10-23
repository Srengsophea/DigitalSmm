import React from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const { toasts, removeToast } = useAuth();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`toast-item toast-${toast.type}`}
          >
            <div className="toast-icon">
              {isSuccess && <CheckCircle2 size={18} />}
              {isError && <AlertCircle size={18} />}
              {!isSuccess && !isError && <Info size={18} />}
            </div>

            <div className="toast-message">{toast.message}</div>

            <button
              type="button"
              className="toast-close-btn"
              onClick={() => removeToast(toast.id)}
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
