'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, type ParentProfile } from '@/lib/stores/authStore';
import { clientFetch } from '@/lib/api/client';
import { Home, UserPlus, Settings, LogOut, Menu, X, BookOpen } from 'lucide-react';

interface ParentShellProps {
  profile: ParentProfile;
  children: React.ReactNode;
}

const NAV = [
  { href: '/dashboard', label: 'Нүүр хуудас', Icon: Home },
  { href: '/learner/new', label: 'Хүүхэд нэмэх', Icon: UserPlus },
  { href: '/settings', label: 'Тохиргоо', Icon: Settings },
];

const sidebarW = 240;

export function ParentShell({ profile, children }: ParentShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const setProfile = useAuthStore((s) => s.setProfile);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setProfile(profile);
  }, [profile, setProfile]);

  async function handleLogout() {
    await clientFetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    setProfile(null);
    router.push('/login');
  }

  const Sidebar = (
    <nav
      style={{
        width: `${sidebarW}px`,
        minHeight: '100dvh',
        background: 'white',
        borderRight: '1px solid #E9F1FF',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid #E9F1FF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #01618F, #31B2FB)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BookOpen size={18} color="white" />
          </div>
          <span
            style={{
              fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
              fontWeight: 800,
              fontSize: '17px',
              color: '#01618F',
            }}
          >
            Монгол Дикт
          </span>
        </div>
      </div>

      {/* Nav links */}
      <div style={{ flex: 1, padding: '12px 12px' }}>
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '12px',
                marginBottom: '4px',
                background: active ? '#F3F6FF' : 'transparent',
                color: active ? '#01618F' : '#405E7E',
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
            >
              <Icon
                size={18}
                color={active ? '#01618F' : '#7A9BB5'}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                style={{
                  fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                  fontWeight: active ? 700 : 500,
                  fontSize: '14px',
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* User + logout */}
      <div style={{ padding: '16px', borderTop: '1px solid #E9F1FF' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 4px',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #01618F, #31B2FB)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
              fontWeight: 800,
              fontSize: '13px',
              flexShrink: 0,
            }}
          >
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                fontWeight: 700,
                fontSize: '13px',
                color: '#01618F',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {profile.name}
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                fontSize: '11px',
                color: '#7A9BB5',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {profile.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            padding: '8px 12px',
            borderRadius: '10px',
            border: 'none',
            background: 'transparent',
            color: '#7A9BB5',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
        >
          <LogOut size={15} />
          <span
            style={{
              fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
              fontSize: '13px',
            }}
          >
            Гарах
          </span>
        </button>
      </div>
    </nav>
  );

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#F7FAFF',
        '--color-primary': '#01618F',
        '--color-primary-mid': '#31B2FB',
        '--color-bg': '#F3F6FF',
        '--color-correct': '#76CE79',
        '--color-wrong': '#FB5151',
      } as React.CSSProperties}
    >
      {/* Desktop: sidebar + content side by side */}
      <div
        style={{ display: 'flex', minHeight: '100dvh' }}
        className="parent-layout"
      >
        {/* Sidebar — visible lg+ */}
        <div className="parent-sidebar">{Sidebar}</div>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              display: 'flex',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.3)',
              }}
              onClick={() => setMobileOpen(false)}
            />
            <div style={{ position: 'relative', zIndex: 1, width: `${sidebarW}px` }}>
              {Sidebar}
            </div>
          </div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Mobile top bar */}
          <div className="parent-topbar">
            <button
              onClick={() => setMobileOpen(true)}
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#01618F',
              }}
            >
              <Menu size={22} />
            </button>
            <span
              style={{
                fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                fontWeight: 800,
                fontSize: '17px',
                color: '#01618F',
              }}
            >
              Монгол Дикт
            </span>
            <div style={{ width: '38px' }} />
          </div>

          <main style={{ flex: 1, padding: '0' }}>{children}</main>
        </div>
      </div>

      <style>{`
        .parent-sidebar { display: none; }
        .parent-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: white;
          border-bottom: 1px solid #E9F1FF;
        }
        @media (min-width: 1024px) {
          .parent-sidebar { display: block; }
          .parent-topbar { display: none; }
        }
      `}</style>
    </div>
  );
}
