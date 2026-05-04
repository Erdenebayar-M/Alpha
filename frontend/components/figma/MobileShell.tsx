import type { ReactNode } from 'react';

interface MobileShellProps {
  children: ReactNode;
}

/**
 * Constrains to a 440 px phone shell that NEVER overflows the viewport.
 * Header sticks to the top; footer sticks to the bottom; only the middle scrolls.
 * Children must be: <header> + <main style="flex:1; overflow-y:auto"> + <footer>
 */
export function MobileShell({ children }: MobileShellProps) {
  return (
    <div
      style={{
        height: '100dvh',
        overflow: 'hidden',
        background: '#E0E8F5',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          background: '#F3F6FF',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  );
}
