import { useState, useEffect, useContext } from 'react';
import { supabase, t } from '../lib/supabase';
import { LangContext, EventContext } from '../App';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, X, Search } from 'lucide-react';

const COLORS = { primary: '#8c368c', accent: '#e71f69', bg: '#f4f2f6', surface: '#ffffff', border: '#e6e2ec', text: '#1d1d1b', muted: '#6b6b76', dim: '#9a9aa5', pg: '#6bc8e8' };
const s = {
  page: { padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: COLORS.text, fontSize: 22, fontWeight: 700 },
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: `${COLORS.primary}`, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  searchBox: { width: '100%', background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px 9px 36px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse', background: COLORS.surface, borderRadius: 12, overflow: 'hidden', border: `1px solid ${COLORS.border}` },
  th: { padding: '12px 16px', color: COLORS.muted, fontSize: 12, fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', borderBottom: `1px solid ${COLORS.border}`, background: COLORS.bg },
  td: { padding: '12px 16px', color: COLORS.text, fontSize: 14, borderBottom: `1px solid ${COLORS.border}` },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modal: { background: COLORS.surface, borderRadius: 16, padding: 28, width: '100%', maxWidth: 540, border: `1px solid ${COLORS.border}`, maxHeight: '90vh', overflowY: 'auto' },
  label: { display: 'block', color: COLORS.muted, fontSize: 12, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase' },
  input: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px', color: COLORS.text, fontSize: 14, outline: 'none',boxSizing: 'border-box' },
  textarea: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', minHeight: 80, resize: 'vertical' },
  field: { marginBottom: 14 },
  row: { display: 'flex', gap: 12 },
  saveBtn: { padding: '10px 24px', background: `${COLORS.primary}`, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  cancelBtn: { padding: '10px 24px', background: '#f0edf3', color: COLORS.muted, border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
  iconBtn: (color) => ({ background: color + '22', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color }),
  bulkBar: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: COLORS.surface, border: `1px solid ${COLORS.primary}`, borderRadius: 10, marginBottom: 14, flexWrap: 'wrap' },
  bulkSelect: { background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 12px', color: COLORS.text, fontSize: 14, outline: 'none' },
  bulkBtn: { padding: '8px 16px', background: `${COLORS.primary}`, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  bulkRemoveBtn: { padding: '8px 16px', background: '#f0edf3', color: COLORS.muted, border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  bulkClear: { background: 'none', border: 'none', color: COLORS.dim, cursor: 'pointer', fontSize: 13 },
  checkbox: { width: 16, height: 16, cursor: 'pointer', accentColor: COLORS.primary },
  catCheckRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer' },
};

const empty = { name: '', description: '', booth_number: '', website: '', phone: '', email: '', logo_url: '', sponsor_tier: '' };

export default function Exhibitors() {
  const lang = useContext(LangContext);
  const event = useContext(EventContext);
  const de = lang === 'de';
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [links, setLinks] = useState([]);
  const [productGroups, setProductGroups] = useState([]);
  const [pgLinks, setPgLinks] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [formCats, setFormCats] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  const load = async () => {
    if (!event) return;
    const [{ data: exData }, { data: catData }, { data: linkData }, { data: pgData }, { data: pgLinkData }] = await Promise.all([
      supabase.from('exhibitors').select('*').eq('event_id', event.id).order('name'),
      supabase.from('exhibitor_categories').select('*').eq('event_id', event.id).order('sort_order'),
      supabase.from('exhibitor_category_links').select('exhibitor_id, category_id'),
      supabase.from('product_groups').select('*').eq('event_id', event.id).order('name'),
      supabase.from('exhibitor_product_group_links').select('exhibitor_id, product_group_id'),
    ]);
    setItems(exData || []);
    setCategories(catData || []);
    setLinks(linkData || []);
    setProductGroups(pgData || []);
    setPgLinks(pgLinkData || []);
  };
  useEffect(() => { load(); }, [event]);

  const catsFor = (exId) => {
    const ids = links.filter(l => l.exhibitor_id === exId).map(l => l.category_id);
    return categories.filter(c => ids.includes(c.id));
  };

  const pgsFor = (exId) => {
    const ids = pgLinks.filter(l => l.exhibitor_id === exId).map(l => l.product_group_id);
    return productGroups.filter(p => ids.includes(p.id));
  };

  const openAdd = () => { setForm(empty); setFormCats([]); setEditing(null); setModal(true); };
  const openEdit = (item) => {
    setForm({ ...empty, ...item });
    setFormCats(links.filter(l => l.exhibitor_id === item.id).map(l => l.category_id));
    setEditing(item.id);
    setModal(true);
  };

  const toggleFormCat = (id) =>
    setFormCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

  const syncLinks = async (exhibitorId, categoryIds) => {
    const del = await supabase.from('exhibitor_category_links').delete().eq('exhibitor_id', exhibitorId);
    if (del.error) { console.error('link delete error:', del.error); throw del.error; }
    if (categoryIds.length > 0) {
      const ins = await supabase.from('exhibitor_category_links')
        .insert(categoryIds.map(cid => ({ exhibitor_id: exhibitorId, category_id: cid })));
      if (ins.error) { console.error('link insert error:', ins.error); throw ins.error; }
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error(de ? 'Name ist erforderlich' : 'Name is required'); return; }
    setSaving(true);
    const payload = { ...form, event_id: event.id };
    let exhibitorId = editing;
    let error;
    if (editing) {
      ({ error } = await supabase.from('exhibitors').update(payload).eq('id', editing));
    } else {
      const res = await supabase.from('exhibitors').insert(payload).select('id').single();
      error = res.error;
      exhibitorId = res.data?.id;
    }
    try {
      if (!error && exhibitorId) await syncLinks(exhibitorId, formCats);
    } catch (e) { error = e; }
    if (error) toast.error(t(lang, 'error'));
    else { toast.success(t(lang, 'saved')); setModal(false); load(); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t(lang, 'confirm_delete'))) return;
    await supabase.from('exhibitors').delete().eq('id', id);
    toast.success(t(lang, 'deleted'));
    setSelected(sel => sel.filter(x => x !== id));
    load();
  };

  const filtered = items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()));

  const toggleOne = (id) => setSelected(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  const allVisibleSelected = filtered.length > 0 && filtered.every(i => selected.includes(i.id));
  const toggleAll = () => {
    if (allVisibleSelected) setSelected(sel => sel.filter(id => !filtered.some(i => i.id === id)));
    else setSelected(sel => [...new Set([...sel, ...filtered.map(i => i.id)])]);
  };

  const bulkAdd = async () => {
    if (!bulkCategory || selected.length === 0) return;
    setBulkSaving(true);
    const rows = selected.map(exId => ({ exhibitor_id: exId, category_id: bulkCategory }));
    const { error } = await supabase.from('exhibitor_category_links').upsert(rows, { onConflict: 'exhibitor_id,category_id', ignoreDuplicates: true });
    if (error) { console.error('bulk add error:', error); toast.error(t(lang, 'error')); }
    else { toast.success(de ? `Kategorie hinzugefügt (${selected.length})` : `Category added (${selected.length})`); setSelected([]); setBulkCategory(''); load(); }
    setBulkSaving(false);
  };

  const bulkRemove = async () => {
    if (!bulkCategory || selected.length === 0) return;
    setBulkSaving(true);
    const { error } = await supabase.from('exhibitor_category_links').delete().eq('category_id', bulkCategory).in('exhibitor_id', selected);
    if (error) { console.error('bulk remove error:', error); toast.error(t(lang, 'error')); }
    else { toast.success(de ? `Kategorie entfernt (${selected.length})` : `Category removed (${selected.length})`); setSelected([]); setBulkCategory(''); load(); }
    setBulkSaving(false);
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>{t(lang, 'exhibitors')}</div>
          <div style={{ color: COLORS.dim, fontSize: 13, marginTop: 4 }}>{items.length} {de ? 'Aussteller' : 'exhibitors'}</div>
        </div>
        <button style={s.addBtn} onClick={openAdd}><Plus size={16} />{t(lang, 'add')}</button>
      </div>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: COLORS.dim }} />
        <input style={s.searchBox} placeholder={t(lang, 'search')} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {selected.length > 0 && (
        <div style={s.bulkBar}>
          <span style={{ color: COLORS.text, fontWeight: 600, fontSize: 14 }}>{selected.length} {de ? 'ausgewählt' : 'selected'}</span>
          <select style={s.bulkSelect} value={bulkCategory} onChange={e => setBulkCategory(e.target.value)}>
            <option value="">{de ? 'Kategorie wählen…' : 'Choose category…'}</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button style={{ ...s.bulkBtn, opacity: bulkCategory ? 1 : 0.5 }} onClick={bulkAdd} disabled={!bulkCategory || bulkSaving}>
            {bulkSaving ? '…' : (de ? 'Hinzufügen' : 'Add')}
          </button>
          <button style={{ ...s.bulkRemoveBtn, opacity: bulkCategory ? 1 : 0.5 }} onClick={bulkRemove} disabled={!bulkCategory || bulkSaving}>
            {de ? 'Entfernen' : 'Remove'}
          </button>
          <button style={s.bulkClear} onClick={() => setSelected([])}>{de ? 'Auswahl aufheben' : 'Clear'}</button>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, width: 40 }}>
                <input type="checkbox" style={s.checkbox} checked={allVisibleSelected} onChange={toggleAll} />
              </th>
              <th style={s.th}>{t(lang, 'name')}</th>
              <th style={s.th}>{t(lang, 'booth')}</th>
              <th style={s.th}>{t(lang, 'category')}</th>
              <th style={s.th}>{de ? 'Produktgruppe' : 'Product group'}</th>
              <th style={s.th}>{de ? 'Sponsor' : 'Sponsor'}</th>
              <th style={s.th}>{t(lang, 'actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(ex => {
              const exCats = catsFor(ex.id);
              const exPgs = pgsFor(ex.id);
              return (
                <tr key={ex.id} style={selected.includes(ex.id) ? { background: COLORS.primary + '11' } : undefined}>
                  <td style={s.td}>
                    <input type="checkbox" style={s.checkbox} checked={selected.includes(ex.id)} onChange={() => toggleOne(ex.id)} />
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {ex.logo_url && <img src={ex.logo_url} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'contain', background: '#fff' }} />}
                      <span style={{ fontWeight: 500 }}>{ex.name}</span>
                    </div>
                  </td>
                  <td style={{ ...s.td, color: COLORS.muted }}>{ex.booth_number || '-'}</td>
                  <td style={s.td}>
                    {exCats.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {exCats.map(c => (
                          <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: (c.color || COLORS.primary) + '22', color: c.color || COLORS.primary, fontSize: 12, fontWeight: 600 }}>
                            <span style={{ width: 7, height: 7, borderRadius: 4, background: c.color || COLORS.primary }} />
                            {c.name}
                          </span>
                        ))}
                      </div>
                    ) : <span style={{ color: COLORS.dim }}>-</span>}
                  </td>
                  <td style={s.td}>
                    {exPgs.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {exPgs.map(p => (
                          <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: COLORS.pg + '22', color: '#3a9bc1', fontSize: 12, fontWeight: 600 }}>
                            <span style={{ width: 7, height: 7, borderRadius: 4, background: COLORS.pg }} />
                            {p.name}
                          </span>
                        ))}
                      </div>
                    ) : <span style={{ color: COLORS.dim }}>-</span>}
                  </td>
                  <td style={s.td}>
                    {ex.sponsor_tier
                      ? <span style={{ padding: '3px 10px', borderRadius: 20, background: '#f59e0b22', color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>{ex.sponsor_tier}</span>
                      : <span style={{ color: COLORS.dim }}>-</span>}
                  </td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={s.iconBtn(COLORS.primary)} onClick={() => openEdit(ex)}><Edit2 size={13} /></button>
                      <button style={s.iconBtn(COLORS.accent)} onClick={() => handleDelete(ex.id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', color: COLORS.dim, padding: 40 }}>{t(lang, 'no_data')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={s.overlay} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={s.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 700 }}>{editing ? t(lang, 'edit') : t(lang, 'add')} {t(lang, 'exhibitors')}</span>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: COLORS.dim, cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {[
              { key: 'name', label: t(lang, 'name') + ' *' },
              { key: 'booth_number', label: t(lang, 'booth') },
              { key: 'website', label: t(lang, 'website') },
              { key: 'phone', label: t(lang, 'phone') },
              { key: 'email', label: t(lang, 'email') },
              { key: 'logo_url', label: 'Logo URL' },
            ].map(f => (
              <div key={f.key} style={s.field}>
                <label style={s.label}>{f.label}</label>
                <input style={s.input} value={form[f.key] || ''} onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div style={s.field}>
              <label style={s.label}>{t(lang, 'category')}</label>
              <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '4px 12px' }}>
                {categories.length === 0 && <div style={{ color: COLORS.dim, fontSize: 13, padding: '8px 0' }}>{de ? 'Keine Kategorien' : 'No categories'}</div>}
                {categories.map(c => {
                  const checked = formCats.includes(c.id);
                  return (
                    <div key={c.id} style={s.catCheckRow} onClick={() => toggleFormCat(c.id)}>
                      <input type="checkbox" style={s.checkbox} checked={checked} readOnly />
                      <span style={{ width: 10, height: 10, borderRadius: 5, background: c.color || COLORS.primary }} />
                      <span style={{ color: COLORS.text, fontSize: 14 }}>{c.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {editing && pgsFor(editing).length > 0 && (
              <div style={s.field}>
                <label style={s.label}>{de ? 'Produktgruppen (aus Profairs)' : 'Product groups (from Profairs)'}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {pgsFor(editing).map(p => (
                    <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: COLORS.pg + '22', color: '#3a9bc1', fontSize: 13, fontWeight: 600 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 4, background: COLORS.pg }} />
                      {p.name}
                    </span>
                  ))}
                </div>
                <div style={{ color: COLORS.dim, fontSize: 12, marginTop: 6 }}>
                  {de ? 'Werden automatisch synchronisiert, nicht manuell editierbar.' : 'Synced automatically, not editable here.'}
                </div>
              </div>
            )}
            <div style={s.field}>
              <label style={s.label}>{de ? 'Sponsor-Stufe' : 'Sponsor tier'}</label>
              <select style={s.input} value={form.sponsor_tier || ''} onChange={e => setForm(fm => ({ ...fm, sponsor_tier: e.target.value }))}>
                <option value="">{de ? 'Kein Sponsor' : 'Not a sponsor'}</option>
                <option value="Partner">Partner</option>
                <option value="Platin">Platin</option>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>{t(lang, 'description')}</label>
              <textarea style={s.textarea} value={form.description || ''} onChange={e => setForm(fm => ({ ...fm, description: e.target.value }))} />
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