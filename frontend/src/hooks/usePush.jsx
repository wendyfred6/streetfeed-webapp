import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export const notifSupported = typeof Notification !== 'undefined';

export function usePush() {
  const [permission, setPermission] = useState(notifSupported ? Notification.permission : 'default');
  const [subscribed, setSubscribed] = useState(false);

  const checkSubscribed = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    // .ready wacht tot de SW echt actief is — getRegistration() kan te vroeg
    // undefined teruggeven en zo subscribed permanent op false laten staan
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    setSubscribed(!!sub);
  }, []);

  useEffect(() => {
    checkSubscribed();
  }, [checkSubscribed]);

  const subscribe = async () => {
    if (!notifSupported || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { ok: false, error: 'Push-notificaties worden niet ondersteund in deze browser' };
    }
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        return { ok: false, error: perm === 'denied' ? 'Notificaties zijn geblokkeerd in je browserinstellingen' : null };
      }

      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await api.get('/push/vapid-key');

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await api.post('/push/subscribe', { subscription: sub.toJSON() });
      setSubscribed(true);
      return { ok: true };
    } catch (err) {
      console.error('[push] subscribe failed:', err);
      return { ok: false, error: 'Aanzetten van notificaties is mislukt' };
    }
  };

  return { permission, subscribed, subscribe };
}
