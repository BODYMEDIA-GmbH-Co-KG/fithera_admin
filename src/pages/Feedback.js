import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, X, GripVertical } from 'lucide-react';

const COLORS = {
  primary: '#8c368c', accent: '#e71f69', bg: '#f4f2f6', surface: '#ffffff',
  border: '#e6e2ec', text: '#1d1d1b', muted: '#6b6b76', dim: '#9a9aa5',
  green: '#0f9960', greenBg: '#e7f6ef',
};

const TYPES = [
  { value: 'stars',         label: 'Sterne (1-5)',        icon: '⭐' },
  { value: 'scale',         label: 'Skala (1-5)',         icon: '📊' },
  { value: 'single_choice', label: 'Einfachauswahl',      icon: '🔘' },
  { value: 'multi_choice',  label: 'Mehrfachauswahl',     icon: '☑️' },
  { value: 'text',          label: 'Freitext',            icon: '💬' },
];

const typeInfo = (value) => TYPES.find(t => t.value === value) || { label: value, icon: '❓' };
const isChoice = (type) => type === 'single_choice' || type === 'multi_choice';

const EMPTY = {
  question: '', question_type: 'stars', section: '', is_required: false,
  options: [], allow_other: false, scale_min_label: '', scale_max_label: '',
};

/** Stable slug for an option value. Generated once, never regenerated on edit. */
function slugify(label, taken) {
  const base = label
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24) || 'option';
  let value = base;
  let i = 2;
  while (taken.includes(value)) value = `${base}_${i++}`;
  return value;
}

export default function FeedbackQuestions() {
  const [eventId, setEventId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answerCounts, setAnswerCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setError(null);
    const { data: event, error: eventError } = await supabase
      .from('events').select('id').eq('is_active', true).maybeSingle();

    if (eventError || !event) {
      setError(eventError?.message || 'Kein aktives Event gefunden');
      setLoading(false);
      return;
    }
    setEventId(event.id);

    const [qRes, fRes] = await Promise.all([
      supabase.from('feedback_questions').select('*')
        .eq('event_id', event.id).order('sort_order', { ascending: true }),
      supabase.from('event_feedback').select('answers').eq('event_id', event.id).limit(5000),
    ]);

    if (qRes.error) { setError(qRes.error.message); setLoading(false); return; }
    setQuestions(qRes.data || []);

    // how many answers exist per question, so we can warn before deleting
    const counts = {};
    for (const row of fRes.data || []) {
      for (const qid of Object.keys(row.answers || {})) counts[qid] = (counts[qid] || 0) + 1;
    }
    setAnswerCounts(counts);
    setLoading(false);
  };

  const buildPayload = (d) => ({
    event_id: eventId,
    question: d.question.trim(),
    question_type: d.question_type,
    section: d.section.trim() || null,
    is_required: d.is_required,
    options: isChoice(d.question_type) ? d.options : [],
    allow_other: isChoice(d.question_type) ? d.allow_other : false,
    scale_min_label: d.question_type === 'scale' ? (d.scale_min_label.trim() || null) : null,
    scale_max_label: d.question_type === 'scale' ? (d.scale_max_label.trim() || null) : null,
  });

  const validate = (d) => {
    if (!d.question.trim()) return 'Bitte gib einen Fragetext ein.';
    if (isChoice(d.question_type) && d.options.length < 2) {
      return 'Auswahlfragen brauchen mindestens zwei Antwortoptionen.';
    }
    if (isChoice(d.question_type) && d.options.some(o => !o.label.trim())) {
      return 'Eine Antwortoption hat keinen Text.';
    }
    return null;
  };

  const addQuestion = async () => {
    const problem = validate(draft);
    if (problem) { setError(problem); return; }

    setSaving(true);
    const nextOrder = questions.length
      ? Math.max(...questions.map(q => q.sort_order || 0)) + 10
      : 10;

    const { error: insertError } = await supabase.from('feedback_questions').insert({
      ...buildPayload(draft),
      sort_order: nextOrder,
      is_active: true,
    });
    setSaving(false);

    if (insertError) { setError(insertError.message); return; }
    setDraft(EMPTY);
    setError(null);
    load();
  };

  const saveEdit = async (id, d) => {
    const problem = validate(d);
    if (problem) { setError(problem); return; }

    setSaving(true);
    const { error: updateError } = await supabase
      .from('feedback_questions').update(buildPayload(d)).eq('id', id);
    setSaving(false);

    if (updateError) { setError(updateError.message); return; }
    setEditingId(null);
    setError(null);
    load();
  };

  const toggleActive = async (q) => {
    await supabase.from('feedback_questions')
      .update({ is_active: !q.is_active }).eq('id', q.id);
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

  const remove = async (q) => {
    const answered = answerCounts[q.id] || 0;
    if (answered > 0) {
      window.alert(
        `Diese Frage hat bereits ${answered} Antworten. Löschen würde die Auswertung unbrauchbar machen, ` +
        `weil die Antworten dann keinen Fragetext mehr haben. Setze die Frage stattdessen auf Inaktiv.`
      );
      return;
    }
    if (!window.confirm(`"${q.question}" wirklich endgültig löschen?`)) return;
    await supabase.from('feedback_questions').delete().eq('id', q.id);
    load();
  };

  if (loading) {
    return <div style={{ color: COLORS.dim, textAlign: 'center', padding: 40 }}>Wird geladen...</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ color: COLORS.text, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        Feedback-Fragen
      </div>
      <div style={{ color: COLORS.dim, fontSize: 13, marginBottom: 20 }}>
        {questions.filter(q => q.is_active).length} aktiv von {questions.length} Fragen
      </div>

      {error && (
        <div style={{
          background: '#fdecf1', border: `1px solid ${COLORS.accent}`, color: COLORS.text,
          borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center',
        }}>
          <span>{error}</span>
          <X size={16} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => setError(null)} />
        </div>
      )}

      {/* ---------------- new question ---------------- */}
      <div style={{
        background: COLORS.surface, border: `1px solid ${COLORS.border}`,
        borderRadius: 12, padding: 18, marginBottom: 24,
      }}>
        <div style={{ color: COLORS.text, fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
          Neue Frage hinzufügen
        </div>
        <QuestionForm value={draft} onChange={setDraft} />
        <button
          onClick={addQuestion}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, marginTop: 14,
            background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 9,
            padding: '10px 16px', fontSize: 14, fontWeight: 600,
            cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1,
          }}
        >
          <Plus size={16} /> Frage hinzufügen
        </button>
      </div>

      {/* ---------------- list ---------------- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {questions.map((q, index) => (
          <QuestionRow
            key={q.id}
            question={q}
            index={index}
            total={questions.length}
            answered={answerCounts[q.id] || 0}
            editing={editingId === q.id}
            saving={saving}
            onEdit={() => { setEditingId(q.id); setError(null); }}
            onCancel={() => setEditingId(null)}
            onSave={d => saveEdit(q.id, d)}
            onToggleActive={() => toggleActive(q)}
            onMove={dir => move(index, dir)}
            onRemove={() => remove(q)}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function QuestionRow({
  question: q, index, total, answered, editing, saving,
  onEdit, onCancel, onSave, onToggleActive, onMove, onRemove,
}) {
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

  const info = typeInfo(q.question_type);

  return (
    <div style={{
      background: COLORS.surface, border: `1px solid ${COLORS.border}`,
      borderRadius: 12, padding: 14, opacity: q.is_active ? 1 : 0.6,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
          <button onClick={() => onMove(-1)} disabled={index === 0} style={iconBtn(index === 0)}>
            <ChevronUp size={15} />
          </button>
          <span style={{ color: COLORS.dim, fontSize: 11, fontWeight: 600 }}>{index + 1}</span>
          <button onClick={() => onMove(1)} disabled={index === total - 1} style={iconBtn(index === total - 1)}>
            <ChevronDown size={15} />
          </button>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: COLORS.text, fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>
            {q.question}
            {q.is_required && <span style={{ color: COLORS.accent }}> *</span>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 6 }}>
            <span style={{ color: COLORS.muted, fontSize: 12 }}>
              {info.icon} {info.label}
            </span>
            {q.section && (
              <span style={{ color: COLORS.dim, fontSize: 12 }}>· {q.section}</span>
            )}
            {isChoice(q.question_type) && (
              <span style={{ color: COLORS.dim, fontSize: 12 }}>
                · {(q.options || []).length} Optionen{q.allow_other ? ' + Sonstiges' : ''}
              </span>
            )}
            {answered > 0 && (
              <span style={{ color: COLORS.dim, fontSize: 12 }}>· {answered} Antworten</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={onToggleActive}
            style={{
              border: 'none', cursor: 'pointer', borderRadius: 7, padding: '5px 10px',
              fontSize: 12, fontWeight: 600,
              background: q.is_active ? COLORS.greenBg : COLORS.bg,
              color: q.is_active ? COLORS.green : COLORS.dim,
            }}
          >
            {q.is_active ? 'Aktiv' : 'Inaktiv'}
          </button>
          <button onClick={editing ? onCancel : onEdit} style={iconBtn(false)}>
            {editing ? <X size={15} /> : <Pencil size={15} />}
          </button>
          <button
            onClick={onRemove}
            title={answered > 0 ? 'Hat Antworten, bitte auf Inaktiv setzen' : 'Löschen'}
            style={{
              ...iconBtn(answered > 0),
              color: answered > 0 ? COLORS.dim : COLORS.accent,
              background: answered > 0 ? COLORS.bg : '#fdecf1',
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {editing && local && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${COLORS.border}` }}>
          <QuestionForm value={local} onChange={setLocal} lockType={answered > 0} />
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button
              onClick={() => onSave(local)}
              disabled={saving}
              style={{
                background: COLORS.primary, color: '#fff', border: 'none', borderRadius: 8,
                padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Speichern
            </button>
            <button
              onClick={onCancel}
              style={{
                background: COLORS.bg, color: COLORS.muted, border: 'none', borderRadius: 8,
                padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function QuestionForm({ value: d, onChange, lockType = false }) {
  const set = (patch) => onChange({ ...d, ...patch });

  const addOption = () => {
    const taken = d.options.map(o => o.value);
    set({ options: [...d.options, { value: slugify('option', taken), label: '' }] });
  };

  const updateOptionLabel = (i, label) => {
    const next = [...d.options];
    // value stays fixed once created, otherwise saved answers lose their key
    next[i] = { ...next[i], label };
    if (!next[i].value || next[i].value.startsWith('option')) {
      const taken = next.filter((_, j) => j !== i).map(o => o.value);
      next[i].value = slugify(label || 'option', taken);
    }
    set({ options: next });
  };

  const removeOption = (i) => set({ options: d.options.filter((_, j) => j !== i) });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <textarea
        value={d.question}
        onChange={e => set({ question: e.target.value })}
        placeholder="z.B. Wie bewertest du die Organisation?"
        rows={2}
        style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }}
      />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ flex: '1 1 200px' }}>
          <div style={labelStyle}>Fragetyp</div>
          <select
            value={d.question_type}
            disabled={lockType}
            onChange={e => set({ question_type: e.target.value })}
            style={{ ...input, cursor: lockType ? 'not-allowed' : 'pointer', opacity: lockType ? 0.6 : 1 }}
          >
            {TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
          {lockType && (
            <div style={{ color: COLORS.dim, fontSize: 11, marginTop: 4 }}>
              Typ gesperrt, es gibt bereits Antworten zu dieser Frage.
            </div>
          )}
        </label>

        <label style={{ flex: '1 1 200px' }}>
          <div style={labelStyle}>Abschnitt (optional)</div>
          <input
            value={d.section}
            onChange={e => set({ section: e.target.value })}
            placeholder="z.B. Programm"
            style={input}
          />
        </label>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={d.is_required}
          onChange={e => set({ is_required: e.target.checked })}
          style={{ width: 16, height: 16, accentColor: COLORS.primary }}
        />
        <span style={{ fontSize: 13, color: COLORS.text }}>Pflichtfrage</span>
      </label>

      {d.question_type === 'scale' && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 180px' }}>
            <div style={labelStyle}>Label für 1</div>
            <input
              value={d.scale_min_label}
              onChange={e => set({ scale_min_label: e.target.value })}
              placeholder="z.B. auf keinen Fall"
              style={input}
            />
          </label>
          <label style={{ flex: '1 1 180px' }}>
            <div style={labelStyle}>Label für 5</div>
            <input
              value={d.scale_max_label}
              onChange={e => set({ scale_max_label: e.target.value })}
              placeholder="z.B. auf jeden Fall"
              style={input}
            />
          </label>
        </div>
      )}

      {isChoice(d.question_type) && (
        <div>
          <div style={labelStyle}>Antwortoptionen</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {d.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <GripVertical size={14} color={COLORS.dim} style={{ flexShrink: 0 }} />
                <input
                  value={opt.label}
                  onChange={e => updateOptionLabel(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  style={{ ...input, flex: 1 }}
                />
                <button onClick={() => removeOption(i)} style={{ ...iconBtn(false), color: COLORS.accent }}>
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addOption}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, marginTop: 8,
              background: 'none', border: `1px dashed ${COLORS.border}`, borderRadius: 8,
              padding: '7px 12px', fontSize: 13, fontWeight: 600,
              color: COLORS.primary, cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Option hinzufügen
          </button>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={d.allow_other}
              onChange={e => set({ allow_other: e.target.checked })}
              style={{ width: 16, height: 16, accentColor: COLORS.primary }}
            />
            <span style={{ fontSize: 13, color: COLORS.text }}>
              "Sonstiges" mit Textfeld anbieten
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const input = {
  width: '100%', boxSizing: 'border-box', background: COLORS.bg,
  border: `1px solid ${COLORS.border}`, borderRadius: 9, padding: '10px 12px',
  fontSize: 14, color: COLORS.text, outline: 'none',
};

const labelStyle = {
  fontSize: 12, fontWeight: 600, color: COLORS.muted, marginBottom: 5,
};

const iconBtn = (disabled) => ({
  background: COLORS.bg, border: 'none', borderRadius: 7, padding: 6,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: COLORS.muted, cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.35 : 1,
});