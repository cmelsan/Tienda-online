import { atom } from 'nanostores';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

export const notifications = atom<Notification[]>([]);

export function addNotification(message: string, type: NotificationType = 'info', duration = 3000) {
  const id = Math.random().toString(36).substr(2, 9);
  const newNotification: Notification = { id, message, type, duration };

  notifications.set([...notifications.get(), newNotification]);

  if (duration > 0) {
    setTimeout(() => {
      removeNotification(id);
    }, duration);
  }

  return id;
}

export function removeNotification(id: string) {
  notifications.set(notifications.get().filter(n => n.id !== id));
}

export function clearNotifications() {
  notifications.set([]);
}
