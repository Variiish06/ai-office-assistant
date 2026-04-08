import { useState } from 'react';
import axios from 'axios';
import {
  Briefcase, Loader2, Target, List, HelpCircle,
  AlertTriangle, CheckCircle2, Copy, Check, RotateCcw,
} from 'lucide-react';

const SAMPLES = [
  {
    label: 'Investor pitch — Sequoia',
    personName: 'Sequoia Capital',
    meetingTopic: 'Series A investor pitch',
    recentContext: 'We met briefly at TechCrunch Disrupt. They expressed interest in our AI productivity tools.',
  },
  {
    label: 'Client onboarding',
    personName: 'Acme Corp (new SaaS customer)',
    meetingTopic: 'Client onboarding and product walkthrough',
    recentContext: 'Signed a 12-month contract last week. They have 50 seats. Main contact is Sarah, Head of Ops.',
  },
  {
    label: '1:1 with manager',
    personName: 'My manager (Engineering Lead)',
    meetingTopic: 'Quarterly performance review and career growth',
    recentContext: 'Last review went well. I shipped the auth refactor and led the new onboarding flow. Want to discuss a promotion.',
  },
];

const BULLET_CONFIG = {
  objective: {
    Icon: Target,
    color: '#3b82f6',
    bg: '#dbeafe',
    label: 'Objective',
  },
  discuss: {
    Icon: List,
    color: '#8b5cf6',
    bg: '#ede9fe',
    label: 'Key Points',
  },
  question: {
    Icon: HelpCircle,
    color: '#f59e0b',
    bg: '#fef3c7',
    label: 'Questions to Ask',
  },
  concern: {
    Icon: AlertTriangle,
    color: '#ef4444',
    bg: '#fee2e2',
    label: 'Concerns',
  },
  outcome: {
    Icon: CheckCircle2,
    color: '#22c55e',
    bg: '#dcfce7',
    label: 'Desired Outcome',
  },
};

function BulletCard({ bullet }) {
  const cfg = BULLET_CONFIG[bullet.icon] || BULLET_CONFIG.discuss;
  const { Icon, color, bg } = cfg;

  return (
    <div style={{
      display: 'flex',
      gap: '0.9rem',
      padding: '0.9rem 1rem',
      borderRadius: 'var(--radius-sm)',
      background: bg,
      border: `1px solid ${color}30`,
    }}>
      <div style={{
        flexShrink: 0,
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: `${color}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div>
        <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
          {bullet.title}
        </p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {bullet.content}
        </p>
      </div>
    </div>
  );
}

export default function MeetingBrief() {
  const [form, setForm] = useState({ personName: '', meetingTopic: '', recentContext: '' });
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [copied, setCopied]   = useState(false);

  function fillSample(s) {
    setForm({ personName: s.personName, meetingTopic: s.meetingTopic, recentContext: s.recentContext });
    setResult(null);
    setError('');
  }

  function updateForm(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function generate() {
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const { data } = await axios.post('/api/brief/generate', {
        personName: form.personName,
        meetingTopic: form.meetingTopic,
        recentContext: form.recentContext || undefined,
      });
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  function copyBrief() {
    if (!result) return;
    const lines = result.bullets.map(
      (b) => `• [${(BULLET_CONFIG[b.icon] || BULLET_CONFIG.discuss).label}] ${b.title}: ${b.content}`
    );
    lines.push('', result.summary);
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const canGenerate = form.personName.trim() && form.meetingTopic.trim();

  return (
    <div>
      <div className="mb-2">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Meeting Brief</h2>
        <p className="text-muted text-sm">Generate a 5-bullet AI brief to walk into any meeting prepared</p>
      </div>

      {/* Input card */}
      <div className="card mb-3">
        <div className="form-row">
          <div className="form-group">
            <label>Who are you meeting?</label>
            <input
              className="input"
              placeholder="e.g. Sequoia Capital, Sarah from Acme Corp"
              value={form.personName}
              onChange={(e) => updateForm('personName', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Meeting topic</label>
            <input
              className="input"
              placeholder="e.g. Series A pitch, performance review"
              value={form.meetingTopic}
              onChange={(e) => updateForm('meetingTopic', e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Recent context <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
          <textarea
            className="textarea"
            style={{ minHeight: 80 }}
            placeholder="Paste recent emails, last discussion notes, or any background context…"
            value={form.recentContext}
            onChange={(e) => updateForm('recentContext', e.target.value)}
          />
        </div>

        <div className="flex-gap flex-wrap gap-1 mb-2">
          <span className="text-xs text-muted">Quick fill:</span>
          {SAMPLES.map((s) => (
            <button key={s.label} className="btn btn-ghost btn-sm" onClick={() => fillSample(s)}>
              {s.label}
            </button>
          ))}
        </div>

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          disabled={loading || !canGenerate}
          onClick={generate}
        >
          {loading
            ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            : <Briefcase size={16} />}
          {loading ? 'Generating brief…' : 'Generate Brief'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error mb-2">
          <AlertTriangle size={14} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="card card-highlight">
          <div className="flex-between mb-3">
            <div>
              <p style={{ fontWeight: 700, fontSize: '1rem' }}>
                {form.meetingTopic}
              </p>
              <p className="text-muted text-sm">with {form.personName}</p>
            </div>
            <div className="flex-gap">
              <button className="btn btn-ghost btn-sm" onClick={copyBrief}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy Brief'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setResult(null); setForm({ personName: '', meetingTopic: '', recentContext: '' }); }}>
                <RotateCcw size={13} /> Start Over
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {result.bullets.map((bullet, i) => (
              <BulletCard key={i} bullet={bullet} />
            ))}
          </div>

          {result.summary && (
            <p style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border)',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              fontStyle: 'italic',
              lineHeight: 1.6,
            }}>
              {result.summary}
            </p>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
