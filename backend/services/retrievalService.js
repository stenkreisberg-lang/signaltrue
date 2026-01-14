import DocumentChunk from '../models/documentChunk.js';
import { getQueryEmbedding, cosineSimilarity } from './embeddingService.js';

// Configuration
const TOP_K = 5; // Number of chunks to retrieve
const RELEVANCE_THRESHOLD = 0.5; // Minimum similarity score

/**
 * Retrieve relevant document chunks for a query
 */
export async function retrieveRelevantChunks(query) {
  try {
    // Get query embedding
    const queryEmbedding = await getQueryEmbedding(query);
    
    // Get all document chunks
    const allChunks = await DocumentChunk.find({}).lean();
    
    if (allChunks.length === 0) {
      console.warn('⚠️ No document chunks found in database. Run indexing first.');
      return {
        chunks: [],
        confidenceScore: 0,
        hasRelevantResults: false
      };
    }
    
    // Calculate similarity scores
    const scoredChunks = allChunks.map(chunk => ({
      ...chunk,
      relevanceScore: cosineSimilarity(queryEmbedding, chunk.embedding)
    }));
    
    // Sort by relevance
    scoredChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Get top K chunks above threshold
    const relevantChunks = scoredChunks
      .filter(chunk => chunk.relevanceScore >= RELEVANCE_THRESHOLD)
      .slice(0, TOP_K);
    
    // Calculate overall confidence score
    const avgConfidence = relevantChunks.length > 0
      ? relevantChunks.reduce((sum, c) => sum + c.relevanceScore, 0) / relevantChunks.length
      : 0;
    
    return {
      chunks: relevantChunks.map(chunk => ({
        source: chunk.source,
        section: chunk.section,
        content: chunk.content,
        relevanceScore: chunk.relevanceScore
      })),
      confidenceScore: avgConfidence,
      hasRelevantResults: relevantChunks.length > 0 && avgConfidence >= RELEVANCE_THRESHOLD
    };
  } catch (error) {
    console.error('Error retrieving chunks:', error);
    throw error;
  }
}

/**
 * Format retrieved chunks for LLM context
 */
export function formatChunksForContext(chunks) {
  if (chunks.length === 0) {
    return '';
  }
  
  const contextParts = chunks.map((chunk, index) => {
    return `[Source: ${chunk.source} | Section: ${chunk.section}]
${chunk.content}`;
  });
  
  return contextParts.join('\n\n---\n\n');
}

export default {
  retrieveRelevantChunks,
  formatChunksForContext
};
