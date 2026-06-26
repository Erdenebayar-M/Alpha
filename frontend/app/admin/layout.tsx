import { Database } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: '#F7FAFF', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 24px',
          background: 'white',
          borderBottom: '1px solid #E9F1FF',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #01618F, #31B2FB)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Database size={16} color="white" />
        </div>
        <span
          style={{
            fontFamily: 'var(--font-geist-sans), sans-serif',
            fontWeight: 700,
            fontSize: '15px',
            color: '#01618F',
          }}
        >
          Агуулгын самбар
        </span>
      </header>
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
