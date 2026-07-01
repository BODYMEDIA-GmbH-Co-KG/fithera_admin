import { useState, useEffect, useContext } from 'react';
import { supabase, t } from '../lib/supabase';
import { LangContext } from '../App';
import { Star } from 'lucide-react';

const COLORS = { primary: '#8c368c', accent: '#e71f69', bg: '#f4f2f6', surface: '#ffffff', border: '#e6e2ec', text: '#1d1d1b', muted: '#6b6b76', dim: '#9a9aa5' };

export default function Feedback() {
  const lang = useContext(LangContext);
  const de = lang === 'de';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('session_feedback').select('*, sessions(title)').order('created_at', { ascending: false });
      setItems(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const avg = items.length ? (items.reduce((s, i) => s + (i.rating || 0), 0) / items.length).toFixed(1) : '—';

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: COLORS.text, fontSize: 22, fontWeight: 700 }}>{lang === 'de' ? 'Session Bewertungen' : 'Session Ratings'}</div>
        <div style={{ color: COLORS.dim, fontSize: 13, marginTop: 4 }}>
          {items.length} {de ? 'Bewertungen' : 'ratings'} · Ø {avg} ⭐
        </div>
      </div>
      {loading && <div style={{ color: COLORS.dim, textAlign: 'center', padding: 40 }}>{t(lang, 'loading')}</div>}
      {!loading && items.length === 0 && <div style={{ color: COLORS.dim, textAlign: 'center', padding: 60 }}>{t(lang, 'no_data')}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(item => (
          <div key={item.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ color: COLORS.muted, fontSize: 13 }}>{item.sessions?.title || (de ? 'Unbekannte Session' : 'Unknown Session')}</div>
              <div style={{ display: 'flex', gap: 2 }}>
                {[1,2,3,4,5].map(s => <Star key={s} size={14} fill={s <= (item.rating||0) ? '#f59e0b' : 'none'} color={s <= (item.rating||0) ? '#f59e0b' : COLORS.border} />)}
              </div>
            </div>
            {item.comment && <div style={{ color: COLORS.text, fontSize: 14, marginTop: 8 }}>{item.comment}</div>}
            <div style={{ color: COLORS.dim, fontSize: 11, marginTop: 6 }}>{new Date(item.created_at).toLocaleString('de-DE')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
