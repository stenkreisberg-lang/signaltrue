import OpenAI from 'openai';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import DocumentChunk from '../models/documentChunk.js';

// Check for API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY not set - Embedding service will not function');
}

// Initialize OpenAI client (may be null if no API key)
let openai = null;
if (OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: OPENAI_API_KEY
  });
}

// Configuration
const CHUNK_SIZE_TOKENS = 400; // Target 300-500 tokens
const EMBEDDING_MODEL = 'text-embedding-3-large';

/**
 * Simple token estimation (rough approximation)
 * More accurate would use tiktoken, but this is sufficient for chunking
 */
function estimateTokens(text) {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Generate content hash for deduplication
 */
function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Parse markdown document into sections
 */
function parseMarkdownSections(content, filename) {
  const sections = [];
  const lines = content.split('\n');
  
  let currentSection = {
    title: 'Introduction',
    content: []
  };
  
  for (const line of lines) {
    // Check for headers (# or ##)
    const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
    
    if (headerMatch) {
      // Save previous section if it has content
      if (currentSection.content.length > 0) {
        sections.push({
          title: currentSection.title,
          content: currentSection.content.join('\n').trim()
        });
      }
      
      // Start new section
      currentSection = {
        title: headerMatch[2].trim(),
        content: []
      };
    } else {
      currentSection.content.push(line);
    }
  }
  
  // Save last section
  if (currentSection.content.length > 0) {
    sections.push({
      title: currentSection.title,
      content: currentSection.content.join('\n').trim()
    });
  }
  
  return sections;
}

/**
 * Chunk a section into smaller pieces
 */
function chunkSection(section, source) {
  const chunks = [];
  const content = section.content;
  const tokenEstimate = estimateTokens(content);
  
  if (tokenEstimate <= CHUNK_SIZE_TOKENS) {
    // Section fits in one chunk
    chunks.push({
      source,
      section: section.title,
      content: content,
      tokenCount: tokenEstimate
    });
  } else {
    // Split by paragraphs first
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = [];
    let currentTokens = 0;
    
    for (const para of paragraphs) {
      const paraTokens = estimateTokens(para);
      
      if (currentTokens + paraTokens > CHUNK_SIZE_TOKENS && currentChunk.length > 0) {
        // Save current chunk
        const chunkContent = currentChunk.join('\n\n');
        chunks.push({
          source,
          section: section.title,
          content: chunkContent,
          tokenCount: estimateTokens(chunkContent)
        });
        currentChunk = [para];
        currentTokens = paraTokens;
      } else {
        currentChunk.push(para);
        currentTokens += paraTokens;
      }
    }
    
    // Save remaining content
    if (currentChunk.length > 0) {
      const chunkContent = currentChunk.join('\n\n');
      chunks.push({
        source,
        section: section.title,
        content: chunkContent,
        tokenCount: estimateTokens(chunkContent)
      });
    }
  }
  
  return chunks;
}

/**
 * Generate embedding for text
 */
async function generateEmbedding(text) {
  if (!openai) {
    throw new Error('OpenAI not configured - OPENAI_API_KEY missing');
  }
  
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    throw error;
  }
}

/**
 * Process a single document file
 */
async function processDocument(filePath) {
  const filename = path.basename(filePath);
  console.log(`📄 Processing: ${filename}`);
  
  const content = await fs.readFile(filePath, 'utf-8');
  const sections = parseMarkdownSections(content, filename);
  
  const allChunks = [];
  
  for (const section of sections) {
    if (section.content.trim().length === 0) continue;
    
    const chunks = chunkSection(section, filename);
    allChunks.push(...chunks);
  }
  
  console.log(`   Found ${allChunks.length} chunks`);
  
  // Generate embeddings and save
  const savedChunks = [];
  
  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    const contentHash = hashContent(chunk.content);
    
    // Check if chunk already exists
    const existing = await DocumentChunk.findOne({ contentHash });
    
    if (existing) {
      console.log(`   Chunk ${i + 1}/${allChunks.length} already exists, skipping`);
      savedChunks.push(existing);
      continue;
    }
    
    // Generate embedding
    const embedding = await generateEmbedding(chunk.content);
    
    // Save to database
    const docChunk = new DocumentChunk({
      source: chunk.source,
      section: chunk.section,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
      embedding,
      chunkIndex: i,
      contentHash
    });
    
    await docChunk.save();
    savedChunks.push(docChunk);
    
    console.log(`   Chunk ${i + 1}/${allChunks.length} embedded and saved`);
    
    // Rate limiting - wait briefly between API calls
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return savedChunks;
}

/**
 * Index all documents in the docs folder
 */
export async function indexAllDocuments() {
  const docsDir = path.resolve(process.cwd(), '../docs');
  
  try {
    const files = await fs.readdir(docsDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    console.log(`\n📚 Found ${mdFiles.length} markdown files to index\n`);
    
    let totalChunks = 0;
    
    for (const file of mdFiles) {
      const filePath = path.join(docsDir, file);
      const chunks = await processDocument(filePath);
      totalChunks += chunks.length;
    }
    
    console.log(`\n✅ Indexing complete: ${totalChunks} total chunks\n`);
    
    return { success: true, totalChunks };
  } catch (error) {
    console.error('Error indexing documents:', error);
    throw error;
  }
}

/**
 * Get embedding for user query
 */
export async function getQueryEmbedding(query) {
  return generateEmbedding(query);
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a, b) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export default {
  indexAllDocuments,
  getQueryEmbedding,
  cosineSimilarity
};
