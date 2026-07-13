import { useCallback, useRef, useState } from 'react';

const DEFAULT_DURATION = 4000;

// Single shared toast/error surface — previously reimplemented three
// times in App.jsx (reportedToast/postError/notifToast), each its own
// fixed-position div with its own timer bookkeeping. See FRE-313.
export function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, opts = {}) => {
    if (!message) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const { duration = DEFAULT_DURATION, ...rest } = opts;
    setToast({ message, ...rest });
    if (duration) timerRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return { toast, showToast, dismissToast };
}
