import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Button } from "../components/ui/button";
import { 
  ArrowLeft, 
  ArrowRight, 
  Calendar, 
  Clock, 
  Tag,
  User,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

// API base URL
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

interface Author {
  name: string;
  email?: string;
  avatar?: string;
  bio?: string;
}

interface FeaturedImage {
  url: string;
  alt?: string;
  caption?: string;
}

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  author: Author;
  featuredImage?: FeaturedImage;
  tags: string[];
  categories: string[];
  status: string;
  publishedAt: string;
  readingTime?: number;
  viewCount: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BlogResponse {
  posts: BlogPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Blog List Component
const BlogList = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    fetchPosts();
    fetchTags();
  }, [page, selectedTag]);

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const tagParam = selectedTag ? `&tag=${encodeURIComponent(selectedTag)}` : "";
      const response = await fetch(`${API_URL}/api/blog?page=${page}&limit=9${tagParam}`);
      if (!response.ok) throw new Error("Failed to fetch posts");
      const data: BlogResponse = await response.json();
      setPosts(data.posts);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch(`${API_URL}/api/blog/tags`);
      if (response.ok) {
        const data = await response.json();
        setTags(data.tags || []);
      }
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      {/* Hero Section */}
      <section className="py-20 bg-hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-glow opacity-20" />
        <div className="container mx-auto px-6 relative">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
              Blog
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold mb-6">
              Insights on{" "}
              <span className="text-gradient">organizational health</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Research, strategies, and stories about detecting organizational drift 
              and building healthier work patterns.
            </p>
          </div>
        </div>
      </section>

      {/* Tags Filter */}
      {tags.length > 0 && (
        <section className="py-6 border-b border-border/50">
          <div className="container mx-auto px-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground mr-2">
                Filter by:
              </span>
              <button
                onClick={() => {
                  setSelectedTag(null);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  !selectedTag
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTag(tag);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    selectedTag === tag
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Blog Posts Grid */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-6">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[16/10] bg-secondary rounded-xl mb-4" />
                  <div className="h-4 bg-secondary rounded w-1/4 mb-3" />
                  <div className="h-6 bg-secondary rounded w-3/4 mb-2" />
                  <div className="h-4 bg-secondary rounded w-full mb-2" />
                  <div className="h-4 bg-secondary rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={fetchPosts} variant="outline">
                Try Again
              </Button>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-2">No blog posts yet.</p>
              <p className="text-sm text-muted-foreground">
                Check back soon for insights on organizational health.
              </p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post, index) => (
                  <Link
                    key={post._id}
                    to={`/blog/${post.slug}`}
                    className="group block animate-slide-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <article className="h-full flex flex-col">
                      {/* Featured Image */}
                      <div className="aspect-[16/10] rounded-xl overflow-hidden bg-secondary mb-4">
                        {post.featuredImage?.url ? (
                          <img
                            src={post.featuredImage.url}
                            alt={post.featuredImage.alt || post.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                            <span className="text-4xl font-display font-bold text-primary/40">
                              ST
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(post.publishedAt)}
                        </span>
                        {post.readingTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {post.readingTime} min read
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h2 className="text-xl font-display font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h2>

                      {/* Excerpt */}
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-grow">
                          {post.excerpt}
                        </p>
                      )}

                      {/* Tags */}
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-auto">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 text-xs bg-secondary text-muted-foreground rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </article>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <span className="px-4 text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
};

// Single Blog Post Component
const BlogPostView = ({ slug }: { slug: string }) => {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPost();
  }, [slug]);

  const fetchPost = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/blog/${slug}`);
      if (!response.ok) {
        if (response.status === 404) throw new Error("Post not found");
        throw new Error("Failed to fetch post");
      }
      const data = await response.json();
      setPost(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto animate-pulse">
            <div className="h-4 bg-secondary rounded w-1/4 mb-6" />
            <div className="h-10 bg-secondary rounded w-3/4 mb-4" />
            <div className="h-4 bg-secondary rounded w-1/3 mb-8" />
            <div className="aspect-[16/9] bg-secondary rounded-xl mb-8" />
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-4 bg-secondary rounded" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || !post) {
    return (
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-2xl font-display font-bold mb-4">
              {error || "Post not found"}
            </h1>
            <Link to="/blog">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <article className="py-12 lg:py-20">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          {/* Back Link */}
          <Link
            to="/blog"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>

          {/* Header */}
          <header className="mb-8">
            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/blog?tag=${encodeURIComponent(tag)}`}
                    className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-6">
              {post.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                {post.author.avatar ? (
                  <img
                    src={post.author.avatar}
                    alt={post.author.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
                <span className="font-medium text-foreground">
                  {post.author.name}
                </span>
              </div>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(post.publishedAt)}
              </span>
              {post.readingTime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {post.readingTime} min read
                </span>
              )}
            </div>
          </header>

          {/* Featured Image */}
          {post.featuredImage?.url && (
            <figure className="mb-10">
              <div className="aspect-[16/9] rounded-xl overflow-hidden">
                <img
                  src={post.featuredImage.url}
                  alt={post.featuredImage.alt || post.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {post.featuredImage.caption && (
                <figcaption className="text-sm text-muted-foreground text-center mt-3">
                  {post.featuredImage.caption}
                </figcaption>
              )}
            </figure>
          )}

          {/* Content */}
          <div 
            className="prose prose-lg dark:prose-invert max-w-none
              prose-headings:font-display prose-headings:font-bold
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-blockquote:border-l-primary prose-blockquote:bg-secondary/50 prose-blockquote:rounded-r-lg prose-blockquote:py-1
              prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-secondary prose-pre:border prose-pre:border-border"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-border">
            {/* Author Bio */}
            {post.author.bio && (
              <div className="flex items-start gap-4 p-6 bg-secondary/50 rounded-xl mb-8">
                {post.author.avatar ? (
                  <img
                    src={post.author.avatar}
                    alt={post.author.name}
                    className="w-16 h-16 rounded-full"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-display font-semibold text-foreground mb-1">
                    {post.author.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {post.author.bio}
                  </p>
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Want to detect organizational drift before it becomes a crisis?
              </p>
              <Link to="/product">
                <Button variant="hero">
                  See your organizational signals
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </article>
  );
};

// Main Blog Page Component
const Blog = () => {
  const { slug } = useParams<{ slug?: string }>();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {slug ? <BlogPostView slug={slug} /> : <BlogList />}
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
