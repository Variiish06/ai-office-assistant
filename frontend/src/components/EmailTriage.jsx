import { useState } from 'react';
import axios from 'axios';
import {
  Inbox, Tag, RefreshCw, Loader2, AlertCircle, CheckCircle2,
  GitMerge, User, Clock, ArrowRight, ThumbsUp, Minus, Flame,
} from 'lucide-react';

const SAMPLES = [
  {
    label: 'Q3 Budget Review',
    text: 'Subject: Q3 Budget Review — urgent sign-off needed\nFrom: finance@company.com\n\nHi,\n\nPlease review and sign off on the Q3 budget proposal by EOD today. The board meeting is tomorrow morning and we need final approval from your department.\n\nThanks,\nFinance Team',
  },
  {
    label: 'You won $1,000,000!!',
    text: 'Subject: You have WON $1,000,000!!!\nFrom: noreply@definitely-not-spam.xyz\n\nCONGRATULATIONS! You have been selected as our lucky winner of $1,000,000! Click here to claim your prize immediately. Limited time offer! Act now before it expires!!!',
  },
  {
    label: 'Standup Notes Apr 8',
    text: 'Subject: Team standup notes — April 8\nFrom: scrum@company.com\n\nHi team,\n\nHere are the notes from today\'s standup.\n\nBlocked: deployment pipeline issue (Josh), API rate limiting (Priya)\nIn progress: auth refactor, onboarding UI\nDone: DB migration, unit tests\n\nNext standup: tomorrow 9:30 AM\n\nScrum Master',
  },
];

function PriorityDots({ value }) {
  return (
    <div className="priority-dots">
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className={`priority-dot${n <= value ? ' filled' : ''}`} />
      ))}
    </div>
  );
}

function EmailCard({ result }) {
  return (
    <div className={`card mt-2`} style={{ borderLeft: `3px solid ${result.label === 'important' ? 'var(--success)' : 'var(--danger)'}` }}>
      <div className="flex-between flex-wrap gap-1">
        <div className="flex-gap flex-wrap gap-1">
          <span className={`badge badge-${result.label}`}>
            {result.label === 'important' ? '★ Important' : '✗ Spam'}
          </span>
          <span className={`badge ${result.confidence === 'high' ? 'badge-primary' : result.confidence === 'medium' ? 'badge-warning' : 'badge-info'}`}>
            {result.confidence}
          </span>
        </div>
        <PriorityDots value={result.priority} />
      </div>

      <p className="text-bold mt-1" style={{ fontSize: '0.95rem' }}>{result.subject}</p>

      {result.sender && result.sender !== 'unknown' && (
        <p className="text-muted text-sm">
          {result.sender}{result.date ? ` · ${new Date(result.date).toLocaleDateString()}` : ''}
        </p>
      )}

      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
        {result.reason}
      </p>
    </div>
  );
}

export default function EmailTriage() {
  const [mode, setMode]         = useState('paste');
  const [emailText, setEmail]   = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [labelled, setLabelled] = useState(false);

  async function classify() {
    setError('');
    setResults([]);
    setLoading(true);
    setLabelled(false);
    try {
      const body = mode === 'gmail'
        ? { useGmail: true, limit: 10 }
        : { emailText };
      const { data } = await axios.post('/api/triage', body);
      setResults(data.results);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  async function applyLabels() {
    setLoading(true);
    try {
      await Promise.all(
        results
          .filter((r) => r.id)
          .map((r) => axios.post('/api/triage/label', { emailId: r.id, label: r.label }))
      );
      setLabelled(true);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  const sorted = [...results].sort((a, b) => {
    if (a.label !== b.label) return a.label === 'important' ? -1 : 1;
    return b.priority - a.priority;
  });

  const importantCount = results.filter((r) => r.label === 'important').length;
  const spamCount      = results.filter((r) => r.label === 'spam').length;

  return (
    <div>
      <div className="flex-between mb-2">
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Email Triage</h2>
          <p className="text-muted text-sm">Classify emails as important or spam using Claude</p>
        </div>
        <div className="toggle-group">
          <button className={`toggle-btn${mode === 'paste' ? ' active' : ''}`} onClick={() => setMode('paste')}>
            Paste
          </button>
          <button className={`toggle-btn${mode === 'gmail' ? ' active' : ''}`} onClick={() => setMode('gmail')}>
            Gmail
          </button>
        </div>
      </div>

      {/* Paste mode */}
      {mode === 'paste' && (
        <div className="card">
          <div className="form-group">
            <label>Email Content</label>
            <textarea
              className="textarea"
              style={{ minHeight: 140 }}
              placeholder="Paste the full email here (include subject, sender, body)..."
              value={emailText}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex-gap flex-wrap gap-1 mb-2">
            <span className="text-xs text-muted" style={{ marginRight: '0.25rem' }}>Quick fill:</span>
            {SAMPLES.map((s) => (
              <button key={s.label} className="btn btn-ghost btn-sm" onClick={() => setEmail(s.text)}>
                {s.label}
              </button>
            ))}
          </div>

          <button
            className="btn btn-primary btn-lg"
            disabled={loading || !emailText.trim()}
            onClick={classify}
            style={{ width: '100%' }}
          >
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Inbox size={16} />}
            {loading ? 'Classifying…' : 'Classify Email'}
          </button>
        </div>
      )}

      {/* Gmail mode */}
      {mode === 'gmail' && (
        <div className="card text-center">
          <Inbox size={40} style={{ color: 'var(--primary)', margin: '0 auto 0.75rem' }} />
          <p className="text-bold mb-1">Fetch from Gmail Inbox</p>
          <p className="text-muted text-sm mb-2">
            Retrieves your last 10 emails via Gmail MCP and classifies each one automatically.
          </p>
          <button
            className="btn btn-primary btn-lg"
            disabled={loading}
            onClick={classify}
            style={{ width: '100%', maxWidth: 320 }}
          >
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
            {loading ? 'Fetching & Classifying…' : 'Fetch Last 10 Emails'}
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="mt-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="card mt-2">
              <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 18, width: '70%', marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 12, width: '90%' }} />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-error mt-2">
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* Results */}
      {!loading && sorted.length > 0 && (
        <div className="mt-3">
          <div className="flex-between flex-wrap gap-1 mb-2">
            <div className="flex-gap">
              <span className="badge badge-important">{importantCount} important</span>
              <span className="badge badge-spam">{spamCount} spam</span>
              <span className="text-muted text-sm">{results.length} total</span>
            </div>
            {mode === 'gmail' && results.some((r) => r.id) && !labelled && (
              <button className="btn btn-ghost btn-sm" disabled={loading} onClick={applyLabels}>
                <Tag size={13} /> Apply labels to Gmail
              </button>
            )}
            {labelled && (
              <div className="flex-gap" style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
                <CheckCircle2 size={15} /> Labels applied
              </div>
            )}
          </div>

          {sorted.map((r, i) => (
            <EmailCard key={r.id || i} result={r} />
          ))}
        </div>
      )}

      {/* ── Thread Summarizer ──────────────────────────── */}
      <hr className="divider" style={{ margin: '2rem 0 1.5rem' }} />
      <ThreadSummarizer />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const SAMPLE_THREAD = `From: Lisa (PM) <lisa@company.com>
To: team@company.com
Subject: Product launch — timeline update
Date: Mon Apr 7, 9:02 AM

Hi team, just flagging that the engineering team pushed back the launch from April 15 to April 22 due to the auth bug. Marketing needs to be looped in ASAP. Can someone own that?

---

From: James (Eng Lead) <james@company.com>
To: team@company.com
Date: Mon Apr 7, 9:45 AM

Confirmed — the bug is in the OAuth flow. Priya is on it, ETA Wednesday EOD for the fix, then we need 2 days QA. That puts us at April 22 earliest. I'll update the roadmap doc.

---

From: Sarah (Marketing) <sarah@company.com>
To: team@company.com
Date: Mon Apr 7, 10:15 AM

This is the second delay this quarter. I already briefed press for April 15 and we have paid social lined up. Can we at least commit to April 22 as a hard deadline? I need something firm before I reschedule.

---

From: Lisa (PM) <lisa@company.com>
To: team@company.com
Date: Mon Apr 7, 11:00 AM

James — April 22 needs to be a hard commit. Sarah — yes, treat April 22 as locked. I'll own the press reschedule coordination. James, please send me the updated roadmap by EOD today so I can share with leadership.`;

const SENTIMENT_CONFIG = {
  positive: { Icon: ThumbsUp, color: '#15803d', bg: 'var(--success-light)', label: 'POSITIVE' },
  neutral:  { Icon: Minus,    color: '#1d4ed8', bg: 'var(--info-light)',    label: 'NEUTRAL'  },
  tense:    { Icon: Flame,    color: '#b91c1c', bg: 'var(--danger-light)',  label: 'TENSE'    },
};

function ThreadSummarizer() {
  const [thread, setThread]   = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function summarize() {
    setError('');
    setSummary(null);
    setLoading(true);
    try {
      const { data } = await axios.post('/api/triage/summarize', { thread });
      setSummary(data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  const sentiment = summary ? (SENTIMENT_CONFIG[summary.sentiment] || SENTIMENT_CONFIG.neutral) : null;

  return (
    <div>
      <div className="flex-between mb-2">
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Thread Summarizer</h3>
          <p className="text-muted text-sm">Extract decisions, owners, and next steps from any email thread</p>
        </div>
        <GitMerge size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
      </div>

      <div className="card">
        <div className="form-group">
          <label>Email Thread</label>
          <textarea
            className="textarea"
            style={{ minHeight: 160, fontFamily: 'monospace', fontSize: '0.8rem' }}
            placeholder="Paste the full email thread here (include all replies, senders, dates)…"
            value={thread}
            onChange={(e) => setThread(e.target.value)}
          />
        </div>

        <div className="flex-gap flex-wrap gap-1 mb-2">
          <span className="text-xs text-muted">Quick fill:</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setThread(SAMPLE_THREAD)}>
            Product launch delay (3-person thread)
          </button>
        </div>

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          disabled={loading || !thread.trim()}
          onClick={summarize}
        >
          {loading
            ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            : <GitMerge size={16} />}
          {loading ? 'Summarizing…' : 'Summarize Thread'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error mt-2">
          <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      {summary && !loading && (
        <div className="mt-3">
          {/* Sentiment badge */}
          {sentiment && (
            <div className="flex-gap mb-3">
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.3rem 0.8rem',
                borderRadius: 999,
                background: sentiment.bg,
                border: `1px solid ${sentiment.color}40`,
                fontWeight: 700,
                fontSize: '0.75rem',
                color: sentiment.color,
                letterSpacing: '0.05em',
              }}>
                <sentiment.Icon size={13} />
                Thread sentiment: {sentiment.label}
              </div>
            </div>
          )}

          {/* 2×2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>

            {/* Decided */}
            <div className="card" style={{ borderTop: '3px solid var(--success)' }}>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--success)' }} /> Decided
              </p>
              {summary.decided?.length > 0
                ? <ul style={{ paddingLeft: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    {summary.decided.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                : <p className="text-muted text-sm">Nothing decided yet</p>}
            </div>

            {/* Pending */}
            <div className="card" style={{ borderTop: '3px solid var(--warning)' }}>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={14} style={{ color: 'var(--warning)' }} /> Pending
              </p>
              {summary.pending?.length > 0
                ? <ul style={{ paddingLeft: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    {summary.pending.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                : <p className="text-muted text-sm">Nothing pending</p>}
            </div>

            {/* Owners */}
            <div className="card" style={{ borderTop: '3px solid var(--info)' }}>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={14} style={{ color: 'var(--info)' }} /> Owners
              </p>
              {summary.owners?.length > 0
                ? <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {summary.owners.map((o, i) => (
                      <div key={i} style={{ fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{o.person}</span>
                        <span style={{ color: 'var(--text-secondary)' }}> — {o.task}</span>
                      </div>
                    ))}
                  </div>
                : <p className="text-muted text-sm">No owners assigned</p>}
            </div>

            {/* Next step */}
            <div className="card" style={{ borderTop: '3px solid var(--primary)' }}>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ArrowRight size={14} style={{ color: 'var(--primary)' }} /> Next Step
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {summary.nextStep || '—'}
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
