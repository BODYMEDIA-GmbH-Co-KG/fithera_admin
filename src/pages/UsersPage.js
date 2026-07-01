import { useState, useEffect, useContext } from 'react';
import { supabase, t } from '../lib/supabase';
import { LangContext } from '../App';

const COLORS = { primary: '#8c368c', accent: '#e71f69', bg: '#f4f2f6', surface: '#ffffff', border: '#e6e2ec', text: '#1d1d1b', muted: '#6b6b76', dim: '#9a9aa5' };

export default function UsersPage() {
  const lang = useContext(LangContext);
  const de = lang === 'de';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('user_profiles').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setUsers(data || []); setLoading(false); });
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: COLORS.text, fontSize: 22, fontWeight: 700 }}>{t(lang, 'users')}</div>
        <div style={{ color: COLORS.dim, fontSize: 13, marginTop: 4 }}>{users.length} {de ? 'registrierte Nutzer' : 'registered users'}</div>
      </div>
      {loading && <div style={{ color: COLORS.dim, textAlign: 'center', padding: 40 }}>{t(lang, 'loading')}</div>}
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {[de ? 'Name' : 'Name', 'E-Mail', de ? 'Registriert' : 'Registered'].map(h => (
                <th key={h} style={{ padding: '12px 16px', color: COLORS.muted, fontSize: 12, fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', borderBottom: `1px solid ${COLORS.border}`, background: COLORS.bg }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ padding: '12px 16px', color: COLORS.text, fontSize: 14, borderBottom: `1px solid ${COLORS.border}` }}>{u.full_name || '—'}</td>
                <td style={{ padding: '12px 16px', color: COLORS.muted, fontSize: 14, borderBottom: `1px solid ${COLORS.border}` }}>{u.email || '—'}</td>
                <td style={{ padding: '12px 16px', color: COLORS.dim, fontSize: 13, borderBottom: `1px solid ${COLORS.border}` }}>{new Date(u.created_at).toLocaleDateString('de-DE')}</td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr><td colSpan={3} style={{ padding: 40, textAlign: 'center', color: COLORS.dim }}>{t(lang, 'no_data')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
