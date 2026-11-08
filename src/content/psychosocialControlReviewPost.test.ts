import { expect, test } from 'vitest';
import { editorialBlogPostBySlug } from './editorialBlogPosts';
import {
  PSYCHOSOCIAL_CONTROL_REVIEW_SLUG,
} from './psychosocialControlReviewPost';

test('publishes one distinct practical control-review article', () => {
  const post = editorialBlogPostBySlug(PSYCHOSOCIAL_CONTROL_REVIEW_SLUG);
  expect(post).toBeDefined();
  expect(post?.status).toBe('published');
  expect(post?.title).toContain('Did the control actually work?');
  expect(post?.seo?.canonicalUrl).toBe(
    'https://www.signaltrue.ai/blog/psychosocial-control-effectiveness-after-assessment'
  );
  expect(post?.content).toContain('Fictional example.');
  expect(post?.content).toContain('worker consultation');
  expect(post?.content).toContain('Maintain');
  expect(post?.content).toContain('Modify');
  expect(post?.content).toContain('Investigate');
  expect(post?.content).toContain('Replace');
});

test('new article images have descriptive alt text and no visible captions', () => {
  const post = editorialBlogPostBySlug(PSYCHOSOCIAL_CONTROL_REVIEW_SLUG);
  expect(post?.featuredImage?.url).toBeTruthy();
  expect(post?.featuredImage?.alt).toBeTruthy();
  expect(post?.featuredImage).not.toHaveProperty('caption');
  expect(post?.content.match(/<img /g)).toHaveLength(4);
  expect(post?.content).not.toMatch(/<figcaption\b|<figure\b|<caption\b/i);
  const images = post?.content.match(/<img\s[^>]*>/g) || [];
  expect(images.every((image) => /\balt="[^"]+"/.test(image))).toBe(true);
});

test('limits claims to team work patterns and fictional illustrative figures', () => {
  const post = editorialBlogPostBySlug(PSYCHOSOCIAL_CONTROL_REVIEW_SLUG);
  expect(post?.content).toContain('They are not SignalTrue customer results.');
  expect(post?.content).toContain('cannot diagnose stress or burnout');
  expect(post?.content).toContain('missing or too thin');
  expect(post?.content).toContain('/did-the-control-work');
  expect(post?.content).toContain('/sample-report');
  expect(post?.content).toContain('/au/8-week-pilot');
});