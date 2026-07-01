import { useState, useEffect, useContext } from 'react';
import { supabase, t } from '../lib/supabase';
import { LangContext, EventContext } from '../App';
import { Store, Calendar, Users, MessageSquare, Image, CheckCircle, Clock } from 'lucide-react';

const COLORS = { primary: '#8c368c', accent: '#e71f69', surface: '#ffffff', border: '#e6e2ec', text: '#1d1d1b', muted: '#6b6b76', dim: '#9a9aa5' };

export default function Dashboard() {
  const lang = useContext(LangContext);
  const event = useContext(EventContext);
  const [stats, setStats] = useState({ exhibitors: 0, sessions: 0, users: 0, feedback: 0, active_ads: 0 });

  useEffect(() => {
    if (!event) return;
    const load = async () => {
      const [ex, se, us, fb, ads] = await Promise.all([
        supabase.from('exhibitors').select('id', { count: 'exact', head: true }).eq('event_id', event.id),
        supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('event_id', event.id),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('session_feedback').select('id', { count: 'exact', head: true }),
        supabase.from('ads').select('id', { count: 'exact', head: true }).eq('event_id', event.id).eq('is_active', true),
      ]);
      setStats({
        exhibitors: ex.count || 0, sessions: se.count || 0,
        users: us.count || 0, feedback: fb.count || 0,
        active_ads: ads.count || 0,
      });
    };
    load();
  }, [event]);

  const cards = [
    { icon: Store, label: t(lang, 'total_exhibitors'), value: stats.exhibitors, color: COLORS.primary },
    { icon: Calendar, label: t(lang, 'total_sessions'), value: stats.sessions, color: '#3b82f6' },
    { icon: Users, label: t(lang, 'total_users'), value: stats.users, color: '#22c55e' },
    { icon: MessageSquare, label: t(lang, 'total_feedback'), value: stats.feedback, color: '#f59e0b' },
    { icon: Image, label: lang === 'de' ? 'Aktive Anzeigen' : 'Active Ads', value: stats.active_ads, color: '#8b5cf6' },
  ];

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: COLORS.text, fontSize: 22, fontWeight: 700 }}>{t(lang, 'dashboard')}</div>
        {event && <div style={{ color: COLORS.dim, fontSize: 14, marginTop: 4 }}>{event.name}</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, background: card.color + '22', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={card.color} />
                </div>
                <div style={{ color: COLORS.muted, fontSize: 13 }}>{card.label}</div>
              </div>
              <div style={{ color: COLORS.text, fontSize: 28, fontWeight: 700 }}>{card.value}</div>
            </div>
          );
        })}
      </div>
      {!event && (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, color: COLORS.muted, textAlign: 'center' }}>
          {lang === 'de' ? 'Kein Event gefunden. Bitte zuerst ein Event in Supabase anlegen.' : 'No event found. Please create an event in Supabase first.'}
        </div>
      )}
    </div>
  );
}
