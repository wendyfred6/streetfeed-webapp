import { useEffect, useRef } from 'react';

export default function AutoTextarea({ style, value, ...props }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} value={value} style={{ ...style, resize: 'none', overflow: 'hidden' }} {...props} />;
}
