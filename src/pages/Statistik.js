import { useState, useEffect, useContext, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { EventContext } from '../App';
import {
  BarChart3, Store, Calendar, Map, Image as ImageIcon, Users, RefreshCw, Download, FileText,
} from 'lucide-react';

const COLORS = {
  primary: '#8c368c',
  accent: '#e71f69',
  bg: '#f4f2f6',
  surface: '#ffffff',
  border: '#e6e2ec',
  text: '#1d1d1b',
  muted: '#6b6b76',
  dim: '#9a9aa5',
};

// Human-readable labels for each tracked event type
const TYPE_LABELS = {
  exhibitor_view: 'Aussteller-Aufrufe',
  session_view: 'Session-Aufrufe',
  speaker_view: 'Referenten-Aufrufe',
  map_open: 'Hallenplan geöffnet',
  map_booth_tap: 'Stand auf Karte getippt',
  program_open: 'Programm geöffnet',
  exhibitors_open: 'Ausstellerliste geöffnet',
  program_filter: 'Programm-Filter genutzt',
  exhibitors_filter: 'Aussteller-Filter genutzt',
};

const ICONS = {
  exhibitor_view: Store,
  session_view: Calendar,
  speaker_view: Users,
  map_open: Map,
  map_booth_tap: Map,
  program_open: Calendar,
  exhibitors_open: Store,
};

export default function Statistik() {
  const event = useContext(EventContext);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');

  // Zeitfilter: 'all' | 'today' | '7d' | '30d' | 'custom'
  const [range, setRange] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const load = async () => {
    if (!event) return;
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('analytics_events')
      .select('event_type, target_id, target_name, device_id, created_at')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false })
      .limit(50000);
    if (error) setError(error.message);
    setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [event?.id]);

  // ---- Zeitfilter anwenden ----
  const filteredEvents = useMemo(() => {
    if (range === 'all') return events;

    const now = new Date();
    let start = null;
    let end = null;

    if (range === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === '7d') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === '30d') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === 'custom') {
      if (customFrom) start = new Date(customFrom + 'T00:00:00');
      if (customTo) end = new Date(customTo + 'T23:59:59');
    }

    return events.filter(e => {
      const t = new Date(e.created_at).getTime();
      if (start && t < start.getTime()) return false;
      if (end && t > end.getTime()) return false;
      return true;
    });
  }, [events, range, customFrom, customTo]);

  // ---- Aggregations (auf gefilterten Daten) ----
  const countByType = {};
  const uniqueDevices = new Set();
  const byTypeTarget = {}; // type -> { target_id: { name, count } }
  const byDay = {};        // 'YYYY-MM-DD' -> count

  const appOpenDevices = new Set(); // unique devices that opened the app
  const devicesByDay = {}; // 'YYYY-MM-DD' -> Set of device_ids that opened the app that day

  filteredEvents.forEach(e => {
    countByType[e.event_type] = (countByType[e.event_type] || 0) + 1;
    if (e.device_id) uniqueDevices.add(e.device_id);
    if (e.event_type === 'app_open' && e.device_id) appOpenDevices.add(e.device_id);
    if (!byTypeTarget[e.event_type]) byTypeTarget[e.event_type] = {};
    const key = e.target_id || e.target_name;
    if (key) {
      const slot = byTypeTarget[e.event_type][key] || { name: e.target_name || '-', count: 0 };
      slot.count += 1;
      byTypeTarget[e.event_type][key] = slot;
    }
    const day = (e.created_at || '').slice(0, 10);
    if (day) {
      byDay[day] = (byDay[day] || 0) + 1;
      if (e.event_type === 'app_open' && e.device_id) {
        if (!devicesByDay[day]) devicesByDay[day] = new Set();
        devicesByDay[day].add(e.device_id);
      }
    }
  });

  const topList = (type, n = null) => {
    const sorted = Object.values(byTypeTarget[type] || {}).sort((a, b) => b.count - a.count);
    return n ? sorted.slice(0, n) : sorted;
  };

  const days = Object.keys(byDay).sort();
  const maxDay = Math.max(1, ...Object.values(byDay));
  const peopleDays = Object.keys(devicesByDay).sort();
  const maxPeopleDay = Math.max(1, ...peopleDays.map(d => devicesByDay[d].size));
  const fmtDay = (d) => new Date(d).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });

  // Label des aktiven Filters (fuer Berichte)
  const rangeLabel = () => {
    if (range === 'all') return 'Gesamter Zeitraum';
    if (range === 'today') return 'Heute';
    if (range === '7d') return 'Letzte 7 Tage';
    if (range === '30d') return 'Letzte 30 Tage';
    if (range === 'custom') {
      const f = customFrom || 'Anfang';
      const tt = customTo || 'heute';
      return `${f} bis ${tt}`;
    }
    return '';
  };

  // Summary cards
  const summaryCards = [
    { type: 'program_open', label: 'Programm geöffnet' },
    { type: 'exhibitors_open', label: 'Ausstellerliste geöffnet' },
    { type: 'exhibitor_view', label: 'Aussteller-Aufrufe' },
    { type: 'session_view', label: 'Session-Aufrufe' },
    { type: 'map_open', label: 'Hallenplan geöffnet' },
  ];

  // ---- Downloads ----
  const downloadFile = (filename, content, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const csvEscape = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const downloadRawCSV = () => {
    const header = ['Zeitpunkt', 'Typ', 'Bezeichnung', 'Gerät', 'Aktion (Code)', 'Ziel-ID'];
    const lines = [header.join(',')];
    filteredEvents.forEach(e => {
      lines.push([
        csvEscape(new Date(e.created_at).toLocaleString('de-DE')),
        csvEscape(TYPE_LABELS[e.event_type] || e.event_type),
        csvEscape(e.target_name || ''),
        csvEscape(e.device_id || ''),
        csvEscape(e.event_type),
        csvEscape(e.target_id || ''),
      ].join(','));
    });
    downloadFile(`fithera-analytics-rohdaten-${new Date().toISOString().slice(0, 10)}.csv`, '\uFEFF' + lines.join('\n'), 'text/csv;charset=utf-8');
  };

  const downloadReport = () => {
    const L = [];
    L.push('FITHERA 2026 - NUTZUNGSBERICHT');
    L.push('Erstellt: ' + new Date().toLocaleString('de-DE'));
    L.push('Zeitraum: ' + rangeLabel());
    L.push('');
    L.push('ÜBERSICHT');
    L.push('Geräte / Nutzer gesamt: ' + appOpenDevices.size);
    L.push('App-Aufrufe gesamt: ' + (countByType['app_open'] || 0));
    L.push('Erfasste Aktionen gesamt: ' + filteredEvents.length);
    L.push('');
    L.push('AKTIONEN NACH TYP');
    Object.entries(countByType).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => {
      L.push((TYPE_LABELS[t] || t) + ': ' + c);
    });
    L.push('');
    L.push('NUTZER PRO TAG');
    peopleDays.forEach(d => L.push(fmtDay(d) + ': ' + devicesByDay[d].size));
    L.push('');
    const section = (title, type) => {
      const rows = topList(type);
      if (rows.length === 0) return;
      L.push(title.toUpperCase() + ' (' + rows.length + ')');
      rows.forEach((r, i) => L.push((i + 1) + '. ' + r.name + ' - ' + r.count));
      L.push('');
    };
    section('Aussteller-Aufrufe', 'exhibitor_view');
    section('Session-Aufrufe', 'session_view');
    section('Referenten-Aufrufe', 'speaker_view');
    section('Stände auf Karte getippt', 'map_booth_tap');
    section('Aussteller-Filter genutzt', 'exhibitors_filter');
    section('Programm-Filter genutzt', 'program_filter');
    downloadFile(`fithera-bericht-${new Date().toISOString().slice(0, 10)}.txt`, L.join('\n'), 'text/plain;charset=utf-8');
  };

  // Styles fuer den Zeitfilter
  const chip = (active) => ({
    padding: '7px 14px',
    background: active ? COLORS.primary : COLORS.surface,
    color: active ? '#fff' : COLORS.muted,
    border: `1px solid ${active ? COLORS.primary : COLORS.border}`,
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  });
  const dateInput = {
    padding: '7px 10px',
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    color: COLORS.text,
    fontSize: 13,
    outline: 'none',
  };

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BarChart3 size={26} color={COLORS.primary} />
          <h1 style={{ color: COLORS.text, fontSize: 24, fontWeight: 700, margin: 0 }}>Statistik</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={downloadReport} disabled={filteredEvents.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: filteredEvents.length === 0 ? COLORS.dim : COLORS.muted, cursor: filteredEvents.length === 0 ? 'default' : 'pointer', fontSize: 13 }}>
            <FileText size={15} /> Bericht
          </button>
          <button onClick={downloadRawCSV} disabled={filteredEvents.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: filteredEvents.length === 0 ? COLORS.dim : COLORS.muted, cursor: filteredEvents.length === 0 ? 'default' : 'pointer', fontSize: 13 }}>
            <Download size={15} /> CSV
          </button>
          <button onClick={load}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.muted, cursor: 'pointer', fontSize: 13 }}>
            <RefreshCw size={15} /> Aktualisieren
          </button>
        </div>
      </div>
      <p style={{ color: COLORS.dim, fontSize: 14, marginTop: 0, marginBottom: 18 }}>
        Anonyme Nutzungsdaten der App - keine persönlichen Daten, nur Aufrufe pro Gerät.
      </p>

      {/* Zeitfilter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        <span style={{ color: COLORS.muted, fontSize: 13, fontWeight: 600, marginRight: 4 }}>Zeitraum:</span>
        <button style={chip(range === 'all')} onClick={() => setRange('all')}>Alles</button>
        <button style={chip(range === 'today')} onClick={() => setRange('today')}>Heute</button>
        <button style={chip(range === '7d')} onClick={() => setRange('7d')}>7 Tage</button>
        <button style={chip(range === '30d')} onClick={() => setRange('30d')}>30 Tage</button>
        <button style={chip(range === 'custom')} onClick={() => setRange('custom')}>Eigener Zeitraum</button>
        {range === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
            <input type="date" style={dateInput} value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
            <span style={{ color: COLORS.dim, fontSize: 13 }}>bis</span>
            <input type="date" style={dateInput} value={customTo} onChange={e => setCustomTo(e.target.value)} />
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: `${COLORS.accent}22`, border: `1px solid ${COLORS.accent}`, color: COLORS.accent, padding: 14, borderRadius: 10, marginBottom: 20, fontSize: 14 }}>
          Fehler beim Laden: {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: COLORS.muted, padding: 40 }}>Laden...</div>
      ) : filteredEvents.length === 0 ? (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <BarChart3 size={40} color={COLORS.dim} style={{ marginBottom: 12 }} />
          <div style={{ color: COLORS.text, fontSize: 17, fontWeight: 600, marginBottom: 6 }}>
            {events.length === 0 ? 'Noch keine Daten' : 'Keine Daten in diesem Zeitraum'}
          </div>
          <div style={{ color: COLORS.dim, fontSize: 14 }}>
            {events.length === 0
              ? 'Sobald die App genutzt wird, erscheinen hier die Zahlen.'
              : 'Waehle einen anderen Zeitraum, um Daten zu sehen.'}
          </div>
        </div>
      ) : (
        <>
          {/* Top-line: people & app opens */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
            <div style={{ background: `${COLORS.primary}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Users size={20} color="#fff" />
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>Geräte / Nutzer</span>
              </div>
              <div style={{ color: '#fff', fontSize: 36, fontWeight: 800 }}>{appOpenDevices.size}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4 }}>
                Schätzung - ein Gerät = ein Nutzer
              </div>
            </div>
            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <BarChart3 size={20} color={COLORS.primary} />
                <span style={{ color: COLORS.muted, fontSize: 13 }}>App-Aufrufe gesamt</span>
              </div>
              <div style={{ color: COLORS.text, fontSize: 36, fontWeight: 800 }}>{countByType['app_open'] || 0}</div>
              <div style={{ color: COLORS.dim, fontSize: 11, marginTop: 4 }}>
                Wie oft die App geöffnet wurde
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
            {summaryCards.map(card => {
              const Icon = ICONS[card.type] || BarChart3;
              return (
                <div key={card.type} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: `${COLORS.primary}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} color={COLORS.primary} />
                    </div>
                    <span style={{ color: COLORS.muted, fontSize: 13 }}>{card.label}</span>
                  </div>
                  <div style={{ color: COLORS.text, fontSize: 30, fontWeight: 800 }}>{countByType[card.type] || 0}</div>
                </div>
              );
            })}
          </div>

          {/* People (unique devices) per day */}
          {peopleDays.length > 0 && (
            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, marginBottom: 28 }}>
              <div style={{ color: COLORS.text, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Nutzer pro Tag</div>
              <div style={{ color: COLORS.dim, fontSize: 12, marginBottom: 16 }}>Geräte, die die App an diesem Tag geöffnet haben</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {peopleDays.map(d => (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 110, color: COLORS.muted, fontSize: 13, flexShrink: 0 }}>{fmtDay(d)}</div>
                    <div style={{ flex: 1, background: COLORS.bg, borderRadius: 6, height: 22, overflow: 'hidden' }}>
                      <div style={{ width: `${(devicesByDay[d].size / maxPeopleDay) * 100}%`, height: '100%', background: `${COLORS.primary}`, borderRadius: 6 }} />
                    </div>
                    <div style={{ width: 50, textAlign: 'right', color: COLORS.text, fontSize: 14, fontWeight: 600 }}>{devicesByDay[d].size}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-day breakdown */}
          {days.length > 0 && (
            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, marginBottom: 28 }}>
              <div style={{ color: COLORS.text, fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Aktivität pro Tag</div>
              <div style={{ color: COLORS.dim, fontSize: 12, marginBottom: 16 }}>Alle Aktionen (Aufrufe, Taps) zusammen</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {days.map(d => (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 110, color: COLORS.muted, fontSize: 13, flexShrink: 0 }}>{fmtDay(d)}</div>
                    <div style={{ flex: 1, background: COLORS.bg, borderRadius: 6, height: 22, overflow: 'hidden' }}>
                      <div style={{ width: `${(byDay[d] / maxDay) * 100}%`, height: '100%', background: `${COLORS.primary}`, borderRadius: 6 }} />
                    </div>
                    <div style={{ width: 50, textAlign: 'right', color: COLORS.text, fontSize: 14, fontWeight: 600 }}>{byDay[d]}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top exhibitors */}
          <TopBlock title="Top Aussteller" rows={topList('exhibitor_view')} color={COLORS.primary} />
          {/* Top sessions */}
          <TopBlock title="Top Sessions" rows={topList('session_view')} color={COLORS.accent} />
          {/* Top speakers (only if any) */}
          {topList('speaker_view').length > 0 && (
            <TopBlock title="Top Referenten" rows={topList('speaker_view')} color={COLORS.primary} />
          )}
          {/* Most-tapped booths on the map */}
          {topList('map_booth_tap').length > 0 && (
            <TopBlock title="Meist getippte Stände (Karte)" rows={topList('map_booth_tap')} color={COLORS.accent} />
          )}
          {/* Which filters people used */}
          {topList('exhibitors_filter').length > 0 && (
            <TopBlock title="Meistgenutzte Aussteller-Filter" rows={topList('exhibitors_filter')} color={COLORS.primary} />
          )}
          {topList('program_filter').length > 0 && (
            <TopBlock title="Meistgenutzte Programm-Filter (Bühnen)" rows={topList('program_filter')} color={COLORS.accent} />
          )}

          <div style={{ color: COLORS.dim, fontSize: 12, marginTop: 16 }}>
            Insgesamt {filteredEvents.length} erfasste Aktionen{range !== 'all' ? ` (${rangeLabel()})` : ''}.
          </div>
        </>
      )}
    </div>
  );
}

function TopBlock({ title, rows, color }) {
  const max = Math.max(1, ...rows.map(r => r.count));
  if (rows.length === 0) return null;
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <div style={{ color: COLORS.text, fontSize: 16, fontWeight: 700, marginBottom: 16 }}>{title} <span style={{ color: COLORS.dim, fontWeight: 400, fontSize: 13 }}>({rows.length})</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 28, color: COLORS.dim, fontSize: 13, flexShrink: 0 }}>{i + 1}.</div>
            <div style={{ width: 200, color: COLORS.text, fontSize: 14, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
            <div style={{ flex: 1, background: COLORS.bg, borderRadius: 6, height: 18, overflow: 'hidden' }}>
              <div style={{ width: `${(r.count / max) * 100}%`, height: '100%', background: color, borderRadius: 6 }} />
            </div>
            <div style={{ width: 44, textAlign: 'right', color: COLORS.text, fontSize: 14, fontWeight: 600 }}>{r.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}