import { expect, test } from 'vitest';
import {
  editorialBlogPostBySlug,
  editorialBlogPosts,
  UNREASONABLE_WORKLOAD_SLUG,
} from './editorialBlogPosts';

test('publishes the Australian unreasonable-workload article with all supplied images', () => {
  const post = editorialBlogPostBySlug(UNREASONABLE_WORKLOAD_SLUG);

  expect(post).toBeDefined();
  expect(post?.seo.metaTitle).toBe('Unreasonable Workload: Psychosocial Hazard in Australia');
  expect(post?.content.match(/<img /g)).toHaveLength(2);
  expect(editorialBlogPosts[0].featuredImage.url).toContain('team-workload-discussion.jpg');
  expect(post?.content).toContain('after-hours-work.jpg');
  expect(post?.content).toContain('control-review.jpg');
  expect(post?.content).not.toMatch(/href=/);
  expect(post?.content).not.toMatch(/\[\d+\]/);
});
