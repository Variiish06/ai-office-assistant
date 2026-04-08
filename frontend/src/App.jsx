import { useState } from 'react';
import { Inbox, Calendar, MessageSquare, Briefcase, Database } from 'lucide-react';
import EmailTriage from './components/EmailTriage.jsx';
import CalendarScheduler from './components/CalendarScheduler.jsx';
import SupportReply from './components/SupportReply.jsx';
import MeetingBrief from './components/MeetingBrief.jsx';
import RAGKnowledge from './components/RAGKnowledge.jsx';
import CommandBar from './components/CommandBar.jsx';

const TABS = [
  { id: 'triage',    label: 'Email Triage',      Icon: Inbox },
  { id: 'calendar',  label: 'Calendar',           Icon: Calendar },
  { id: 'support',   label: 'Customer Support',   Icon: MessageSquare },
  { id: 'brief',     label: 'Meeting Brief',      Icon: Briefcase },
  { id: 'knowledge', label: 'Knowledge Base',     Icon: Database },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('triage');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '1.25rem 1.5rem 0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="flex-between mb-1">
            <div>
              <h1 style={{
                fontSize: 'clamp(1.1rem, 3vw, 1.5rem)',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1.2,
              }}>
                AI Office Assistant
              </h1>
              <p style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                fontWeight: 500,
                marginTop: '0.15rem',
              }}>
                OpenEnv Hackathon · Meta × Scaler
              </p>
            </div>
          </div>

          {/* Tab navigation */}
          <nav style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', overflowX: 'auto' }}>
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: activeTab === id ? 700 : 500,
                  color: activeTab === id ? 'var(--primary)' : 'var(--text-secondary)',
                  borderBottom: activeTab === id ? '2px solid var(--primary)' : '2px solid transparent',
                  whiteSpace: 'nowrap',
                  transition: 'color 150ms ease, border-color 150ms ease',
                  marginBottom: '-1px',
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main content — extra bottom padding so CommandBar never overlaps */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem 1rem 8rem' }}>
        {activeTab === 'triage'    && <EmailTriage />}
        {activeTab === 'calendar'  && <CalendarScheduler />}
        {activeTab === 'support'   && <SupportReply />}
        {activeTab === 'brief'     && <MeetingBrief />}
        {activeTab === 'knowledge' && <RAGKnowledge />}
      </main>

      <CommandBar setActiveTab={setActiveTab} />
    </div>
  );
}
