import { useState, useEffect, useContext } from 'react';
import { supabase, t } from '../lib/supabase';
import { LangContext, EventContext } from '../App';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, X } from 'lucide-react';

const COLORS = { primary: '#8c368c', accent: '#e71f69', bg: '#f4f2f6', surface: '#ffffff', border: '#e6e2ec', text: '#1d1d1b', muted: '#6b6b76', dim: '#9a9aa5' };

const empty = { name: '', color: '#8c368c', icon: '', sort_order: 0 };

function CategoryTable({ title, table, eventId, lang }) {
  const de = lang === 'de';
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from(table).select('*').eq('event_id', eventId).order('sort_order');
    setItems(data || []);
  };
  useEffect(() => { if (eventId) load(); }, [eventId]);

  const openAdd = () => { setForm({ ...empty, sort_order: items.length }); setEditing(null); setModal(true); };
  const openEdit = (item) => { setForm(item); setEditing(item.id); setModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error(de ? 'Name ist erforderlich' : 'Name is required'); return; }
    setSaving(true);
    const payload = { ...form, event_id: eventId };
    const { error } = editing
      ? await supabase.from(table).update(payload).eq('id', editing)
      : await supabase.from(table).insert(payload);
    if (error) toast.error(t(lang, 'error'));
    else { toast.success(t(lang, 'saved')); setModal(false); load(); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t(lang, 'confirm_delete'))) return;
    await supabase.from(table).delete().eq('id', id);
    toast.success(t(lang, 'deleted')); load();
  };

  const s = {
    card: { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, marginBottom: 20 },
    addBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: `${COLORS.primary}`, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    row: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${COLORS.border}` },
    label: { display: 'block', color: COLORS.muted, fontSize: 11, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase' },
    input: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
    modal: { background: COLORS.surface, borderRadius: 16, padding: 28, width: '100%', maxWidth: 440, border: `1px solid ${COLORS.border}` },
    saveBtn: { padding: '10px 24px', background: `${COLORS.primary}`, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
    cancelBtn: { padding: '10px 24px', background: '#f0edf3', color: COLORS.muted, border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
    iconBtn: (color) => ({ background: color + '22', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color }),
  };

  return (
    <div style={s.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ color: COLORS.text, fontSize: 16, fontWeight: 700 }}>{title}</div>
        <button style={s.addBtn} onClick={openAdd}><Plus size={15} />{de ? 'Hinzufügen' : 'Add'}</button>
      </div>

      {items.length === 0 && <div style={{ color: COLORS.dim, textAlign: 'center', padding: 24 }}>{t(lang, 'no_data')}</div>}

      {items.map(item => (
        <div key={item.id} style={s.row}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: item.color || COLORS.primary, flexShrink: 0 }} />
          <div style={{ flex: 1, color: COLORS.text, fontWeight: 500 }}>{item.name}</div>
          <div style={{ color: COLORS.dim, fontSize: 12 }}>{item.color}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={s.iconBtn(COLORS.primary)} onClick={() => openEdit(item)}><Edit2 size={13} /></button>
            <button style={s.iconBtn(COLORS.accent)} onClick={() => handleDelete(item.id)}><Trash2 size={13} /></button>
          </div>
        </div>
      ))}

      {modal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={s.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 700 }}>{editing ? t(lang, 'edit') : t(lang, 'add')}</span>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: COLORS.dim, cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>{t(lang, 'name')} *</label>
              <input style={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>{de ? 'Farbe' : 'Color'}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  style={{ width: 44, height: 38, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6 }} />
                <input style={{ ...s.input, flex: 1 }} value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>{de ? 'Reihenfolge' : 'Sort order'}</label>
              <input style={s.input} type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={s.cancelBtn} onClick={() => setModal(false)}>{t(lang, 'cancel')}</button>
              <button style={s.saveBtn} onClick={handleSave} disabled={saving}>{saving ? '...' : t(lang, 'save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Categories() {
  const lang = useContext(LangContext);
  const event = useContext(EventContext);
  const de = lang === 'de';

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: COLORS.text, fontSize: 22, fontWeight: 700 }}>{de ? 'Kategorien & Bühnen' : 'Categories & Stages'}</div>
        <div style={{ color: COLORS.dim, fontSize: 13, marginTop: 4 }}>{de ? 'Aussteller-Kategorien und Programm-Bühnen verwalten' : 'Manage exhibitor categories and program stages'}</div>
      </div>
      {event && (
        <>
          <CategoryTable title={de ? 'Aussteller-Kategorien' : 'Exhibitor Categories'} table="exhibitor_categories" eventId={event.id} lang={lang} />
          <CategoryTable title={de ? 'Programm-Bühnen & Formate' : 'Program Stages & Formats'} table="tracks" eventId={event.id} lang={lang} />
        </>
      )}
    </div>
  );
}
