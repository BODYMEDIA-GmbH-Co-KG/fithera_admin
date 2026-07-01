import { useState, useEffect, useContext } from 'react';
import { supabase, t } from '../lib/supabase';
import { LangContext, EventContext } from '../App';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, X, Upload, Calendar } from 'lucide-react';

const COLORS = { primary: '#8c368c', accent: '#e71f69', bg: '#f4f2f6', surface: '#ffffff', border: '#e6e2ec', text: '#1d1d1b', muted: '#6b6b76', dim: '#9a9aa5' };

const s = {
  page: { padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: COLORS.text, fontSize: 22, fontWeight: 700 },
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: `${COLORS.primary}`, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 },
  card: { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' },
  avatar: { width: 56, height: 56, borderRadius: 28, objectFit: 'cover', background: COLORS.bg, flexShrink: 0 },
  avatarFallback: { width: 56, height: 56, borderRadius: 28, background: COLORS.primary + '33', color: COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, flexShrink: 0 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal: { background: COLORS.surface, borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, border: `1px solid ${COLORS.border}`, maxHeight: '90vh', overflowY: 'auto' },
  label: { display: 'block', color: COLORS.muted, fontSize: 12, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase' },
  input: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', minHeight: 90, resize: 'vertical' },
  field: { marginBottom: 14 },
  row: { display: 'flex', gap: 12 },
  saveBtn: { padding: '10px 24px', background: `${COLORS.primary}`, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  cancelBtn: { padding: '10px 24px', background: '#f0edf3', color: COLORS.muted, border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  iconBtn: (color) => ({ background: color + '22', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color }),
  sessionTag: { display: 'flex', alignItems: 'center', gap: 5, background: COLORS.primary + '18', color: COLORS.primary, borderRadius: 6, padding: '3px 7px', fontSize: 11, fontWeight: 600 },
};

const empty = { name: '', company: '', role: '', bio: '', photo_url: '' };

export default function Speakers() {
  const lang = useContext(LangContext);
  const event = useContext(EventContext);
  const de = lang === 'de';
  const [items, setItems] = useState([]);
  const [sessionsBySpeaker, setSessionsBySpeaker] = useState({}); // speaker_id -> [{title, start_time}]
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!event) return;
    const { data } = await supabase.from('speakers').select('*').eq('event_id', event.id).order('name');
    setItems(data || []);

    // Load which sessions each speaker is linked to (speaker -> session direction)
    const { data: links } = await supabase
      .from('session_speakers')
      .select('speaker_id, sessions(id, title, start_time)');
    const map = {};
    (links || []).forEach(l => {
      if (!l.sessions) return;
      if (!map[l.speaker_id]) map[l.speaker_id] = [];
      map[l.speaker_id].push(l.sessions);
    });
    // sort each speaker's sessions by time
    Object.values(map).forEach(arr => arr.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')));
    setSessionsBySpeaker(map);
  };
  useEffect(() => { load(); }, [event]);

  const openAdd = () => { setForm(empty); setEditing(null); setModal(true); };
  const openEdit = (item) => {
    setForm({ name: item.name || '', company: item.company || '', role: item.role || '', bio: item.bio || '', photo_url: item.photo_url || '' });
    setEditing(item.id);
    setModal(true);
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = 'photos/' + Date.now() + '.' + ext;
      const { error } = await supabase.storage.from('speakers').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('speakers').getPublicUrl(path);
      setForm(f => ({ ...f, photo_url: urlData.publicUrl }));
      toast.success(de ? 'Foto hochgeladen!' : 'Photo uploaded!');
    } catch (e) {
      toast.error(de ? 'Upload fehlgeschlagen' : 'Upload failed');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error(de ? 'Name ist erforderlich' : 'Name is required'); return; }
    setSaving(true);
    const payload = {
      name: form.name,
      company: form.company || null,
      role: form.role || null,
      bio: form.bio || null,
      photo_url: form.photo_url || null,
      event_id: event.id,
    };
    const { error } = editing
      ? await supabase.from('speakers').update(payload).eq('id', editing)
      : await supabase.from('speakers').insert(payload);
    if (error) toast.error(t(lang, 'error'));
    else { toast.success(t(lang, 'saved')); setModal(false); load(); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t(lang, 'confirm_delete'))) return;
    await supabase.from('speakers').delete().eq('id', id);
    toast.success(t(lang, 'deleted')); load();
  };

  const fmtTime = (dt) => dt ? new Date(dt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>{de ? 'Referenten' : 'Speakers'}</div>
          <div style={{ color: COLORS.dim, fontSize: 13, marginTop: 4 }}>{items.length} {de ? 'Referenten' : 'speakers'}</div>
        </div>
        <button style={s.addBtn} onClick={openAdd}><Plus size={16} />{de ? 'Referent hinzufügen' : 'Add Speaker'}</button>
      </div>

      {items.length === 0 && (
        <div style={{ color: COLORS.dim, textAlign: 'center', padding: 60 }}>{t(lang, 'no_data')}</div>
      )}

      <div style={s.grid}>
        {items.map(item => {
          const sess = sessionsBySpeaker[item.id] || [];
          return (
            <div key={item.id} style={s.card}>
              {item.photo_url
                ? <img src={item.photo_url} alt="" style={s.avatar} />
                : <div style={s.avatarFallback}>{item.name[0]}</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 15 }}>{item.name}</div>
                {(item.role || item.company) && (
                  <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 2 }}>
                    {[item.role, item.company].filter(Boolean).join(' · ')}
                  </div>
                )}
                {item.bio && <div style={{ color: COLORS.dim, fontSize: 12, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.bio}</div>}

                {/* Sessions this speaker is linked to */}
                {sess.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {sess.map(se => (
                      <span key={se.id} style={s.sessionTag} title={fmtTime(se.start_time)}>
                        <Calendar size={11} /> {se.title}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button style={s.iconBtn(COLORS.primary)} onClick={() => openEdit(item)}><Edit2 size={13} /></button>
                  <button style={s.iconBtn(COLORS.accent)} onClick={() => handleDelete(item.id)}><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={s.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 700 }}>{editing ? t(lang, 'edit') : t(lang, 'add')} {de ? 'Referent' : 'Speaker'}</span>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: COLORS.dim, cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={s.field}>
              <label style={s.label}>{de ? 'Foto' : 'Photo'}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {form.photo_url
                  ? <img src={form.photo_url} alt="" style={{ width: 56, height: 56, borderRadius: 28, objectFit: 'cover' }} />
                  : <div style={s.avatarFallback}>{(form.name || '?')[0]}</div>}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: COLORS.primary + '22', color: COLORS.primary, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  <Upload size={14} />
                  {uploading ? '...' : (de ? 'Hochladen' : 'Upload')}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => uploadPhoto(e.target.files[0])} />
                </label>
                {form.photo_url && <button onClick={() => setForm(f => ({ ...f, photo_url: '' }))} style={{ background: 'none', border: 'none', color: COLORS.dim, cursor: 'pointer', fontSize: 12 }}>✕ {de ? 'Entfernen' : 'Remove'}</button>}
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>{de ? 'Name' : 'Name'} *</label>
              <input style={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={s.row}>
              <div style={{ flex: 1, ...s.field }}>
                <label style={s.label}>{de ? 'Position / Rolle' : 'Role'}</label>
                <input style={s.input} value={form.role || ''} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder={de ? 'z.B. CEO' : 'e.g. CEO'} />
              </div>
              <div style={{ flex: 1, ...s.field }}>
                <label style={s.label}>{de ? 'Unternehmen' : 'Company'}</label>
                <input style={s.input} value={form.company || ''} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>{de ? 'Biografie' : 'Bio'}</label>
              <textarea style={s.textarea} value={form.bio || ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
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