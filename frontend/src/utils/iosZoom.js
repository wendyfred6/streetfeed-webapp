// iOS Safari zooms the viewport when an input with font-size < 16px gets focus.
// Calling this on blur forces iOS to reset the zoom by briefly adding maximum-scale=1,
// then immediately restoring the original viewport content so pinch-to-zoom still works.
export function resetIOSZoom() {
  const meta = document.querySelector('meta[name=viewport]');
  if (!meta) return;
  const original = meta.getAttribute('content');
  meta.setAttribute('content', original + ', maximum-scale=1');
  requestAnimationFrame(() => requestAnimationFrame(() =>
    meta.setAttribute('content', original)
  ));
}
