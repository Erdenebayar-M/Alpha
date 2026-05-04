import type { ReactNode } from 'react';
import { MobileShell } from './MobileShell';
import { TopAppBar } from './TopAppBar';
import { BottomNav } from './BottomNav';
import type { NavItem, ProgressInfo } from './types';

/**
 * SRP: owns the 3-zone layout (header / scrollable body / footer).
 * Every task screen composes this instead of repeating MobileShell + TopAppBar + BottomNav.
 */
interface ScreenShellProps {
  title: string;
  progress: ProgressInfo;
  stage: string;
  backIconUrl: string;
  navItems: NavItem[];
  /** Rendered above BottomNav — typically the action button */
  footer?: ReactNode;
  onBack?: () => void;
  children: ReactNode;
}

export function ScreenShell({
  title,
  progress,
  stage,
  backIconUrl,
  navItems,
  footer,
  onBack,
  children,
}: ScreenShellProps) {
  return (
    <MobileShell>
      <TopAppBar
        title={title}
        progress={progress}
        stage={stage}
        backIconUrl={backIconUrl}
        onBack={onBack}
      />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: '8px',
        }}
      >
        {children}
      </div>

      <div style={{ flexShrink: 0 }}>
        {footer}
        <BottomNav items={navItems} />
      </div>
    </MobileShell>
  );
}
