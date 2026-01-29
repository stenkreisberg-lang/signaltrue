import mongoose from "mongoose";

const blogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true
    },
    content: { type: String, required: true },
    excerpt: { type: String, maxlength: 500 },
    author: {
      name: { type: String, required: true },
      email: { type: String },
      avatar: { type: String },
      bio: { type: String }
    },
    featuredImage: {
      url: { type: String },
      alt: { type: String },
      caption: { type: String }
    },
    tags: { type: [String], default: [] },
    categories: { type: [String], default: [] },
    status: { 
      type: String, 
      enum: ["draft", "published", "archived"], 
      default: "draft" 
    },
    publishedAt: { type: Date },
    // External provider integration
    externalProvider: {
      name: { type: String }, // e.g., "contentful", "sanity", "strapi", "wordpress", "ghost"
      externalId: { type: String }, // ID from the external CMS
      syncedAt: { type: Date },
      webhookPayload: { type: mongoose.Schema.Types.Mixed } // Store raw webhook data for debugging
    },
    // SEO fields
    seo: {
      metaTitle: { type: String },
      metaDescription: { type: String },
      canonicalUrl: { type: String },
      ogImage: { type: String }
    },
    // Reading time estimate (in minutes)
    readingTime: { type: Number },
    // View count for analytics
    viewCount: { type: Number, default: 0 },
    // Related posts
    relatedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "BlogPost" }],
    // Featured on homepage
    featured: { type: Boolean, default: false }
  },
  { 
    timestamps: true // Adds createdAt and updatedAt
  }
);

// Pre-save hook to generate slug from title if not provided
blogPostSchema.pre("save", function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  
  // Calculate reading time (average 200 words per minute)
  if (this.content) {
    const wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.ceil(wordCount / 200);
  }
  
  // Auto-set publishedAt when status changes to published
  if (this.isModified("status") && this.status === "published" && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

// Index for efficient queries
blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ tags: 1 });
blogPostSchema.index({ categories: 1 });
blogPostSchema.index({ "externalProvider.name": 1, "externalProvider.externalId": 1 });

export default mongoose.model("BlogPost", blogPostSchema);
