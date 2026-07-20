// Custom Streetfeed Icon System icons (Figma page "🌼 Streetfeed Icon System
// v0.1", node 324:3836) — replacing Phosphor placeholders one at a time as
// each icon gets confirmed there. Path data extracted directly from Figma's
// individual vector exports (get_design_context), not hand-drawn. API shape
// (size/color props) mirrors @phosphor-icons/react so these drop in at
// existing call sites with no other changes.
//
// ChevronRight/CaretRight reuse the exact same path as ChevronDown, rotated
// -90deg — confirmed against Figma's own generated code, which literally
// wraps the identical chevron shape in a `-rotate-90` transform rather than
// defining a second path. Cross/X is the same relationship to Plus, rotated
// 45deg.

export function ChevronDownIcon({ size = 24, color = 'currentColor', style, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} {...props}>
      <path d="M4 8L12 16L20 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 24, color = 'currentColor', style, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} {...props}>
      <path d="M4 8L12 16L20 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-90 12 12)" />
    </svg>
  );
}

export function PlusIcon({ size = 24, color = 'currentColor', style, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} {...props}>
      <path d="M12 4.5V19.5M4.5 12H19.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CrossIcon({ size = 24, color = 'currentColor', style, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} {...props}>
      <path d="M12 4.5V19.5M4.5 12H19.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" transform="rotate(45 12 12)" />
    </svg>
  );
}

export function PaperclipIcon({ size = 24, color = 'currentColor', style, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 17" fill="none" style={style} {...props}>
      <path d="M10.4932 4.506L3.5394 11.5735C3.29504 11.8252 3.15954 12.1629 3.16219 12.5136C3.16483 12.8644 3.3054 13.2 3.55351 13.4479C3.80163 13.6959 4.13738 13.8363 4.48818 13.8388C4.83899 13.8413 5.17669 13.7056 5.4283 13.4612L13.7176 5.05928C14.2186 4.55842 14.5 3.8791 14.5 3.17077C14.5 2.46243 14.2186 1.78311 13.7176 1.28225C13.2166 0.781383 12.5372 0.5 11.8287 0.5C11.1202 0.5 10.4408 0.781383 9.93979 1.28225L1.6505 9.68502C0.909243 10.4383 0.49573 11.4539 0.500033 12.5106C0.504337 13.5673 0.92611 14.5795 1.67348 15.3268C2.42085 16.074 3.43326 16.4957 4.49019 16.5C5.54712 16.5043 6.56294 16.0908 7.31637 15.3497L14.1658 8.51169" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PersonIcon({ size = 24, color = 'currentColor', style, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} {...props}>
      <g transform="translate(7.5,5) scale(0.90909)">
        <path d="M5.5 10.5C8.26142 10.5 10.5 8.26142 10.5 5.5C10.5 2.73858 8.26142 0.5 5.5 0.5C2.73858 0.5 0.5 2.73858 0.5 5.5C0.5 8.26142 2.73858 10.5 5.5 10.5Z" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g transform="translate(11,11) rotate(180,1.5,0.5) scale(0.75,0.5)">
        <path d="M0.500108 1.5C0.802764 0.902322 1.35245 0.5 2.00011 0.5C2.64776 0.5 3.19745 0.902322 3.50011 1.5" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g transform="translate(5,15) scale(0.9375,0.8140)">
        <path d="M0.500083 4.875C2.01336 2.26016 4.7618 0.5 8.00008 0.5C11.2384 0.5 13.9868 2.26016 15.5001 4.875" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

// `filled` is not a separate Figma asset — the Icon System only has one Bell
// style. It approximates the "unread notification" solid-bell affordance the
// app already had with Phosphor's fill weight, using the same approved
// outline shape with its fill turned on, rather than dropping that signal.
export function BellIcon({ size = 24, color = 'currentColor', filled = false, style, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} {...props}>
      <g transform="translate(5,5) scale(0.9333,0.9286)">
        <path d="M1.76945 6.35C1.76945 4.79848 2.37312 3.31051 3.44766 2.21343C4.52219 1.11634 5.97958 0.5 7.49921 0.5C9.01883 0.5 10.4762 1.11634 11.5508 2.21343C12.6253 3.31051 13.229 4.79848 13.229 6.35C13.229 9.26037 13.8895 11.5987 14.4147 12.525C14.4705 12.6236 14.4999 12.7355 14.5 12.8494C14.5001 12.9633 14.4709 13.0753 14.4153 13.174C14.3597 13.2728 14.2796 13.3548 14.1831 13.4121C14.0867 13.4693 13.9772 13.4996 13.8656 13.5H1.13281C1.02138 13.4993 0.912081 13.4688 0.815833 13.4115C0.719584 13.3541 0.639759 13.272 0.584335 13.1733C0.528912 13.0746 0.499831 12.9628 0.500001 12.849C0.50017 12.7353 0.529583 12.6235 0.5853 12.525C1.10973 11.5987 1.76945 9.25956 1.76945 6.35Z" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill={filled ? color : 'none'} />
      </g>
      <g transform="translate(10,18) scale(0.8,0.6667)">
        <path d="M0.5 0.5C0.5 1.03043 0.710714 1.53914 1.08579 1.91421C1.46086 2.28929 1.96957 2.5 2.5 2.5C3.03043 2.5 3.53914 2.28929 3.91421 1.91421C4.28929 1.53914 4.5 1.03043 4.5 0.5" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill={filled ? color : 'none'} />
      </g>
    </svg>
  );
}
