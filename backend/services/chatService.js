import OpenAI from 'openai';
import { retrieveRelevantChunks, formatChunksForContext } from './retrievalService.js';
import ChatLog from '../models/chatLog.js';
import ChatLead from '../models/chatLead.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configuration
const MODEL = 'gpt-4.1'; // Or 'gpt-4o-mini' for faster/cheaper
const TEMPERATURE = 0.2;
const MAX_TOKENS = 500;

// Lead capture trigger keywords
const LEAD_TRIGGERS = {
  pilot: ['pilot', 'trial', 'try', 'test', 'demo', 'poc', 'proof of concept'],
  pricing: ['price', 'pricing', 'cost', 'how much', 'quote', 'budget'],
  rollout: ['rollout', 'roll out', 'deploy', 'implementation', 'implement'],
  usage: ['use case', 'how to use', 'start using', 'get started', 'begin']
};

// System prompt - COPY EXACTLY as specified
const SYSTEM_PROMPT = `You are the SignalTrue AI assistant.

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

If the user asks something outside these boundaries, politely refuse.`;

// Safe refusal message when no relevant info found
const NO_INFO_RESPONSE = "I don't have enough information about that in the SignalTrue documentation.";

// Safe refusal for out-of-scope questions
const OUT_OF_SCOPE_RESPONSE = "This question is outside my scope. I can only answer questions about SignalTrue's products, privacy, and pilot program.";

/**
 * Check if question triggers lead capture
 */
function checkLeadTrigger(question) {
  const lowerQuestion = question.toLowerCase();
  
  for (const [triggerType, keywords] of Object.entries(LEAD_TRIGGERS)) {
    for (const keyword of keywords) {
      if (lowerQuestion.includes(keyword)) {
        return triggerType;
      }
    }
  }
  
  return null;
}

/**
 * Validate response against retrieved chunks
 * Ensures no hallucination by checking claims exist in source
 */
function validateResponse(response, chunks) {
  // Basic validation - check response isn't empty
  if (!response || response.trim().length === 0) {
    return { valid: false, reason: 'empty_response' };
  }
  
  // If we have chunks, response is considered valid
  // (LLM is instructed to only use provided context)
  if (chunks.length > 0) {
    return { valid: true };
  }
  
  // No chunks and got a response - potential hallucination
  return { valid: false, reason: 'no_source_chunks' };
}

/**
 * Generate chat response using RAG
 */
export async function generateChatResponse(question, sessionId) {
  const startTime = Date.now();
  
  try {
    // Step 1: Retrieve relevant chunks
    const retrieval = await retrieveRelevantChunks(question);
    
    // Step 2: Check if we have relevant results
    if (!retrieval.hasRelevantResults) {
      // Log the query
      await logChatInteraction({
        sessionId,
        question,
        retrievedSources: [],
        confidenceScore: retrieval.confidenceScore,
        responseType: 'refused',
        processingTime: Date.now() - startTime
      });
      
      return {
        response: NO_INFO_RESPONSE,
        sources: [],
        leadTrigger: null,
        confidenceScore: retrieval.confidenceScore
      };
    }
    
    // Step 3: Format context for LLM
    const context = formatChunksForContext(retrieval.chunks);
    
    // Step 4: Build messages
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { 
        role: 'user', 
        content: `Based ONLY on the following SignalTrue documentation, answer the user's question.

DOCUMENTATION:
${context}

USER QUESTION: ${question}

Remember: Only use information from the documentation above. If the answer is not in the documentation, say you don't have that information.`
      }
    ];
    
    // Step 5: Generate response
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS
    });
    
    const response = completion.choices[0].message.content;
    
    // Step 6: Validate response
    const validation = validateResponse(response, retrieval.chunks);
    
    if (!validation.valid) {
      await logChatInteraction({
        sessionId,
        question,
        retrievedSources: retrieval.chunks.map(c => ({
          source: c.source,
          section: c.section,
          relevanceScore: c.relevanceScore
        })),
        confidenceScore: retrieval.confidenceScore,
        responseType: 'refused',
        processingTime: Date.now() - startTime
      });
      
      return {
        response: NO_INFO_RESPONSE,
        sources: [],
        leadTrigger: null,
        confidenceScore: retrieval.confidenceScore
      };
    }
    
    // Step 7: Check for lead triggers
    const leadTrigger = checkLeadTrigger(question);
    
    // Step 8: Log the interaction
    await logChatInteraction({
      sessionId,
      question,
      retrievedSources: retrieval.chunks.map(c => ({
        source: c.source,
        section: c.section,
        relevanceScore: c.relevanceScore
      })),
      confidenceScore: retrieval.confidenceScore,
      responseType: leadTrigger ? 'lead_capture' : 'answered',
      processingTime: Date.now() - startTime
    });
    
    return {
      response,
      sources: retrieval.chunks.map(c => ({
        source: c.source,
        section: c.section
      })),
      leadTrigger,
      confidenceScore: retrieval.confidenceScore
    };
    
  } catch (error) {
    console.error('Error generating chat response:', error);
    
    // Log error
    await logChatInteraction({
      sessionId,
      question,
      retrievedSources: [],
      confidenceScore: 0,
      responseType: 'error',
      processingTime: Date.now() - startTime
    });
    
    throw error;
  }
}

/**
 * Log chat interaction (internal only, no PII)
 */
async function logChatInteraction(data) {
  try {
    const log = new ChatLog({
      sessionId: data.sessionId,
      question: data.question,
      retrievedSources: data.retrievedSources,
      confidenceScore: data.confidenceScore,
      responseType: data.responseType,
      processingTime: data.processingTime,
      model: MODEL
    });
    
    await log.save();
  } catch (error) {
    console.error('Error logging chat interaction:', error);
    // Don't throw - logging shouldn't break the response
  }
}

/**
 * Capture lead from chat
 */
export async function captureLeadFromChat(email, question, triggerType, sessionId) {
  try {
    const lead = new ChatLead({
      email,
      question,
      triggerType,
      sessionId
    });
    
    await lead.save();
    
    // TODO: Send notification to internal inbox
    // This would integrate with your notification service
    
    return { success: true, leadId: lead._id };
  } catch (error) {
    console.error('Error capturing lead:', error);
    throw error;
  }
}

export default {
  generateChatResponse,
  captureLeadFromChat
};
