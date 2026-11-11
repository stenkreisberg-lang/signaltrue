import { describe, expect, test } from '@jest/globals';
import { buildReportTrendSeries, buildEligibleTeamTrends, buildTimelineAnnotations } from '../services/reportTrendService.js';
import { renderVisualWeeklyEmail, renderVisualWeeklyEmailPackage, emailTimeline } from '../services/visualWeeklyEmailService.js';
const now = new Date('2026-10-26T12:00:00.000Z');
const sample = (date, n, more = {}) => ({ date: new Date(date + 'T00:00:00Z'),
  meetingInstanceCount7d: n, meetingCount7d: n + 2, messageCount7d: 0, ...more });

describe('visual weekly report data integrity', () => {
  test('uses consistent completed Sunday observations, not a different weekday', () => {
    const series = buildReportTrendSeries([
      sample('2026-10-11', 750),
      sample('2026-10-18', 720),
      sample('2026-10-25', 685),
      sample('2026-10-24', 9999, { teamId: 'hidden-team' }),
    ], now);
    expect(series.anchorDay).toBe(0);
    expect(series.weekly).toHaveLength(26);
    expect(series.weekly.at(-1).meetings).toBe(685);
    expect(series.weekly.at(-2).meetings).toBe(720);
    expect(series.weekly.at(-3).meetings).toBe(750);
    expect(series.weekly.at(-4).meetings).toBeNull();
    expect(series.weekly.at(-1).after_hours).toBeNull();
    expect(series.currentPartial).toBeNull();
  });
  test('does not switch observation weekday or silently fill missing weeks', () => {
    const series = buildReportTrendSeries([
      sample('2026-10-07', 88),
      sample('2026-10-14', 89),
      sample('2026-10-18', 999),
    ], now);
    expect(series.anchorDay).toBe(3); // Wednesday has more complete-week records
    expect(series.weekly.at(-2).meetings).toBe(89);
    expect(series.weekly.at(-1).meetings).toBeNull(); // not substituted from Sunday
  });
  test('does not imply a full week from an incomplete one', () => {
    const series = buildReportTrendSeries([
      sample('2026-10-25', 685),
      sample('2026-10-26', 9),
    ], now, { anchorDay: 0 });
    expect(series.weekly.at(-1).meetings).toBe(685);
    expect(series.currentPartial.meetings).toBe(9);
    expect(series.currentPartial.complete).toBe(false);
  });
  test('rejects old non-deduplicated meeting counts and preserves empty weeks', () => {
    const series = buildReportTrendSeries([
      sample('2026-10-18', 0, { meetingCount7d: 1000 }),
    ], now);
    expect(series.weekly.at(-2).meetings).toBeNull();
  });
  test('team views include two-person teams but suppress weeks with fewer than two mapped actors', () => {
    const dates = ['2026-10-04','2026-10-11','2026-10-18','2026-10-25'];
    const weeks = ['2026-09-28','2026-10-05','2026-10-12','2026-10-19'];
    const team = { _id:'eligible', name:'Operations', isActive:true, analyticsEnabled:true, metadata:{actualSize:10} };
    const hidden = { _id:'small', name:'Private small team', isActive:true, analyticsEnabled:true, metadata:{actualSize:1} };
    const records = dates.flatMap((d,i) => [
      sample(d,10+i,{teamId:'eligible'}), sample(d,3,{teamId:'small'}),
    ]);
    const actorsByWeek = Object.fromEntries(weeks.flatMap(w => [
      ['eligible:'+w, 9],['small:'+w,1],
    ]));
    let visible = buildEligibleTeamTrends({ records, teams:[team,hidden],
      activeMemberCounts:{eligible:10,small:1}, actorsByWeek, minimumGroupSize:2, now, anchorDay:0 });
    expect(visible.map(t => t.name)).toEqual(['Operations']);
    expect(visible[0].current).toBeCloseTo(13/9,2);
    actorsByWeek['eligible:2026-10-05'] = 1;
    visible = buildEligibleTeamTrends({ records, teams:[team,hidden],
      activeMemberCounts:{eligible:10,small:1}, actorsByWeek, minimumGroupSize:2, now, anchorDay:0 });
    expect(visible).toHaveLength(1);
    expect(visible[0].points.find(p => p.date === '2026-10-05')
      .meetingsPerRepresentedPerson).toBeNull(); // a single-contributor week is a gap
  });
  test('only privacy-eligible, non-private interventions appear', () => {
    const eligible = [{id:'eligible'}];
    const annotations = buildTimelineAnnotations({ now, teams:eligible,
      contexts:[{weekStart:new Date('2026-10-19'),weekEnd:new Date('2026-10-25'),tag:'planning_week'}],
      interventions:[
        {teamId:'eligible',startDate:new Date('2026-10-12'),title:'Meeting reset',
          outcomeDelta:{metricBefore:20,metricAfter:15,improved:true,computedAt:new Date('2026-10-25')}},
        {teamId:'small',startDate:new Date('2026-10-12'),title:'Secret suppressed action'},
        {teamId:'eligible',privateToManager:true,startDate:new Date('2026-10-12'),title:'Private manager coaching'},
      ] });
    expect(annotations.map(a=>a.title)).toContain('Meeting reset');
    expect(annotations.map(a=>a.title)).not.toContain('Secret suppressed action');
    expect(annotations.map(a=>a.title)).not.toContain('Private manager coaching');
    expect(annotations.find(a=>a.kind==='intervention').outcome).toBe('improved');
  });
  test('email only visualizes measured weekly data and provides an explicit next step', () => {
    const snapshot = {
      orgName:'Example',periodStart:new Date('2026-10-19'),periodEnd:now,
      status:{label:'Stable',evidenceGrade:'Low'},coverage:{mappingCoveragePct:98},
      metrics:[
        {key:'meetings',label:'Meetings',unit:'meetings',available:true,current:685,previous:750,changePct:-9},
        {key:'meeting_hours',label:'Meeting hours',unit:'hours',available:true,current:12,previous:10,changePct:20,readiness:{mappedUsers:2,totalUsers:42}},
        {key:'after_hours',label:'After-hours messaging',unit:'%',available:false,readiness:{mappedUsers:2,totalUsers:42}},
        {key:'focus_time',label:'Uninterrupted time',unit:'hours',available:false},
      ],
      trend:[
        {weekStart:'2026-10-11',label:'2w ago',meetingHours:8},
        {weekStart:'2026-10-18',label:'1w ago',meetingHours:9},
        {weekStart:'2026-10-25',label:'Current',meetingHours:12},
      ],
      observations:[],actions:{primary:null}
    };
    const history = buildReportTrendSeries([
      sample('2026-10-11', 750), sample('2026-10-18', 720), sample('2026-10-25',685),
    ],now);
    const html = renderVisualWeeklyEmail(snapshot, history);
    expect(html).toContain('Nädala töökorralduse ülevaade');
    expect(html).toContain('Koosolekuaeg');
    expect(html).toContain('Mõõdikute allikad ja katvus');
    expect(html).toContain('Andmed puuduvad');
    expect(html).toContain('Algandmete ja aruande täielik vastavuskontroll ei ole kinnitatud');
    expect(html).toContain('Aruande versioon ST-');
    expect(html).toContain('/app/latest-brief');
    expect(html).not.toContain('No action recommended this week');
    expect(emailTimeline(history.weekly.slice(-4),'meetings','meetings')).toContain('—');
    const bundle = renderVisualWeeklyEmailPackage(snapshot, history);
    expect(bundle.attachments).toHaveLength(1);
    expect(bundle.html).toContain('cid:st-weekly-meeting_hours');
    const decoded = Buffer.from(bundle.attachments[0].content, 'base64');
    expect([...decoded.subarray(0, 8)]).toEqual([137,80,78,71,13,10,26,10]);
  });
});
