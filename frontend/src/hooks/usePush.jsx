import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function usePush() {
  const [permission, setPermission] = useState(Notification?.permission || 'default');
  const [subscribed, setSubscribed] = useState(false);

  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;
    const { publicKey } = await api.get('/push/vapid-key');

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await api.post('/push/subscribe', { subscription: sub.toJSON() });
    setSubscribed(true);
  };

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) return;
      reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub));
    });
  }, []);

  return { permission, subscribed, subscribe };
}
