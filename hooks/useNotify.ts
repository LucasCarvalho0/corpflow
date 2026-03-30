'use client';
// hooks/useNotify.ts

import { useState, useCallback } from 'react';

type NotifyType = 'success' | 'error' | 'warning';

interface Notification {
  message: string;
  type: NotifyType;
  id: number;
}

let notifyId = 0;

export function useNotify() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((message: string, type: NotifyType = 'success') => {
    const id = ++notifyId;
    setNotifications((prev) => [...prev, { message, type, id }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3500);
  }, []);

  return { notifications, notify };
}
