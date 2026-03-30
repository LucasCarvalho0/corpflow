'use client';
// components/Notifications.tsx
import { useEffect, useState } from 'react';

export interface NotifItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning';
}

// Simple global bus
let listeners: ((n: NotifItem) => void)[] = [];
let _id = 0;

export function notify(message: string, type: NotifItem['type'] = 'success') {
  const item: NotifItem = { id: ++_id, message, type };
  listeners.forEach((fn) => fn(item));
}

export default function Notifications() {
  const [items, setItems] = useState<NotifItem[]>([]);

  useEffect(() => {
    const handler = (n: NotifItem) => {
      setItems((prev) => [...prev, n]);
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== n.id)), 3500);
    };
    listeners.push(handler);
    return () => { listeners = listeners.filter((l) => l !== handler); };
  }, []);

  const colors: Record<NotifItem['type'], string> = {
    success: 'var(--success)',
    error: 'var(--danger)',
    warning: 'var(--warning)',
  };

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 400, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((n) => (
        <div key={n.id} className="animate-slideUp" style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '12px 18px', fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', gap: 10, minWidth: 260,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[n.type], flexShrink: 0 }} />
          {n.message}
        </div>
      ))}
    </div>
  );
}
