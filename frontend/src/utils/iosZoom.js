// iOS Safari/Chrome zooms the viewport when an input with font-size < 16px gets focus.

// On blur (no navigation): briefly add maximum-scale=1 to force zoom reset, then restore.
export function resetIOSZoom() {
  const meta = document.querySelector('meta[name=viewport]');
  if (!meta) return;
  const original = meta.getAttribute('content');
  meta.setAttribute('content', original + ', maximum-scale=1');
  requestAnimationFrame(() => requestAnimationFrame(() =>
    meta.setAttribute('content', original)
  ));
}

// Before a step/page transition: hold maximum-scale=1 through the entire async operation
// so iOS has time to process the zoom reset before React renders the next step.
// Returns an unlock function — call it after setStep() to restore pinch-to-zoom.
export function lockIOSZoom() {
  const meta = document.querySelector('meta[name=viewport]');
  const original = meta?.getAttribute('content');
  if (meta && original) meta.setAttribute('content', original + ', maximum-scale=1');
  return function unlock() {
    if (meta && original) {
      requestAnimationFrame(() => requestAnimationFrame(() =>
        meta.setAttribute('content', original)
      ));
    }
  };
}
