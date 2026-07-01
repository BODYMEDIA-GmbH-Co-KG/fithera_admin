import { useState, useEffect, useContext } from 'react';
import { supabase, t } from '../lib/supabase';
import { LangContext, EventContext } from '../App';
import toast from 'react-hot-toast';
import { Search, X, Plus, Trash2, Edit2 } from 'lucide-react';

const COLORS = { primary: '#8c368c', accent: '#e71f69', bg: '#f4f2f6', surface: '#ffffff', border: '#e6e2ec', text: '#1d1d1b', muted: '#6b6b76', dim: '#9a9aa5' };

// Sponsor tiers in display order. matchNames are the category names that count
// for exhibitor-sponsors. The "tier" string stored in the sponsors table uses label.
const TIERS = [
  { label: 'Eventpartner', color: '#8c368c', matchNames: ['eventpartner', 'event partner'] },
  { label: 'Platin', color: '#7b8794', matchNames: ['platinsponsor', 'platin', 'platinum'] },
  { label: 'Gold', color: '#d4a017', matchNames: ['goldsponsor', 'gold'] },
  { label: 'Silber', color: '#9aa5b1', matchNames: ['silbersponsor', 'silber', 'silver'] },
];

const s = {
  page: { padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { color: COLORS.text, fontSize: 22, fontWeight: 700 },
  sub: { color: COLORS.dim, fontSize: 13, marginTop: 4 },
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  tierBlock: { marginBottom: 28 },
  tierHead: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  tierBar: { width: 4, height: 20, borderRadius: 2 },
  tierTitle: { fontSize: 17, fontWeight: 700 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 },
  card: { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 10, position: 'relative' },
  logoBox: { width: 44, height: 44, borderRadius: 8, background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' },
  logoFb: { fontSize: 18, fontWeight: 700, color: COLORS.primary },
  cardName: { fontSize: 13, fontWeight: 600, color: COLORS.text, lineHeight: 1.3, flex: 1 },
  partnerTag: { fontSize: 10, fontWeight: 600, color: COLORS.muted, background: COLORS.bg, borderRadius: 4, padding: '1px 5px', marginTop: 3, display: 'inline-block' },
  cardBtns: { position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4 },
  miniBtn: (c) => ({ background: c + '22', border: 'none', borderRadius: 6, padding: 3, cursor: 'pointer', color: c, display: 'flex' }),
  emptyTier: { color: COLORS.dim, fontSize: 13, fontStyle: 'italic' },
  assignBar: { display: 'flex', alignItems: 'center', gap: 10, padding: 16, background: COLORS.surface, border: `1px solid ${COLORS.primary}`, borderRadius: 12, marginBottom: 24, flexWrap: 'wrap' },
  select: { background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px', color: COLORS.text, fontSize: 14, outline: 'none', minWidth: 180 },
  btn: { padding: '9px 16px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  searchWrap: { position: 'relative', flex: 1, minWidth: 200 },
  searchBox: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px 9px 34px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal: { background: COLORS.surface, borderRadius: 16, padding: 28, width: '100%', maxWidth: 460, border: `1px solid ${COLORS.border}` },
  label: { display: 'block', color: COLORS.muted, fontSize: 12, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase' },
  input: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  field: { marginBottom: 14 },
  row: { display: 'flex', gap: 12, marginTop: 8 },
  saveBtn: { padding: '10px 24px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  cancelBtn: { padding: '10px 24px', background: '#f0edf3', color: COLORS.muted, border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  sectionLabel: { color: COLORS.muted, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
};

const emptyPartner = { name: '', tier: 'Eventpartner', logo_url: '', website: '' };

export default function Sponsors() {
  const lang = useContext(LangContext);
  const event = useContext(EventContext);
  const de = lang === 'de';
  const [exhibitors, setExhibitors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [links, setLinks] = useState([]);
  const [partners, setPartners] = useState([]);
  const [assignEx, setAssignEx] = useState('');
  const [assignTier, setAssignTier] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyPartner);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    if (!event) return;
    const [{ data: exData }, { data: catData }, { data: linkData }, { data: partnerData }] = await Promise.all([
      supabase.from('exhibitors').select('id, name, logo_url').eq('event_id', event.id).order('name'),
      supabase.from('exhibitor_categories').select('id, name').eq('event_id', event.id),
      supabase.from('exhibitor_category_links').select('exhibitor_id, category_id'),
      supabase.from('sponsors').select('*').eq('event_id', event.id).order('name'),
    ]);
    setExhibitors(exData || []);
    setCategories(catData || []);
    setLinks(linkData || []);
    setPartners(partnerData || []);
  };
  useEffect(() => { load(); }, [event]);

  const catIdForTier = (tier) => {
    const matches = categories.filter(c => tier.matchNames.includes((c.name || '').trim().toLowerCase()));
    if (matches.length === 0) return null;
    // If several categories match (e.g. an old duplicate), prefer the one that
    // actually has exhibitors linked, so we never pick an empty leftover.
    const withLinks = matches.find(c => links.some(l => l.category_id === c.id));
    return (withLinks || matches[0]).id;
  };

  // All matching category ids for a tier (used to gather exhibitors).
  const catIdsForTier = (tier) =>
    categories
      .filter(c => tier.matchNames.includes((c.name || '').trim().toLowerCase()))
      .map(c => c.id);

  // Exhibitor-sponsors for a tier.
  const exhibitorsForTier = (tier) => {
    const cids = catIdsForTier(tier);
    if (cids.length === 0) return [];
    const exIds = new Set(links.filter(l => cids.includes(l.category_id)).map(l => l.exhibitor_id));
    return exhibitors.filter(e => exIds.has(e.id)).map(e => ({ ...e, _kind: 'exhibitor' }));
  };

  // Manual partners for a tier.
  const partnersForTier = (tier) => partners.filter(p => p.tier === tier.label).map(p => ({ ...p, _kind: 'partner' }));

  // Combined list per tier.
  const allForTier = (tier) => [...exhibitorsForTier(tier), ...partnersForTier(tier)];

  const sponsorCatIds = TIERS.map(catIdForTier).filter(Boolean);
  const assignedExIds = new Set(links.filter(l => sponsorCatIds.includes(l.category_id)).map(l => l.exhibitor_id));

  const totalCount = TIERS.reduce((sum, tr) => sum + allForTier(tr).length, 0);

  const assign = async () => {
    if (!assignEx || !assignTier) return;
    const tier = TIERS.find(t => t.label === assignTier);
    const cid = catIdForTier(tier);
    if (!cid) { toast.error(de ? `Kategorie "${tier.label}" fehlt. Erst unter Kategorien anlegen.` : `Category "${tier.label}" missing.`); return; }
    setSaving(true);
    const otherCatIds = sponsorCatIds.filter(id => id !== cid);
    if (otherCatIds.length) {
      await supabase.from('exhibitor_category_links').delete().eq('exhibitor_id', assignEx).in('category_id', otherCatIds);
    }
    const { error } = await supabase.from('exhibitor_category_links')
      .upsert([{ exhibitor_id: assignEx, category_id: cid }], { onConflict: 'exhibitor_id,category_id', ignoreDuplicates: true });
    if (error) { console.error(error); toast.error(t(lang, 'error')); }
    else { toast.success(de ? 'Sponsor zugewiesen' : 'Sponsor assigned'); setAssignEx(''); setAssignTier(''); load(); }
    setSaving(false);
  };

  const removeExhibitorTier = async (exId, tier) => {
    const cid = catIdForTier(tier);
    if (!cid) return;
    const { error } = await supabase.from('exhibitor_category_links').delete().eq('exhibitor_id', exId).eq('category_id', cid);
    if (error) { console.error(error); toast.error(t(lang, 'error')); }
    else { toast.success(de ? 'Entfernt' : 'Removed'); load(); }
  };

  const openAddPartner = () => { setForm(emptyPartner); setEditing(null); setModal(true); };
  const openEditPartner = (p) => { setForm({ name: p.name, tier: p.tier, logo_url: p.logo_url || '', website: p.website || '' }); setEditing(p.id); setModal(true); };

  const savePartner = async () => {
    if (!form.name.trim()) { toast.error(de ? 'Name ist erforderlich' : 'Name is required'); return; }
    setSaving(true);
    const payload = { ...form, event_id: event.id };
    let error;
    if (editing) ({ error } = await supabase.from('sponsors').update(payload).eq('id', editing));
    else ({ error } = await supabase.from('sponsors').insert(payload));
    if (error) { console.error(error); toast.error(t(lang, 'error')); }
    else { toast.success(t(lang, 'saved')); setModal(false); load(); }
    setSaving(false);
  };

  const deletePartner = async (id) => {
    if (!window.confirm(t(lang, 'confirm_delete'))) return;
    const { error } = await supabase.from('sponsors').delete().eq('id', id);
    if (error) { console.error(error); toast.error(t(lang, 'error')); }
    else { toast.success(t(lang, 'deleted')); load(); }
  };

  const assignable = exhibitors.filter(e => e.name.toLowerCase().includes(search.toLowerCase())).slice(0, 200);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>{de ? 'Sponsoren' : 'Sponsors'}</div>
          <div style={s.sub}>{totalCount} {de ? 'gesamt (Aussteller + Partner)' : 'total (exhibitors + partners)'}</div>
        </div>
        <button style={s.addBtn} onClick={openAddPartner}><Plus size={16} />{de ? 'Partner hinzufügen' : 'Add partner'}</button>
      </div>

      <div style={s.sectionLabel}>{de ? 'Aussteller als Sponsor markieren' : 'Mark exhibitor as sponsor'}</div>
      <div style={s.assignBar}>
        <div style={s.searchWrap}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: COLORS.dim }} />
          <input style={s.searchBox} placeholder={de ? 'Aussteller suchen…' : 'Search exhibitor…'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={s.select} value={assignEx} onChange={e => setAssignEx(e.target.value)}>
          <option value="">{de ? 'Aussteller wählen…' : 'Choose exhibitor…'}</option>
          {assignable.map(e => <option key={e.id} value={e.id}>{e.name}{assignedExIds.has(e.id) ? ' ✓' : ''}</option>)}
        </select>
        <select style={s.select} value={assignTier} onChange={e => setAssignTier(e.target.value)}>
          <option value="">{de ? 'Stufe wählen…' : 'Choose tier…'}</option>
          {TIERS.map(tier => <option key={tier.label} value={tier.label}>{tier.label}</option>)}
        </select>
        <button style={{ ...s.btn, opacity: (assignEx && assignTier) ? 1 : 0.5 }} onClick={assign} disabled={!assignEx || !assignTier || saving}>
          {saving ? '…' : (de ? 'Zuweisen' : 'Assign')}
        </button>
      </div>

      {TIERS.map(tier => {
        const list = allForTier(tier);
        return (
          <div key={tier.label} style={s.tierBlock}>
            <div style={s.tierHead}>
              <div style={{ ...s.tierBar, background: tier.color }} />
              <div style={{ ...s.tierTitle, color: tier.color }}>{tier.label}</div>
              <div style={{ color: COLORS.dim, fontSize: 13 }}>({list.length})</div>
            </div>
            {list.length === 0 ? (
              <div style={s.emptyTier}>{de ? 'Noch keine zugewiesen' : 'None assigned yet'}</div>
            ) : (
              <div style={s.grid}>
                {list.map(sp => (
                  <div key={sp._kind + sp.id} style={s.card}>
                    <div style={s.logoBox}>
                      {sp.logo_url
                        ? <img src={sp.logo_url} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
                        : <span style={s.logoFb}>{sp.name[0]}</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={s.cardName}>{sp.name}</div>
                      {sp._kind === 'partner' && <span style={s.partnerTag}>{de ? 'Partner' : 'Partner'}</span>}
                    </div>
                    <div style={s.cardBtns}>
                      {sp._kind === 'partner' ? (
                        <>
                          <button style={s.miniBtn(COLORS.primary)} title={de ? 'Bearbeiten' : 'Edit'} onClick={() => openEditPartner(sp)}><Edit2 size={12} /></button>
                          <button style={s.miniBtn(COLORS.accent)} title={de ? 'Löschen' : 'Delete'} onClick={() => deletePartner(sp.id)}><Trash2 size={12} /></button>
                        </>
                      ) : (
                        <button style={s.miniBtn(COLORS.muted)} title={de ? 'Stufe entfernen' : 'Remove tier'} onClick={() => removeExhibitorTier(sp.id, tier)}><X size={13} /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {modal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={s.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 700 }}>{editing ? (de ? 'Partner bearbeiten' : 'Edit partner') : (de ? 'Partner hinzufügen' : 'Add partner')}</span>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: COLORS.dim, cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={s.field}>
              <label style={s.label}>{de ? 'Name' : 'Name'} *</label>
              <input style={s.input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{de ? 'Stufe' : 'Tier'}</label>
              <select style={s.input} value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))}>
                {TIERS.map(tier => <option key={tier.label} value={tier.label}>{tier.label}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Logo URL</label>
              <input style={s.input} value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div style={s.field}>
              <label style={s.label}>{de ? 'Webseite' : 'Website'}</label>
              <input style={s.input} value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." />
            </div>
            <div style={s.row}>
              <button style={s.cancelBtn} onClick={() => setModal(false)}>{t(lang, 'cancel')}</button>
              <button style={s.saveBtn} onClick={savePartner} disabled={saving}>{saving ? t(lang, 'loading') : t(lang, 'save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}