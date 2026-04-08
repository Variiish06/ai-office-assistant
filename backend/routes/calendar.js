import { Router } from 'express';
import { findAndBookSlot } from '../services/claudeService.js';
import { getEventsForRange, createEvent } from '../services/calendarService.js';

const router = Router();

function getDateString(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

// POST /api/calendar/schedule
router.post('/schedule', async (req, res) => {
  try {
    const { title, duration = 60, preferredDay, notes } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Meeting title is required' });
    }

    const today = getDateString(0);
    const nextWeek = getDateString(7);
    const existingEvents = await getEventsForRange(today, nextWeek);

    const meetingDetails = {
      title,
      duration,
      preferredDay,
      notes,
      today,
    };

    const slot = await findAndBookSlot(meetingDetails, existingEvents);

    let eventId = null;
    let calendarLink = null;

    if (slot.conflict_free) {
      const created = await createEvent(
        title,
        slot.suggested_date,
        slot.start_time,
        slot.end_time,
        notes || ''
      );
      eventId = created.id;
      calendarLink = created.link;
    }

    const conflictsWith = existingEvents
      .filter((e) => {
        if (e.date !== slot.suggested_date) return false;
        return e.startTime < slot.end_time && e.endTime > slot.start_time;
      })
      .map((e) => e.title);

    res.json({
      suggestedTime: `${slot.start_time} – ${slot.end_time}`,
      displayTime: slot.display_time,
      rationale: slot.rationale,
      conflictFree: slot.conflict_free,
      eventId,
      calendarLink,
      conflictsWith,
    });
  } catch (err) {
    console.error('[POST /api/calendar/schedule]', err);
    res.status(500).json({ error: err.message, code: 'SCHEDULE_ERROR' });
  }
});

// GET /api/calendar/events
router.get('/events', async (req, res) => {
  try {
    const today = getDateString(0);
    const tomorrow = getDateString(1);
    const start = req.query.start || today;
    const end = req.query.end || tomorrow;

    const events = await getEventsForRange(start, end);
    res.json({ events });
  } catch (err) {
    console.error('[GET /api/calendar/events]', err);
    res.status(500).json({ error: err.message, code: 'EVENTS_ERROR' });
  }
});

export default router;
