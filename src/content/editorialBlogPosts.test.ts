import { expect, test } from 'vitest';
import {
  BURNOUT_WORKLOAD_CONTROLS_SLUG,
  editorialBlogPostBySlug,
  editorialBlogPosts,
  UNREASONABLE_WORKLOAD_SLUG,
} from './editorialBlogPosts';

test('publishes the Australian unreasonable-workload article with all supplied images', () => {
  const post = editorialBlogPostBySlug(UNREASONABLE_WORKLOAD_SLUG);

  expect(post).toBeDefined();
  expect(post?.seo.metaTitle).toBe('Unreasonable Workload: Psychosocial Hazard in Australia');
  expect(post?.content.match(/<img /g)).toHaveLength(2);
  expect(post?.featuredImage?.url).toContain('team-workload-discussion.jpg');
  expect(post?.content).toContain('after-hours-work.jpg');
  expect(post?.content).toContain('control-review.jpg');
  expect(post?.content).not.toMatch(/href=/);
  expect(post?.content).not.toMatch(/\[\d+\]/);
});

test('publishes the psychosocial-risk controls article from the editorial brief', () => {
  const post = editorialBlogPostBySlug(BURNOUT_WORKLOAD_CONTROLS_SLUG);

  expect(post).toBeDefined();
  expect(post?.title).toBe('Burnout Is the Signal. Workload Is the Evidence.');
  expect(post?.seo.metaTitle).toContain('How to Evaluate Psychosocial Risk Controls');
  expect(post?.content).toContain('Use this six-part review');
  expect(post?.content).toContain('one source of work evidence');
  expect(post?.content).toContain('not as a mental-health assessment');
});

test('gives every editorial post a featured image for the blog grid', () => {
  const imageUrls = editorialBlogPosts.map((post) => post.featuredImage?.url);

  expect(imageUrls.every(Boolean)).toBe(true);
  expect(new Set(imageUrls).size).toBe(imageUrls.length);
});
