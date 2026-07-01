import { useState, useEffect, useContext } from 'react';
import { supabase, t } from '../lib/supabase';
import { LangContext, EventContext } from '../App';
import toast from 'react-hot-toast';
import { Plus, Trash2, Download, BarChart2, MessageSquare } from 'lucide-react';

const COLORS = { primary: '#8c368c', accent: '#e71f69', bg: '#f4f2f6', surface: '#ffffff', border: '#e6e2ec', text: '#1d1d1b', muted: '#6b6b76', dim: '#9a9aa5' };

export default function EventFeedback() {
  const lang = useContext(LangContext);
  const event = useContext(EventContext);
  const de = lang === 'de';
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [tab, setTab] = useState('questions');
  const [newQ, setNewQ] = useState('');
  const [newType, setNewType] = useState('stars');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!event) return;
    setLoading(true);
    const [{ data: qs }, { data: rs }] = await Promise.all([
      supabase.from('feedback_questions').select('*').eq('event_id', event.id).order('sort_order'),
      supabase.from('event_feedback').select('*').eq('event_id', event.id).order('created_at', { ascending: false }),
    ]);
    setQuestions(qs || []);
    setResponses(rs || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [event]);

  const addQuestion = async () => {
    if (!newQ.trim()) { toast.error(de ? 'Frage ist erforderlich' : 'Question is required'); return; }
    const { error } = await supabase.from('feedback_questions').insert({
      event_id: event.id, question: newQ, question_type: newType, sort_order: questions.length,
    });
    if (error) toast.error(t(lang, 'error'));
    else { toast.success(de ? 'Frage hinzugefügt!' : 'Question added!'); setNewQ(''); load(); }
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm(t(lang, 'confirm_delete'))) return;
    await supabase.from('feedback_questions').delete().eq('id', id);
    toast.success(t(lang, 'deleted')); load();
  };

  const toggleActive = async (q) => {
    await supabase.from('feedback_questions').update({ is_active: !q.is_active }).eq('id', q.id);
    load();
  };

  const getAvg = (questionId) => {
    const vals = responses.map(r => r.answers?.[questionId]).filter(v => typeof v === 'number');
    if (!vals.length) return null;
    return (vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  const getRatingDist = (questionId) => {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    responses.forEach(r => {
      const val = r.answers?.[questionId];
      if (typeof val === 'number' && val >= 1 && val <= 5) dist[val]++;
    });
    return dist;
  };

  const exportCSV = () => {
    if (responses.length === 0) { toast.error(de ? 'Keine Antworten zum Exportieren' : 'No responses to export'); return; }
    
    const starQuestions = questions.filter(q => q.question_type === 'stars');
    const textQuestions = questions.filter(q => q.question_type === 'text');
    
    const headers = ['Datum', ...starQuestions.map(q => q.question), ...textQuestions.map(q => q.question)];
    const rows = responses.map(r => [
      new Date(r.created_at).toLocaleString('de-DE'),
      ...starQuestions.map(q => r.answers?.[q.id] || ''),
      ...textQuestions.map(q => '"' + (r.answers?.[q.id] || '').replace(/"/g, '""') + '"'),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fithera-feedback.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(de ? 'CSV exportiert!' : 'CSV exported!');
  };

  const overallAvg = () => {
    const starQIds = questions.filter(q => q.question_type === 'stars').map(q => q.id);
    if (!starQIds.length || !responses.length) return null;
    const allVals = responses.flatMap(r => starQIds.map(id => r.answers?.[id]).filter(v => typeof v === 'number'));
    if (!allVals.length) return null;
    return (allVals.reduce((a, b) => a + b, 0) / allVals.length).toFixed(1);
  };

  const s = {
    page: { padding: 24 },
    tabs: { display: 'flex', gap: 8, marginBottom: 20 },
    tab: (active) => ({ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: active ? `${COLORS.primary}33` : COLORS.surface, color: active ? COLORS.primary : COLORS.muted, borderColor: active ? COLORS.primary : 'transparent', borderWidth: 1, borderStyle: 'solid' }),
    card: { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16, marginBottom: 12 },
    input: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
    select: { background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 12px', color: COLORS.text, fontSize: 14, outline: 'none' },
    addBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: `${COLORS.primary}`, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 },
    exportBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
    deleteBtn: { background: COLORS.accent + '22', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: COLORS.accent },
    toggleBtn: (active) => ({ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: active ? '#22c55e22' : '#9a9aa522', color: active ? '#22c55e' : COLORS.dim }),
  };

  const starColor = (avg) => {
    if (!avg) return COLORS.dim;
    if (avg >= 4.5) return '#22c55e';
    if (avg >= 3.5) return '#f59e0b';
    return COLORS.accent;
  };

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ color: COLORS.text, fontSize: 22, fontWeight: 700 }}>Event Feedback</div>
          <div style={{ color: COLORS.dim, fontSize: 13, marginTop: 4 }}>{responses.length} {de ? 'Antworten' : 'responses'}</div>
        </div>
        {tab === 'results' && (
          <button style={s.exportBtn} onClick={exportCSV}>
            <Download size={16} /> {de ? 'CSV exportieren' : 'Export CSV'}
          </button>
        )}
      </div>

      <div style={s.tabs}>
        {[{ key: 'questions', label: de ? 'Fragen' : 'Questions' }, { key: 'results', label: de ? 'Ergebnisse' : 'Results' }].map(tb => (
          <button key={tb.key} style={s.tab(tab === tb.key)} onClick={() => setTab(tb.key)}>{tb.label}</button>
        ))}
      </div>

      {tab === 'questions' && (
        <div>
          <div style={{ ...s.card, marginBottom: 20 }}>
            <div style={{ color: COLORS.text, fontWeight: 600, marginBottom: 12 }}>{de ? 'Neue Frage hinzufügen' : 'Add new question'}</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <input style={{ ...s.input, flex: 1 }} value={newQ} onChange={e => setNewQ(e.target.value)}
                placeholder={de ? 'z.B. Wie bewerten Sie die Organisation?' : 'e.g. How do you rate the organization?'}
                onKeyDown={e => e.key === 'Enter' && addQuestion()} />
              <select style={s.select} value={newType} onChange={e => setNewType(e.target.value)}>
                <option value="stars">⭐ {de ? 'Sterne (1-5)' : 'Stars (1-5)'}</option>
                <option value="text">💬 {de ? 'Freitext' : 'Text'}</option>
              </select>
            </div>
            <button style={s.addBtn} onClick={addQuestion}>
              <Plus size={16} />{de ? 'Frage hinzufügen' : 'Add question'}
            </button>
          </div>

          {loading && <div style={{ color: COLORS.dim, textAlign: 'center', padding: 40 }}>{t(lang, 'loading')}</div>}
          {!loading && questions.length === 0 && <div style={{ color: COLORS.dim, textAlign: 'center', padding: 40 }}>{de ? 'Noch keine Fragen' : 'No questions yet'}</div>}

          {questions.map((q, i) => (
            <div key={q.id} style={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ color: COLORS.dim, fontSize: 13 }}>{i + 1}.</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: COLORS.text, fontWeight: 600 }}>{q.question}</div>
                  <div style={{ color: COLORS.dim, fontSize: 12, marginTop: 3 }}>
                    {q.question_type === 'stars' ? '⭐ Sterne (1-5)' : '💬 Freitext'}
                  </div>
                </div>
                <button style={s.toggleBtn(q.is_active)} onClick={() => toggleActive(q)}>
                  {q.is_active ? (de ? 'Aktiv' : 'Active') : (de ? 'Inaktiv' : 'Inactive')}
                </button>
                <button style={s.deleteBtn} onClick={() => deleteQuestion(q.id)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'results' && (
        <div>
          {loading && <div style={{ color: COLORS.dim, textAlign: 'center', padding: 40 }}>{t(lang, 'loading')}</div>}
          {!loading && responses.length === 0 && (
            <div style={{ color: COLORS.dim, textAlign: 'center', padding: 60 }}>
              <BarChart2 size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div>{de ? 'Noch keine Antworten' : 'No responses yet'}</div>
            </div>
          )}

          {/* Overall score */}
          {overallAvg() && (
            <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, fontWeight: 800, color: starColor(parseFloat(overallAvg())) }}>{overallAvg()}</div>
                <div style={{ color: COLORS.dim, fontSize: 12 }}>{de ? 'Gesamtbewertung' : 'Overall score'}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#F59E0B', fontSize: 24, letterSpacing: 2 }}>
                  {'★'.repeat(Math.round(parseFloat(overallAvg())))}{'☆'.repeat(5 - Math.round(parseFloat(overallAvg())))}
                </div>
                <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>
                  {de ? `Basierend auf ${responses.length} Bewertungen` : `Based on ${responses.length} responses`}
                </div>
              </div>
            </div>
          )}

          {/* Star questions */}
          {questions.filter(q => q.question_type === 'stars').map(q => {
            const avg = getAvg(q.id);
            const dist = getRatingDist(q.id);
            const total = Object.values(dist).reduce((a, b) => a + b, 0);
            return (
              <div key={q.id} style={s.card}>
                <div style={{ color: COLORS.muted, fontSize: 12, marginBottom: 8 }}>{q.question}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: starColor(avg) }}>{avg ? avg.toFixed(1) : '—'}</div>
                  <div>
                    <div style={{ color: '#F59E0B', fontSize: 18 }}>
                      {avg ? '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg)) : '☆☆☆☆☆'}
                    </div>
                    <div style={{ color: COLORS.dim, fontSize: 12 }}>{total} {de ? 'Bewertungen' : 'ratings'}</div>
                  </div>
                </div>
                {/* Distribution bars */}
                {[5, 4, 3, 2, 1].map(star => {
                  const count = dist[star] || 0;
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ color: '#F59E0B', fontSize: 12, width: 16 }}>{star}★</div>
                      <div style={{ flex: 1, height: 8, background: COLORS.bg, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: pct + '%', height: '100%', background: starColor(star), borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                      <div style={{ color: COLORS.dim, fontSize: 12, width: 24, textAlign: 'right' }}>{count}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Text questions */}
          {questions.filter(q => q.question_type === 'text').map(q => (
            <div key={q.id} style={s.card}>
              <div style={{ color: COLORS.text, fontWeight: 600, marginBottom: 12 }}>{q.question}</div>
              <div style={{ color: COLORS.dim, fontSize: 12, marginBottom: 12 }}>
                {responses.filter(r => r.answers?.[q.id]).length} {de ? 'Kommentare' : 'comments'}
              </div>
              {responses.filter(r => r.answers?.[q.id]).map(r => (
                <div key={r.id} style={{ background: COLORS.bg, borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  <div style={{ color: COLORS.dim, fontSize: 11, marginBottom: 6 }}>
                    {new Date(r.created_at).toLocaleString('de-DE')}
                  </div>
                  <div style={{ color: COLORS.text, fontSize: 14, lineHeight: 1.5 }}>{r.answers[q.id]}</div>
                </div>
              ))}
              {responses.filter(r => r.answers?.[q.id]).length === 0 && (
                <div style={{ color: COLORS.dim, fontSize: 13 }}>{de ? 'Noch keine Kommentare' : 'No comments yet'}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}