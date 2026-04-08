import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Database, Upload, Search, Loader2, CheckCircle2,
  AlertCircle, BookOpen, Zap, FileText,
} from 'lucide-react';

const SAMPLE_DOCS = [
  {
    label: 'Return Policy',
    title: 'Return Policy',
    text: 'Our return policy allows returns within 30 days of purchase. Items must be unused and in original packaging. Refunds are processed within 5-7 business days. Sale items are final sale and cannot be returned. To initiate a return, contact support@company.com with your order number. Exchanges are available for defective items within 60 days.',
  },
  {
    label: 'Shipping Policy',
    title: 'Shipping Policy',
    text: 'We offer free shipping on orders over $50. Standard shipping takes 3-5 business days. Express shipping (1-2 days) costs $15. International shipping is available to 50+ countries with delivery in 7-14 business days. Orders placed before 2pm EST ship same day. Tracking information is emailed once the order leaves our warehouse.',
  },
  {
    label: 'Support Hours',
    title: 'Support Hours & SLA',
    text: 'Our support team is available Monday-Friday 9am-6pm EST. Average response time is under 2 hours. For urgent issues call our hotline at 1-800-SUPPORT. Weekend support is available for Premium customers with a guaranteed 4-hour response time. All tickets are acknowledged within 30 minutes during business hours.',
  },
];

const SAMPLE_QUESTIONS = [
  "Can I return a sale item?",
  "How long does shipping take?",
  "When is support available?",
];

function SourceBadge({ grounded, sourcesUsed }) {
  if (grounded) {
    return (
      <span className="badge badge-important" style={{ fontSize: '0.72rem' }}>
        <Zap size={11} /> Grounded in {sourcesUsed} source{sourcesUsed !== 1 ? 's' : ''}
      </span>
    );
  }
  return (
    <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
      <AlertCircle size={11} /> No relevant docs found
    </span>
  );
}

export default function RAGKnowledge() {
  // Upload state
  const [docText, setDocText]     = useState('');
  const [docTitle, setDocTitle]   = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  // Status
  const [status, setStatus] = useState({ documentsCount: 0, ready: false });

  // Reply state
  const [question, setQuestion]   = useState('');
  const [result, setResult]       = useState(null);
  const [replying, setReplying]   = useState(false);
  const [replyError, setReplyError] = useState('');

  useEffect(() => { fetchStatus(); }, []);

  async function fetchStatus() {
    try {
      const { data } = await axios.get('/api/rag/status');
      setStatus(data);
    } catch (_) {}
  }

  async function handleUpload() {
    if (!docText.trim()) return;
    setUploading(true);
    setUploadMsg('');
    try {
      const { data } = await axios.post('/api/rag/upload', {
        text: docText,
        title: docTitle || 'Untitled',
      });
      setUploadMsg(`"${data.title}" added — ${data.chunksAdded} chunk${data.chunksAdded !== 1 ? 's' : ''} indexed.`);
      setDocText('');
      setDocTitle('');
      await fetchStatus();
    } catch (e) {
      setUploadMsg('Error: ' + (e.response?.data?.error || e.message));
    } finally {
      setUploading(false);
    }
  }

  async function handleReply() {
    setReplyError('');
    setResult(null);
    setReplying(true);
    try {
      const { data } = await axios.post('/api/rag/reply', { customerMessage: question });
      setResult(data);
    } catch (e) {
      setReplyError(e.response?.data?.error || e.message);
    } finally {
      setReplying(false);
    }
  }

  return (
    <div>
      <div className="mb-2">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>RAG Knowledge Base</h2>
        <p className="text-muted text-sm">Upload company docs, then generate replies grounded in your knowledge base</p>
      </div>

      {/* Status bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.6rem 1rem',
        background: status.ready ? 'var(--success-light)' : 'var(--bg)',
        border: `1px solid ${status.ready ? 'var(--success)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-sm)',
        marginBottom: '1.25rem',
        fontSize: '0.85rem',
      }}>
        <Database size={15} style={{ color: status.ready ? 'var(--success)' : 'var(--text-muted)', flexShrink: 0 }} />
        {status.ready
          ? <span style={{ color: '#15803d', fontWeight: 600 }}>{status.documentsCount} document{status.documentsCount !== 1 ? 's' : ''} in knowledge base · {status.chunksCount} chunks indexed</span>
          : <span style={{ color: 'var(--text-muted)' }}>Knowledge base empty — add documents below</span>
        }
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>

        {/* LEFT — Upload */}
        <div>
          <div className="card">
            <div className="flex-gap mb-2" style={{ color: 'var(--primary)' }}>
              <Upload size={16} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Add to Knowledge Base</span>
            </div>

            <div className="form-group">
              <label>Document title</label>
              <input
                className="input"
                placeholder="e.g. Return Policy"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Document content</label>
              <textarea
                className="textarea"
                style={{ minHeight: 160 }}
                placeholder="Paste company document, FAQ, or policy text here…"
                value={docText}
                onChange={(e) => setDocText(e.target.value)}
              />
            </div>

            <div className="flex-gap flex-wrap gap-1 mb-2">
              <span className="text-xs text-muted">Quick fill:</span>
              {SAMPLE_DOCS.map((s) => (
                <button
                  key={s.label}
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setDocText(s.text); setDocTitle(s.title); }}
                >
                  <FileText size={11} /> {s.label}
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={uploading || !docText.trim()}
              onClick={handleUpload}
            >
              {uploading
                ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : <Upload size={14} />}
              {uploading ? 'Indexing…' : 'Add to Knowledge Base'}
            </button>

            {uploadMsg && (
              <div className={`alert mt-2 ${uploadMsg.startsWith('Error') ? 'alert-error' : 'alert-success'}`}>
                {uploadMsg.startsWith('Error')
                  ? <AlertCircle size={13} style={{ flexShrink: 0 }} />
                  : <CheckCircle2 size={13} style={{ flexShrink: 0 }} />}
                {uploadMsg}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — RAG reply */}
        <div>
          <div className="card">
            <div className="flex-gap mb-2" style={{ color: 'var(--primary)' }}>
              <Search size={16} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>RAG-Powered Reply</span>
            </div>

            <div className="form-group">
              <label>Customer message</label>
              <textarea
                className="textarea"
                style={{ minHeight: 100 }}
                placeholder="Paste a customer question or message…"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            <div className="flex-gap flex-wrap gap-1 mb-2">
              <span className="text-xs text-muted">Try:</span>
              {SAMPLE_QUESTIONS.map((q) => (
                <button key={q} className="btn btn-ghost btn-sm" onClick={() => setQuestion(q)}>
                  {q}
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={replying || !question.trim()}
              onClick={handleReply}
            >
              {replying
                ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : <BookOpen size={14} />}
              {replying ? 'Searching & generating…' : 'Generate Grounded Reply'}
            </button>
          </div>

          {replyError && (
            <div className="alert alert-error mt-2">
              <AlertCircle size={14} style={{ flexShrink: 0 }} /> {replyError}
            </div>
          )}

          {result && !replying && (
            <div className="card card-highlight mt-2">
              <div className="flex-between mb-2">
                <SourceBadge grounded={result.grounded} sourcesUsed={result.sourcesUsed} />
              </div>

              <p style={{
                fontSize: '0.9rem',
                lineHeight: 1.65,
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
              }}>
                {result.reply}
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          div[style*="gridTemplateColumns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
