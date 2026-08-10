import { useState, useEffect, useContext, useMemo } from 'react';
import { supabase, t } from '../lib/supabase';
import { LangContext, EventContext } from '../App';
import toast from 'react-hot-toast';
import { Plus, Trash2, Download, BarChart2, Pencil, X, ChevronUp, ChevronDown } from 'lucide-react';

const COLORS = { primary: '#8c368c', accent: '#e71f69', bg: '#f4f2f6', surface: '#ffffff', border: '#e6e2ec', text: '#1d1d1b', muted: '#6b6b76', dim: '#9a9aa5' };

const TYPES = [
  { value: 'stars',         icon: '⭐', de: 'Sterne (1-5)',    en: 'Stars (1-5)' },
  { value: 'scale',         icon: '📊', de: 'Skala (1-5)',     en: 'Scale (1-5)' },
  { value: 'single_choice', icon: '🔘', de: 'Einfachauswahl',  en: 'Single choice' },
  { value: 'multi_choice',  icon: '☑️', de: 'Mehrfachauswahl', en: 'Multiple choice' },
  { value: 'text',          icon: '💬', de: 'Freitext',        en: 'Text' },
];

const typeLabel = (value, de) => {
  const info = TYPES.find(x => x.value === value);
  return info ? `${info.icon} ${de ? info.de : info.en}` : `❓ ${value}`;
};

const isChoice = (type) => type === 'single_choice' || type === 'multi_choice';
const isNumeric = (type) => type === 'stars' || type === 'scale';

const EMPTY = {
  question: '', question_type: 'stars', section: '', is_required: false,
  options: [], allow_other: false, scale_min_label: '', scale_max_label: '',
};

function slugify(label, taken) {
  const base = label.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'option';
  let value = base;
  let i = 2;
  while (taken.includes(value)) value = `${base}_${i++}`;
  return value;
}

export default function EventFeedback() {
  const lang = useContext(LangContext);
  const event = useContext(EventContext);
  const de = lang === 'de';

  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [tab, setTab] = useState('questions');
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);

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

  // how many answers exist per question, so we never orphan them
  const answerCounts = useMemo(() => {
    const counts = {};
    for (const r of responses) {
      for (const [qid, v] of Object.entries(r.answers || {})) {
        if (v === null || v === undefined || v === '') continue;
        counts[qid] = (counts[qid] || 0) + 1;
      }
    }
    return counts;
  }, [responses]);

  /* ---------------- CRUD ---------------- */

  const validate = (d) => {
    if (!d.question.trim()) return de ? 'Frage ist erforderlich' : 'Question is required';
    if (isChoice(d.question_type) && d.options.length < 2) {
      return de ? 'Auswahlfragen brauchen mindestens zwei Optionen' : 'Choice questions need at least two options';
    }
    if (isChoice(d.question_type) && d.options.some(o => !o.label.trim())) {
      return de ? 'Eine Option hat keinen Text' : 'An option has no text';
    }
    return null;
  };

  const payload = (d) => ({
    question: d.question.trim(),
    question_type: d.question_type,
    section: d.section.trim() || null,
    is_required: d.is_required,
    options: isChoice(d.question_type) ? d.options : [],
    allow_other: isChoice(d.question_type) ? d.allow_other : false,
    scale_min_label: d.question_type === 'scale' ? (d.scale_min_label.trim() || null) : null,
    scale_max_label: d.question_type === 'scale' ? (d.scale_max_label.trim() || null) : null,
  });

  const addQuestion = async () => {
    const problem = validate(draft);
    if (problem) { toast.error(problem); return; }

    // keep the 10 step spacing from the seed, so new questions land at the end
    const nextOrder = questions.length ? Math.max(...questions.map(q => q.sort_order || 0)) + 10 : 10;

    const { error } = await supabase.from('feedback_questions').insert({
      ...payload(draft), event_id: event.id, sort_order: nextOrder, is_active: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(de ? 'Frage hinzugefügt!' : 'Question added!');
    setDraft(EMPTY);
    load();
  };

  const saveEdit = async (id, d) => {
    const problem = validate(d);
    if (problem) { toast.error(problem); return; }
    const { error } = await supabase.from('feedback_questions').update(payload(d)).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(de ? 'Gespeichert!' : 'Saved!');
    setEditingId(null);
    load();
  };

  const deleteQuestion = async (q) => {
    const answered = answerCounts[q.id] || 0;
    if (answered > 0) {
      toast.error(de
        ? `Diese Frage hat ${answered} Antworten. Bitte auf Inaktiv setzen statt löschen.`
        : `This question has ${answered} answers. Set it to inactive instead of deleting.`);
      return;
    }
    if (!window.confirm(t(lang, 'confirm_delete'))) return;
    await supabase.from('feedback_questions').delete().eq('id', q.id);
    toast.success(t(lang, 'deleted'));
    load();
  };

  const toggleActive = async (q) => {
    await supabase.from('feedback_questions').update({ is_active: !q.is_active }).eq('id', q.id);
    load();
  };

  const move = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const a = questions[index];
    const b = questions[target];
    await Promise.all([
      supabase.from('feedback_questions').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('feedback_questions').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    load();
  };

  /* ---------------- results helpers ---------------- */

  const numericValues = (questionId) =>
    responses.map(r => r.answers?.[questionId]).filter(v => typeof v === 'number' && v > 0);

  const getAvg = (questionId) => {
    const vals = numericValues(questionId);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const getDist = (questionId) => {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    numericValues(questionId).forEach(v => { if (v >= 1 && v <= 5) dist[v]++; });
    return dist;
  };

  const overallAvg = () => {
    const ids = questions.filter(q => isNumeric(q.question_type)).map(q => q.id);
    const all = ids.flatMap(id => numericValues(id));
    return all.length ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(1) : null;
  };

  const flatten = (value, q) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      const opts = Array.isArray(q?.options) ? q.options : [];
      const labels = (value.options || []).map(v => {
        const opt = opts.find(o => o.value === v);
        return opt ? opt.label : v === 'other' ? 'Sonstiges' : v;
      });
      return value.text ? `${labels.join(' | ')} :: ${value.text}` : labels.join(' | ');
    }
    return String(value);
  };

  const exportCSV = () => {
    if (responses.length === 0) {
      toast.error(de ? 'Keine Antworten zum Exportieren' : 'No responses to export');
      return;
    }
    const cols = [...questions].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const headers = ['Datum', ...cols.map(q => q.question)];
    const rows = responses.map(r => [
      new Date(r.created_at).toLocaleString('de-DE'),
      ...cols.map(q => flatten(r.answers?.[q.id], q)),
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    // BOM so Excel opens the umlauts correctly
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `fithera-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(de ? 'CSV exportiert!' : 'CSV exported!');
  };

  const starColor = (avg) => {
    if (!avg) return COLORS.dim;
    if (avg >= 4.5) return '#22c55e';
    if (avg >= 3.5) return '#f59e0b';
    return COLORS.accent;
  };

  /* ---------------- render ---------------- */

  const activeCount = questions.filter(q => q.is_active).length;

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ color: COLORS.text, fontSize: 22, fontWeight: 700 }}>Event Feedback</div>
          <div style={{ color: COLORS.dim, fontSize: 13, marginTop: 4 }}>
            {responses.length} {de ? 'Antworten' : 'responses'} · {activeCount}/{questions.length} {de ? 'Fragen aktiv' : 'questions active'}
          </div>
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

      {/* ============ QUESTIONS ============ */}
      {tab === 'questions' && (
        <div>
          <div style={{ ...s.card, marginBottom: 20 }}>
            <div style={{ color: COLORS.text, fontWeight: 600, marginBottom: 14 }}>
              {de ? 'Neue Frage hinzufügen' : 'Add new question'}
            </div>
            <QuestionForm value={draft} onChange={setDraft} de={de} />
            <button style={{ ...s.addBtn, marginTop: 14 }} onClick={addQuestion}>
              <Plus size={16} />{de ? 'Frage hinzufügen' : 'Add question'}
            </button>
          </div>

          {loading && <div style={{ color: COLORS.dim, textAlign: 'center', padding: 40 }}>{t(lang, 'loading')}</div>}
          {!loading && questions.length === 0 && (
            <div style={{ color: COLORS.dim, textAlign: 'center', padding: 40 }}>
              {de ? 'Noch keine Fragen' : 'No questions yet'}
            </div>
          )}

          {questions.map((q, i) => (
            <QuestionRow
              key={q.id}
              q={q}
              index={i}
              total={questions.length}
              answered={answerCounts[q.id] || 0}
              de={de}
              lang={lang}
              editing={editingId === q.id}
              onEdit={() => setEditingId(q.id)}
              onCancel={() => setEditingId(null)}
              onSave={d => saveEdit(q.id, d)}
              onToggleActive={() => toggleActive(q)}
              onMove={dir => move(i, dir)}
              onDelete={() => deleteQuestion(q)}
            />
          ))}
        </div>
      )}

      {/* ============ RESULTS ============ */}
      {tab === 'results' && (
        <div>
          {loading && <div style={{ color: COLORS.dim, textAlign: 'center', padding: 40 }}>{t(lang, 'loading')}</div>}
          {!loading && responses.length === 0 && (
            <div style={{ color: COLORS.dim, textAlign: 'center', padding: 60 }}>
              <BarChart2 size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div>{de ? 'Noch keine Antworten' : 'No responses yet'}</div>
            </div>
          )}

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
                  {de ? `Basierend auf ${responses.length} Antworten` : `Based on ${responses.length} responses`}
                </div>
              </div>
            </div>
          )}

          {responses.length > 0 && questions.map(q => {
            const answered = answerCounts[q.id] || 0;

            if (isNumeric(q.question_type)) {
              const avg = getAvg(q.id);
              const dist = getDist(q.id);
              const total = Object.values(dist).reduce((a, b) => a + b, 0);
              return (
                <div key={q.id} style={s.card}>
                  <ResultHeader q={q} answered={answered} de={de} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '12px 0 16px' }}>
                    <div style={{ fontSize: 36, fontWeight: 800, color: starColor(avg) }}>{avg ? avg.toFixed(1) : '-'}</div>
                    <div>
                      <div style={{ color: '#F59E0B', fontSize: 18 }}>
                        {avg ? '★'.repeat(Math.round(avg)) + '☆'.repeat(5 - Math.round(avg)) : '☆☆☆☆☆'}
                      </div>
                      <div style={{ color: COLORS.dim, fontSize: 12 }}>{total} {de ? 'Bewertungen' : 'ratings'}</div>
                    </div>
                  </div>
                  {[5, 4, 3, 2, 1].map(step => {
                    const count = dist[step] || 0;
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ color: COLORS.muted, fontSize: 12, width: 18 }}>
                          {q.question_type === 'stars' ? `${step}★` : step}
                        </div>
                        <div style={{ flex: 1, height: 8, background: COLORS.bg, borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: pct + '%', height: '100%', background: starColor(step), borderRadius: 4, transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ color: COLORS.dim, fontSize: 12, width: 24, textAlign: 'right' }}>{count}</div>
                      </div>
                    );
                  })}
                  {(q.scale_min_label || q.scale_max_label) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: COLORS.dim, fontSize: 11, marginTop: 8, paddingLeft: 26 }}>
                      <span>1 = {q.scale_min_label}</span>
                      <span>5 = {q.scale_max_label}</span>
                    </div>
                  )}
                </div>
              );
            }

            if (isChoice(q.question_type)) {
              const opts = Array.isArray(q.options) ? q.options : [];
              const counts = new Map(opts.map(o => [o.value, 0]));
              const otherTexts = [];
              let answeredHere = 0;

              for (const r of responses) {
                const v = r.answers?.[q.id];
                if (!v || typeof v !== 'object' || !(v.options || []).length) continue;
                answeredHere++;
                for (const picked of v.options) counts.set(picked, (counts.get(picked) || 0) + 1);
                if (v.options.includes('other') && v.text) otherTexts.push({ text: v.text, at: r.created_at });
              }

              const rows = [...counts.entries()].map(([value, n]) => {
                const opt = opts.find(o => o.value === value);
                return { value, n, label: opt ? opt.label : value === 'other' ? (de ? 'Sonstiges' : 'Other') : value };
              }).sort((a, b) => b.n - a.n);

              return (
                <div key={q.id} style={s.card}>
                  <ResultHeader q={q} answered={answeredHere} de={de} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                    {rows.map(r => (
                      <div key={r.value}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 3 }}>
                          <span style={{ color: COLORS.text, fontSize: 13 }}>{r.label}</span>
                          <span style={{ color: COLORS.dim, fontSize: 12, whiteSpace: 'nowrap' }}>
                            {r.n} ({answeredHere ? Math.round((r.n / answeredHere) * 100) : 0}%)
                          </span>
                        </div>
                        <div style={{ height: 8, background: COLORS.bg, borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${answeredHere ? (r.n / answeredHere) * 100 : 0}%`, height: '100%', background: COLORS.accent, borderRadius: 4, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {otherTexts.length > 0 && (
                    <details style={{ marginTop: 14 }}>
                      <summary style={{ color: COLORS.primary, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        {de ? `Sonstiges im Detail (${otherTexts.length})` : `Other in detail (${otherTexts.length})`}
                      </summary>
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {otherTexts.map((o, idx) => (
                          <div key={idx} style={{ background: COLORS.bg, borderRadius: 8, padding: '8px 12px' }}>
                            <div style={{ color: COLORS.text, fontSize: 13 }}>{o.text}</div>
                            <div style={{ color: COLORS.dim, fontSize: 11, marginTop: 4 }}>
                              {new Date(o.at).toLocaleString('de-DE')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              );
            }

            // text
            const comments = responses.filter(r => typeof r.answers?.[q.id] === 'string' && r.answers[q.id].trim());
            return (
              <div key={q.id} style={s.card}>
                <ResultHeader q={q} answered={comments.length} de={de} unit={de ? 'Kommentare' : 'comments'} />
                <div style={{ marginTop: 12 }}>
                  {comments.map(r => (
                    <div key={r.id} style={{ background: COLORS.bg, borderRadius: 8, padding: 12, marginBottom: 8 }}>
                      <div style={{ color: COLORS.dim, fontSize: 11, marginBottom: 6 }}>
                        {new Date(r.created_at).toLocaleString('de-DE')}
                      </div>
                      <div style={{ color: COLORS.text, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {r.answers[q.id]}
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <div style={{ color: COLORS.dim, fontSize: 13 }}>{de ? 'Noch keine Kommentare' : 'No comments yet'}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================= subcomponents ================= */

function ResultHeader({ q, answered, de, unit }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
      <div>
        <div style={{ color: COLORS.text, fontWeight: 600, fontSize: 14 }}>{q.question}</div>
        {q.section && <div style={{ color: COLORS.dim, fontSize: 11, marginTop: 3 }}>{q.section}</div>}
      </div>
      <div style={{ color: COLORS.dim, fontSize: 11, whiteSpace: 'nowrap', paddingTop: 2 }}>
        {answered} {unit || (de ? 'Antworten' : 'answers')}
      </div>
    </div>
  );
}

function QuestionRow({ q, index, total, answered, de, lang, editing, onEdit, onCancel, onSave, onToggleActive, onMove, onDelete }) {
  const [local, setLocal] = useState(null);

  useEffect(() => {
    if (editing) {
      setLocal({
        question: q.question || '',
        question_type: q.question_type,
        section: q.section || '',
        is_required: !!q.is_required,
        options: Array.isArray(q.options) ? q.options : [],
        allow_other: !!q.allow_other,
        scale_min_label: q.scale_min_label || '',
        scale_max_label: q.scale_max_label || '',
      });
    }
  }, [editing, q]);

  return (
    <div style={{ ...s.card, opacity: q.is_active ? 1 : 0.6 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
          <button style={s.iconBtn(index === 0)} disabled={index === 0} onClick={() => onMove(-1)}>
            <ChevronUp size={14} />
          </button>
          <span style={{ color: COLORS.dim, fontSize: 11, fontWeight: 600 }}>{index + 1}</span>
          <button style={s.iconBtn(index === total - 1)} disabled={index === total - 1} onClick={() => onMove(1)}>
            <ChevronDown size={14} />
          </button>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: COLORS.text, fontWeight: 600, lineHeight: 1.4 }}>
            {q.question}
            {q.is_required && <span style={{ color: COLORS.accent }}> *</span>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, color: COLORS.dim, fontSize: 12, marginTop: 4 }}>
            <span>{typeLabel(q.question_type, de)}</span>
            {q.section && <span>· {q.section}</span>}
            {isChoice(q.question_type) && (
              <span>· {(q.options || []).length} {de ? 'Optionen' : 'options'}{q.allow_other ? (de ? ' + Sonstiges' : ' + other') : ''}</span>
            )}
            {answered > 0 && <span>· {answered} {de ? 'Antworten' : 'answers'}</span>}
          </div>
        </div>

        <button style={s.toggleBtn(q.is_active)} onClick={onToggleActive}>
          {q.is_active ? (de ? 'Aktiv' : 'Active') : (de ? 'Inaktiv' : 'Inactive')}
        </button>
        <button style={s.iconBtn(false)} onClick={editing ? onCancel : onEdit}>
          {editing ? <X size={14} /> : <Pencil size={14} />}
        </button>
        <button
          style={{ ...s.deleteBtn, opacity: answered > 0 ? 0.4 : 1 }}
          onClick={onDelete}
          title={answered > 0 ? (de ? 'Hat Antworten, bitte auf Inaktiv setzen' : 'Has answers, set inactive instead') : ''}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {editing && local && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${COLORS.border}` }}>
          <QuestionForm value={local} onChange={setLocal} de={de} lockType={answered > 0} />
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button style={s.addBtn} onClick={() => onSave(local)}>{t(lang, 'save') || (de ? 'Speichern' : 'Save')}</button>
            <button style={s.cancelBtn} onClick={onCancel}>{de ? 'Abbrechen' : 'Cancel'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionForm({ value: d, onChange, de, lockType = false }) {
  const set = (patch) => onChange({ ...d, ...patch });

  const addOption = () => {
    const taken = d.options.map(o => o.value);
    set({ options: [...d.options, { value: slugify('option', taken), label: '' }] });
  };

  const updateOption = (i, label) => {
    const next = [...d.options];
    next[i] = { ...next[i], label };
    // the value slug is only derived while it is still a placeholder,
    // so renaming a live option never breaks stored answers
    if (!next[i].value || next[i].value.startsWith('option')) {
      const taken = next.filter((_, j) => j !== i).map(o => o.value);
      next[i].value = slugify(label || 'option', taken);
    }
    set({ options: next });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <textarea
        style={{ ...s.input, resize: 'vertical', fontFamily: 'inherit' }}
        rows={2}
        value={d.question}
        onChange={e => set({ question: e.target.value })}
        placeholder={de ? 'z.B. Wie bewertest du die Organisation?' : 'e.g. How do you rate the organization?'}
      />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <div style={s.label}>{de ? 'Fragetyp' : 'Question type'}</div>
          <select
            style={{ ...s.input, cursor: lockType ? 'not-allowed' : 'pointer', opacity: lockType ? 0.6 : 1 }}
            value={d.question_type}
            disabled={lockType}
            onChange={e => set({ question_type: e.target.value })}
          >
            {TYPES.map(ty => (
              <option key={ty.value} value={ty.value}>{ty.icon} {de ? ty.de : ty.en}</option>
            ))}
          </select>
          {lockType && (
            <div style={{ color: COLORS.dim, fontSize: 11, marginTop: 4 }}>
              {de ? 'Typ gesperrt, es gibt bereits Antworten.' : 'Type locked, answers already exist.'}
            </div>
          )}
        </div>

        <div style={{ flex: '1 1 200px' }}>
          <div style={s.label}>{de ? 'Abschnitt (optional)' : 'Section (optional)'}</div>
          <input
            style={s.input}
            value={d.section}
            onChange={e => set({ section: e.target.value })}
            placeholder={de ? 'z.B. Programm' : 'e.g. Programme'}
          />
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={d.is_required}
          onChange={e => set({ is_required: e.target.checked })}
          style={{ width: 16, height: 16, accentColor: COLORS.primary }}
        />
        <span style={{ fontSize: 13, color: COLORS.text }}>{de ? 'Pflichtfrage' : 'Required'}</span>
      </label>

      {d.question_type === 'scale' && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 180px' }}>
            <div style={s.label}>{de ? 'Label für 1' : 'Label for 1'}</div>
            <input style={s.input} value={d.scale_min_label}
              onChange={e => set({ scale_min_label: e.target.value })}
              placeholder={de ? 'z.B. auf keinen Fall' : 'e.g. definitely not'} />
          </div>
          <div style={{ flex: '1 1 180px' }}>
            <div style={s.label}>{de ? 'Label für 5' : 'Label for 5'}</div>
            <input style={s.input} value={d.scale_max_label}
              onChange={e => set({ scale_max_label: e.target.value })}
              placeholder={de ? 'z.B. auf jeden Fall' : 'e.g. definitely'} />
          </div>
        </div>
      )}

      {isChoice(d.question_type) && (
        <div>
          <div style={s.label}>{de ? 'Antwortoptionen' : 'Answer options'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {d.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  style={{ ...s.input, flex: 1 }}
                  value={opt.label}
                  onChange={e => updateOption(i, e.target.value)}
                  placeholder={`${de ? 'Option' : 'Option'} ${i + 1}`}
                />
                <button style={s.deleteBtn} onClick={() => set({ options: d.options.filter((_, j) => j !== i) })}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <button style={s.dashedBtn} onClick={addOption}>
            <Plus size={14} /> {de ? 'Option hinzufügen' : 'Add option'}
          </button>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={d.allow_other}
              onChange={e => set({ allow_other: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: COLORS.primary }}
            />
            <span style={{ fontSize: 13, color: COLORS.text }}>
              {de ? '"Sonstiges" mit Textfeld anbieten' : 'Offer "Other" with a text field'}
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

/* ================= styles ================= */

const s = {
  page: { padding: 24 },
  tabs: { display: 'flex', gap: 8, marginBottom: 20 },
  tab: (active) => ({ padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, background: active ? `${COLORS.primary}33` : COLORS.surface, color: active ? COLORS.primary : COLORS.muted, borderColor: active ? COLORS.primary : 'transparent', borderWidth: 1, borderStyle: 'solid' }),
  card: { background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16, marginBottom: 12 },
  input: { width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '10px 12px', color: COLORS.text, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  label: { fontSize: 12, fontWeight: 600, color: COLORS.muted, marginBottom: 5 },
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  cancelBtn: { padding: '10px 20px', background: COLORS.bg, color: COLORS.muted, border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  dashedBtn: { display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '7px 12px', background: 'none', border: `1px dashed ${COLORS.border}`, borderRadius: 8, color: COLORS.primary, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  exportBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  deleteBtn: { background: COLORS.accent + '22', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: COLORS.accent, display: 'flex', alignItems: 'center' },
  toggleBtn: (active) => ({ padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: active ? '#22c55e22' : '#9a9aa522', color: active ? '#22c55e' : COLORS.dim, flexShrink: 0 }),
  iconBtn: (disabled) => ({ background: COLORS.bg, border: 'none', borderRadius: 6, padding: 5, cursor: disabled ? 'default' : 'pointer', color: COLORS.muted, opacity: disabled ? 0.35 : 1, display: 'flex', alignItems: 'center' }),
};