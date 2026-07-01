import { useState, useEffect, useContext } from 'react';
import { supabase, t } from '../lib/supabase';
import { LangContext, EventContext } from '../App';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, X, Search } from 'lucide-react';

const COLORS = { primary: '#8c368c', accent: '#e71f69', bg: '#f4f2f6', surface: '#ffffff', border: '#e6e2ec', text: '#1d1d1b', muted: '#6b6b76', dim: '#9a9aa5' };

// Only these track names appear as selectable stages.
const STAGE_NAMES = [
  'Main Stage',
  'Marketing & Tech Stage',
  'Therapie & Mindset Stage',
  'Business & Leadership Stage',
  'Innovation Stage',
];

// --- Zeit-Helfer (Zeitzone) ---
// Das datetime-local Feld liefert lokale Zeit ohne Zeitzone (z.B. "2026-06-30T15:00").
// Wenn man das roh speichert, deutet die Datenbank es als UTC und es verschiebt sich.
// Diese Helfer rechnen sauber zwischen lokaler Eingabe und gespeichertem Zeitstempel um.

// Form-Wert ("2026-06-30T15:00") -> echter ISO-Zeitstempel mit Zeitzone fuer die DB.
function localInputToISO(value) {
  if (!value) return null;
  const d = new Date(value); // wird als LOKALE Zeit interpretiert
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

// Gespeicherter Zeitstempel -> Form-Wert im datetime-local Format (lokale Zeit).
function isoToLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  // In lokale Zeit umrechnen und als "YYYY-MM-DDTHH:MM" formatieren.
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

const s = {
  page: { padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: COLORS.text, fontSize: 22, fontWeight: 700 },
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: `${COLORS.primary}`, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  card: { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16, marginBottom: 10 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal: { background: COLORS.surface, borderRadius: 16, padding: 28, width: '100%', maxWidth: 540, border: `1px solid ${COLORS.border}`, maxHeight: '90vh', overflowY: 'auto' },
  label: { display: 'block', color: COLORS.muted, fontSize: 12, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase' },
  input: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', minHeight: 80, resize: 'vertical' },
  field: { marginBottom: 14 },
  row: { display: 'flex', gap: 12 },
  saveBtn: { padding: '10px 24px', background: `${COLORS.primary}`, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  cancelBtn: { padding: '10px 24px', background: '#f0edf3', color: COLORS.muted, border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  iconBtn: (color) => ({ background: color + '22', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color }),
  badge: (color) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: color + '22', color, marginRight: 6 }),
  speakerRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 4 },
  speakerAvatar: { width: 30, height: 30, borderRadius: 15, objectFit: 'cover', background: COLORS.bg },
  speakerAvatarFb: { width: 30, height: 30, borderRadius: 15, background: COLORS.primary + '33', color: COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 },
  searchBox: { display: 'flex', alignItems: 'center', gap: 8, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '7px 10px', marginBottom: 6 },
  searchInput: { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: COLORS.text, fontSize: 14 },
};

const empty = { title: '', description: '', track_id: '', session_type: '', start_time: '', end_time: '', location: '', is_featured: false };

export default function Program() {
  const lang = useContext(LangContext);
  const event = useContext(EventContext);
  const de = lang === 'de';
  const [items, setItems] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [sessionSpeakers, setSessionSpeakers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [selectedSpeakers, setSelectedSpeakers] = useState([]);
  const [speakerSearch, setSpeakerSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!event) return;
    const [{ data: sessionsData }, { data: tracksData }, { data: speakersData }, { data: linksData }] = await Promise.all([
      supabase.from('sessions').select('*').eq('event_id', event.id).order('start_time'),
      supabase.from('tracks').select('id, name'),
      supabase.from('speakers').select('id, name, photo_url, role, company').eq('event_id', event.id).order('name'),
      supabase.from('session_speakers').select('session_id, speaker_id'),
    ]);
    setItems(sessionsData || []);
    setTracks(tracksData || []);
    setSpeakers(speakersData || []);
    setSessionSpeakers(linksData || []);
  };
  useEffect(() => { load(); }, [event]);

  const trackName = (id) => tracks.find(tr => tr.id === id)?.name || '';
  const stageOptions = STAGE_NAMES.map(name => tracks.find(tr => tr.name === name)).filter(Boolean);
  const speakerName = (id) => speakers.find(sp => sp.id === id)?.name || '';
  const speakersForSession = (sessionId) => sessionSpeakers.filter(l => l.session_id === sessionId).map(l => l.speaker_id);

  const openAdd = () => { setForm(empty); setSelectedSpeakers([]); setSpeakerSearch(''); setEditing(null); setModal(true); };
  const openEdit = (item) => {
    setForm({
      title: item.title || '',
      description: item.description || '',
      track_id: item.track_id || '',
      session_type: item.session_type || '',
      location: item.location || '',
      is_featured: item.is_featured || false,
      start_time: isoToLocalInput(item.start_time),
      end_time: isoToLocalInput(item.end_time),
    });
    setSelectedSpeakers(speakersForSession(item.id));
    setSpeakerSearch('');
    setEditing(item.id);
    setModal(true);
  };

  const toggleSpeaker = (id) => {
    setSelectedSpeakers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Speakers shown in the picker: selected ones always shown on top,
  // the rest filtered by the search term.
  const q = speakerSearch.trim().toLowerCase();
  const matches = (sp) => !q || [sp.name, sp.role, sp.company].filter(Boolean).some(v => v.toLowerCase().includes(q));
  const visibleSpeakers = speakers.filter(sp => selectedSpeakers.includes(sp.id) || matches(sp));

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error(de ? 'Titel ist erforderlich' : 'Title is required'); return; }
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description || null,
      track_id: form.track_id || null,
      session_type: form.session_type || null,
      location: form.location || null,
      is_featured: form.is_featured || false,
      start_time: localInputToISO(form.start_time),
      end_time: localInputToISO(form.end_time),
      event_id: event.id,
    };

    let sessionId = editing;
    let error;
    if (editing) {
      ({ error } = await supabase.from('sessions').update(payload).eq('id', editing));
    } else {
      const res = await supabase.from('sessions').insert(payload).select('id').single();
      error = res.error;
      sessionId = res.data?.id;
    }

    if (error) { toast.error(t(lang, 'error')); setSaving(false); return; }

    if (sessionId) {
      await supabase.from('session_speakers').delete().eq('session_id', sessionId);
      if (selectedSpeakers.length > 0) {
        const rows = selectedSpeakers.map(sid => ({ session_id: sessionId, speaker_id: sid }));
        await supabase.from('session_speakers').insert(rows);
      }
    }

    toast.success(t(lang, 'saved'));
    setModal(false);
    load();
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t(lang, 'confirm_delete'))) return;
    await supabase.from('sessions').delete().eq('id', id);
    toast.success(t(lang, 'deleted')); load();
  };

  const fmt = (dt) => dt ? new Date(dt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>{t(lang, 'program')}</div>
          <div style={{ color: COLORS.dim, fontSize: 13, marginTop: 4 }}>{items.length} {de ? 'Sessions' : 'sessions'}</div>
        </div>
        <button style={s.addBtn} onClick={openAdd}><Plus size={16} />{de ? 'Session hinzufügen' : 'Add Session'}</button>
      </div>

      {items.length === 0 && (
        <div style={{ color: COLORS.dim, textAlign: 'center', padding: 60 }}>{t(lang, 'no_data')}</div>
      )}
      {items.map(item => {
        const spIds = speakersForSession(item.id);
        return (
          <div key={item.id} style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{item.title}</div>
                {spIds.length > 0 && <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 6 }}>👤 {spIds.map(speakerName).filter(Boolean).join(', ')}</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                  {item.track_id && <span style={s.badge(COLORS.primary)}>{trackName(item.track_id)}</span>}
                  {item.session_type && <span style={s.badge('#3b82f6')}>{item.session_type}</span>}
                  {item.is_featured && <span style={s.badge('#f59e0b')}>Featured</span>}
                </div>
                <div style={{ color: COLORS.dim, fontSize: 12 }}>{fmt(item.start_time)} bis {fmt(item.end_time)}{item.location ? ` · ${item.location}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginLeft: 12 }}>
                <button style={s.iconBtn(COLORS.primary)} onClick={() => openEdit(item)}><Edit2 size={13} /></button>
                <button style={s.iconBtn(COLORS.accent)} onClick={() => handleDelete(item.id)}><Trash2 size={13} /></button>
              </div>
            </div>
          </div>
        );
      })}

      {modal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={s.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 700 }}>{editing ? t(lang, 'edit') : t(lang, 'add')} Session</span>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: COLORS.dim, cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={s.field}>
              <label style={s.label}>{t(lang, 'title')} *</label>
              <input style={s.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            <div style={s.field}>
              <label style={s.label}>{de ? 'Referenten' : 'Speakers'} {selectedSpeakers.length > 0 && `(${selectedSpeakers.length})`}</label>
              {speakers.length === 0 ? (
                <div style={{ color: COLORS.dim, fontSize: 13, padding: '8px 0' }}>
                  {de ? 'Noch keine Referenten angelegt. Lege sie zuerst im Referenten-Bereich an.' : 'No speakers yet. Create them in the Speakers section first.'}
                </div>
              ) : (
                <div>
                  <div style={s.searchBox}>
                    <Search size={15} color={COLORS.dim} />
                    <input style={s.searchInput} value={speakerSearch} onChange={e => setSpeakerSearch(e.target.value)}
                      placeholder={de ? 'Referent suchen…' : 'Search speaker…'} />
                    {speakerSearch && <button onClick={() => setSpeakerSearch('')} style={{ background: 'none', border: 'none', color: COLORS.dim, cursor: 'pointer' }}><X size={14} /></button>}
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 6 }}>
                    {visibleSpeakers.length === 0 && (
                      <div style={{ color: COLORS.dim, fontSize: 13, padding: '8px 10px' }}>{de ? 'Keine Treffer.' : 'No matches.'}</div>
                    )}
                    {visibleSpeakers.map(sp => {
                      const checked = selectedSpeakers.includes(sp.id);
                      return (
                        <div key={sp.id} style={{ ...s.speakerRow, background: checked ? COLORS.primary + '22' : 'transparent' }} onClick={() => toggleSpeaker(sp.id)}>
                          <input type="checkbox" checked={checked} readOnly />
                          {sp.photo_url ? <img src={sp.photo_url} alt="" style={s.speakerAvatar} /> : <div style={s.speakerAvatarFb}>{sp.name[0]}</div>}
                          <div style={{ flex: 1 }}>
                            <div style={{ color: COLORS.text, fontSize: 14 }}>{sp.name}</div>
                            {(sp.role || sp.company) && <div style={{ color: COLORS.dim, fontSize: 12 }}>{[sp.role, sp.company].filter(Boolean).join(' · ')}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={s.row}>
              <div style={{ flex: 1, ...s.field }}>
                <label style={s.label}>{de ? 'Bühne' : 'Stage'}</label>
                <select style={s.select} value={form.track_id || ''} onChange={e => setForm(f => ({ ...f, track_id: e.target.value }))}>
                  <option value="">{de ? '- Bühne wählen -' : '- Select stage -'}</option>
                  {stageOptions.map(tr => <option key={tr.id} value={tr.id}>{tr.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, ...s.field }}>
                <label style={s.label}>{t(lang, 'type')}</label>
                <input style={s.input} value={form.session_type || ''} onChange={e => setForm(f => ({ ...f, session_type: e.target.value }))} placeholder="Talk, Workshop..." />
              </div>
            </div>
            <div style={s.row}>
              <div style={{ flex: 1, ...s.field }}>
                <label style={s.label}>{t(lang, 'start')}</label>
                <input style={s.input} type="datetime-local" value={form.start_time || ''} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div style={{ flex: 1, ...s.field }}>
                <label style={s.label}>{t(lang, 'end')}</label>
                <input style={s.input} type="datetime-local" value={form.end_time || ''} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>{de ? 'Ort / Raum' : 'Location / Room'}</label>
              <input style={s.input} value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{t(lang, 'description')}</label>
              <textarea style={s.textarea} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ ...s.field, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="featured" checked={form.is_featured || false} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} />
              <label htmlFor="featured" style={{ color: COLORS.muted, fontSize: 13 }}>Featured / Hervorgehoben</label>
            </div>
            <div style={s.row}>
              <button style={s.cancelBtn} onClick={() => setModal(false)}>{t(lang, 'cancel')}</button>
              <button style={s.saveBtn} onClick={handleSave} disabled={saving}>{saving ? t(lang, 'loading') : t(lang, 'save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}