import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { notifications, removeNotification, addNotification } from '@/stores/notifications';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const iconMap = {
  success: <CheckCircle className="w-5 h-5 text-green-600" />,
  error: <AlertCircle className="w-5 h-5 text-red-600" />,
  info: <Info className="w-5 h-5 text-blue-600" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
};

const bgColorMap = {
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  info: 'bg-blue-50 border-blue-200',
  warning: 'bg-yellow-50 border-yellow-200',
};

const textColorMap = {
  success: 'text-green-800',
  error: 'text-red-800',
  info: 'text-blue-800',
  warning: 'text-yellow-800',
};

export default function ToastContainer() {
  const notificationList = useStore(notifications);

  useEffect(() => {
    // Listen for custom notification events from .astro scripts
    const handleNotificationEvent = (event: any) => {
      const { message, type } = event.detail;
      addNotification(message, type || 'info');
    };

    document.addEventListener('show-notification', handleNotificationEvent);

    return () => {
      document.removeEventListener('show-notification', handleNotificationEvent);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notificationList.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-start gap-3 p-4 rounded-lg border ${bgColorMap[notification.type]} animate-in fade-in slide-in-from-top-2 duration-300`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {iconMap[notification.type]}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${textColorMap[notification.type]}`}>
              {notification.message}
            </p>
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar notificación"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
