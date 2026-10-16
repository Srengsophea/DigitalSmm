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
              {isSuccess && <CheckCircle2 size={18} color="#16a34a" />}
              {isError && <AlertCircle size={18} color="#dc2626" />}
              {!isSuccess && !isError && <Info size={18} color="#2563eb" />}
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
