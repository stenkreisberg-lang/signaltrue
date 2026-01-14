# SignalTrue AI Chat Assistant - Developer Documentation

## Overview

The SignalTrue AI Chat is a documentation-based assistant that answers user questions **only** from approved SignalTrue documentation. It does not access customer data, analyze messages, or learn from conversations.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ChatWidget.tsx - Floating chat component                │   │
│  │  - Suggested prompts                                     │   │
│  │  - Lead capture form                                     │   │
│  │  - Source attribution                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend API                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  /api/chat/message - Main chat endpoint                  │   │
│  │  /api/chat/lead - Lead capture endpoint                  │   │
│  │  /api/chat/index - Document indexing (admin)             │   │
│  │  /api/chat/stats - Usage statistics (admin)              │   │
│  │  /api/chat/suggested-prompts - Quick prompts             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      RAG Pipeline                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Embedding    │  │ Retrieval    │  │ Chat Service         │  │
│  │ Service      │→ │ Service      │→ │ - System prompt      │  │
│  │ - Chunking   │  │ - Top-K      │  │ - Response validation│  │
│  │ - OpenAI     │  │ - Threshold  │  │ - Lead detection     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        MongoDB                                   │
│  DocumentChunk - Embedded document chunks                       │
│  ChatLog - Anonymized interaction logs                          │
│  ChatLead - Captured leads                                      │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
backend/
├── models/
│   ├── documentChunk.js    # Vector storage schema
│   ├── chatLead.js         # Lead capture schema
│   └── chatLog.js          # Interaction logging schema
├── services/
│   ├── embeddingService.js # Document chunking & embeddings
│   ├── retrievalService.js # Vector similarity search
│   └── chatService.js      # RAG chat orchestration
├── routes/
│   └── chat.js             # API endpoints
└── scripts/
    └── indexDocs.js        # Document indexing script

docs/                       # Knowledge base (single source of truth)
├── product_overview.md
├── how_signaltrue_works.md
├── data_sources.md
├── privacy_and_gdpr.md
├── pilot_process.md
├── faq_hr.md
├── faq_it.md
├── faq_ceo.md
└── what_we_do_not_do.md

src/
└── components/
    └── ChatWidget.tsx      # Frontend chat widget
```

## Setup Instructions

### 1. Environment Variables

Add to `backend/.env`:

```bash
# Required for AI Chat
OPENAI_API_KEY=sk-...

# Admin API key for indexing and stats
ADMIN_API_KEY=your-secure-key
```

### 2. Index Documents

Run the indexing script to embed all documentation:

```bash
cd backend
node scripts/indexDocs.js
```

This will:
- Read all markdown files from `/docs`
- Split into 300-500 token chunks
- Generate embeddings using OpenAI text-embedding-3-large
- Store in MongoDB with metadata

### 3. Start the Application

```bash
# Backend
cd backend
npm start

# Frontend
npm start
```

## API Reference

### POST /api/chat/message

Send a question to the AI assistant.

**Request:**
```json
{
  "question": "What data does SignalTrue analyze?",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "response": "SignalTrue analyzes only metadata...",
  "sources": [
    { "source": "data_sources.md", "section": "Overview" }
  ],
  "leadTrigger": null,
  "sessionId": "abc123",
  "confidenceScore": 0.85
}
```

### POST /api/chat/lead

Capture a lead from the chat.

**Request:**
```json
{
  "email": "user@example.com",
  "question": "How do I start a pilot?",
  "triggerType": "pilot",
  "sessionId": "abc123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Thank you! We will contact you soon."
}
```

### POST /api/chat/index (Admin)

Re-index all documentation.

**Headers:** `x-admin-key: your-admin-key`

**Response:**
```json
{
  "success": true,
  "totalChunks": 45
}
```

### GET /api/chat/stats (Admin)

Get chat usage statistics.

**Headers:** `x-admin-key: your-admin-key`

**Response:**
```json
{
  "totalQuestions": 150,
  "questions24h": 12,
  "answeredCount": 140,
  "refusedCount": 10,
  "answerRate": 93.3,
  "totalLeads": 5,
  "topSources": [...]
}
```

## System Prompt (Critical)

The system prompt is defined in `chatService.js`. **Do not modify** without review:

```
You are the SignalTrue AI assistant.

Rules you must always follow:
- Answer ONLY using the provided SignalTrue documentation.
- Do NOT use general knowledge or assumptions.
- If the answer is not in the documents, say you do not have that information.
- Never speculate.
- Never describe or imply employee monitoring.
- Never claim to read messages, emails, or chat content.
- SignalTrue analyzes only metadata and only at team level (minimum 5 people).
- Be clear, factual, and concise.
- If a question concerns security, privacy, or compliance, prioritize those aspects.
- If a question indicates buying intent, suggest contacting SignalTrue.

If the user asks something outside these boundaries, politely refuse.
```

## Response Validation

Before any response is returned:

1. Check that retrieval found relevant chunks (threshold: 0.5)
2. If no relevant chunks, return safe refusal message
3. Validate response isn't empty
4. Log interaction (no PII)

## Lead Capture Triggers

Questions containing these keywords trigger lead capture:

- **pilot**: pilot, trial, try, test, demo, poc
- **pricing**: price, pricing, cost, how much, quote
- **rollout**: rollout, deploy, implementation
- **usage**: use case, how to use, start using, get started

## Security Measures

1. **No PII logging** - Only question text and sources logged
2. **Session IDs are anonymous** - No user identification
3. **No conversation history** - Each request is independent
4. **API key protection** - Admin endpoints require key
5. **Instant disable** - Remove route from server.js to disable

## Monitoring

Use the `/api/chat/stats` endpoint to monitor:

- Answer rate (should be >90%)
- Refused questions (indicates missing docs)
- Lead capture effectiveness
- Top document sources

## Updating Documentation

When updating the knowledge base:

1. Edit files in `/docs`
2. Run indexing script: `node scripts/indexDocs.js`
3. Verify with test questions

## Troubleshooting

### Chat returns "I don't have enough information about that"

- Check if documents are indexed (run indexing script)
- Verify the topic is covered in documentation
- Check similarity threshold in retrievalService.js

### Low confidence scores

- Add more specific content to documentation
- Ensure questions match document terminology
- Check chunk sizes aren't too small

### Lead capture not triggering

- Verify keywords in chatService.js
- Check that leadTrigger is returned in response
- Ensure frontend handles leadTrigger correctly

## Definition of Done ✅

- [x] Never answers outside docs
- [x] Refuses confidently when info missing
- [x] Never mentions reading content
- [x] Reinforces privacy positioning
- [x] Generates qualified leads
- [x] No hallucination
- [x] No surveillance implications
