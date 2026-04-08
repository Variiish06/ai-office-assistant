import { useState } from 'react';
import axios from 'axios';
import {
  MessageSquare, Loader2, Copy, Check, Edit3, RefreshCw,
  Send, X, ChevronDown, ChevronUp, AlertCircle,
} from 'lucide-react';

const SAMPLES = [
  {
    label: 'Missing order',
    text: "Hi, I placed an order 3 days ago and still haven't received any tracking information. Order #12345. Can you help?",
  },
  {
    label: "Can't log in",
    text: "I'm unable to log into my account. I've tried the password reset twice but the email never arrives. I need access urgently.",
  },
  {
    label: 'Charged twice',
    text: "I was charged twice for my monthly subscription this billing cycle. I can see two identical charges of $29.99 on my credit card statement.",
  },
];

function SendModal({ reply, onClose, onSent }) {
  const [to, setTo]           = useState('');
  const [subject, setSubject] = useState('Re: Your Support Request');
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState('');

  async function handleSend() {
    if (!to.trim()) { setError('Please enter a recipient email.'); return; }
    setSending(true);
    setError('');
    try {
      const { data } = await axios.post('/api/support/send', { to, subject, reply });
      if (data.success) {
        onSent(data.messageId);
        onClose();
      } else {
        setError('Failed to send. Please try again.');
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex-between mb-2">
          <h3 style={{ fontWeight: 700 }}>Send Email</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="form-group">
          <label>To</label>
          <input className="input" type="email" placeholder="customer@example.com" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Subject</label>
          <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Preview</label>
          <div style={{
            padding: '0.75rem',
            background: 'var(--bg)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            fontSize: '0.85rem',
            whiteSpace: 'pre-wrap',
            maxHeight: 160,
            overflowY: 'auto',
            color: 'var(--text-secondary)',
          }}>
            {reply}
          </div>
        </div>

        {error && (
          <div className="alert alert-error mb-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={sending} onClick={handleSend}>
            {sending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SupportReply() {
  const [customerMessage, setMessage]   = useState('');
  const [companyContext, setContext]     = useState('');
  const [showContext, setShowContext]    = useState(false);
  const [productName, setProductName]   = useState('');
  const [policies, setPolicies]         = useState('');

  const [reply, setReply]         = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [tone, setTone]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [editMode, setEditMode]   = useState(false);
  const [copied, setCopied]       = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [sentId, setSentId]       = useState('');

  function buildContext() {
    const parts = [];
    if (productName) parts.push(`Product: ${productName}`);
    if (policies)    parts.push(`Policies: ${policies}`);
    return parts.join('. ');
  }

  async function generate(toneHint = '') {
    setError('');
    setLoading(true);
    setReply('');
    setSentId('');
    try {
      const ctx = buildContext() + (toneHint ? ` Tone instruction: ${toneHint}` : '');
      const { data } = await axios.post('/api/support/generate', {
        customerMessage,
        companyContext: ctx || undefined,
      });
      setReply(data.reply);
      setWordCount(data.wordCount);
      setTone(data.tone);
      setEditMode(false);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(reply).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const toneBadgeClass = tone === 'empathetic' ? 'badge-info' : tone === 'friendly' ? 'badge-warning' : 'badge-primary';

  return (
    <div>
      <div className="mb-2">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Customer Support Reply</h2>
        <p className="text-muted text-sm">Generate professional, empathetic replies powered by Claude</p>
      </div>

      {/* Input card */}
      <div className="card">
        <div className="form-group">
          <label>Customer Message</label>
          <textarea
            className="textarea"
            style={{ minHeight: 120 }}
            placeholder="Paste the customer's message here…"
            value={customerMessage}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="flex-gap flex-wrap gap-1 mb-2">
          <span className="text-xs text-muted">Quick fill:</span>
          {SAMPLES.map((s) => (
            <button key={s.label} className="btn btn-ghost btn-sm" onClick={() => setMessage(s.text)}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Collapsible context */}
        <button
          className="btn btn-ghost btn-sm mb-2"
          style={{ color: 'var(--text-secondary)' }}
          onClick={() => setShowContext((v) => !v)}
        >
          {showContext ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Company context (optional)
        </button>

        {showContext && (
          <div className="form-row" style={{ marginBottom: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Product / Company name</label>
              <input className="input" placeholder="e.g. Acme SaaS" value={productName} onChange={(e) => setProductName(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Key policies</label>
              <input className="input" placeholder="e.g. 3-5 day shipping, 24h SLA" value={policies} onChange={(e) => setPolicies(e.target.value)} />
            </div>
          </div>
        )}

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          disabled={loading || !customerMessage.trim()}
          onClick={() => generate()}
        >
          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <MessageSquare size={16} />}
          {loading ? 'Generating…' : 'Generate Reply'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error mt-2">
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      {/* Generated reply */}
      {reply && !loading && (
        <div className="card card-highlight mt-3">
          {/* Toolbar */}
          <div className="flex-between flex-wrap gap-1 mb-2">
            <div className="flex-gap flex-wrap gap-1">
              <span className="badge badge-info">{wordCount} words</span>
              {tone && <span className={`badge ${toneBadgeClass}`}>{tone}</span>}
            </div>
            <div className="flex-gap">
              <button className="btn btn-ghost btn-sm" onClick={copyToClipboard}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setEditMode((v) => !v)}
                style={editMode ? { borderColor: 'var(--warning)', color: 'var(--warning)' } : {}}
              >
                <Edit3 size={13} /> {editMode ? 'Done' : 'Edit'}
              </button>
            </div>
          </div>

          {/* Reply text */}
          <textarea
            className={`textarea ${editMode ? 'textarea-editable' : ''}`}
            style={{ minHeight: 140, fontFamily: 'inherit', resize: editMode ? 'vertical' : 'none' }}
            readOnly={!editMode}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />

          {/* Action buttons */}
          <div className="flex-gap flex-wrap gap-1 mt-2">
            <button className="btn btn-ghost btn-sm" disabled={loading} onClick={() => generate()}>
              <RefreshCw size={13} /> Regenerate
            </button>
            <button className="btn btn-ghost btn-sm" disabled={loading} onClick={() => generate('Make the reply more formal and professional.')}>
              Make Formal
            </button>
            <button className="btn btn-ghost btn-sm" disabled={loading} onClick={() => generate('Make the reply warmer, friendlier, and more conversational.')}>
              Make Friendlier
            </button>
            <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setShowModal(true)}>
              <Send size={13} /> Send Email
            </button>
          </div>

          {sentId && (
            <div className="alert alert-success mt-2">
              <Check size={14} /> Email sent successfully! Message ID: {sentId}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <SendModal
          reply={reply}
          onClose={() => setShowModal(false)}
          onSent={(id) => setSentId(id)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
