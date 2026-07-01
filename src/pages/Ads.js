import { useState, useEffect, useContext, useRef } from 'react';
import { supabase, t } from '../lib/supabase';
import { LangContext, EventContext } from '../App';
import toast from 'react-hot-toast';
import { Plus, Trash2, X, Upload, Image } from 'lucide-react';

const COLORS = { primary: '#8c368c', accent: '#e71f69', bg: '#f4f2f6', surface: '#ffffff', border: '#e6e2ec', text: '#1d1d1b', muted: '#6b6b76', dim: '#9a9aa5' };
const SUPABASE_URL = 'https://zdtfrqlqprtswnxniedq.supabase.co';

const PLACEMENTS = [
  { value: 'footer_banner', de: 'Footer Banner', en: 'Footer Banner', desc_de: 'Dauerhafter Banner am unteren Rand der App', desc_en: 'Permanent banner at the bottom of the app', size: '1200 x 240 px', ratio: '5:1' },
  { value: 'list_ad', de: 'Listen-Anzeige', en: 'List Ad', desc_de: 'Rotierende Anzeige in Listen (Aussteller, Programm)', desc_en: 'Rotating ad inside lists (exhibitors, program)', size: '1200 x 300 px', ratio: '4:1' },
];

const empty = { title: '', image_url: '', link_url: '', exhibitor_id: '', placement: 'footer_banner', priority: 0, is_active: true };

export default function Ads() {
  const lang = useContext(LangContext);
  const event = useContext(EventContext);
  const de = lang === 'de';
  const [ads, setAds] = useState([]);
  const [exhibitors, setExhibitors] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const load = async () => {
    if (!event) return;
    const { data } = await supabase.from('ads').select('*, exhibitors(id,name)').eq('event_id', event.id).order('priority', { ascending: false });
    setAds(data || []);
  };
  const loadEx = async () => {
    if (!event) return;
    const { data } = await supabase.from('exhibitors').select('id,name').eq('event_id', event.id).order('name');
    setExhibitors(data || []);
  };
  useEffect(() => { load(); loadEx(); }, [event]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `ads/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('ads').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('ads').getPublicUrl(path);
      setForm(f => ({ ...f, image_url: urlData.publicUrl }));
      toast.success(de ? 'Bild hochgeladen!' : 'Image uploaded!');
    } catch {
      toast.error(de ? 'Upload fehlgeschlagen. Bitte "ads" Bucket in Supabase Storage erstellen.' : 'Upload failed. Please create "ads" bucket in Supabase Storage.');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.image_url.trim()) {
      toast.error(de ? 'Titel und Bild sind erforderlich' : 'Title and image are required');
      return;
    }
    setSaving(true);
    const payload = {
      event_id: event.id, title: form.title, image_url: form.image_url,
      link_url: form.exhibitor_id ? null : (form.link_url || null),
      exhibitor_id: form.exhibitor_id || null,
      placement: form.placement, priority: parseInt(form.priority) || 0, is_active: form.is_active,
    };
    const { error } = await supabase.from('ads').insert(payload);
    if (error) toast.error(t(lang, 'error'));
    else { toast.success(t(lang, 'saved')); setModal(false); setForm(empty); load(); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t(lang, 'confirm_delete'))) return;
    await supabase.from('ads').delete().eq('id', id);
    toast.success(t(lang, 'deleted')); load();
  };

  const toggleActive = async (ad) => {
    await supabase.from('ads').update({ is_active: !ad.is_active }).eq('id', ad.id);
    load();
  };

  const plLabel = (v) => { const p = PLACEMENTS.find(x => x.value === v); return p ? (de ? p.de : p.en) : v; };
  const selectedPlacement = PLACEMENTS.find(p => p.value === form.placement);

  const s = {
    page: { padding: 24 },
    addBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: `${COLORS.primary}`, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 },
    card: (active) => ({ background: COLORS.surface, borderRadius: 12, overflow: 'hidden', border: `1px solid ${COLORS.border}`, opacity: active ? 1 : 0.5 }),
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
    modal: { background: COLORS.surface, borderRadius: 16, padding: 28, width: '100%', maxWidth: 500, border: `1px solid ${COLORS.border}`, maxHeight: '90vh', overflowY: 'auto' },
    label: { display: 'block', color: COLORS.muted, fontSize: 12, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase' },
    input: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
    select: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
    field: { marginBottom: 14 },
    row: { display: 'flex', gap: 10 },
    saveBtn: { padding: '10px 24px', background: `${COLORS.primary}`, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
    cancelBtn: { padding: '10px 24px', background: '#f0edf3', color: COLORS.muted, border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
    badge: (color) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: color + '22', color, marginRight: 4 }),
    sizeHint: { background: COLORS.primary + '11', border: `1px solid ${COLORS.primary}33`, borderRadius: 8, padding: '10px 12px', marginBottom: 8, fontSize: 13, color: COLORS.text },
  };

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ color: COLORS.text, fontSize: 22, fontWeight: 700 }}>{t(lang, 'ads')}</div>
          <div style={{ color: COLORS.dim, fontSize: 13, marginTop: 4 }}>{ads.length} {de ? 'Anzeigen' : 'ads'}</div>
        </div>
        <button style={s.addBtn} onClick={() => { setForm(empty); setModal(true); }}><Plus size={16} />{de ? 'Neue Anzeige' : 'New Ad'}</button>
      </div>

      {/* Placement summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {PLACEMENTS.map(p => {
          const count = ads.filter(a => a.placement === p.value && a.is_active).length;
          return (
            <div key={p.value} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 14 }}>{de ? p.de : p.en}</div>
              <div style={{ color: COLORS.dim, fontSize: 12, marginTop: 2 }}>{de ? p.desc_de : p.desc_en}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <span style={{ color: COLORS.primary, fontWeight: 600, fontSize: 13 }}>{count} {de ? 'aktiv' : 'active'}</span>
                <span style={{ color: COLORS.muted, fontSize: 12 }}>{de ? 'Empf.' : 'Rec.'} {p.size}</span>
              </div>
            </div>
          );
        })}
      </div>

      {ads.length === 0
        ? <div style={{ color: COLORS.dim, textAlign: 'center', padding: 60 }}><Image size={36} style={{ opacity: 0.3, marginBottom: 10 }} /><div>{de ? 'Noch keine Anzeigen' : 'No ads yet'}</div></div>
        : <div style={s.grid}>
          {ads.map(ad => (
            <div key={ad.id} style={s.card(ad.is_active)}>
              {ad.image_url
                ? <img src={ad.image_url} alt={ad.title} style={{ width: '100%', height: 150, objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: 150, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Image size={28} color="#ded8e6" /></div>
              }
              <div style={{ padding: 14 }}>
                <div style={{ color: COLORS.text, fontWeight: 600, marginBottom: 6 }}>{ad.title}</div>
                <span style={s.badge(COLORS.primary)}>{plLabel(ad.placement)}</span>
                {ad.exhibitors && <span style={s.badge(COLORS.accent)}>{ad.exhibitors.name}</span>}
                <div style={{ color: COLORS.dim, fontSize: 12, marginTop: 6 }}>{de ? 'Priorität' : 'Priority'}: {ad.priority}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => toggleActive(ad)}
                    style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: ad.is_active ? '#22c55e22' : '#9a9aa522', color: ad.is_active ? '#22c55e' : COLORS.dim }}>
                    {ad.is_active ? (de ? 'Aktiv' : 'Active') : (de ? 'Inaktiv' : 'Inactive')}
                  </button>
                  <button onClick={() => handleDelete(ad.id)}
                    style={{ padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: COLORS.accent + '22', color: COLORS.accent }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      }

      {modal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={s.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 700 }}>{de ? 'Neue Anzeige' : 'New Ad'}</span>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: COLORS.dim, cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={s.field}>
              <label style={s.label}>{de ? 'Titel *' : 'Title *'}</label>
              <input style={s.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{de ? 'Platzierung *' : 'Placement *'}</label>
              <select style={s.select} value={form.placement} onChange={e => setForm(f => ({ ...f, placement: e.target.value }))}>
                {PLACEMENTS.map(p => <option key={p.value} value={p.value}>{de ? p.de : p.en}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>{de ? 'Anzeigenbild *' : 'Ad Image *'}</label>
              {selectedPlacement && (
                <div style={s.sizeHint}>
                  <strong>{de ? 'Empfohlene Größe:' : 'Recommended size:'}</strong> {selectedPlacement.size} ({de ? 'Verhältnis' : 'ratio'} {selectedPlacement.ratio})
                  <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 3 }}>
                    {de ? 'Querformat, PNG oder JPG, unter 1 MB. Wichtige Inhalte mittig platzieren.' : 'Landscape, PNG or JPG, under 1 MB. Keep key content centered.'}
                  </div>
                </div>
              )}
              {form.image_url && <img src={form.image_url} alt="" style={{ width: '100%', height: 130, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />}
              <div onClick={() => fileRef.current?.click()}
                style={{ border: `2px dashed ${COLORS.border}`, borderRadius: 8, padding: 16, textAlign: 'center', cursor: 'pointer', marginBottom: 6 }}>
                <Upload size={18} color={COLORS.primary} style={{ marginBottom: 4 }} />
                <div style={{ color: COLORS.muted, fontSize: 13 }}>{uploading ? (de ? 'Hochladen...' : 'Uploading...') : (de ? 'Bild hochladen' : 'Upload image')}</div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
              <input style={{ ...s.input, marginTop: 4 }} placeholder="oder URL eingeben / or enter URL" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{de ? 'Link zu Aussteller' : 'Link to Exhibitor'}</label>
              <select style={s.select} value={form.exhibitor_id} onChange={e => setForm(f => ({ ...f, exhibitor_id: e.target.value, link_url: '' }))}>
                <option value="">{de ? 'Kein Aussteller' : 'No exhibitor'}</option>
                {exhibitors.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </select>
            </div>
            {!form.exhibitor_id && (
              <div style={s.field}>
                <label style={s.label}>{de ? 'Oder externe URL' : 'Or external URL'}</label>
                <input style={s.input} placeholder="https://" value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} />
              </div>
            )}
            <div style={s.row}>
              <div style={{ flex: 1, ...s.field }}>
                <label style={s.label}>{de ? 'Priorität (0-100)' : 'Priority (0-100)'}</label>
                <input style={s.input} type="number" min="0" max="100" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} />
              </div>
              <div style={{ flex: 1, ...s.field }}>
                <label style={s.label}>Status</label>
                <select style={s.select} value={form.is_active ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'true' }))}>
                  <option value="true">{de ? 'Aktiv' : 'Active'}</option>
                  <option value="false">{de ? 'Inaktiv' : 'Inactive'}</option>
                </select>
              </div>
            </div>
            <div style={s.row}>
              <button style={s.cancelBtn} onClick={() => setModal(false)}>{t(lang, 'cancel')}</button>
              <button style={s.saveBtn} onClick={handleSave} disabled={saving}>{saving ? '...' : t(lang, 'save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}