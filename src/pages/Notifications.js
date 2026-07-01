import { useState, useEffect, useContext } from 'react';
import { supabase, t } from '../lib/supabase';
import { LangContext, EventContext } from '../App';
import toast from 'react-hot-toast';
import { Bell, Send, Trash2 } from 'lucide-react';

const COLORS = { primary: '#8c368c', accent: '#e71f69', bg: '#f4f2f6', surface: '#ffffff', border: '#e6e2ec', text: '#1d1d1b', muted: '#6b6b76', dim: '#9a9aa5' };

export default function Notifications() {
  const lang = useContext(LangContext);
  const event = useContext(EventContext);
  const de = lang === 'de';
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);

  const loadHistory = async () => {
    if (!event) return;
    const { data } = await supabase.from('push_notifications').select('*').eq('event_id', event.id).order('created_at', { ascending: false }).limit(50);
    setHistory(data || []);
  };
  useEffect(() => { loadHistory(); }, [event]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error(de ? 'Titel und Nachricht sind erforderlich' : 'Title and message are required');
      return;
    }
    setSending(true);
    // 1. Save the notification.
    const { data: inserted, error } = await supabase.from('push_notifications')
      .insert({ event_id: event?.id, title, message, target: 'all', status: 'pending' })
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
    setTitle(''); setMessage('');
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

  const s = {
    label: { display: 'block', color: COLORS.muted, fontSize: 12, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase' },
    input: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
    textarea: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box', minHeight: 100, resize: 'vertical' },
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
          <input style={s.input} value={title} onChange={e => setTitle(e.target.value)} placeholder={de ? 'z.B. fithera startet gleich!' : 'e.g. fithera starts soon!'} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={s.label}>{t(lang, 'message')} *</label>
          <textarea style={s.textarea} value={message} onChange={e => setMessage(e.target.value)} placeholder={de ? 'Deine Nachricht an alle Besucher...' : 'Your message to all attendees...'} />
        </div>
        <button onClick={handleSend} disabled={sending}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: `${COLORS.primary}`, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          <Send size={16} /> {sending ? (de ? 'Wird gesendet...' : 'Sending...') : t(lang, 'send')}
        </button>
      </div>

      {/* Verlauf der gesendeten Nachrichten */}
      <div style={{ marginTop: 28, maxWidth: 540 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ color: COLORS.text, fontSize: 16, fontWeight: 700 }}>{de ? 'Gesendete Nachrichten' : 'Sent messages'}</div>
          {history.length > 0 && (
            <button onClick={handleDeleteAll}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'transparent', color: COLORS.accent, border: `1px solid ${COLORS.accent}`, borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
              <Trash2 size={14} /> {de ? 'Alle loeschen' : 'Delete all'}
            </button>
          )}
        </div>
        {history.length === 0
          ? <div style={{ color: COLORS.dim, fontSize: 13 }}>{de ? 'Noch keine Nachrichten gesendet.' : 'No messages sent yet.'}</div>
          : history.map(n => (
            <div key={n.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 14 }}>{n.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: n.status === 'sent' ? '#22c55e22' : '#f59e0b22', color: n.status === 'sent' ? '#16a34a' : '#b45309', whiteSpace: 'nowrap' }}>
                    {n.status === 'sent' ? (de ? 'Gesendet' : 'Sent') : (de ? 'Ausstehend' : 'Pending')}
                  </span>
                  <button onClick={() => handleDelete(n.id)} title={de ? 'Loeschen' : 'Delete'}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, background: 'transparent', color: COLORS.dim, border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>{n.message}</div>
              <div style={{ color: COLORS.dim, fontSize: 11, marginTop: 6 }}>{new Date(n.created_at).toLocaleString('de-DE')}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}