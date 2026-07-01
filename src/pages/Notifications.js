import { useState, useEffect, useContext } from 'react';
import { supabase, t } from '../lib/supabase';
import { LangContext, EventContext } from '../App';
import toast from 'react-hot-toast';
import { Bell, Send, Trash2, Clock } from 'lucide-react';

const COLORS = { primary: '#8c368c', accent: '#e71f69', bg: '#f4f2f6', surface: '#ffffff', border: '#e6e2ec', text: '#1d1d1b', muted: '#6b6b76', dim: '#9a9aa5' };

export default function Notifications() {
  const lang = useContext(LangContext);
  const event = useContext(EventContext);
  const de = lang === 'de';
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [mode, setMode] = useState('now'); // 'now' or 'later'
  const [scheduledAt, setScheduledAt] = useState('');
  const [linkType, setLinkType] = useState('none'); // none | SessionDetail | ExhibitorDetail | Programm | Aussteller | Hallenplan
  const [linkId, setLinkId] = useState('');
  const [sessionsList, setSessionsList] = useState([]);
  const [exhibitorsList, setExhibitorsList] = useState([]);

  const loadHistory = async () => {
    if (!event) return;
    const { data } = await supabase.from('push_notifications').select('*').eq('event_id', event.id).order('created_at', { ascending: false }).limit(50);
    setHistory(data || []);
  };
  useEffect(() => { loadHistory(); }, [event]);

  useEffect(() => {
    if (!event) return;
    supabase.from('sessions').select('id, title, start_time').eq('event_id', event.id).order('start_time')
      .then(({ data }) => setSessionsList(data || []));
    supabase.from('exhibitors').select('id, name').eq('event_id', event.id).order('name')
      .then(({ data }) => setExhibitorsList(data || []));
  }, [event]);

  // Turns the picker choice into the two columns the backend uses.
  const buildLinkFields = () => {
    if (linkType === 'none') return { link_screen: null, link_id: null };
    if (linkType === 'SessionDetail' || linkType === 'ExhibitorDetail') {
      if (!linkId) return null; // needs a specific item
      return { link_screen: linkType, link_id: linkId };
    }
    // Whole-screen targets (no id needed)
    return { link_screen: linkType, link_id: null };
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error(de ? 'Titel und Nachricht sind erforderlich' : 'Title and message are required');
      return;
    }
    const linkFields = buildLinkFields();
    if (linkFields === null) {
      toast.error(de ? 'Bitte ein Ziel fuer die Verlinkung waehlen' : 'Please choose a link target');
      return;
    }
    // Scheduling validation
    if (mode === 'later') {
      if (!scheduledAt) {
        toast.error(de ? 'Bitte Datum und Uhrzeit waehlen' : 'Please pick a date and time');
        return;
      }
      const when = new Date(scheduledAt);
      if (when.getTime() <= Date.now()) {
        toast.error(de ? 'Zeitpunkt muss in der Zukunft liegen' : 'Time must be in the future');
        return;
      }
    }
    setSending(true);

    if (mode === 'later') {
      // Save with a scheduled time. The cron job will send it. Do NOT invoke now.
      const { error } = await supabase.from('push_notifications')
        .insert({ event_id: event?.id, title, message, target: 'all', status: 'pending', scheduled_for: new Date(scheduledAt).toISOString(), ...linkFields });
      if (error) { toast.error(t(lang, 'error')); setSending(false); return; }
      toast.success(de ? 'Geplant' : 'Scheduled');
      setTitle(''); setMessage(''); setScheduledAt(''); setMode('now'); setLinkType('none'); setLinkId('');
      loadHistory();
      setSending(false);
      return;
    }

    // Send now (original behaviour).
    // 1. Save the notification.
    const { data: inserted, error } = await supabase.from('push_notifications')
      .insert({ event_id: event?.id, title, message, target: 'all', status: 'pending', ...linkFields })
      .select()
      .single();
    if (error) { toast.error(t(lang, 'error')); setSending(false); return; }

    // 2. Trigger the edge function to actually deliver it.
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('send-push', { body: { id: inserted.id } });
      if (fnError) throw fnError;
      const count = fnData?.sent ?? 0;
      toast.success(de ? `Gesendet an ${count} Gerät(e)` : `Sent to ${count} device(s)`);
    } catch (e) {
      // Saved but delivery failed (function not deployed yet, etc.)
      toast.error(de ? 'Gespeichert, aber Versand fehlgeschlagen. Edge Function pruefen.' : 'Saved, but delivery failed. Check edge function.');
    }
    setTitle(''); setMessage(''); setLinkType('none'); setLinkId('');
    loadHistory();
    setSending(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(de ? 'Diese Nachricht loeschen?' : 'Delete this message?')) return;
    const { error } = await supabase.from('push_notifications').delete().eq('id', id);
    if (error) { toast.error(t(lang, 'error')); return; }
    toast.success(de ? 'Geloescht' : 'Deleted');
    loadHistory();
  };

  const handleDeleteAll = async () => {
    if (history.length === 0) return;
    if (!window.confirm(de ? 'Wirklich ALLE Nachrichten loeschen?' : 'Really delete ALL messages?')) return;
    const { error } = await supabase.from('push_notifications').delete().eq('event_id', event.id);
    if (error) { toast.error(t(lang, 'error')); return; }
    toast.success(de ? 'Alle Nachrichten geloescht' : 'All messages deleted');
    loadHistory();
  };

  // Status helper: a pending row with a future scheduled_for is "scheduled".
  const rowState = (n) => {
    if (n.status === 'sent') return 'sent';
    if (n.scheduled_for && new Date(n.scheduled_for).getTime() > Date.now()) return 'scheduled';
    return 'pending';
  };

  const s = {
    label: { display: 'block', color: COLORS.muted, fontSize: 12, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase' },
    input: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
    textarea: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', minHeight: 100, resize: 'vertical' },
    modeBtn: (active) => ({ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', borderRadius: 8, border: `1px solid ${active ? COLORS.primary : COLORS.border}`, background: active ? COLORS.primary + '22' : 'transparent', color: active ? COLORS.primary : COLORS.muted, cursor: 'pointer', fontWeight: 600, fontSize: 13 }),
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: COLORS.text, fontSize: 22, fontWeight: 700 }}>{t(lang, 'notifications')}</div>
        <div style={{ color: COLORS.dim, fontSize: 13, marginTop: 4 }}>{de ? 'Nachricht an alle App-Nutzer senden' : 'Send message to all app users'}</div>
      </div>
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, maxWidth: 540 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, background: COLORS.primary + '22', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={20} color={COLORS.primary} />
          </div>
          <div style={{ color: COLORS.text, fontWeight: 600 }}>{de ? 'Push-Benachrichtigung' : 'Push Notification'}</div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={s.label}>{de ? 'Titel *' : 'Title *'}</label>
          <input style={s.input} value={title} onChange={e => setTitle(e.target.value)} placeholder={de ? 'z.B. fithera startet gleich!' : 'e.g. fithera starts soon!'}/>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={s.label}>{t(lang, 'message')} *</label>
          <textarea style={s.textarea} value={message} onChange={e => setMessage(e.target.value)} placeholder={de ? 'Deine Nachricht an alle Besucher...' : 'Your message to all attendees...'} />
        </div>

        {/* Deep-link target */}
        <div style={{ marginBottom: 16 }}>
          <label style={s.label}>{de ? 'Verlinkung (optional)' : 'Link (optional)'}</label>
          <select
            value={linkType}
            onChange={e => { setLinkType(e.target.value); setLinkId(''); }}
            style={{ ...s.input, cursor: 'pointer' }}
          >
            <option value="none">{de ? 'Keine' : 'None'}</option>
            <option value="SessionDetail">{de ? 'Bestimmte Session' : 'Specific session'}</option>
            <option value="ExhibitorDetail">{de ? 'Bestimmter Aussteller' : 'Specific exhibitor'}</option>
            <option value="Programm">{de ? 'Programm (Liste)' : 'Program (list)'}</option>
            <option value="Aussteller">{de ? 'Aussteller (Liste)' : 'Exhibitors (list)'}</option>
            <option value="Hallenplan">{de ? 'Hallenplan' : 'Floor plan'}</option>
          </select>
        </div>

        {linkType === 'SessionDetail' && (
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>{de ? 'Session waehlen' : 'Choose session'}</label>
            <select value={linkId} onChange={e => setLinkId(e.target.value)} style={{ ...s.input, cursor: 'pointer' }}>
              <option value="">{de ? '-- bitte waehlen --' : '-- please choose --'}</option>
              {sessionsList.map(se => (
                <option key={se.id} value={se.id}>{se.title}</option>
              ))}
            </select>
          </div>
        )}

        {linkType === 'ExhibitorDetail' && (
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>{de ? 'Aussteller waehlen' : 'Choose exhibitor'}</label>
            <select value={linkId} onChange={e => setLinkId(e.target.value)} style={{ ...s.input, cursor: 'pointer' }}>
              <option value="">{de ? '-- bitte waehlen --' : '-- please choose --'}</option>
              {exhibitorsList.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Send mode: now or later */}
        <div style={{ marginBottom: 16 }}>
          <label style={s.label}>{de ? 'Versand' : 'Delivery'}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setMode('now')} style={s.modeBtn(mode === 'now')}>
              <Send size={14} /> {de ? 'Jetzt senden' : 'Send now'}
            </button>
            <button type="button" onClick={() => setMode('later')} style={s.modeBtn(mode === 'later')}>
              <Clock size={14} /> {de ? 'Spaeter senden' : 'Schedule'}
            </button>
          </div>
        </div>

        {mode === 'later' && (
          <div style={{ marginBottom: 20 }}>
            <label style={s.label}>{de ? 'Datum und Uhrzeit' : 'Date and time'}</label>
            <input type="datetime-local" style={s.input} value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
            <div style={{ color: COLORS.dim, fontSize: 11, marginTop: 6 }}>
              {de ? 'Die Nachricht wird automatisch zum gewaehlten Zeitpunkt gesendet (deutsche Zeit).' : 'The message is sent automatically at the chosen time (German time).'}
            </div>
          </div>
        )}

        <button onClick={handleSend} disabled={sending}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: `${COLORS.primary}`, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          {mode === 'later' ? <Clock size={16} /> : <Send size={16} />}
          {sending
            ? (de ? 'Wird verarbeitet...' : 'Working...')
            : (mode === 'later' ? (de ? 'Planen' : 'Schedule') : t(lang, 'send'))}
        </button>
      </div>

      {/* Verlauf der gesendeten Nachrichten */}
      <div style={{ marginTop: 28, maxWidth: 540 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ color: COLORS.text, fontSize: 16, fontWeight: 700 }}>{de ? 'Nachrichten' : 'Messages'}</div>
          {history.length > 0 && (
            <button onClick={handleDeleteAll}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'transparent', color: COLORS.accent, border: `1px solid ${COLORS.accent}`, borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
              <Trash2 size={14} /> {de ? 'Alle loeschen' : 'Delete all'}
            </button>
          )}
        </div>
        {history.length === 0
          ? <div style={{ color: COLORS.dim, fontSize: 13 }}>{de ? 'Noch keine Nachrichten.' : 'No messages yet.'}</div>
          : history.map(n => {
            const st = rowState(n);
            const badge = st === 'sent'
              ? { bg: '#22c55e22', color: '#16a34a', label: de ? 'Gesendet' : 'Sent' }
              : st === 'scheduled'
                ? { bg: '#8c368c22', color: COLORS.primary, label: de ? 'Geplant' : 'Scheduled' }
                : { bg: '#f59e0b22', color: '#b45309', label: de ? 'Ausstehend' : 'Pending' };
            return (
            <div key={n.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 14 }}>{n.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: badge.bg, color: badge.color, whiteSpace: 'nowrap' }}>
                    {badge.label}
                  </span>
                  <button onClick={() => handleDelete(n.id)} title={de ? 'Loeschen' : 'Delete'}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, background: 'transparent', color: COLORS.dim, border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>{n.message}</div>
              <div style={{ color: COLORS.dim, fontSize: 11, marginTop: 6 }}>
                {st === 'scheduled'
                  ? (de ? 'Geplant fuer: ' : 'Scheduled for: ') + new Date(n.scheduled_for).toLocaleString('de-DE')
                  : st === 'sent' && n.sent_at
                    ? (de ? 'Gesendet: ' : 'Sent: ') + new Date(n.sent_at).toLocaleString('de-DE')
                    : new Date(n.created_at).toLocaleString('de-DE')}
              </div>
            </div>
            );
          })
        }
      </div>
    </div>
  );
}
