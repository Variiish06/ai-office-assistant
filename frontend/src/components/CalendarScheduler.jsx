import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Calendar, Clock, Loader2, RefreshCw, CheckCircle2,
  AlertTriangle, ExternalLink, Plus,
} from 'lucide-react';

const DURATIONS = [
  { value: 15,  label: '15 min' },
  { value: 30,  label: '30 min' },
  { value: 45,  label: '45 min' },
  { value: 60,  label: '1 hour' },
  { value: 90,  label: '1.5 hours' },
];

const PREFERRED_DAYS = [
  { value: 'today',     label: 'Today' },
  { value: 'tomorrow',  label: 'Tomorrow' },
  { value: 'this week', label: 'This week' },
  { value: 'next week', label: 'Next week' },
];

const EVENT_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899'];

function EventBlock({ event, index }) {
  const color = EVENT_COLORS[index % EVENT_COLORS.length];
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      padding: '0.5rem 0.75rem',
      borderRadius: 'var(--radius-sm)',
      background: `${color}18`,
      borderLeft: `3px solid ${color}`,
      marginBottom: '0.4rem',
    }}>
      <Clock size={13} style={{ color, flexShrink: 0 }} />
      <div>
        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {event.title}
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {event.startTime} – {event.endTime}
        </p>
      </div>
    </div>
  );
}

export default function CalendarScheduler() {
  const [form, setForm] = useState({
    title: '',
    duration: 60,
    preferredDay: 'tomorrow',
    attendees: '',
    notes: '',
  });
  const [events, setEvents]     = useState([]);
  const [eventsLoading, setEvtL]= useState(false);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');

  useEffect(() => { fetchEvents(); }, []);

  async function fetchEvents() {
    setEvtL(true);
    try {
      const { data } = await axios.get('/api/calendar/events');
      setEvents(data.events || []);
    } catch (e) {
      console.warn('Could not fetch events:', e.message);
    } finally {
      setEvtL(false);
    }
  }

  function updateForm(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function schedule() {
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const { data } = await axios.post('/api/calendar/schedule', {
        title: form.title,
        duration: Number(form.duration),
        preferredDay: form.preferredDay,
        notes: [form.attendees ? `Attendees: ${form.attendees}` : '', form.notes].filter(Boolean).join('. '),
      });
      setResult(data);
      fetchEvents();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({ title: '', duration: 60, preferredDay: 'tomorrow', attendees: '', notes: '' });
    setResult(null);
    setError('');
  }

  // Group events by date
  const today     = new Date().toISOString().split('T')[0];
  const tomorrow  = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const todayEvts = events.filter((e) => e.date === today);
  const tmrwEvts  = events.filter((e) => e.date === tomorrow);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.25rem', alignItems: 'start' }}>
      {/* Left: form + result */}
      <div>
        <div className="mb-2">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Schedule a Meeting</h2>
          <p className="text-muted text-sm">Claude finds free slots that avoid calendar conflicts</p>
        </div>

        {!result ? (
          <div className="card">
            <div className="form-group">
              <label>Meeting title *</label>
              <input
                className="input"
                placeholder="e.g. Product sync with design team"
                value={form.title}
                onChange={(e) => updateForm('title', e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Duration</label>
                <select className="select" value={form.duration} onChange={(e) => updateForm('duration', e.target.value)}>
                  {DURATIONS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Preferred day</label>
                <select className="select" value={form.preferredDay} onChange={(e) => updateForm('preferredDay', e.target.value)}>
                  {PREFERRED_DAYS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Attendee emails</label>
              <input
                className="input"
                placeholder="alice@co.com, bob@co.com"
                value={form.attendees}
                onChange={(e) => updateForm('attendees', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Notes / constraints</label>
              <textarea
                className="textarea"
                style={{ minHeight: 70 }}
                placeholder="e.g. Avoid Monday mornings, prefer afternoon slots"
                value={form.notes}
                onChange={(e) => updateForm('notes', e.target.value)}
              />
            </div>

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={loading || !form.title.trim()}
              onClick={schedule}
            >
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Calendar size={16} />}
              {loading ? 'Finding free slot…' : 'Find Free Slot & Book'}
            </button>
          </div>
        ) : (
          /* Booking result */
          <div className="card card-highlight">
            <div className="flex-gap mb-2" style={{ color: 'var(--success)' }}>
              <CheckCircle2 size={22} />
              <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {result.conflictFree ? 'Meeting Booked!' : 'Slot Suggested'}
              </span>
            </div>

            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', margin: '0.25rem 0' }}>
              {result.displayTime}
            </p>

            <p className="text-muted text-sm mb-2">{result.rationale}</p>

            {!result.conflictFree && result.conflictsWith?.length > 0 && (
              <div className="alert alert-warning mb-2">
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                <span>Potential conflicts: {result.conflictsWith.join(', ')}</span>
              </div>
            )}

            <div className="flex-gap flex-wrap gap-1">
              {result.calendarLink && (
                <a
                  className="btn btn-primary btn-sm"
                  href={result.calendarLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={13} /> Open in Calendar
                </a>
              )}
              <button className="btn btn-ghost btn-sm" onClick={resetForm}>
                <Plus size={13} /> Book Another
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error mt-2">
            <AlertTriangle size={14} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}
      </div>

      {/* Right: today's schedule sidebar */}
      <div>
        <div className="card" style={{ position: 'sticky', top: 90 }}>
          <div className="flex-between mb-2">
            <div className="flex-gap">
              <Calendar size={15} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Schedule</span>
            </div>
            <button className="btn btn-ghost btn-sm" disabled={eventsLoading} onClick={fetchEvents}>
              <RefreshCw size={12} style={eventsLoading ? { animation: 'spin 1s linear infinite' } : {}} />
            </button>
          </div>

          {eventsLoading ? (
            <div>
              {[1, 2].map((n) => (
                <div key={n} className="skeleton" style={{ height: 46, marginBottom: 6, borderRadius: 'var(--radius-sm)' }} />
              ))}
            </div>
          ) : (
            <>
              {todayEvts.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-muted text-bold mb-1" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today</p>
                  {todayEvts.map((e, i) => <EventBlock key={e.id} event={e} index={i} />)}
                </div>
              )}

              {tmrwEvts.length > 0 && (
                <div>
                  <p className="text-xs text-muted text-bold mb-1" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tomorrow</p>
                  {tmrwEvts.map((e, i) => <EventBlock key={e.id} event={e} index={i + todayEvts.length} />)}
                </div>
              )}

              {todayEvts.length === 0 && tmrwEvts.length === 0 && (
                <div className="text-center" style={{ padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                  <Calendar size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  <p className="text-sm">No events today</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
