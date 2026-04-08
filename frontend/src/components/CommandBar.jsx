import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  ArrowRight, X, Loader2, Zap, CheckCircle2, Calendar,
  MessageSquare, Briefcase, Database, GitMerge, Inbox,
  ExternalLink, Clock, User, ThumbsUp, Minus, Flame,
  Target, List, HelpCircle, AlertTriangle,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────

const PLACEHOLDERS = [
  'Schedule a meeting with Priya tomorrow for 30 mins…',
  'Is this email spam? Check: You won $1M…',
  'Draft a reply to an angry customer…',
  'Brief me for investor meeting with Sequoia…',
  'Summarize this email thread…',
];

const FEATURE_CONFIG = {
  triage:    { label: 'Email Triage',     color: '#6366f1', bg: '#eef2ff', tabId: 'triage',    Icon: Inbox },
  calendar:  { label: 'Calendar',         color: '#22c55e', bg: '#dcfce7', tabId: 'calendar',  Icon: Calendar },
  support:   { label: 'Customer Support', color: '#3b82f6', bg: '#dbeafe', tabId: 'support',   Icon: MessageSquare },
  brief:     { label: 'Meeting Brief',    color: '#8b5cf6', bg: '#ede9fe', tabId: 'brief',     Icon: Briefcase },
  rag:       { label: 'Knowledge Base',   color: '#f59e0b', bg: '#fef3c7', tabId: 'knowledge', Icon: Database },
  summarize: { label: 'Email Triage',     color: '#6366f1', bg: '#eef2ff', tabId: 'triage',    Icon: GitMerge },
};

const SENTIMENT = {
  positive: { Icon: ThumbsUp, color: '#15803d' },
  neutral:  { Icon: Minus,    color: '#1d4ed8' },
  tense:    { Icon: Flame,    color: '#b91c1c' },
};

const BRIEF_ICON = {
  objective: { Icon: Target,        color: '#3b82f6' },
  discuss:   { Icon: List,          color: '#8b5cf6' },
  question:  { Icon: HelpCircle,    color: '#f59e0b' },
  concern:   { Icon: AlertTriangle, color: '#ef4444' },
  outcome:   { Icon: CheckCircle2,  color: '#22c55e' },
};

// ── Result rendering ─────────────────────────────────────────

function ResultContent({ feature, result }) {
  if (!result) return null;

  if (feature === 'triage') {
    const isImportant = result.label === 'important';
    return (
      <div>
        <div className="flex-gap flex-wrap" style={{ marginBottom: '0.5rem' }}>
          <span className={`badge badge-${result.label}`}>{isImportant ? '★ Important' : '✗ Spam'}</span>
          <span className={`badge ${result.confidence === 'high' ? 'badge-primary' : 'badge-warning'}`}>{result.confidence} confidence</span>
          <span className="text-xs text-muted">Priority {result.priority}/5</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{result.reason}</p>
      </div>
    );
  }

  if (feature === 'calendar') {
    return (
      <div>
        <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem' }}>
          {result.displayTime}
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
          {result.rationale}
        </p>
        {!result.conflictFree && (
          <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Potential conflict</span>
        )}
        {result.conflictFree && result.calendarLink && (
          <a
            className="btn btn-ghost btn-sm"
            href={result.calendarLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginTop: '0.4rem' }}
          >
            <ExternalLink size={12} /> Open in Calendar
          </a>
        )}
      </div>
    );
  }

  if (feature === 'support') {
    return (
      <p style={{
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
        fontStyle: 'italic',
        display: '-webkit-box',
        WebkitLineClamp: 4,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        "{result.reply}"
      </p>
    );
  }

  if (feature === 'brief') {
    const bullets = result.bullets || [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {bullets.slice(0, 3).map((b, i) => {
          const cfg = BRIEF_ICON[b.icon] || BRIEF_ICON.discuss;
          const content = Array.isArray(b.content) ? b.content[0] : b.content;
          return (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <cfg.Icon size={13} style={{ color: cfg.color, flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.82rem' }}>
                <span style={{ fontWeight: 600 }}>{b.title}: </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {typeof content === 'string' ? content.slice(0, 100) : ''}
                  {typeof content === 'string' && content.length > 100 ? '…' : ''}
                </span>
              </div>
            </div>
          );
        })}
        {bullets.length > 3 && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+{bullets.length - 3} more bullets — view in tab</p>
        )}
      </div>
    );
  }

  if (feature === 'rag') {
    return (
      <div>
        <div className="flex-gap" style={{ marginBottom: '0.4rem' }}>
          {result.grounded
            ? <span className="badge badge-important" style={{ fontSize: '0.7rem' }}><Zap size={10} /> Grounded in {result.sourcesUsed} sources</span>
            : <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>No relevant docs found</span>}
        </div>
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {result.reply}
        </p>
      </div>
    );
  }

  if (feature === 'summarize') {
    const sentCfg = SENTIMENT[result.sentiment] || SENTIMENT.neutral;
    return (
      <div>
        <div className="flex-gap" style={{ marginBottom: '0.5rem' }}>
          <sentCfg.Icon size={13} style={{ color: sentCfg.color }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: sentCfg.color, textTransform: 'uppercase' }}>
            {result.sentiment}
          </span>
        </div>
        {result.decided?.length > 0 && (
          <div style={{ marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Decided: </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {result.decided.slice(0, 2).join(' · ')}
            </span>
          </div>
        )}
        {result.nextStep && (
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
            <ArrowRight size={12} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{result.nextStep}</span>
          </div>
        )}
      </div>
    );
  }

  return <pre style={{ fontSize: '0.75rem', overflowX: 'auto' }}>{JSON.stringify(result, null, 2)}</pre>;
}

// ── Main CommandBar ──────────────────────────────────────────

const HISTORY_KEY = 'ai_command_history';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 5)));
}

export default function CommandBar({ setActiveTab }) {
  const [inputValue, setInputValue]   = useState('');
  const [focused, setFocused]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [cmdResult, setCmdResult]     = useState(null); // { understood, feature, result, canExecute }
  const [history, setHistory]         = useState(loadHistory);
  const [phIdx, setPhIdx]             = useState(0);
  const [error, setError]             = useState('');
  const inputRef = useRef(null);

  // Ctrl+K shortcut
  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setFocused(true);
      }
      if (e.key === 'Escape') {
        setFocused(false);
        setCmdResult(null);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Cycle placeholder
  useEffect(() => {
    const id = setInterval(() => setPhIdx((i) => (i + 1) % PLACEHOLDERS.length), 3200);
    return () => clearInterval(id);
  }, []);

  const submit = useCallback(async (text) => {
    const cmd = (text || inputValue).trim();
    if (!cmd) return;
    setError('');
    setCmdResult(null);
    setLoading(true);
    setFocused(false);

    try {
      const { data } = await axios.post('/api/command', { command: cmd });
      setCmdResult(data);
      // Update history
      const next = [cmd, ...history.filter((h) => h !== cmd)].slice(0, 5);
      setHistory(next);
      saveHistory(next);
      setInputValue('');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [inputValue, history]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const featureCfg = cmdResult ? (FEATURE_CONFIG[cmdResult.feature] || FEATURE_CONFIG.triage) : null;

  return (
    <>
      {/* Backdrop when focused */}
      {focused && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 190 }}
          onClick={() => setFocused(false)}
        />
      )}

      <div style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(600px, calc(100vw - 2rem))',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.6rem',
      }}>

        {/* ── Result card ── */}
        {cmdResult && (
          <div style={{
            width: '100%',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: `1px solid ${featureCfg.color}40`,
            boxShadow: 'var(--shadow-lg)',
            padding: '1rem 1.1rem',
            animation: 'slideUp 200ms ease',
          }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.6rem', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  padding: '0.2rem 0.6rem', borderRadius: 999,
                  background: featureCfg.bg, color: featureCfg.color,
                  fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                }}>
                  <featureCfg.Icon size={11} />
                  {featureCfg.label}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  {cmdResult.understood}
                </span>
              </div>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem', flexShrink: 0 }}
                onClick={() => setCmdResult(null)}
              >
                <X size={15} />
              </button>
            </div>

            {/* Result content */}
            {cmdResult.canExecute && cmdResult.result
              ? <ResultContent feature={cmdResult.feature} result={cmdResult.result} />
              : !cmdResult.canExecute && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  I need a bit more info to execute this. Try adding more detail to your command.
                </p>
              )
            }

            {/* View in tab button */}
            {cmdResult.canExecute && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: '0.75rem', color: featureCfg.color, borderColor: `${featureCfg.color}40` }}
                onClick={() => { setActiveTab(featureCfg.tabId); setCmdResult(null); }}
              >
                View in {featureCfg.label} <ArrowRight size={12} />
              </button>
            )}
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="alert alert-error" style={{ width: '100%', borderRadius: 'var(--radius)' }}>
            <AlertTriangle size={13} style={{ flexShrink: 0 }} /> {error}
            <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setError('')}>
              <X size={13} />
            </button>
          </div>
        )}

        {/* ── History chips ── */}
        {focused && history.length > 0 && (
          <div style={{
            width: '100%',
            display: 'flex',
            gap: '0.4rem',
            flexWrap: 'wrap',
            animation: 'slideUp 150ms ease',
          }}>
            {history.map((cmd, i) => (
              <button
                key={i}
                onClick={() => submit(cmd)}
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  maxWidth: 220,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  transition: 'border-color 150ms, color 150ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <Clock size={10} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                {cmd}
              </button>
            ))}
          </div>
        )}

        {/* ── Input pill ── */}
        <div style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          background: 'var(--surface)',
          borderRadius: 999,
          border: `1.5px solid ${focused || loading ? 'var(--primary)' : 'var(--border)'}`,
          boxShadow: focused || loading
            ? '0 0 0 3px rgba(99,102,241,0.18), var(--shadow-lg)'
            : 'var(--shadow)',
          padding: '0.45rem 0.45rem 0.45rem 1.1rem',
          gap: '0.5rem',
          transition: 'border-color 200ms, box-shadow 200ms',
          animation: loading ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }}>
          {/* Zap icon */}
          <Zap
            size={15}
            style={{
              color: focused || loading ? 'var(--primary)' : 'var(--text-muted)',
              flexShrink: 0,
              transition: 'color 200ms',
            }}
          />

          {/* Input */}
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            placeholder={loading ? 'AI is thinking…' : PLACEHOLDERS[phIdx]}
            disabled={loading}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              minWidth: 0,
            }}
          />

          {/* ⌘K badge */}
          {!focused && !loading && (
            <span style={{
              padding: '0.15rem 0.45rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              ⌘K
            </span>
          )}

          {/* Send / spinner */}
          <button
            onClick={() => submit()}
            disabled={loading || !inputValue.trim()}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: inputValue.trim() && !loading ? 'var(--primary)' : 'var(--border)',
              color: inputValue.trim() && !loading ? '#fff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputValue.trim() && !loading ? 'pointer' : 'default',
              transition: 'background 150ms, color 150ms',
              flexShrink: 0,
            }}
          >
            {loading
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <ArrowRight size={14} />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse   {
          0%, 100% { box-shadow: 0 0 0 3px rgba(99,102,241,0.18), var(--shadow-lg); }
          50%       { box-shadow: 0 0 0 6px rgba(99,102,241,0.10), var(--shadow-lg); }
        }
      `}</style>
    </>
  );
}
