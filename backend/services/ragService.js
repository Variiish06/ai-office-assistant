/**
 * RAG service — in-memory vector store with @xenova/transformers embeddings.
 *
 * Note: `chromadb` (also installed) requires a running Chroma HTTP server, so
 * this service uses an equivalent in-process store for zero-config demo use.
 * To switch to a real Chroma server later, replace VectorStore with ChromaDB calls.
 */
import { pipeline } from '@xenova/transformers';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.1-8b-instant';

// ── Embedding pipeline (lazy singleton) ─────────────────────
let _extractor = null;
async function getExtractor() {
  if (!_extractor) {
    _extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return _extractor;
}

async function embed(text) {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// ── In-memory vector store ───────────────────────────────────
const store = []; // { id, text, metadata, embedding }
let nextId = 0;

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

// ── Text chunking ────────────────────────────────────────────
function chunkText(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end).trim());
    start += chunkSize - overlap;
  }
  return chunks.filter((c) => c.length > 20);
}

// ── Public API ───────────────────────────────────────────────

/**
 * Add a document to the knowledge base.
 * Returns the number of chunks stored.
 */
export async function addDocument(text, metadata = {}) {
  const chunks = chunkText(text);
  for (const chunk of chunks) {
    const embedding = await embed(chunk);
    store.push({ id: nextId++, text: chunk, metadata, embedding });
  }
  return chunks.length;
}

/**
 * Search for the most relevant chunks.
 */
export async function searchDocuments(query, nResults = 3) {
  if (store.length === 0) return [];
  const queryEmbedding = await embed(query);
  const scored = store.map((doc) => ({
    text: doc.text,
    metadata: doc.metadata,
    distance: 1 - cosineSimilarity(queryEmbedding, doc.embedding),
  }));
  scored.sort((a, b) => a.distance - b.distance);
  return scored.slice(0, nResults);
}

/**
 * Generate a RAG-grounded support reply.
 */
export async function generateRAGReply(customerMessage) {
  const hits = await searchDocuments(customerMessage, 3);

  const RELEVANCE_THRESHOLD = 0.45; // cosine distance < 0.45 means fairly similar
  const relevant = hits.filter((h) => h.distance < RELEVANCE_THRESHOLD);
  const grounded = relevant.length > 0;

  const context = grounded
    ? relevant.map((h, i) => `[Source ${i + 1}] ${h.text}`).join('\n\n')
    : 'No relevant documents found in the knowledge base.';

  const systemPrompt =
    'You are a customer support agent. Use the following company knowledge base to answer accurately.\n\n' +
    `Knowledge base:\n${context}\n\n` +
    "If the knowledge base doesn't contain relevant info, say so honestly. " +
    'Write a helpful reply under 150 words.';

  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 400,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: customerMessage },
    ],
  });

  return {
    reply: response.choices[0].message.content,
    sourcesUsed: relevant.length,
    grounded,
  };
}

/**
 * Return store stats.
 */
export function getStatus() {
  const titles = [...new Set(store.map((d) => d.metadata?.title).filter(Boolean))];
  return { documentsCount: titles.length, chunksCount: store.length, ready: store.length > 0 };
}
