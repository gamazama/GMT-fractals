import React, { useEffect, useRef } from 'react';

export interface MenuItem {
  label: string;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
  /** If provided, adds a separator ABOVE this item. */
  separatorAbove?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: MenuItem[];
  onDismiss: () => void;
}

/**
 * A small floating context menu shown on canvas right-click.
 * Standalone (no StoreCallbacksContext dependency) so the toy can ship without
 * wiring up GMT's full context-menu plumbing.
 */
export const CanvasContextMenu: React.FC<Props> = ({ x, y, items, onDismiss }) => {
  const rootRef = useRef<HTMLDivElement>(null);

  // Dismiss on outside-click / escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) onDismiss();
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss(); };
    // Defer binding to the NEXT tick so the right-click that opened the menu
    // doesn't immediately trigger the dismiss.
    const t = setTimeout(() => {
      window.addEventListener('mousedown', onDown);
      window.addEventListener('keydown', onEsc);
    }, 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onEsc);
    };
  }, [onDismiss]);

  // Clamp position so the menu doesn't overflow the viewport.
  const style: React.CSSProperties = {
    left: Math.min(x, window.innerWidth - 240),
    top: Math.min(y, window.innerHeight - items.length * 28 - 12),
  };

  return (
    <div
      ref={rootRef}
      className="fixed z-50 min-w-[200px] rounded border border-white/15 bg-[#1a1a1d]/95 backdrop-blur-sm shadow-xl text-[11px] text-gray-200 py-1"
      style={style}
      onContextMenu={(e) => { e.preventDefault(); onDismiss(); }}
    >
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {it.separatorAbove && <div className="my-1 border-t border-white/10" />}
          <button
            type="button"
            onClick={() => { it.onClick(); onDismiss(); }}
            title={it.hint}
            className={
              'w-full text-left px-3 py-1.5 transition-colors ' +
              (it.danger
                ? 'hover:bg-red-500/20 text-red-300'
                : 'hover:bg-cyan-500/15 hover:text-cyan-200')
            }
          >
            {it.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};
