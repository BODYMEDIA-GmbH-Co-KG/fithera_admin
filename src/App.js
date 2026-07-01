import { useState, useEffect, createContext, useContext } from 'react';
import { supabase, t } from './lib/supabase';
import { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard, Store, Calendar, Megaphone, Image,
  Bell, MessageSquare, Users, LogOut, Globe, Smartphone, Tag, BarChart3, Award
} from 'lucide-react';

import Dashboard from './pages/Dashboard';
import Exhibitors from './pages/Exhibitors';
import Program from './pages/Program';
import Ads from './pages/Ads';
import Notifications from './pages/Notifications';
import Feedback from './pages/Feedback';
import UsersPage from './pages/UsersPage';
import EventFeedback from './pages/EventFeedback';
import AppSettings from './pages/AppSettings';
import Categories from './pages/Categories';
import Speakers from './pages/Speakers';
import FloorPlan from './pages/FloorPlan';
import Statistik from './pages/Statistik';
import Sponsors from './pages/Sponsors';

export const LangContext = createContext('de');
export const EventContext = createContext(null);

const COLORS = {
  primary: '#8c368c',
  accent: '#e71f69',
  bg: '#f4f2f6',
  surface: '#ffffff',
  border: '#e6e2ec',
  text: '#1d1d1b',
  muted: '#6b6b76',
  dim: '#9a9aa5',
};

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('de');
  const [page, setPage] = useState('dashboard');
  const [event, setEvent] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    supabase.auth.onAuthStateChange((_e, session) => setSession(session));
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase.from('events').select('*').eq('is_active', true).order('start_date', { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data?.[0]) setEvent(data[0]);
        else {
          // fallback: get any event
          supabase.from('events').select('*').order('start_date', { ascending: false }).limit(1)
            .then(({ data: d2 }) => { if (d2?.[0]) setEvent(d2[0]); });
        }
      });
  }, [session]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoginError(lang === 'de' ? 'Falsche E-Mail oder Passwort' : 'Invalid email or password');
    setLoginLoading(false);
  };

  const handleLogout = () => supabase.auth.signOut();

  if (loading) return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: COLORS.muted }}>Laden...</div>
    </div>
  );

  if (!session) return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <Toaster />
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 40, width: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: `${COLORS.primary}`, borderRadius: 16, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>F</span>
          </div>
          <div style={{ color: COLORS.text, fontSize: 22, fontWeight: 700 }}>Fithera Admin</div>
          <div style={{ color: COLORS.dim, fontSize: 14, marginTop: 4 }}>
            {lang === 'de' ? 'Anmelden zur Eventverwaltung' : 'Sign in to manage your event'}
          </div>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', color: COLORS.muted, fontSize: 12, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase' }}>E-Mail</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
              style={{ width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: COLORS.muted, fontSize: 12, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase' }}>{t(lang, 'password')}</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" required
              style={{ width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {loginError && <div style={{ color: COLORS.accent, fontSize: 13, marginBottom: 14 }}>{loginError}</div>}
          <button type="submit" disabled={loginLoading}
            style={{ width: '100%', padding: '11px', background: `${COLORS.primary}`, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
            {loginLoading ? '...' : (lang === 'de' ? 'Anmelden' : 'Sign In')}
          </button>
        </form>
        <button onClick={() => setLang(l => l === 'de' ? 'en' : 'de')}
          style={{ width: '100%', marginTop: 14, padding: '8px', background: 'transparent', color: COLORS.dim, border: `1px solid ${COLORS.border}`, borderRadius: 8, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Globe size={14} /> {lang === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
        </button>
      </div>
    </div>
  );

  const nav = [
    { id: 'dashboard', icon: LayoutDashboard, label: t(lang, 'dashboard') },
    { id: 'exhibitors', icon: Store, label: t(lang, 'exhibitors') },
    { id: 'sponsors', icon: Award, label: lang === 'de' ? 'Sponsoren' : 'Sponsors' },
    { id: 'program', icon: Calendar, label: t(lang, 'program') },
    { id: 'speakers', icon: Users, label: lang === 'de' ? 'Referenten' : 'Speakers' },
    { id: 'ads', icon: Megaphone, label: t(lang, 'ads') },
    { id: 'notifications', icon: Bell, label: t(lang, 'notifications') },
    { id: 'feedback', icon: MessageSquare, label: t(lang, 'feedback') },
    { id: 'users', icon: Users, label: t(lang, 'users') },
    { id: 'eventfeedback', icon: MessageSquare, label: 'Event Feedback' },
    { id: 'categories', icon: Tag, label: lang === 'de' ? 'Kategorien' : 'Categories' },
    { id: 'appsettings', icon: Smartphone, label: lang === 'de' ? 'App Einstellungen' : 'App Settings' },
    { id: 'floorplan', icon: Image, label: lang === 'de' ? 'Hallenplan' : 'Floor Plan' },
    { id: 'statistik', icon: BarChart3, label: lang === 'de' ? 'Statistik' : 'Analytics' },
  ];

  const pages = { dashboard: Dashboard, exhibitors: Exhibitors, sponsors: Sponsors, program: Program, speakers: Speakers, ads: Ads, notifications: Notifications, feedback: Feedback, users: UsersPage, eventfeedback: EventFeedback, appsettings: AppSettings, categories: Categories, floorplan: FloorPlan, statistik: Statistik };
  const PageComponent = pages[page] || Dashboard;

  return (
    <LangContext.Provider value={lang}>
      <EventContext.Provider value={event}>
        <div style={{ display: 'flex', minHeight: '100vh', background: COLORS.bg, fontFamily: 'system-ui, sans-serif' }}>
          <Toaster position="top-right" />
          {/* Sidebar */}
          <div style={{ width: 220, background: COLORS.surface, borderRight: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '20px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, background: `${COLORS.primary}`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>F</span>
                </div>
                <div>
                  <div style={{ color: COLORS.text, fontWeight: 700, fontSize: 15 }}>Fithera</div>
                  <div style={{ color: COLORS.dim, fontSize: 11 }}>Admin Panel</div>
                </div>
              </div>
              {event && <div style={{ marginTop: 10, padding: '5px 8px', background: `${COLORS.primary}22`, borderRadius: 6, color: COLORS.primary, fontSize: 11, fontWeight: 600 }}>{event.name}</div>}
            </div>
            <nav style={{ flex: 1, padding: '10px 8px' }}>
              {nav.map(item => {
                const Icon = item.icon;
                const active = page === item.id;
                return (
                  <button key={item.id} onClick={() => setPage(item.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2, background: active ? `${COLORS.primary}22` : 'transparent', color: active ? COLORS.primary : COLORS.muted, fontWeight: active ? 600 : 400, fontSize: 14, textAlign: 'left' }}>
                    <Icon size={17} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div style={{ padding: '10px 8px', borderTop: `1px solid ${COLORS.border}` }}>
              <button onClick={() => setLang(l => l === 'de' ? 'en' : 'de')}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: COLORS.dim, fontSize: 13, marginBottom: 4 }}>
                <Globe size={15} /> {lang === 'de' ? 'English' : 'Deutsch'}
              </button>
              <button onClick={handleLogout}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: COLORS.dim, fontSize: 13 }}>
                <LogOut size={15} /> {t(lang, 'logout')}
              </button>
            </div>
          </div>
          {/* Main content */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {!event ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: 40, color: "#9a9aa5" }}>Event wird geladen...</div> : <PageComponent />}
          </div>
        </div>
      </EventContext.Provider>
    </LangContext.Provider>
  );
}
