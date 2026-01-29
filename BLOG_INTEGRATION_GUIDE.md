# SignalTrue Blog API Integration Guide

This guide explains how to connect external CMS providers to the SignalTrue blog system.

## Overview

The blog API allows you to:
- **Read** blog posts publicly (no authentication required)
- **Write/Update/Delete** blog posts via API key authentication
- **Sync** with external CMS providers via webhooks

## API Endpoints

### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/blog` | List all published posts |
| GET | `/api/blog/:slug` | Get a single post by slug |
| GET | `/api/blog/tags` | Get all unique tags |
| GET | `/api/blog/categories` | Get all unique categories |

**Query Parameters for listing:**
- `page` - Page number (default: 1)
- `limit` - Posts per page (default: 10)
- `tag` - Filter by tag
- `category` - Filter by category
- `featured` - Set to "true" to only show featured posts

### Protected Endpoints (API Key Required)

All write operations require an API key in the header:
```
x-api-key: your-api-key-here
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/blog` | Create a new post |
| PUT | `/api/blog/:id` | Update a post by MongoDB ID |
| DELETE | `/api/blog/:id` | Delete a post by MongoDB ID |
| PUT | `/api/blog/external/:provider/:externalId` | Upsert by external provider ID |
| DELETE | `/api/blog/external/:provider/:externalId` | Delete by external provider ID |

### Webhook Endpoints (API Key Required)

Pre-built handlers for popular CMS platforms:

| Endpoint | Provider |
|----------|----------|
| POST `/api/blog/webhook/contentful` | Contentful |
| POST `/api/blog/webhook/sanity` | Sanity.io |
| POST `/api/blog/webhook/strapi` | Strapi |
| POST `/api/blog/webhook/wordpress` | WordPress |
| POST `/api/blog/webhook/ghost` | Ghost CMS |

---

## Integration Guides

### Contentful

1. **Create a Webhook in Contentful:**
   - Go to Settings → Webhooks
   - Click "Add Webhook"
   - URL: `https://your-api.com/api/blog/webhook/contentful`
   - Add header: `x-api-key: your-api-key`
   - Triggers: Entry publish, unpublish, delete
   - Filters: Content type = `blogPost`

2. **Content Model Setup:**
   Create a content type called `blogPost` with these fields:
   - `title` (Short text, required)
   - `slug` (Short text, required, unique)
   - `content` (Rich text or Long text)
   - `excerpt` (Long text)
   - `authorName` (Short text)
   - `tags` (Short text, list)

### Sanity.io

1. **Install GROQ-powered Webhooks:**
   ```bash
   npm install @sanity/webhook
   ```

2. **Configure Webhook in Sanity:**
   - Go to sanity.io/manage → Your Project → API → Webhooks
   - URL: `https://your-api.com/api/blog/webhook/sanity`
   - Add Secret: Your API key
   - Filter: `_type == "post"`
   - Projection: Include all fields

3. **Schema Example:**
   ```javascript
   export default {
     name: 'post',
     title: 'Blog Post',
     type: 'document',
     fields: [
       { name: 'title', type: 'string' },
       { name: 'slug', type: 'slug', options: { source: 'title' } },
       { name: 'body', type: 'blockContent' },
       { name: 'excerpt', type: 'text' },
       { name: 'author', type: 'reference', to: { type: 'author' } },
       { name: 'tags', type: 'array', of: [{ type: 'string' }] },
       { name: 'publishedAt', type: 'datetime' }
     ]
   }
   ```

### Strapi

1. **Install Webhooks Plugin (Strapi v4):**
   Webhooks are built-in in Strapi v4.

2. **Configure Webhook:**
   - Go to Settings → Webhooks
   - Create new webhook
   - URL: `https://your-api.com/api/blog/webhook/strapi`
   - Headers: `x-api-key: your-api-key`
   - Events: `entry.create`, `entry.update`, `entry.delete`, `entry.publish`

3. **Content Type:**
   Create a `blog-post` or `article` collection type with:
   - `title` (Text)
   - `slug` (UID, based on title)
   - `content` (Rich text)
   - `excerpt` (Text)
   - `featuredImage` (Media)
   - `tags` (Relation or JSON)

### WordPress

1. **Install WP Webhooks Plugin:**
   - Install "WP Webhooks" from the plugin repository
   - Or use "Jetrails Webhook on Post Publish"

2. **Configure Webhook:**
   - Go to Settings → WP Webhooks
   - Add new action
   - Trigger: Post Published, Updated, Deleted
   - URL: `https://your-api.com/api/blog/webhook/wordpress`
   - Add header: `x-api-key: your-api-key`

3. **Payload Fields:**
   The WordPress webhook sends: `ID`, `post_title`, `post_name`, `post_content`, `post_excerpt`, `post_status`, `post_date`, `post_author`

### Ghost CMS

1. **Create Custom Integration:**
   - Go to Settings → Integrations
   - Click "Add custom integration"
   - Name: "SignalTrue Sync"

2. **Configure Webhook:**
   - Add webhook
   - Event: Post published, updated
   - Target URL: `https://your-api.com/api/blog/webhook/ghost`
   - Add `x-api-key` to query params or use Secret

3. **Note:**
   Ghost webhooks include the full post object with `post.current` and `post.previous` states.

---

## Generic API Usage

### Creating a Post Directly

```bash
curl -X POST https://your-api.com/api/blog \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "title": "Understanding Organizational Drift",
    "slug": "understanding-organizational-drift",
    "content": "<p>Full HTML content here...</p>",
    "excerpt": "A brief overview of what organizational drift means...",
    "author": {
      "name": "SignalTrue Team",
      "email": "team@signaltrue.ai"
    },
    "tags": ["organizational-health", "leadership"],
    "categories": ["Insights"],
    "status": "published",
    "featured": true
  }'
```

### Updating via External Provider ID

If syncing from any CMS, use the upsert endpoint:

```bash
curl -X PUT https://your-api.com/api/blog/external/my-cms/post-123 \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "title": "Updated Title",
    "content": "<p>Updated content...</p>",
    "status": "published"
  }'
```

This will create the post if it doesn't exist, or update it if it does.

---

## Blog Post Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | String | Yes | Post title |
| `slug` | String | Yes* | URL-friendly identifier (*auto-generated if not provided) |
| `content` | String | Yes | Full post content (HTML supported) |
| `excerpt` | String | No | Short summary (max 500 chars) |
| `author.name` | String | Yes | Author display name |
| `author.email` | String | No | Author email |
| `author.avatar` | String | No | Author avatar URL |
| `author.bio` | String | No | Author biography |
| `featuredImage.url` | String | No | Featured image URL |
| `featuredImage.alt` | String | No | Image alt text |
| `featuredImage.caption` | String | No | Image caption |
| `tags` | Array[String] | No | Post tags |
| `categories` | Array[String] | No | Post categories |
| `status` | Enum | No | `draft`, `published`, or `archived` |
| `publishedAt` | Date | No | Publication date (auto-set on publish) |
| `featured` | Boolean | No | Show on homepage featured section |
| `seo.metaTitle` | String | No | Custom SEO title |
| `seo.metaDescription` | String | No | Custom meta description |
| `seo.canonicalUrl` | String | No | Canonical URL |
| `seo.ogImage` | String | No | Open Graph image URL |

---

## Environment Setup

Add your API key to the backend `.env` file:

```env
# Blog API Key for external CMS integrations
BLOG_API_KEY=your-secure-random-key-here
```

Generate a secure key:
```bash
openssl rand -hex 32
```

---

## Security Best Practices

1. **Use HTTPS** for all webhook URLs
2. **Rotate API keys** periodically
3. **Validate webhook signatures** when supported by your CMS
4. **Limit IP addresses** if your CMS provider has static IPs
5. **Monitor webhook logs** for unusual activity

---

## Troubleshooting

### Post not appearing?
- Check `status` is set to `published`
- Verify `publishedAt` is set (or it auto-sets when status changes to published)

### Webhook not firing?
- Verify the URL is correct and accessible
- Check API key is in headers
- Review CMS webhook logs for errors

### Duplicate posts?
- Ensure you're using the external provider endpoint for syncing
- The system uses `externalProvider.name` + `externalProvider.externalId` for deduplication
