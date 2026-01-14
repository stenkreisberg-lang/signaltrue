import mongoose from 'mongoose';

/**
 * DocumentChunk Schema
 * Stores chunked documentation with embeddings for RAG retrieval
 */
const documentChunkSchema = new mongoose.Schema({
  // Source document information
  source: {
    type: String,
    required: true,
    index: true
  },
  section: {
    type: String,
    required: true
  },
  
  // Chunk content
  content: {
    type: String,
    required: true
  },
  
  // Token count for chunk management
  tokenCount: {
    type: Number,
    required: true
  },
  
  // OpenAI embedding vector (text-embedding-3-large = 3072 dimensions)
  embedding: {
    type: [Number],
    required: true
  },
  
  // Chunk order within document
  chunkIndex: {
    type: Number,
    required: true
  },
  
  // Hash of content for deduplication
  contentHash: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient retrieval
documentChunkSchema.index({ source: 1, chunkIndex: 1 });

export default mongoose.model('DocumentChunk', documentChunkSchema);
