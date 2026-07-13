import { s } from '../design/appStyles.js';

export default function SheetOverlay({ closing, onOverlayClick, children }) {
  return (
    <div
      style={{ ...s.overlay, animation: `${closing ? 'overlayOut 0.27s ease-in' : 'overlayIn 0.22s ease-out'} forwards` }}
      onClick={onOverlayClick}
    >
      <div
        style={{ ...s.sheet, animation: `${closing ? 'sheetOut 0.27s ease-in' : 'sheetIn 0.32s cubic-bezier(0.22,1,0.36,1)'} forwards` }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
