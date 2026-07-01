import { useState, useEffect, useContext } from 'react';
import { supabase, t } from '../lib/supabase';
import { LangContext, EventContext } from '../App';
import toast from 'react-hot-toast';
import { Save, Plus, Trash2, Upload } from 'lucide-react';
import { useRef } from 'react';

const COLORS = { primary: '#8c368c', accent: '#e71f69', bg: '#f4f2f6', surface: '#ffffff', border: '#e6e2ec', text: '#1d1d1b', muted: '#6b6b76', dim: '#9a9aa5' };

const DEFAULT_SETTINGS = {
  hero_welcome: 'Willkommen bei',
  hero_subtitle: '',
  info_hours: '',
  info_address: '',
  info_parking: '',
  info_wifi: '',
  quick_buttons: [
    { icon: 'calendar-outline', label: 'Programm', sub: '', screen: 'Programm', color: '#8c368c' },
    { icon: 'business-outline', label: 'Aussteller', sub: '', screen: 'Aussteller', color: '#6bc8e8' },
    { icon: 'map-outline', label: 'Hallenplan', sub: '', screen: 'Hallenplan', color: '#e71f69' },
    { icon: 'heart-outline', label: 'Saved', sub: '', screen: 'Gespeichert', color: '#cd80b4' },
  ],
  tab_items: [
    { icon: 'home-outline', icon_active: 'home', label: 'Home', screen: 'Home' },
    { icon: 'calendar-outline', icon_active: 'calendar', label: 'Programm', screen: 'Programm' },
    { icon: 'business-outline', icon_active: 'business', label: 'Aussteller', screen: 'Aussteller' },
    { icon: 'map-outline', icon_active: 'map', label: 'Hallenpl.', screen: 'Hallenplan' },
    { icon: 'chatbubbles-outline', icon_active: 'chatbubbles', label: 'Social', screen: 'Social' },
    { icon: 'heart-outline', icon_active: 'heart', label: 'Saved', screen: 'Gespeichert' },
  ],
};

const ICON_OPTIONS = [
  'calendar-outline', 'business-outline', 'map-outline', 'heart-outline',
  'star-outline', 'people-outline', 'trophy-outline', 'home-outline',
  'megaphone-outline', 'chatbubbles-outline', 'information-circle-outline',
  'search-outline', 'bookmark-outline', 'camera-outline', 'qr-code-outline',
  'fitness-outline', 'barbell-outline', 'medkit-outline', 'restaurant-outline',
];

const SCREEN_OPTIONS = ['Home', 'Programm', 'Aussteller', 'Hallenplan', 'Gespeichert', 'LeadScanner', 'EventFeedback', 'Info', 'Sponsoren'];

export default function AppSettings() {
  const lang = useContext(LangContext);
  const event = useContext(EventContext);
  const de = lang === 'de';
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('hero');

  useEffect(() => { if (event) loadSettings(); }, [event]);

  const loadSettings = async () => {
    const { data } = await supabase.from('app_settings').select('value').eq('event_id', event.id).eq('key', 'home_config').single();
    if (data?.value) setSettings({ ...DEFAULT_SETTINGS, ...data.value });
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('app_settings').upsert({ event_id: event.id, key: 'home_config', value: settings }, { onConflict: 'event_id,key' });
    if (error) toast.error(t(lang, 'error'));
    else toast.success(de ? 'Gespeichert!' : 'Saved!');
    setSaving(false);
  };

  // Quick buttons
  const updateBtn = (i, field, val) => {
    const btns = [...settings.quick_buttons];
    btns[i] = { ...btns[i], [field]: val };
    setSettings(s => ({ ...s, quick_buttons: btns }));
  };
  const addBtn = () => {
    setSettings(s => ({ ...s, quick_buttons: [...s.quick_buttons, { icon: 'star-outline', label: 'Neu', sub: '', screen: 'Home', color: '#8c368c' }] }));
  };
  const deleteBtn = (i) => {
    setSettings(s => ({ ...s, quick_buttons: s.quick_buttons.filter((_, idx) => idx !== i) }));
  };

  // Tab items
  const updateTab = (i, field, val) => {
    const tabs = [...settings.tab_items];
    tabs[i] = { ...tabs[i], [field]: val };
    setSettings(s => ({ ...s, tab_items: tabs }));
  };
  const addTab = () => {
    if (settings.tab_items.length >= 6) { toast.error(de ? 'Maximal 6 Tabs erlaubt' : 'Maximum 6 tabs allowed'); return; }
    setSettings(s => ({ ...s, tab_items: [...s.tab_items, { icon: 'star-outline', icon_active: 'star', label: 'Neu', screen: 'Home' }] }));
  };
  const deleteTab = (i) => {
    if (settings.tab_items.length <= 2) { toast.error(de ? 'Mindestens 2 Tabs erforderlich' : 'Minimum 2 tabs required'); return; }
    setSettings(s => ({ ...s, tab_items: s.tab_items.filter((_, idx) => idx !== i) }));
  };

  const s = {
    page: { padding: 24 },
    tabs: { display: 'flex', gap: 8, marginBottom: 20, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 16 },
    tab: (active) => ({ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: active ? `${COLORS.primary}33` : 'transparent', color: active ? COLORS.primary : COLORS.muted }),
    section: { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, marginBottom: 16 },
    label: { display: 'block', color: COLORS.muted, fontSize: 11, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' },
    input: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
    textarea: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', minHeight: 70, resize: 'vertical', fontFamily: 'inherit' },
    select: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
    field: { marginBottom: 14 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 },
    itemCard: { background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, marginBottom: 10 },
    addBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: `${COLORS.primary}22`, color: COLORS.primary, border: `1px solid ${COLORS.primary}44`, borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, marginTop: 8 },
    deleteBtn: { background: COLORS.accent + '22', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: COLORS.accent, flexShrink: 0 },
    saveBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 15 },
    itemNum: { color: COLORS.primary, fontWeight: 700, fontSize: 12, marginBottom: 10 },
  };

  const fileRef = useRef();
  const [uploadingFor, setUploadingFor] = useState(null);

  const uploadIcon = async (file, index, type) => {
    if (!file) return;
    setUploadingFor(index + '-' + type);
    try {
      const ext = file.name.split('.').pop();
      const path = 'icons/' + Date.now() + '.' + ext;
      const { error } = await supabase.storage.from('ads').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('ads').getPublicUrl(path);
      if (type === 'quick') updateBtn(index, 'custom_icon', urlData.publicUrl);
      else updateTab(index, 'custom_icon', urlData.publicUrl);
      toast.success(de ? 'Icon hochgeladen!' : 'Icon uploaded!');
    } catch (e) {
      toast.error(de ? 'Upload fehlgeschlagen' : 'Upload failed');
    }
    setUploadingFor(null);
  };


  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ color: COLORS.text, fontSize: 22, fontWeight: 700 }}>{de ? 'App Einstellungen' : 'App Settings'}</div>
          <div style={{ color: COLORS.dim, fontSize: 13, marginTop: 4 }}>{de ? 'Startseite & Navigation anpassen' : 'Customize home screen & navigation'}</div>
        </div>
        <button style={s.saveBtn} onClick={save} disabled={saving}>
          <Save size={16} /> {saving ? '...' : (de ? 'Speichern' : 'Save')}
        </button>
      </div>

      <div style={s.tabs}>
        {[
          { key: 'hero', label: de ? '🏠 Hero' : '🏠 Hero' },
          { key: 'quick', label: de ? '⚡ Schnellzugriff' : '⚡ Quick Access' },
          { key: 'tabbar', label: de ? '📱 Tab-Leiste' : '📱 Tab Bar' },
          { key: 'info', label: de ? 'ℹ️ Info' : 'ℹ️ Info' },
        ].map(tb => (
          <button key={tb.key} style={s.tab(activeTab === tb.key)} onClick={() => setActiveTab(tb.key)}>{tb.label}</button>
        ))}
      </div>

      {/* Hero section */}
      {activeTab === 'hero' && (
        <div style={s.section}>
          <div style={s.field}>
            <label style={s.label}>{de ? 'Begrüßungstext' : 'Welcome text'}</label>
            <input style={s.input} value={settings.hero_welcome}
              onChange={e => setSettings(s => ({ ...s, hero_welcome: e.target.value }))}
              placeholder="Willkommen bei" />
          </div>
          <div style={s.field}>
            <label style={s.label}>{de ? 'Untertitel (optional)' : 'Subtitle (optional)'}</label>
            <input style={s.input} value={settings.hero_subtitle || ''}
              onChange={e => setSettings(s => ({ ...s, hero_subtitle: e.target.value }))}
              placeholder="z.B. Das Fitness & Health Business Event" />
          </div>
          <div style={{ color: COLORS.dim, fontSize: 12 }}>
            {de ? 'Event-Name und Datum werden automatisch übernommen.' : 'Event name and dates are taken from event settings.'}
          </div>
        </div>
      )}

      {/* Info section */}
      {activeTab === 'info' && (
        <div style={s.section}>
          <div style={{ color: COLORS.dim, fontSize: 12, marginBottom: 16 }}>
            {de ? 'Diese Texte erscheinen auf der Info-Seite in der App. Leere Felder werden ausgeblendet.' : 'These texts appear on the Info page in the app. Empty fields are hidden.'}
          </div>
          <div style={s.field}>
            <label style={s.label}>{de ? 'Öffnungszeiten' : 'Opening hours'}</label>
            <textarea style={s.textarea} value={settings.info_hours || ''}
              onChange={e => setSettings(s => ({ ...s, info_hours: e.target.value }))}
              placeholder={de ? 'z.B. Do 17.9.: 9–18 Uhr\nFr 18.9.: 9–17 Uhr' : 'e.g. Thu 9am–6pm'} />
          </div>
          <div style={s.field}>
            <label style={s.label}>{de ? 'Anfahrt & Adresse' : 'Address & directions'}</label>
            <textarea style={s.textarea} value={settings.info_address || ''}
              onChange={e => setSettings(s => ({ ...s, info_address: e.target.value }))}
              placeholder={de ? 'Messe Offenbach, ...' : 'Venue address, ...'} />
          </div>
          <div style={s.field}>
            <label style={s.label}>{de ? 'Parken' : 'Parking'}</label>
            <textarea style={s.textarea} value={settings.info_parking || ''}
              onChange={e => setSettings(s => ({ ...s, info_parking: e.target.value }))}
              placeholder={de ? 'Parkmöglichkeiten ...' : 'Parking info ...'} />
          </div>
          <div style={s.field}>
            <label style={s.label}>WLAN</label>
            <textarea style={s.textarea} value={settings.info_wifi || ''}
              onChange={e => setSettings(s => ({ ...s, info_wifi: e.target.value }))}
              placeholder={de ? 'Netzwerk: ...\nPasswort: ...' : 'Network: ...\nPassword: ...'} />
          </div>
          <div style={{ color: COLORS.dim, fontSize: 12 }}>
            {de ? 'Tipp: Füge einen Schnellzugriff-Button mit Screen "Info" hinzu, damit Besucher die Seite finden.' : 'Tip: add a Quick Access button with screen "Info" so visitors can reach this page.'}
          </div>
        </div>
      )}

      {/* Quick buttons */}
      {activeTab === 'quick' && (
        <div>
          <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>
            {de ? `${settings.quick_buttons.length} Buttons · max. 4 empfohlen` : `${settings.quick_buttons.length} buttons · max. 4 recommended`}
          </div>
          {settings.quick_buttons.map((btn, i) => (
            <div key={i} style={s.itemCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={s.itemNum}>Button {i + 1}</div>
                <button style={s.deleteBtn} onClick={() => deleteBtn(i)}><Trash2 size={13} /></button>
              </div>
              <div style={s.grid2}>
                <div style={s.field}>
                  <label style={s.label}>Label</label>
                  <input style={s.input} value={btn.label} onChange={e => updateBtn(i, 'label', e.target.value)} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>{de ? 'Text darunter' : 'Sub text'}</label>
                  <input style={s.input} value={btn.sub || ''} onChange={e => updateBtn(i, 'sub', e.target.value)} placeholder="Optional..." />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Icon</label>
                  <select style={s.select} value={btn.icon} onChange={e => updateBtn(i, 'icon', e.target.value)}>
                    {ICON_OPTIONS.map(ico => <option key={ico} value={ico}>{ico}</option>)}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Screen</label>
                  <select style={s.select} value={btn.screen} onChange={e => updateBtn(i, 'screen', e.target.value)}>
                    {SCREEN_OPTIONS.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>{de ? 'Farbe' : 'Color'}</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="color" value={btn.color} onChange={e => updateBtn(i, 'color', e.target.value)}
                      style={{ width: 44, height: 38, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 6 }} />
                    <input style={{ ...s.input, flex: 1 }} value={btn.color} onChange={e => updateBtn(i, 'color', e.target.value)} />
                  </div>
                </div>
                <div style={s.field}>
                  <label style={s.label}>{de ? 'Eigenes Icon (optional)' : 'Custom icon (optional)'} · 96×96 px PNG</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {btn.custom_icon && <img src={btn.custom_icon} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain', background: '#fff' }} />}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: COLORS.primary + '22', color: COLORS.primary, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      <Upload size={14} />
                      {uploadingFor === i + '-quick' ? '...' : (de ? 'Hochladen' : 'Upload')}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => uploadIcon(e.target.files[0], i, 'quick')} />
                    </label>
                    {btn.custom_icon && <button onClick={() => updateBtn(i, 'custom_icon', '')} style={{ background: 'none', border: 'none', color: COLORS.dim, cursor: 'pointer', fontSize: 12 }}>✕ {de ? 'Entfernen' : 'Remove'}</button>}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button style={s.addBtn} onClick={addBtn}>
            <Plus size={16} /> {de ? 'Button hinzufügen' : 'Add button'}
          </button>
        </div>
      )}

      {/* Tab bar */}
      {activeTab === 'tabbar' && (
        <div>
          <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 16 }}>
            {de ? `${settings.tab_items.length} Tabs · min. 2, max. 6` : `${settings.tab_items.length} tabs · min. 2, max. 6`}
          </div>
          {settings.tab_items.map((tab, i) => (
            <div key={i} style={s.itemCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={s.itemNum}>Tab {i + 1}</div>
                <button style={s.deleteBtn} onClick={() => deleteTab(i)}><Trash2 size={13} /></button>
              </div>
              <div style={s.grid3}>
                <div style={s.field}>
                  <label style={s.label}>Label</label>
                  <input style={s.input} value={tab.label} onChange={e => updateTab(i, 'label', e.target.value)} />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Icon</label>
                  <select style={s.select} value={tab.icon} onChange={e => updateTab(i, 'icon', e.target.value)}>
                    {ICON_OPTIONS.map(ico => <option key={ico} value={ico}>{ico}</option>)}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>Screen</label>
                  <select style={s.select} value={tab.screen} onChange={e => updateTab(i, 'screen', e.target.value)}>
                    {SCREEN_OPTIONS.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                  </select>
                </div>
                <div style={{ ...s.field, gridColumn: '1 / -1' }}>
                  <label style={s.label}>{de ? 'Eigenes Icon (optional)' : 'Custom icon (optional)'} · 28×28 px PNG</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {tab.custom_icon && <img src={tab.custom_icon} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'contain', background: '#fff' }} />}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: COLORS.primary + '22', color: COLORS.primary, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      <Upload size={14} />
                      {uploadingFor === i + '-tab' ? '...' : (de ? 'Hochladen' : 'Upload')}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => uploadIcon(e.target.files[0], i, 'tab')} />
                    </label>
                    {tab.custom_icon && <button onClick={() => updateTab(i, 'custom_icon', '')} style={{ background: 'none', border: 'none', color: COLORS.dim, cursor: 'pointer', fontSize: 12 }}>✕ {de ? 'Entfernen' : 'Remove'}</button>}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button style={s.addBtn} onClick={addTab}>
            <Plus size={16} /> {de ? 'Tab hinzufügen' : 'Add tab'}
          </button>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <button style={s.saveBtn} onClick={save} disabled={saving}>
          <Save size={16} /> {saving ? '...' : (de ? 'Alle Änderungen speichern' : 'Save all changes')}
        </button>
      </div>
    </div>
  );
}
