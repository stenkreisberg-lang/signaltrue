import { getPublicEvidenceKnowledge } from '../services/publicEvidenceKnowledge.js';

describe('public evidence knowledge', () => {
  test('returns Safe Work Australia context for Australian control-review questions', () => {
    const result = getPublicEvidenceKnowledge(
      'What does Safe Work Australia expect when we review a psychosocial control?'
    );

    expect(result.hasRelevantResults).toBe(true);
    expect(result.context).toContain('Safe Work Australia');
    expect(result.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'Safe Work Australia',
          url: expect.stringContaining('safeworkaustralia.gov.au'),
        }),
      ])
    );
  });

  test('returns workload-migration context for meeting-control questions', () => {
    const result = getPublicEvidenceKnowledge(
      'We reduced meetings. How do we check whether workload moved into chat or evenings?'
    );

    expect(result.hasRelevantResults).toBe(true);
    expect(result.context).toContain('workload migration');
    expect(result.sources.length).toBeGreaterThan(0);
  });

  test('does not invent evidence for unrelated questions', () => {
    const result = getPublicEvidenceKnowledge('What is the weather tomorrow?');

    expect(result.hasRelevantResults).toBe(false);
    expect(result.context).toBe('');
    expect(result.sources).toEqual([]);
  });
});
