import express from "express";
import BlogPost from "../models/blogPost.js";
import { requireApiKey } from "../middleware/auth.js";

const router = express.Router();

// =============================================================================
// PUBLIC ROUTES (No authentication required)
// =============================================================================

/**
 * GET /api/blog
 * Get all published blog posts (public)
 * Query params: page, limit, tag, category, featured
 */
router.get("/", async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      tag, 
      category, 
      featured 
    } = req.query;

    const query = { status: "published" };
    
    if (tag) query.tags = tag;
    if (category) query.categories = category;
    if (featured === "true") query.featured = true;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [posts, total] = await Promise.all([
      BlogPost.find(query)
        .select("-externalProvider.webhookPayload") // Exclude raw webhook data
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      BlogPost.countDocuments(query)
    ]);

    res.json({
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/blog/tags
 * Get all unique tags from published posts
 */
router.get("/tags", async (req, res) => {
  try {
    const tags = await BlogPost.distinct("tags", { status: "published" });
    res.json({ tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/blog/categories
 * Get all unique categories from published posts
 */
router.get("/categories", async (req, res) => {
  try {
    const categories = await BlogPost.distinct("categories", { status: "published" });
    res.json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/blog/:slug
 * Get a single blog post by slug (public)
 * Also increments view count
 */
router.get("/:slug", async (req, res) => {
  try {
    const post = await BlogPost.findOneAndUpdate(
      { slug: req.params.slug, status: "published" },
      { $inc: { viewCount: 1 } },
      { new: true }
    ).select("-externalProvider.webhookPayload");

    if (!post) {
      return res.status(404).json({ message: "Blog post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error("Error fetching blog post:", error);
    res.status(500).json({ message: error.message });
  }
});

// =============================================================================
// PROTECTED ROUTES (API Key required - for external CMS integrations)
// =============================================================================

/**
 * POST /api/blog
 * Create a new blog post (API key required)
 * Use this endpoint for external CMS webhooks (Contentful, Sanity, etc.)
 */
router.post("/", requireApiKey, async (req, res) => {
  try {
    const {
      title,
      slug,
      content,
      excerpt,
      author,
      featuredImage,
      tags,
      categories,
      status,
      publishedAt,
      externalProvider,
      seo,
      featured
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    // Check if post with same slug exists
    const existingPost = await BlogPost.findOne({ slug });
    if (existingPost) {
      return res.status(409).json({ 
        message: "A post with this slug already exists",
        existingId: existingPost._id
      });
    }

    const post = new BlogPost({
      title,
      slug,
      content,
      excerpt,
      author: author || { name: "SignalTrue Team" },
      featuredImage,
      tags: tags || [],
      categories: categories || [],
      status: status || "draft",
      publishedAt,
      externalProvider: externalProvider ? {
        ...externalProvider,
        syncedAt: new Date()
      } : undefined,
      seo,
      featured: featured || false
    });

    await post.save();
    res.status(201).json(post);
  } catch (error) {
    console.error("Error creating blog post:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/blog/:id
 * Update a blog post by ID (API key required)
 */
router.put("/:id", requireApiKey, async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Update sync timestamp if external provider info is present
    if (updateData.externalProvider) {
      updateData.externalProvider.syncedAt = new Date();
    }

    const post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!post) {
      return res.status(404).json({ message: "Blog post not found" });
    }

    res.json(post);
  } catch (error) {
    console.error("Error updating blog post:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/blog/external/:provider/:externalId
 * Update or create a blog post by external provider ID (upsert)
 * This is the primary webhook endpoint for external CMS systems
 */
router.put("/external/:provider/:externalId", requireApiKey, async (req, res) => {
  try {
    const { provider, externalId } = req.params;
    const updateData = {
      ...req.body,
      externalProvider: {
        name: provider,
        externalId: externalId,
        syncedAt: new Date(),
        webhookPayload: req.body._rawWebhook || undefined
      }
    };

    // Remove internal webhook payload from main data
    delete updateData._rawWebhook;

    const post = await BlogPost.findOneAndUpdate(
      { 
        "externalProvider.name": provider, 
        "externalProvider.externalId": externalId 
      },
      updateData,
      { new: true, upsert: true, runValidators: true }
    );

    res.json(post);
  } catch (error) {
    console.error("Error upserting blog post:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/blog/:id
 * Delete a blog post by ID (API key required)
 */
router.delete("/:id", requireApiKey, async (req, res) => {
  try {
    const post = await BlogPost.findByIdAndDelete(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: "Blog post not found" });
    }

    res.json({ message: "Blog post deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/blog/external/:provider/:externalId
 * Delete a blog post by external provider ID (API key required)
 */
router.delete("/external/:provider/:externalId", requireApiKey, async (req, res) => {
  try {
    const { provider, externalId } = req.params;
    
    const post = await BlogPost.findOneAndDelete({
      "externalProvider.name": provider,
      "externalProvider.externalId": externalId
    });

    if (!post) {
      return res.status(404).json({ message: "Blog post not found" });
    }

    res.json({ message: "Blog post deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    res.status(500).json({ message: error.message });
  }
});

// =============================================================================
// WEBHOOK ENDPOINTS (for specific CMS providers)
// =============================================================================

/**
 * POST /api/blog/webhook/contentful
 * Contentful webhook handler
 */
router.post("/webhook/contentful", requireApiKey, async (req, res) => {
  try {
    const { sys, fields } = req.body;
    
    if (!sys || !fields) {
      return res.status(400).json({ message: "Invalid Contentful webhook payload" });
    }

    const contentType = sys.contentType?.sys?.id;
    if (contentType !== "blogPost") {
      return res.json({ message: "Skipping non-blog content type", skipped: true });
    }

    const locale = Object.keys(fields.title || {})[0] || "en-US";
    
    const postData = {
      title: fields.title?.[locale],
      slug: fields.slug?.[locale],
      content: fields.content?.[locale],
      excerpt: fields.excerpt?.[locale],
      author: {
        name: fields.authorName?.[locale] || "SignalTrue Team"
      },
      tags: fields.tags?.[locale] || [],
      status: sys.publishedAt ? "published" : "draft",
      publishedAt: sys.publishedAt,
      externalProvider: {
        name: "contentful",
        externalId: sys.id,
        syncedAt: new Date(),
        webhookPayload: req.body
      }
    };

    const post = await BlogPost.findOneAndUpdate(
      { "externalProvider.name": "contentful", "externalProvider.externalId": sys.id },
      postData,
      { new: true, upsert: true, runValidators: true }
    );

    res.json(post);
  } catch (error) {
    console.error("Contentful webhook error:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/blog/webhook/sanity
 * Sanity.io webhook handler
 */
router.post("/webhook/sanity", requireApiKey, async (req, res) => {
  try {
    const { _id, _type, title, slug, body, excerpt, author, publishedAt, tags } = req.body;
    
    if (_type !== "post" && _type !== "blogPost") {
      return res.json({ message: "Skipping non-blog document type", skipped: true });
    }

    const postData = {
      title,
      slug: slug?.current || slug,
      content: typeof body === "string" ? body : JSON.stringify(body),
      excerpt,
      author: {
        name: author?.name || "SignalTrue Team"
      },
      tags: tags || [],
      status: publishedAt ? "published" : "draft",
      publishedAt,
      externalProvider: {
        name: "sanity",
        externalId: _id,
        syncedAt: new Date(),
        webhookPayload: req.body
      }
    };

    const post = await BlogPost.findOneAndUpdate(
      { "externalProvider.name": "sanity", "externalProvider.externalId": _id },
      postData,
      { new: true, upsert: true, runValidators: true }
    );

    res.json(post);
  } catch (error) {
    console.error("Sanity webhook error:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/blog/webhook/strapi
 * Strapi webhook handler
 */
router.post("/webhook/strapi", requireApiKey, async (req, res) => {
  try {
    const { event, model, entry } = req.body;
    
    if (model !== "blog-post" && model !== "article") {
      return res.json({ message: "Skipping non-blog model", skipped: true });
    }

    // Handle delete events
    if (event === "entry.delete") {
      await BlogPost.findOneAndDelete({
        "externalProvider.name": "strapi",
        "externalProvider.externalId": String(entry.id)
      });
      return res.json({ message: "Blog post deleted" });
    }

    const postData = {
      title: entry.title,
      slug: entry.slug,
      content: entry.content,
      excerpt: entry.excerpt || entry.description,
      author: {
        name: entry.author?.name || entry.author?.username || "SignalTrue Team"
      },
      featuredImage: entry.featuredImage?.url ? {
        url: entry.featuredImage.url,
        alt: entry.featuredImage.alternativeText
      } : undefined,
      tags: entry.tags?.map(t => t.name || t) || [],
      categories: entry.categories?.map(c => c.name || c) || [],
      status: entry.publishedAt ? "published" : "draft",
      publishedAt: entry.publishedAt,
      externalProvider: {
        name: "strapi",
        externalId: String(entry.id),
        syncedAt: new Date(),
        webhookPayload: req.body
      }
    };

    const post = await BlogPost.findOneAndUpdate(
      { "externalProvider.name": "strapi", "externalProvider.externalId": String(entry.id) },
      postData,
      { new: true, upsert: true, runValidators: true }
    );

    res.json(post);
  } catch (error) {
    console.error("Strapi webhook error:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/blog/webhook/wordpress
 * WordPress webhook handler (via WP Webhooks or custom plugin)
 */
router.post("/webhook/wordpress", requireApiKey, async (req, res) => {
  try {
    const { ID, post_title, post_name, post_content, post_excerpt, post_status, post_date, post_author } = req.body;
    
    // Handle delete action
    if (req.body.action === "delete" || req.body.action === "trash") {
      await BlogPost.findOneAndDelete({
        "externalProvider.name": "wordpress",
        "externalProvider.externalId": String(ID)
      });
      return res.json({ message: "Blog post deleted" });
    }

    const postData = {
      title: post_title,
      slug: post_name,
      content: post_content,
      excerpt: post_excerpt,
      author: {
        name: post_author?.display_name || post_author?.user_nicename || "SignalTrue Team"
      },
      status: post_status === "publish" ? "published" : "draft",
      publishedAt: post_status === "publish" ? new Date(post_date) : undefined,
      externalProvider: {
        name: "wordpress",
        externalId: String(ID),
        syncedAt: new Date(),
        webhookPayload: req.body
      }
    };

    const post = await BlogPost.findOneAndUpdate(
      { "externalProvider.name": "wordpress", "externalProvider.externalId": String(ID) },
      postData,
      { new: true, upsert: true, runValidators: true }
    );

    res.json(post);
  } catch (error) {
    console.error("WordPress webhook error:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/blog/webhook/ghost
 * Ghost CMS webhook handler
 */
router.post("/webhook/ghost", requireApiKey, async (req, res) => {
  try {
    const { post } = req.body;
    
    if (!post || !post.current) {
      return res.status(400).json({ message: "Invalid Ghost webhook payload" });
    }

    const { current: entry, previous } = post;
    
    // Handle delete (post unpublished/deleted)
    if (previous && !current) {
      await BlogPost.findOneAndDelete({
        "externalProvider.name": "ghost",
        "externalProvider.externalId": previous.id
      });
      return res.json({ message: "Blog post deleted" });
    }

    const postData = {
      title: entry.title,
      slug: entry.slug,
      content: entry.html || entry.mobiledoc,
      excerpt: entry.excerpt || entry.custom_excerpt,
      author: {
        name: entry.primary_author?.name || "SignalTrue Team"
      },
      featuredImage: entry.feature_image ? {
        url: entry.feature_image,
        alt: entry.feature_image_alt
      } : undefined,
      tags: entry.tags?.map(t => t.name) || [],
      status: entry.status === "published" ? "published" : "draft",
      publishedAt: entry.published_at,
      seo: {
        metaTitle: entry.meta_title,
        metaDescription: entry.meta_description,
        ogImage: entry.og_image
      },
      externalProvider: {
        name: "ghost",
        externalId: entry.id,
        syncedAt: new Date(),
        webhookPayload: req.body
      }
    };

    const savedPost = await BlogPost.findOneAndUpdate(
      { "externalProvider.name": "ghost", "externalProvider.externalId": entry.id },
      postData,
      { new: true, upsert: true, runValidators: true }
    );

    res.json(savedPost);
  } catch (error) {
    console.error("Ghost webhook error:", error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/blog/webhook/babylovegrowth
 * BabyLoveGrowth.ai webhook handler
 */
router.post("/webhook/babylovegrowth", requireApiKey, async (req, res) => {
  try {
    const { 
      id,
      title, 
      slug, 
      content, 
      excerpt, 
      summary,
      author, 
      authorName,
      featuredImage,
      image,
      imageUrl,
      tags, 
      categories,
      status,
      publishedAt,
      createdAt
    } = req.body;

    // Generate slug from title if not provided
    const postSlug = slug || title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    
    // Use external ID or generate one
    const externalId = id || postSlug || `blg-${Date.now()}`;

    const postData = {
      title,
      slug: postSlug,
      content,
      excerpt: excerpt || summary,
      author: {
        name: author?.name || authorName || "SignalTrue Team"
      },
      featuredImage: featuredImage || image || imageUrl ? {
        url: featuredImage?.url || featuredImage || image || imageUrl,
        alt: featuredImage?.alt || title
      } : undefined,
      tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
      categories: Array.isArray(categories) ? categories : (categories ? [categories] : []),
      status: status === "draft" ? "draft" : "published",
      publishedAt: publishedAt || createdAt || new Date(),
      externalProvider: {
        name: "babylovegrowth",
        externalId: String(externalId),
        syncedAt: new Date(),
        webhookPayload: req.body
      }
    };

    const post = await BlogPost.findOneAndUpdate(
      { "externalProvider.name": "babylovegrowth", "externalProvider.externalId": String(externalId) },
      postData,
      { new: true, upsert: true, runValidators: true }
    );

    console.log(`[BabyLoveGrowth] Blog post synced: ${post.title}`);
    res.json({ success: true, post });
  } catch (error) {
    console.error("BabyLoveGrowth webhook error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
