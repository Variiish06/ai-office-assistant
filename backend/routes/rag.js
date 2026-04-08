import { Router } from 'express';
import multer from 'multer';
import { addDocument, searchDocuments, generateRAGReply, getStatus } from '../services/ragService.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/rag/upload  — accept JSON body or multipart file
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    let text, title;

    if (req.file) {
      // File upload (text/plain)
      text  = req.file.buffer.toString('utf-8');
      title = req.file.originalname;
    } else {
      ({ text, title } = req.body);
    }

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    title = title || 'Untitled document';
    const chunksAdded = await addDocument(text.trim(), { title });
    res.json({ success: true, chunksAdded, title });
  } catch (err) {
    console.error('[POST /api/rag/upload]', err);
    res.status(500).json({ error: err.message, code: 'RAG_UPLOAD_ERROR' });
  }
});

// POST /api/rag/search
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'query is required' });
    const results = await searchDocuments(query, 3);
    res.json({ results });
  } catch (err) {
    console.error('[POST /api/rag/search]', err);
    res.status(500).json({ error: err.message, code: 'RAG_SEARCH_ERROR' });
  }
});

// POST /api/rag/reply
router.post('/reply', async (req, res) => {
  try {
    const { customerMessage } = req.body;
    if (!customerMessage) return res.status(400).json({ error: 'customerMessage is required' });
    const result = await generateRAGReply(customerMessage);
    res.json(result);
  } catch (err) {
    console.error('[POST /api/rag/reply]', err);
    res.status(500).json({ error: err.message, code: 'RAG_REPLY_ERROR' });
  }
});

// GET /api/rag/status
router.get('/status', (_req, res) => {
  res.json(getStatus());
});

export default router;
