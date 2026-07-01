import { useState, useEffect, useContext, useRef } from 'react';
import { supabase, t } from '../lib/supabase';
import { LangContext, EventContext } from '../App';
import toast from 'react-hot-toast';
import { Upload, Trash2, Map, Plus, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

const COLORS = { primary: '#8c368c', accent: '#e71f69', bg: '#0a0a0f', surface: '#13131f', border: '#1e1e2e', text: '#f1f1f3', muted: '#9999aa', dim: '#6b6b7b' };

const s = {
  page: { padding: 24 },
  header: { marginBottom: 20 },
  title: { color: COLORS.text, fontSize: 22, fontWeight: 700 },
  sub: { color: COLORS.dim, fontSize: 13, marginTop: 4 },
  card: { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, maxWidth: 1400 },
  uploadBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  addBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, marginLeft: 10 },
  addStageBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#6bc8e8', color: '#0a0a0f', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, marginLeft: 10 },
  removeBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#2a2a3e', color: COLORS.muted, border: 'none', borderRadius: 8, cursor:'pointer', fontWeight: 600, fontSize: 14, marginLeft: 10 },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0', color: COLORS.dim },
  hint: { color: COLORS.dim, fontSize: 13, marginTop: 16, lineHeight: 1.5 },
  zoomBar: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 },
  zoomBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 8, cursor: 'pointer' },
  zoomLabel: { color: COLORS.muted, fontSize: 13, minWidth: 48, textAlign: 'center' },
  viewport: { position: 'relative', marginTop: 12, width: '100%', height: 780, overflow: 'auto', borderRadius: 10, border: `1px solid ${COLORS.border}`, background: '#1a1a26' },
  planWrap: { position: 'relative', userSelect: 'none', lineHeight: 0, transformOrigin: 'top left' },
  planImg: { display: 'block', background: '#fff' },
  zone: { position: 'absolute', borderStyle: 'solid', borderRadius: 0, cursor: 'move', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'stretch' },
  zoneNum: { width: '100%', fontSize: 13, fontWeight: 800, padding: '3px 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', flexShrink: 0 },
  zoneBody: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, padding: 2, overflow: 'hidden' },
  zoneLogo: { maxWidth: '90%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', pointerEvents: 'none', display: 'block' },
  zoneName: { fontSize: 10, color: '#222', fontWeight: 700, textAlign: 'center', padding: '0 4px', pointerEvents: 'none', overflow: 'hidden',lineHeight: 1.1, maxWidth: '95%',display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  handle: { position: 'absolute', right: -8, bottom: -8, width: 28, height: 28, background: 'transparent', cursor: 'nwse-resize', zIndex: 50, touchAction: 'none' },
  handleHint: { position: 'absolute', right: -4, bottom: -4, width: 8, height: 8, borderRight: `3px solid ${COLORS.primary}`, borderBottom: `3px solid ${COLORS.primary}`, pointerEvents: 'none' },
  zoneDel: { position: 'absolute', top: -8, right: -8, width: 18, height: 18, background: COLORS.accent, color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 11, lineHeight: '14px', padding: 0 },
  picker: { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 12, marginTop: 16 },
  pickerRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' },
  select: { flex: 1, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 12px', color: COLORS.text, fontSize: 14, outline: 'none' },
  miniLogo: { width: 28, height: 28, borderRadius: 5, objectFit: 'contain', background: '#fff' },
  miniLogoFb: { width: 28, height: 28, borderRadius: 5, background: COLORS.bg, border: `1px solid ${COLORS.border}` },
  colorPanel: { display: 'flex', flexWrap: 'wrap', gap: 18, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 14, marginTop: 16, alignItems: 'center' },
  colorItem: { display: 'flex', alignItems: 'center', gap: 8 },
  colorLabel: { color: COLORS.muted, fontSize: 12, fontWeight: 600 },
  swatch: { width: 32, height: 28, padding: 0, border: `1px solid ${COLORS.border}`, borderRadius: 6, background: 'none', cursor: 'pointer' },
  toggleRow: { display: 'flex', alignItems: 'center', gap: 6, color: COLORS.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  // Popup that appears when you click a booth on the map
  boothPop: { position: 'absolute', zIndex: 60, background: COLORS.surface, border: `1px solid ${COLORS.primary}`, borderRadius: 10, padding:12, width: 280, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' },
  boothPopTitle: { color: COLORS.text, fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent:'space-between' },
  boothPopSelect: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px', color: COLORS.text, fontSize: 14, outline: 'none' },
  boothPopClose: { background: 'none', border: 'none', color: COLORS.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 },
  modeTabs: { display: 'flex', gap: 6, marginBottom: 10 },
  modeTab: (active) => ({ flex: 1, padding: '7px 4px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: active ? `1px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`, background: active ? COLORS.primary : COLORS.bg, color: active ? '#fff' : COLORS.muted }),
};

const DEFAULTS = {
  booth_num_color: '#ffffff',
  booth_badge_color: '#e71f69',
  booth_border_color: '#e71f69',
  booth_fill_color: 'rgba(255,255,255,0.85)',
};

const STAGE_COLOR = '#6bc8e8';

export default function FloorPlan() {
  const lang = useContext(LangContext);
  const event = useContext(EventContext);
  const de = lang === 'de';
  const [mapUrl, setMapUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [exhibitors, setExhibitors] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [colors, setColors] = useState(DEFAULTS);
  const [fillTransparent, setFillTransparent] = useState(false);
  const [showLogos, setShowLogos] = useState(true);
  const [borderWidth, setBorderWidth] = useState(1.5);
  const [openPicker, setOpenPicker] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  // Booth popup: which booth is open for inline editing
  const [popupZoneId, setPopupZoneId] = useState(null);
  const [boothSearch, setBoothSearch] = useState('');
  // popup mode per open popup: 'exhibitor' | 'stage'
  const [popupMode, setPopupMode] = useState('exhibitor');
  const viewportRef = useRef(null);
  const planRef = useRef(null);
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const zonesRef = useRef(zones);
  useEffect(() => { zonesRef.current = zones; }, [zones]);

  const load = async () => {
    if (!event) return;
    const [{ data: ev }, { data: ex }, { data: tr }, { data: bz }] = await Promise.all([
      supabase.from('events').select('map_url, booth_num_color, booth_badge_color, booth_border_color, booth_fill_color, booth_show_logos, booth_border_width').eq('id', event.id).single(),
      supabase.from('exhibitors').select('id, name, booth_number, logo_url').eq('event_id', event.id).order('name'),
      supabase.from('tracks').select('id, name, color').eq('event_id', event.id).order('sort_order'),
      supabase.from('floor_plan_booths').select('*').eq('event_id', event.id),
    ]);
    setMapUrl(ev?.map_url || '');
    setExhibitors(ex || []);
    setTracks(tr || []);
    setZones(bz || []);
    if (ev) {
      const c = {
        booth_num_color: ev.booth_num_color || DEFAULTS.booth_num_color,
        booth_badge_color: ev.booth_badge_color || DEFAULTS.booth_badge_color,
        booth_border_color: ev.booth_border_color || DEFAULTS.booth_border_color,
        booth_fill_color: ev.booth_fill_color || DEFAULTS.booth_fill_color,
      };
      setColors(c);
      setFillTransparent(c.booth_fill_color === 'transparent');
      setShowLogos(ev.booth_show_logos !== false);
      setBorderWidth(ev.booth_border_width != null ? Number(ev.booth_border_width) : 1.5);
    }
  };
  useEffect(() => { load(); }, [event]);

  const exOf = (id) => exhibitors.find(x => x.id === id);
  const trackOf = (id) => tracks.find(tr => tr.id === id);

  const saveColor = async (key, value) => {
    setColors(c => ({ ...c, [key]: value }));
    const { error } = await supabase.from('events').update({ [key]: value }).eq('id', event.id);
    if (error) { console.error('color save error:', error); toast.error(t(lang, 'error')); }
  };

  const toggleTransparent = async () => {
    const next = !fillTransparent;
    setFillTransparent(next);
    const value = next ? 'transparent' : (colors.booth_fill_color === 'transparent' ? DEFAULTS.booth_fill_color : colors.booth_fill_color);
    await saveColor('booth_fill_color', value);
  };

  const effectiveFill = fillTransparent ? 'transparent' : colors.booth_fill_color;

  const saveBorderWidth = async (val) => {
    setBorderWidth(val);
    const { error } = await supabase.from('events').update({ booth_border_width: val }).eq('id', event.id);
    if (error) { console.error('border width save error:', error); }
  };

  const toggleLogos = async () => {
    const next = !showLogos;
    setShowLogos(next);
    const { error } = await supabase.from('events').update({ booth_show_logos: next }).eq('id', event.id);
    if (error) { console.error('show logos save error:', error); toast.error(t(lang, 'error')); }
  };

  // Base display width = viewport width; zoom multiplies it.
  const baseWidth = () => viewportRef.current ? viewportRef.current.clientWidth - 2 : 600;
  const displayW = baseWidth() * zoom;
  const displayH = imgSize.w ? displayW * (imgSize.h / imgSize.w) : 0;

  const onImgLoad = (e) => setImgSize({ w: e.target.naturalWidth, h: e.target.naturalHeight });

  const zoomIn = () => setZoom(z => Math.min(5, +(z + 0.25).toFixed(2)));
  const zoomOut = () => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)));
  const zoomFit = () => setZoom(1);

  const onWheel = (e) => {
    if (!e.ctrlKey && !e.metaKey) return; // only zoom with ctrl/cmd + scroll, else normal scroll/pan
    e.preventDefault();
    setZoom(z => Math.max(0.5, Math.min(5, +(z - Math.sign(e.deltaY) * 0.15).toFixed(2))));
  };

  const uploadMap = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `event-${event.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('maps').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('maps').getPublicUrl(path);
      const url = urlData.publicUrl;
      const { error: saveErr } = await supabase.from('events').update({ map_url: url }).eq('id', event.id);
      if (saveErr) throw saveErr;
      setMapUrl(url);
      toast.success(de ? 'Hallenplan hochgeladen!' : 'Floor plan uploaded!');
    } catch (e) {
      console.error('map upload error:', e);
      toast.error(t(lang, 'error'));
    }
    setUploading(false);
  };

  const removeMap = async () => {
    if (!window.confirm(de ? 'Hallenplan wirklich entfernen?' : 'Remove floor plan?')) return;
    const { error } = await supabase.from('events').update({ map_url: null }).eq('id', event.id);
    if (error) { toast.error(t(lang, 'error')); return; }
    setMapUrl('');
    toast.success(de ? 'Hallenplan entfernt' : 'Floor plan removed');
  };

  const addZone = async () => {
    const { data, error } = await supabase.from('floor_plan_booths')
      .insert({ event_id: event.id, x: 40, y: 40, w: 6, h: 5 })
      .select().single();
    if (error) { console.error('add zone error:', error); toast.error(t(lang, 'error')); return; }
    setZones(z => [...z, data]);
    setSelectedZone(data.id);
    setPopupMode('exhibitor');
    setPopupZoneId(data.id); setBoothSearch(''); // open the popup immediately on the new booth
  };

  const addStage = async () => {
    const { data, error } = await supabase.from('floor_plan_booths')
      .insert({ event_id: event.id, x: 40, y: 40, w: 12, h: 8 })
      .select().single();
    if (error) { console.error('add stage error:', error); toast.error(t(lang, 'error')); return; }
    setZones(z => [...z, data]);
    setSelectedZone(data.id);
    setPopupMode('stage');
    setPopupZoneId(data.id); setBoothSearch('');
  };

  const updateZoneExhibitor = async (zoneId, exhibitorId) => {
    // Assigning an exhibitor clears any stage (track) link.
    setZones(z => z.map(zz => zz.id === zoneId ? { ...zz, exhibitor_id: exhibitorId, track_id: null } : zz));
    const { error } = await supabase.from('floor_plan_booths').update({ exhibitor_id: exhibitorId || null, track_id: null }).eq('id', zoneId);
    if (error) { console.error('zone link error:', error); toast.error(t(lang, 'error')); }
  };

  const updateZoneTrack = async (zoneId, trackId) => {
    // Assigning a stage (track) clears any exhibitor link.
    setZones(z => z.map(zz => zz.id === zoneId ? { ...zz, track_id: trackId, exhibitor_id: null } : zz));
    const { error } = await supabase.from('floor_plan_booths').update({ track_id: trackId || null, exhibitor_id: null }).eq('id', zoneId);
    if (error) { console.error('zone track error:', error); toast.error(t(lang, 'error')); }
  };

  const updateZoneDisplayMode = async (zoneId, mode) => {
    // mode: 'logo' | 'number' | null (null = follow global toggle)
    setZones(z => z.map(zz => zz.id === zoneId ? { ...zz, display_mode: mode } : zz));
    const { error } = await supabase.from('floor_plan_booths').update({ display_mode: mode }).eq('id', zoneId);
    if (error) { console.error('display mode save error:', error); toast.error(t(lang, 'error')); }
  };

  const deleteZone = async (zoneId) => {
    setZones(z => z.filter(zz => zz.id !== zoneId));
    if (selectedZone === zoneId) setSelectedZone(null);
    if (popupZoneId === zoneId) setPopupZoneId(null);
    await supabase.from('floor_plan_booths').delete().eq('id', zoneId);
  };

  const persistZone = async (zone) => {
    const { error } = await supabase.from('floor_plan_booths')
      .update({ x: zone.x, y: zone.y, w: zone.w, h: zone.h }).eq('id', zone.id);
    if (error) console.error('zone move error:', error);
  };

  // Booth drag/resize (percentage-based, divides by displayW/H so it tracks the cursor at any zoom)
  // We also track whether the pointer actually moved, so a near-stationary press = a "click" that opens the popup.
  const onZonePointerDown = (e, zone, mode) => {
    e.stopPropagation();
    setSelectedZone(zone.id);
    dragRef.current = { id: zone.id, mode, startX: e.clientX, startY: e.clientY, orig: { ...zone }, moved: false };
    window.addEventListener('pointermove', onZonePointerMove);
    window.addEventListener('pointerup', onZonePointerUp);
  };
  const onZonePointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dxPx = e.clientX - d.startX;
    const dyPx = e.clientY - d.startY;
    // mark as a real drag once the pointer moves beyond a small threshold
    if (!d.moved && (Math.abs(dxPx) > 4 || Math.abs(dyPx) > 4)) d.moved = true;
    if (!d.moved) return; // tiny movement = still a click, don't move the booth yet
    const dxPct = (dxPx / displayW) * 100;
    const dyPct = (dyPx / displayH) * 100;
    setZones(zs => zs.map(z => {
      if (z.id !== d.id) return z;
      if (d.mode === 'move') {
        return { ...z, x: Math.max(0, Math.min(100 - z.w, d.orig.x + dxPct)), y: Math.max(0, Math.min(100 - z.h, d.orig.y + dyPct)) };
      }
      // Resize handles. d.mode is one of: nw n ne e se s sw w
      const o = d.orig;
      let x = o.x, y = o.y, w = o.w, h = o.h;
      const minS = 0.5;
      const dir = d.mode;
      if (dir.includes('e')) { w = Math.max(minS, Math.min(100 - o.x, o.w + dxPct)); }
      if (dir.includes('s')) { h = Math.max(minS, Math.min(100 - o.y, o.h + dyPct)); }
      if (dir.includes('w')) {
        const newX = Math.max(0, Math.min(o.x + o.w - minS, o.x + dxPct));
        w = o.w + (o.x - newX);
        x = newX;
      }
      if (dir.includes('n')) {
        const newY = Math.max(0, Math.min(o.y + o.h - minS, o.y + dyPct));
        h = o.h + (o.y - newY);
        y = newY;
      }
      return { ...z, x, y, w, h };
    }));
  };
  const onZonePointerUp = () => {
    const d = dragRef.current;
    window.removeEventListener('pointermove', onZonePointerMove);
    window.removeEventListener('pointerup', onZonePointerUp);
    if (d) {
      if (d.moved) {
        // it was a real drag/resize: persist the new position
        const z = (zonesRef.current || []).find(zz => zz.id === d.id);
        if (z) persistZone(z);
      } else if (d.mode === 'move') {
        // it was a click (no movement) on the booth body: open the inline popup
        const z = (zonesRef.current || []).find(zz => zz.id === d.id);
        setPopupMode(z && z.track_id ? 'stage' : 'exhibitor');
        setPopupZoneId(d.id); setBoothSearch('');
      }
    }
    dragRef.current = null;
  };

  // Pan by dragging empty area (scrolls the viewport). Clicking empty area closes the popup.
  const onPlanPointerDown = (e) => {
    if (!viewportRef.current) return;
    setPopupZoneId(null); // clicking the map background closes any open booth popup
    panRef.current = { startX: e.clientX, startY: e.clientY, sl: viewportRef.current.scrollLeft, st: viewportRef.current.scrollTop };
    window.addEventListener('pointermove', onPlanPointerMove);
    window.addEventListener('pointerup', onPlanPointerUp);
  };
  const onPlanPointerMove = (e) => {
    const p = panRef.current;
    if (!p || !viewportRef.current) return;
    viewportRef.current.scrollLeft = p.sl - (e.clientX - p.startX);
    viewportRef.current.scrollTop = p.st - (e.clientY - p.startY);
  };
  const onPlanPointerUp = () => {
    window.removeEventListener('pointermove', onPlanPointerMove);
    window.removeEventListener('pointerup', onPlanPointerUp);
    panRef.current = null;
  };

  const ColorControl = ({ label, k }) => {
    const isTransparent = colors[k] === 'transparent';
    const open = openPicker === k;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, position: 'relative' }}>
        <span style={s.colorLabel}>{label}</span>
        <button
          onClick={() => setOpenPicker(open ? null : k)}
          style={{ width: 40, height: 30, borderRadius: 8, border: `1px solid ${COLORS.border}`, cursor: 'pointer', background: isTransparent? 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 12px 12px' : (colors[k] || '#fff') }}
          title={de ? 'Farbe wählen' : 'Choose colour'}
        />
        {open && (
          <div style={{ position: 'absolute', top: 64, left: 0, zIndex: 50, background: COLORS.surface, border: `1px solid ${COLORS.border}`,borderRadius: 12, padding: 18, width: 260, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ color: COLORS.text, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{label}</div>
            <input type="color" value={toHex(colors[k])} onChange={e => saveColor(k, e.target.value)} style={{ width: '100%', height: 56, padding: 0, border: `1px solid ${COLORS.border}`, borderRadius: 8, background: 'none', cursor: 'pointer', marginBottom: 12 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ color: COLORS.muted, fontSize: 12, fontWeight: 600 }}>Hex</span>
              <input
                type="text"
                value={isTransparent ? 'transparent' : (colors[k] || '')}
                placeholder="#000000"
                onChange={e => saveColor(k, e.target.value)}
                style={{ flex: 1, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: '8px 10px', color: COLORS.text, fontSize: 13, outline:'none', fontFamily: 'monospace' }}
              />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {['#ffffff', '#000000', '#8c368c', '#e71f69', '#6bc8e8', '#cd80b4', '#888888', '#f59e0b'].map(c => (
                <button key={c} onClick={() => saveColor(k, c)} style={{ width: 28, height: 28, borderRadius: 6, border: colors[k] === c ? `2px solid ${COLORS.text}` : `1px solid ${COLORS.border}`, background: c, cursor: 'pointer' }} />
              ))}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.muted, fontSize: 13, cursor: 'pointer', marginBottom: 14 }}>
              <input type="checkbox" checked={isTransparent} onChange={e => saveColor(k, e.target.checked ? 'transparent' : (DEFAULTS[k] === 'transparent' ? '#ffffff' : DEFAULTS[k]))} />
              {de ? 'Transparent' : 'Transparent'}
            </label>
            <button onClick={() => setOpenPicker(null)} style={{ width: '100%', padding: '9px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {de ? 'Fertig' : 'Done'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.title}>{de ? 'Hallenplan' : 'Floor Plan'}</div>
        <div style={s.sub}>{de ? 'Plan hochladen, zoomen und Stände mit Ausstellern oder Bühnen verknüpfen' : 'Upload, zoom and link booths to exhibitors or stages'}</div>
      </div>

      <div style={s.card}>
        <div>
          <label style={s.uploadBtn}>
            <Upload size={16} />
            {uploading ? (de ? 'Lädt hoch…' : 'Uploading…') : (mapUrl ? (de ? 'Bild ersetzen' : 'Replace image') : (de ? 'Bild hochladen' : 'Upload image'))}
            <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading} onChange={e => uploadMap(e.target.files[0])}/>
          </label>
          {mapUrl && <button style={s.addBtn} onClick={addZone}><Plus size={15} />{de ? 'Stand hinzufügen' : 'Add booth'}</button>}
          {mapUrl && <button style={s.addStageBtn} onClick={addStage}><Plus size={15} />{de ? 'Bühne hinzufügen' : 'Add stage'}</button>}
          {mapUrl && <button style={s.removeBtn} onClick={removeMap}><Trash2 size={15} />{de ? 'Plan entfernen' : 'Remove plan'}</button>}
        </div>

        {mapUrl && (
          <div style={s.colorPanel}>
            <ColorControl label={de ? 'Rahmen' : 'Border'} k="booth_border_color" />
            <ColorControl label={de ? 'Füllung' : 'Fill'} k="booth_fill_color" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
              <span style={s.colorLabel}>{de ? 'Randdicke' : 'Border width'}: {borderWidth}px</span>
              <input
                type="range"
                min="0"
                max="6"
                step="0.5"
                value={borderWidth}
                onChange={(e) => saveBorderWidth(Number(e.target.value))}
                style={{ width: '100%', accentColor: COLORS.primary, cursor: 'pointer' }}
              />
            </div>
            <label style={s.toggleRow}>
              <input type="checkbox" checked={showLogos} onChange={toggleLogos} />
              {de ? 'Logos anzeigen' : 'Show logos'}
            </label>
          </div>
        )}

        {mapUrl ? (
          <>
            <div style={s.zoomBar}>
              <button style={s.zoomBtn} onClick={zoomOut} title="Zoom out"><ZoomOut size={16} /></button>
              <span style={s.zoomLabel}>{Math.round(zoom * 100)}%</span>
              <button style={s.zoomBtn} onClick={zoomIn} title="Zoom in"><ZoomIn size={16} /></button>
              <button style={s.zoomBtn} onClick={zoomFit} title="Reset"><Maximize size={15} /></button>
              <span style={{ color: COLORS.dim, fontSize: 12, marginLeft: 8 }}>{de ? '(Strg/⌘ + Scrollen zum Zoomen · leere Fläche ziehen zum Verschieben · Stand/Bühne anklicken zum Zuweisen)' : '(Ctrl/⌘ + scroll to zoom · drag empty area to pan · click a booth/stage to assign)'}</span>
            </div>

            <div style={s.viewport} ref={viewportRef} onWheel={onWheel}>
              <div
                style={{ ...s.planWrap, width: displayW, height: displayH }}
                ref={planRef}
                onPointerDown={onPlanPointerDown}
              >
                <img src={mapUrl} alt="Hallenplan" style={{ ...s.planImg, width: displayW, height: displayH }} draggable={false} onLoad={onImgLoad} />
                {zones.map(z => {
                  const isStage = !!z.track_id;
                  const tr = isStage ? trackOf(z.track_id) : null;
                  const ex = !isStage ? exOf(z.exhibitor_id) : null;
                  const isSel = selectedZone === z.id;
                  const isPop = popupZoneId === z.id;
                  const stageCol = tr?.color || STAGE_COLOR;
                  return (
                    <div
                      key={z.id}
                      style={{
                        ...s.zone,
                        left: z.x + '%', top: z.y + '%', width: z.w + '%', height: z.h + '%',
                        borderWidth: (isSel || isPop) ? Math.max(borderWidth, 2) : Math.max(borderWidth, isStage ? 2 : borderWidth),
                        borderColor: (isSel || isPop) ? COLORS.primary : (isStage ? stageCol : colors.booth_border_color),
                        background: isStage ? stageCol + '33' : colors.booth_fill_color,
                      }}
                      onPointerDown={(e) => onZonePointerDown(e, z, 'move')}
                    >
                      <div style={s.zoneBody}>
                        {isStage ? (
                          <span style={{ fontSize: 11, color: stageCol === '#ffffff' ? '#222' : stageCol, fontWeight: 800, textAlign: 'center', padding: '0 4px', pointerEvents: 'none', overflow: 'hidden', lineHeight: 1.15, maxWidth: '95%', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', textShadow: '0 1px 2px rgba(255,255,255,0.6)' }}>
                            {tr?.name || (de ? 'Bühne' : 'Stage')}
                          </span>
                        ) : (() => {
                          // effective mode: per-booth override (z.display_mode) wins; else global toggle
                          const mode = z.display_mode || (showLogos ? 'logo' : 'number');
                          if (mode === 'logo') {
                            return ex?.logo_url
                              ? <img src={ex.logo_url} alt="" style={s.zoneLogo} />
                              : ex ? <span style={s.zoneName}>{ex.name}</span> : null;
                          }
                          // number mode
                          if (ex?.booth_number) {
                            const bw = (z.w / 100) * displayW;
                            const bh = (z.h / 100) * displayH;
                            const num = ex.booth_number;
                            const byHeight = bh * 0.55;
                            const byWidth = (bw * 1.5) / num.length;
                            const fs = Math.max(7, Math.min(byHeight, byWidth));
                            return <span style={{ fontWeight: 800, color: '#222', fontSize: fs, lineHeight: 1, whiteSpace: 'nowrap' }}>{num}</span>;
                          }
                          return ex ? <span style={s.zoneName}>{ex.name}</span> : null;
                        })()}
                      </div>
                      <button style={s.zoneDel} onClick={(e) => { e.stopPropagation(); deleteZone(z.id); }}>×</button>
                      {/* PowerPoint-style square handles on all 8 points, shown when selected. Each one resizes from its side/corner. */}
                      {(isSel || isPop) && [
                        { dir: 'nw', style: { left: -5, top: -5, cursor: 'nwse-resize' } },
                        { dir: 'n',  style: { left: 'calc(50% - 5px)', top: -5, cursor: 'ns-resize' } },
                        { dir: 'ne', style: { right: -5, top: -5, cursor: 'nesw-resize' } },
                        { dir: 'e',  style: { right: -5, top: 'calc(50% - 5px)', cursor: 'ew-resize' } },
                        { dir: 'se', style: { right: -5, bottom: -5, cursor: 'nwse-resize' } },
                        { dir: 's',  style: { left: 'calc(50% - 5px)', bottom: -5, cursor: 'ns-resize' } },
                        { dir: 'sw', style: { left: -5, bottom: -5, cursor: 'nesw-resize' } },
                        { dir: 'w',  style: { left: -5, top: 'calc(50% - 5px)', cursor: 'ew-resize' } },
                      ].map(hd => (
                        <div
                          key={hd.dir}
                          style={{ position: 'absolute', width: 10, height: 10, background: '#fff', border: `1px solid #888`, boxShadow: '0 1px 3px rgba(0,0,0,0.4)', zIndex: 50, touchAction: 'none', ...hd.style }}
                          onPointerDown={(e) => onZonePointerDown(e, z, hd.dir)}
                        />
                      ))}




                    </div>
                  );
                })}

                {/* Single floating popup for the selected booth (rendered outside booth divs so booth handlers never interfere) */}
                {popupZoneId && (() => {
                  const z = zones.find(zz => zz.id === popupZoneId);
                  if (!z) return null;
                  const popBelow = z.y < 70;
                  const leftPx = (z.x / 100) * displayW;
                  const topPx = (z.y / 100) * displayH;
                  const hPx = (z.h / 100) * displayH;
                  return (
                    <div
                      style={{
                        position: 'absolute',
                        left: leftPx,
                        top: popBelow ? topPx + hPx + 8 : undefined,
                        bottom: popBelow ? undefined : (displayH - topPx + 8),
                        zIndex: 200,
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ ...s.boothPop, position: 'relative', left: 0, top: 0 }}>
                        <div style={s.boothPopTitle}>
                          <span>{popupMode === 'stage' ? (de ? 'Bühne zuweisen' : 'Assign stage') : (de ? 'Aussteller zuweisen' : 'Assign exhibitor')}</span>
                          <button style={s.boothPopClose} onClick={(e) => { e.stopPropagation(); setPopupZoneId(null); }}>×</button>
                        </div>

                        {/* Mode tabs: Exhibitor vs Stage */}
                        <div style={s.modeTabs}>
                          <button style={s.modeTab(popupMode === 'exhibitor')} onClick={() => setPopupMode('exhibitor')}>
                            {de ? 'Aussteller' : 'Exhibitor'}
                          </button>
                          <button style={s.modeTab(popupMode === 'stage')} onClick={() => setPopupMode('stage')}>
                            {de ? 'Bühne' : 'Stage'}
                          </button>
                        </div>

                        {popupMode === 'exhibitor' ? (
                          <>
                            <input
                              type="text"
                              placeholder={de ? 'Aussteller suchen…' : 'Search exhibitor…'}
                              value={boothSearch}
                              autoFocus
                              onChange={(e) => setBoothSearch(e.target.value)}
                              style={{ ...s.boothPopSelect, marginBottom: 6 }}
                            />
                            <div style={{ maxHeight: 180, overflowY: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.bg }}>
                              <div
                                onClick={() => updateZoneExhibitor(z.id, '')}
                                style={{ padding: '9px 12px', fontSize: 13, lineHeight: 1.3, color: COLORS.dim, cursor: 'pointer', borderBottom: `1px solid ${COLORS.border}` }}
                              >
                                {de ? 'Kein Aussteller' : 'No exhibitor'}
                              </div>
                              {exhibitors
                                .filter(exo => {
                                  const q = boothSearch.trim().toLowerCase();
                                  if (!q) return true;
                                  return (exo.name || '').toLowerCase().includes(q) || (exo.booth_number || '').toLowerCase().includes(q);
                                })
                                .map(exo => {
                                  const sel = z.exhibitor_id === exo.id;
                                  return (
                                    <div
                                      key={exo.id}
                                      onClick={() => updateZoneExhibitor(z.id, exo.id)}
                                      style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                                        padding: '9px 12px', fontSize: 13, lineHeight: 1.3, cursor: 'pointer',
                                        color: sel ? '#ffffff' : '#f1f1f3',
                                        background: sel ? COLORS.primary : 'transparent',
                                        borderBottom: `1px solid ${COLORS.border}`,
                                      }}
                                    >
                                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exo.name}</span>
                                      {exo.booth_number && (
                                        <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: sel ? 'rgba(255,255,255,0.85)' : COLORS.dim, fontVariantNumeric: 'tabular-nums' }}>
                                          {exo.booth_number}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                            <div style={{ marginTop: 10 }}>
                              <div style={{ color: COLORS.muted, fontSize: 11, fontWeight: 600, marginBottom: 6 }}>{de ? 'Anzeige auf diesem Stand' : 'Show on this booth'}</div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {[
                                  { val: null, label: de ? 'Standard' : 'Default' },
                                  { val: 'logo', label: 'Logo' },
                                  { val: 'number', label: de ? 'Nummer' : 'Number' },
                                ].map(opt => {
                                  const active = (z.display_mode || null) === opt.val;
                                  return (
                                    <button
                                      key={String(opt.val)}
                                      onClick={() => updateZoneDisplayMode(z.id, opt.val)}
                                      style={{
                                        flex: 1, padding: '6px 4px', borderRadius: 6, cursor: 'pointer',
                                        fontSize: 12, fontWeight: 600,
                                        border: active ? `1px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
                                        background: active ? COLORS.primary : COLORS.bg,
                                        color: active ? '#fff' : COLORS.muted,
                                      }}
                                    >
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ color: COLORS.muted, fontSize: 11, fontWeight: 600, marginBottom: 6 }}>{de ? 'Welche Bühne ist das?' : 'Which stage is this?'}</div>
                            <div style={{ maxHeight: 220, overflowY: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: 8, background: COLORS.bg }}>
                              <div
                                onClick={() => updateZoneTrack(z.id, '')}
                                style={{ padding: '9px 12px', fontSize: 13, lineHeight: 1.3, color: COLORS.dim, cursor: 'pointer', borderBottom: `1px solid ${COLORS.border}` }}
                              >
                                {de ? 'Keine Bühne' : 'No stage'}
                              </div>
                              {tracks.length === 0 && (
                                <div style={{ padding: '9px 12px', fontSize: 12, color: COLORS.dim }}>
                                  {de ? 'Keine Bühnen/Tracks angelegt' : 'No stages/tracks yet'}
                                </div>
                              )}
                              {tracks.map(tr => {
                                const sel = z.track_id === tr.id;
                                return (
                                  <div
                                    key={tr.id}
                                    onClick={() => updateZoneTrack(z.id, tr.id)}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: 10,
                                      padding: '9px 12px', fontSize: 13, lineHeight: 1.3, cursor: 'pointer',
                                      color: sel ? '#ffffff' : '#f1f1f3',
                                      background: sel ? COLORS.primary : 'transparent',
                                      borderBottom: `1px solid ${COLORS.border}`,
                                    }}
                                  >
                                    <span style={{ width: 12, height: 12, borderRadius: 6, background: tr.color || STAGE_COLOR, flexShrink: 0 }} />
                                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr.name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div style={s.picker}>
              <div style={{ color: COLORS.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>
                {de ? 'Stände & Bühnen' : 'Booths & stages'} ({zones.length})
              </div>
              {zones.length === 0 && <div style={{ color: COLORS.dim, fontSize: 13 }}>{de ? 'Noch keine Stände. Klicke „Stand hinzufügen".' :'No booths yet. Click "Add booth".'}</div>}
              {zones.map((z, i) => {
                const isStage = !!z.track_id;
                const tr = isStage ? trackOf(z.track_id) : null;
                const ex = !isStage ? exOf(z.exhibitor_id) : null;
                return (
                  <div key={z.id} style={s.pickerRow}>
                    <span style={{ color: COLORS.dim, fontSize: 13, width: 24 }}>#{i + 1}</span>
                    {isStage
                      ? <div style={{ width: 28, height: 28, borderRadius: 5, background: (tr?.color || STAGE_COLOR) + '33', border: `1px solid ${tr?.color || STAGE_COLOR}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎤</div>
                      : (ex?.logo_url ? <img src={ex.logo_url} alt="" style={s.miniLogo} /> : <div style={s.miniLogoFb} />)}
                    {isStage ? (
                      <select style={s.select} value={z.track_id || ''} onChange={e => updateZoneTrack(z.id, e.target.value)} onFocus={() => setSelectedZone(z.id)}>
                        <option value="">{de ? 'Bühne wählen' : 'Select stage'}</option>
                        {tracks.map(tr => <option key={tr.id} value={tr.id}>{tr.name}</option>)}
                      </select>
                    ) : (
                      <select style={s.select} value={z.exhibitor_id || ''} onChange={e => updateZoneExhibitor(z.id, e.target.value)} onFocus={() => setSelectedZone(z.id)}>
                        <option value="">{de ? 'Aussteller wählen' : 'Select exhibitor'}</option>
                        {exhibitors.map(ex => <option key={ex.id} value={ex.id}>{ex.booth_number ? `${ex.name} (${ex.booth_number})` : ex.name}</option>)}
                      </select>
                    )}
                    <button style={{ width: 22, height: 22, borderRadius: 6, background: '#2a2a3e', color: COLORS.muted, border: 'none', cursor: 'pointer' }} onClick={() => deleteZone(z.id)}>×</button>
                  </div>
                );
              })}
            </div>

            <div style={s.hint}>
              {de
                ? 'Zoome mit den Buttons oder Strg/⌘+Scrollen. Verschiebe den Plan, indem du eine leere Fläche ziehst. „Stand hinzufügen" für Aussteller, „Bühne hinzufügen" für eine Bühne. Box auf die Stelle ziehen → Ecke zum Anpassen → anklicken, um Aussteller oder Bühne zuzuweisen. Bühnen werden in der App antippbar und zeigen das Programm der Bühne.'
                : 'Zoom with the buttons or Ctrl/⌘+scroll. Pan by dragging an empty area. "Add booth" for exhibitors, "Add stage" for a stage. Drag the box onto the spot → corner to resize → click to assign an exhibitor or a stage. Stages become tappable in the app and show the stage program.'}
            </div>
          </>
        ) : (
          <div style={s.empty}>
            <Map size={48} color={COLORS.dim} />
            <span>{de ? 'Noch kein Hallenplan hochgeladen' : 'No floor plan uploaded yet'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function toHex(c) {
  if (!c) return '#ffffff';
  if (c[0] === '#') return c.slice(0, 7);
  if (c === 'transparent') return '#ffffff';
  return '#ffffff';
}