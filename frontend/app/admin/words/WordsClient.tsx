'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Pencil, EyeOff, Eye, Search, ChevronLeft, ChevronRight, X, RefreshCw,
} from 'lucide-react';
import { editWord, deactivateWord, reactivateWord } from './actions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Word {
  id: string;
  word: string;
  category: string;
  grade_band: string[];
  part_of_speech: string | null;
  meaning_type: string | null;
  app_level: string | null;
  meaning_complexity: number | null;
  spelling_complexity: number | null;
  morph_complexity: number | null;
  suggested_exercises: string | null;
  spelling_tag: string | null;
  primary_skill: string | null;
  balarhai_unknown: boolean | null;
  is_active: boolean;
}

export interface WordMeta {
  page: number;
  per_page: number;
  total: number;
  has_next: boolean;
}

export interface WordFacets {
  grades: string[];
  categories: string[];
  app_levels: string[];
}

interface ActiveFilters {
  grade?: string;
  category?: string;
  q?: string;
}

interface WordsClientProps {
  initialWords: Word[];
  initialMeta: WordMeta;
  facets: WordFacets;
  activeFilters: ActiveFilters;
}

// ─── Edit form ────────────────────────────────────────────────────────────────

interface EditForm {
  word: string;
  category: string;
  part_of_speech: string;
  meaning_type: string;
  app_level: string;
  grade_band: string[];
  spelling_tag: string;
  suggested_exercises: string;
  meaning_complexity: string;
  spelling_complexity: string;
  morph_complexity: string;
}

const GRADES = ['G1', 'G2', 'G3', 'G4'];
const REDERIVE_TRIGGER = new Set(['word', 'part_of_speech', 'meaning_type']);

function wordToForm(w: Word): EditForm {
  return {
    word: w.word,
    category: w.category ?? '',
    part_of_speech: w.part_of_speech ?? '',
    meaning_type: w.meaning_type ?? '',
    app_level: w.app_level ?? '',
    grade_band: w.grade_band ?? [],
    spelling_tag: w.spelling_tag ?? '',
    suggested_exercises: w.suggested_exercises ?? '',
    meaning_complexity: w.meaning_complexity?.toString() ?? '',
    spelling_complexity: w.spelling_complexity?.toString() ?? '',
    morph_complexity: w.morph_complexity?.toString() ?? '',
  };
}

function formToUpdates(
  form: EditForm,
  original: Word,
  dirty: Set<string>,
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  if (dirty.has('word')) updates.word = form.word.trim();
  if (dirty.has('category')) updates.category = form.category;
  if (dirty.has('part_of_speech')) updates.part_of_speech = form.part_of_speech || null;
  if (dirty.has('meaning_type')) updates.meaning_type = form.meaning_type || null;
  if (dirty.has('app_level')) updates.app_level = form.app_level || null;
  if (dirty.has('grade_band')) updates.grade_band = form.grade_band;
  if (dirty.has('spelling_tag')) updates.spelling_tag = form.spelling_tag || null;
  if (dirty.has('suggested_exercises')) updates.suggested_exercises = form.suggested_exercises || null;
  if (dirty.has('meaning_complexity'))
    updates.meaning_complexity = form.meaning_complexity ? parseInt(form.meaning_complexity, 10) : null;
  if (dirty.has('spelling_complexity'))
    updates.spelling_complexity = form.spelling_complexity ? parseInt(form.spelling_complexity, 10) : null;
  if (dirty.has('morph_complexity'))
    updates.morph_complexity = form.morph_complexity ? parseInt(form.morph_complexity, 10) : null;
  return updates;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const C = {
  primary: '#01618F',
  primaryMid: '#31B2FB',
  text: '#405E7E',
  textLight: '#7A9BB5',
  border: '#E9F1FF',
  bg: '#F7FAFF',
  bgAlt: '#F3F6FF',
  green: '#76CE79',
  red: '#FB5151',
  white: '#ffffff',
} as const;

const font = 'var(--font-geist-sans), sans-serif';

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 7px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 600,
        background: color + '1a',
        color,
        fontFamily: font,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

function IconBtn({
  onClick,
  title,
  children,
  danger,
  disabled,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '30px',
        height: '30px',
        borderRadius: '7px',
        border: 'none',
        background: 'transparent',
        color: disabled ? '#c0ccd8' : danger ? C.red : C.textLight,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.12s, color 0.12s',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.background = danger ? '#FFF0F0' : C.bgAlt;
          (e.currentTarget as HTMLButtonElement).style.color = danger ? C.red : C.primary;
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = disabled ? '#c0ccd8' : danger ? C.red : C.textLight;
      }}
    >
      {children}
    </button>
  );
}

function FormField({
  label,
  hint,
  children,
  rederives,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  rederives?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label
        style={{
          fontFamily: font,
          fontSize: '12px',
          fontWeight: 600,
          color: C.text,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {label}
        {rederives && (
          <span
            title="Энэ талбарыг өөрчлөхөд чадварын баганууд дахин тооцоологдоно"
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: C.primaryMid,
              background: C.primaryMid + '1a',
              padding: '1px 5px',
              borderRadius: '4px',
            }}
          >
            ↺ re-derives
          </span>
        )}
      </label>
      {children}
      {hint && (
        <span style={{ fontFamily: font, fontSize: '11px', color: C.textLight }}>{hint}</span>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 11px',
  borderRadius: '8px',
  border: `1.5px solid ${C.border}`,
  fontFamily: font,
  fontSize: '13px',
  color: C.text,
  background: C.white,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function WordsClient({
  initialWords,
  initialMeta,
  facets,
  activeFilters,
}: WordsClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Local word list — updated optimistically on mutations
  const [words, setWords] = useState<Word[]>(initialWords);
  const [meta] = useState<WordMeta>(initialMeta);

  // Filter state (controlled inputs, applied on submit/change)
  const [search, setSearch] = useState(activeFilters.q ?? '');
  const [gradeFilter, setGradeFilter] = useState(activeFilters.grade ?? '');

  // Edit modal
  const [editTarget, setEditTarget] = useState<Word | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [isSaving, startSaving] = useTransition();

  // Deactivate confirm
  const [confirmWord, setConfirmWord] = useState<Word | null>(null);
  const [isActioning, startActioning] = useTransition();
  const [actionErr, setActionErr] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  // ─── Navigation helpers ───────────────────────────────────────────────────

  function navigate(params: Record<string, string | undefined>) {
    const qs = new URLSearchParams();
    const merged = { grade: gradeFilter, q: search, page: '1', ...params };
    if (merged.grade) qs.set('grade', merged.grade);
    if (merged.q) qs.set('q', merged.q);
    if (merged.page && merged.page !== '1') qs.set('page', merged.page);
    router.push(`${pathname}?${qs.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ q: search, page: '1' });
  }

  function handleGradeChange(g: string) {
    setGradeFilter(g);
    navigate({ grade: g, page: '1' });
  }

  // ─── Edit modal ───────────────────────────────────────────────────────────

  function openEdit(w: Word) {
    setEditTarget(w);
    setForm(wordToForm(w));
    setDirty(new Set());
    setSaveErr(null);
    setSaveOk(false);
  }

  function closeEdit() {
    setEditTarget(null);
    setForm(null);
  }

  function setField<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
    setDirty((prev) => new Set(prev).add(key));
    setSaveErr(null);
    setSaveOk(false);
  }

  function handleSave() {
    if (!editTarget || !form || dirty.size === 0) return;
    const updates = formToUpdates(form, editTarget, dirty);
    if (Object.keys(updates).length === 0) return;

    startSaving(async () => {
      const res = await editWord(editTarget.id, updates);
      if (!res.ok) {
        setSaveErr(res.error);
        return;
      }
      // Optimistic update
      setWords((prev) =>
        prev.map((w) =>
          w.id === editTarget.id
            ? {
                ...w,
                ...(updates as Partial<Word>),
                // clear derived field display if re-derived (data is stale until nav)
              }
            : w,
        ),
      );
      setSaveOk(true);
      setSaveErr(null);
      // Auto-close after brief confirmation
      setTimeout(closeEdit, 700);
    });
  }

  // ─── Deactivate / Reactivate ──────────────────────────────────────────────

  function handleDeactivate(w: Word) {
    setConfirmWord(w);
    setActionErr(null);
  }

  function confirmDeactivate() {
    if (!confirmWord) return;
    const target = confirmWord;
    setConfirmWord(null);
    startActioning(async () => {
      const res = await deactivateWord(target.id);
      if (!res.ok) {
        setActionErr(res.error);
        return;
      }
      setWords((prev) => prev.map((w) => w.id === target.id ? { ...w, is_active: false } : w));
    });
  }

  function handleReactivate(w: Word) {
    startActioning(async () => {
      const res = await reactivateWord(w.id);
      if (!res.ok) {
        setActionErr(res.error);
        return;
      }
      setWords((prev) => prev.map((wp) => wp.id === w.id ? { ...wp, is_active: true } : wp));
    });
  }

  const willRederive = dirty.size > 0 && [...dirty].some((f) => REDERIVE_TRIGGER.has(f));

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px', fontFamily: font }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: C.primary }}>
            Үгийн сан
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: '13px', color: C.textLight }}>
            {meta.total} үг нийт
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Grade filter */}
          <select
            value={gradeFilter}
            onChange={(e) => handleGradeChange(e.target.value)}
            style={{ ...inputStyle, width: 'auto', paddingRight: '28px', cursor: 'pointer' }}
          >
            <option value="">Бүх анги</option>
            {facets.grades.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0' }}>
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Үг хайх..."
              style={{
                ...inputStyle,
                width: '200px',
                borderRadius: '8px 0 0 8px',
                borderRight: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '0 12px',
                border: `1.5px solid ${C.border}`,
                borderLeft: 'none',
                borderRadius: '0 8px 8px 0',
                background: C.bgAlt,
                color: C.primary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Search size={14} />
            </button>
          </form>
        </div>
      </div>

      {actionErr && (
        <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#FFF0F0', border: `1px solid ${C.red}30`, borderRadius: '8px', color: C.red, fontSize: '13px' }}>
          {actionErr}
        </div>
      )}

      {/* Table */}
      <div style={{ background: C.white, borderRadius: '12px', border: `1px solid ${C.border}`, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '140px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '110px' }} />
            <col style={{ width: '130px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '80px' }} />
            <col style={{ width: '76px' }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {['Үг', 'Ангилал', 'Анги', 'Үгийн аймаг', 'Апп түвшин', 'Үндсэн ур чадвар', 'Төлөв', 'Үйлдэл'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: C.textLight,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {words.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{ padding: '48px', textAlign: 'center', color: C.textLight, fontSize: '14px' }}
                >
                  Үг олдсонгүй
                </td>
              </tr>
            )}
            {words.map((w) => (
              <tr
                key={w.id}
                style={{
                  borderBottom: `1px solid ${C.border}`,
                  opacity: w.is_active ? 1 : 0.55,
                  background: w.is_active ? 'transparent' : '#F9F9FB',
                  transition: 'opacity 0.15s',
                }}
              >
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: C.text }}>{w.word}</span>
                    {w.balarhai_unknown && (
                      <span title="Балархай эгшиг — шалгах шаардлагатай" style={{ fontSize: '10px', color: '#F59E0B', fontWeight: 700 }}>⚠</span>
                    )}
                  </div>
                  <div style={{ fontSize: '10px', color: C.textLight, marginTop: '1px' }}>{w.id}</div>
                </td>
                <td style={{ padding: '10px 12px', fontSize: '13px', color: C.text }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.category || '—'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                    {w.grade_band.map((g) => <Badge key={g} label={g} color={C.primaryMid} />)}
                    {w.grade_band.length === 0 && <span style={{ fontSize: '12px', color: C.textLight }}>—</span>}
                  </div>
                </td>
                <td style={{ padding: '10px 12px', fontSize: '13px', color: C.text }}>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.part_of_speech || '—'}
                  </span>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {w.app_level ? <Badge label={w.app_level} color={C.primary} /> : <span style={{ fontSize: '12px', color: C.textLight }}>—</span>}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {w.primary_skill ? <Badge label={w.primary_skill} color='#8B5CF6' /> : <span style={{ fontSize: '12px', color: C.textLight }}>—</span>}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {w.is_active
                    ? <Badge label="Идэвхтэй" color={C.green} />
                    : <Badge label="Идэвхгүй" color={C.textLight} />}
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <IconBtn onClick={() => openEdit(w)} title="Засах">
                      <Pencil size={14} />
                    </IconBtn>
                    {w.is_active ? (
                      <IconBtn onClick={() => handleDeactivate(w)} title="Идэвхгүй болгох" danger disabled={isActioning}>
                        <EyeOff size={14} />
                      </IconBtn>
                    ) : (
                      <IconBtn onClick={() => handleReactivate(w)} title="Дахин идэвхжүүлэх" disabled={isActioning}>
                        <Eye size={14} />
                      </IconBtn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px' }}>
        <span style={{ fontSize: '13px', color: C.textLight }}>
          {meta.page} / {Math.max(1, Math.ceil(meta.total / meta.per_page))} хуудас — {meta.total} үг
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            disabled={meta.page <= 1}
            onClick={() => navigate({ page: String(meta.page - 1) })}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '6px 12px', borderRadius: '8px',
              border: `1.5px solid ${C.border}`, background: C.white,
              color: meta.page <= 1 ? C.textLight : C.primary,
              cursor: meta.page <= 1 ? 'not-allowed' : 'pointer',
              fontSize: '13px', fontFamily: font,
            }}
          >
            <ChevronLeft size={14} /> Өмнөх
          </button>
          <button
            disabled={!meta.has_next}
            onClick={() => navigate({ page: String(meta.page + 1) })}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '6px 12px', borderRadius: '8px',
              border: `1.5px solid ${C.border}`, background: C.white,
              color: !meta.has_next ? C.textLight : C.primary,
              cursor: !meta.has_next ? 'not-allowed' : 'pointer',
              fontSize: '13px', fontFamily: font,
            }}
          >
            Дараах <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ─── Deactivate confirm overlay ─── */}
      {confirmWord && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setConfirmWord(null)}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
          <div
            style={{
              position: 'relative', background: C.white, borderRadius: '16px',
              padding: '28px 32px', maxWidth: '380px', width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '16px', color: C.text }}>
              Үгийг идэвхгүй болгох уу?
            </p>
            <p style={{ margin: '0 0 24px', fontSize: '14px', color: C.textLight }}>
              <strong style={{ color: C.text }}>{confirmWord.word}</strong> — устгагдахгүй, зөвхөн нуугдана.
              Дараа нь дахин идэвхжүүлж болно.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmWord(null)}
                style={{
                  padding: '9px 18px', borderRadius: '9px',
                  border: `1.5px solid ${C.border}`, background: 'transparent',
                  color: C.text, cursor: 'pointer', fontFamily: font, fontSize: '13px',
                }}
              >
                Болих
              </button>
              <button
                onClick={confirmDeactivate}
                style={{
                  padding: '9px 18px', borderRadius: '9px',
                  border: 'none', background: C.red,
                  color: C.white, cursor: 'pointer', fontFamily: font,
                  fontSize: '13px', fontWeight: 600,
                }}
              >
                Идэвхгүй болгох
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit modal ─── */}
      {editTarget && form && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={closeEdit}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
          <div
            style={{
              position: 'relative', background: C.white, borderRadius: '16px',
              width: '90%', maxWidth: '640px', maxHeight: '90dvh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '17px', color: C.primary }}>
                  Үг засах
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: C.textLight }}>
                  {editTarget.id}
                  {willRederive && (
                    <span style={{ marginLeft: '8px', color: C.primaryMid, fontWeight: 600 }}>
                      ↺ чадварын баганууд дахин тооцоологдоно
                    </span>
                  )}
                </p>
              </div>
              <IconBtn onClick={closeEdit} title="Хаах">
                <X size={16} />
              </IconBtn>
            </div>

            {/* Modal body */}
            <div style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Section: Core */}
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Үндсэн мэдээлэл
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <FormField label="Үг" rederives>
                  <input
                    value={form.word}
                    onChange={(e) => setField('word', e.target.value)}
                    style={inputStyle}
                    placeholder="ном"
                  />
                </FormField>
                <FormField label="Ангилал (category)">
                  <input
                    value={form.category}
                    onChange={(e) => setField('category', e.target.value)}
                    style={inputStyle}
                    placeholder="Амьтад"
                  />
                </FormField>
                <FormField label="Үгийн аймаг" rederives>
                  <input
                    value={form.part_of_speech}
                    onChange={(e) => setField('part_of_speech', e.target.value)}
                    style={inputStyle}
                    placeholder="нэр үг"
                  />
                </FormField>
                <FormField label="Утгын төрөл" rederives hint="зурагтай → бодит/зурагтай холбож болно">
                  <input
                    value={form.meaning_type}
                    onChange={(e) => setField('meaning_type', e.target.value)}
                    style={inputStyle}
                    placeholder=""
                  />
                </FormField>
              </div>

              {/* Section: Grade & level */}
              <p style={{ margin: '4px 0 0', fontSize: '11px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Анги & түвшин
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <FormField label="Анги (grade_band)">
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
                    {GRADES.map((g) => (
                      <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px', color: C.text, fontFamily: font }}>
                        <input
                          type="checkbox"
                          checked={form.grade_band.includes(g)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...form.grade_band, g]
                              : form.grade_band.filter((x) => x !== g);
                            setField('grade_band', next);
                          }}
                          style={{ accentColor: C.primary, width: '14px', height: '14px' }}
                        />
                        {g}
                      </label>
                    ))}
                  </div>
                </FormField>
                <FormField label="Апп түвшин (app_level)">
                  <input
                    value={form.app_level}
                    onChange={(e) => setField('app_level', e.target.value)}
                    style={inputStyle}
                    placeholder="M0–M5"
                  />
                </FormField>
              </div>

              {/* Section: Complexity */}
              <p style={{ margin: '4px 0 0', fontSize: '11px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Төвөгшлийн түвшин
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <FormField label="Утгын (1–5)">
                  <input
                    type="number"
                    min={1} max={5}
                    value={form.meaning_complexity}
                    onChange={(e) => setField('meaning_complexity', e.target.value)}
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Зөв бичих (1–4)">
                  <input
                    type="number"
                    min={1} max={4}
                    value={form.spelling_complexity}
                    onChange={(e) => setField('spelling_complexity', e.target.value)}
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Морфологийн (1–3)">
                  <input
                    type="number"
                    min={1} max={3}
                    value={form.morph_complexity}
                    onChange={(e) => setField('morph_complexity', e.target.value)}
                    style={inputStyle}
                  />
                </FormField>
              </div>

              {/* Section: Tags */}
              <p style={{ margin: '4px 0 0', fontSize: '11px', fontWeight: 700, color: C.textLight, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Тэмдэглэгээ
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <FormField label="Зөв бичих tag">
                  <input
                    value={form.spelling_tag}
                    onChange={(e) => setField('spelling_tag', e.target.value)}
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Санал болгох дасгал">
                  <input
                    value={form.suggested_exercises}
                    onChange={(e) => setField('suggested_exercises', e.target.value)}
                    style={inputStyle}
                  />
                </FormField>
              </div>
            </div>

            {/* Modal footer */}
            <div
              style={{
                padding: '14px 24px 20px',
                borderTop: `1px solid ${C.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '13px', minHeight: '20px' }}>
                {saveErr && <span style={{ color: C.red }}>{saveErr}</span>}
                {saveOk && <span style={{ color: C.green, fontWeight: 600 }}>✓ Хадгалагдлаа</span>}
                {dirty.size > 0 && !saveErr && !saveOk && (
                  <span style={{ color: C.textLight }}>{dirty.size} талбар өөрчлөгдсөн</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={closeEdit}
                  style={{
                    padding: '9px 18px', borderRadius: '9px',
                    border: `1.5px solid ${C.border}`, background: 'transparent',
                    color: C.text, cursor: 'pointer', fontFamily: font, fontSize: '13px',
                  }}
                >
                  Болих
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || dirty.size === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '9px 20px', borderRadius: '9px',
                    border: 'none',
                    background: isSaving || dirty.size === 0 ? '#c0ccd8' : C.primary,
                    color: C.white, cursor: isSaving || dirty.size === 0 ? 'not-allowed' : 'pointer',
                    fontFamily: font, fontSize: '13px', fontWeight: 600,
                    transition: 'background 0.15s',
                  }}
                >
                  {isSaving && <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} />}
                  Хадгалах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
