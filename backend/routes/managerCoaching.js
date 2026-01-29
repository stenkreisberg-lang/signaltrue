/**
 * Manager Coaching Routes
 * Provides coaching nudges, scorecard, and 1:1 agenda suggestions for managers
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import MetricsDaily from '../models/metricsDaily.js';

const router = express.Router();

/**
 * Generate coaching nudges based on team signals
 */
function generateNudges(teamMetrics, baseline, teamName) {
  const nudges = [];
  
  // Check after-hours activity
  const afterHoursRate = teamMetrics.afterHoursRate || 0;
  const baselineAfterHours = baseline.afterHoursRate || 15;
  if (afterHoursRate > baselineAfterHours * 1.25) {
    const percentIncrease = Math.round(((afterHoursRate - baselineAfterHours) / baselineAfterHours) * 100);
    nudges.push({
      id: `after-hours-${Date.now()}`,
      type: 'warning',
      title: 'After-hours activity elevated',
      message: `Your team has been ${percentIncrease}% more active after 6pm compared to baseline. This sustained pattern may lead to burnout. Consider discussing workload in your next team meeting.`,
      dismissed: false
    });
  }
  
  // Check meeting load
  const meetingLoad = teamMetrics.meetingLoadIndex || 0;
  const baselineMeetings = baseline.meetingLoadIndex || 20;
  if (meetingLoad > baselineMeetings * 1.15) {
    const percentIncrease = Math.round(((meetingLoad - baselineMeetings) / baselineMeetings) * 100);
    nudges.push({
      id: `meeting-load-${Date.now()}`,
      type: 'observation',
      title: 'Meeting patterns shifting',
      message: `Your team spends ${Math.round(meetingLoad)}% of time in meetings (up from ${Math.round(baselineMeetings)}%). Consider auditing recurring meetings to see which can be async.`,
      dismissed: false
    });
  }
  
  // Check focus time improvement
  const focusTime = teamMetrics.focusTimeRatio || 0.3;
  const baselineFocus = baseline.focusTimeRatio || 0.3;
  if (focusTime > baselineFocus * 1.1) {
    nudges.push({
      id: `focus-time-${Date.now()}`,
      type: 'recognition',
      title: 'Team focus time improved',
      message: `Great progress! Your team gained focus time compared to baseline. Keep up the good work on protecting deep work time!`,
      dismissed: false
    });
  }
  
  // Check response latency
  const responseTime = teamMetrics.responseMedianMins || 30;
  const baselineResponse = baseline.responseMedianMins || 30;
  if (responseTime > baselineResponse * 1.4) {
    nudges.push({
      id: `response-time-${Date.now()}`,
      type: 'action',
      title: 'Response times slowing',
      message: `Team response latency has increased significantly. This might indicate overload or blockers. Consider a quick check-in with team members showing the biggest change.`,
      dismissed: false
    });
  }
  
  return nudges;
}

/**
 * Generate manager scorecard
 */
function generateScorecard(teamMetrics, baseline) {
  // Team health score (based on BDI inverse)
  const bdi = teamMetrics.bdi || 50;
  const teamHealthScore = Math.max(0, Math.min(100, 100 - bdi));
  
  // Response time score
  const responseTime = teamMetrics.responseMedianMins || 45;
  const responseScore = Math.max(0, Math.min(100, 100 - (responseTime - 30)));
  
  // 1:1 consistency (placeholder - would come from calendar analysis)
  const oneOnOneScore = 75;
  
  // Team sentiment (placeholder - would come from sentiment analysis)
  const sentimentScore = 78;
  
  // Overall score
  const overallScore = Math.round(
    0.30 * teamHealthScore +
    0.25 * responseScore +
    0.25 * oneOnOneScore +
    0.20 * sentimentScore
  );
  
  // Determine trend (would compare to previous period)
  const trend = overallScore > 70 ? 'improving' : overallScore < 50 ? 'declining' : 'stable';
  
  // Determine rank
  let rank = 'Average';
  if (overallScore >= 80) rank = 'Top 10%';
  else if (overallScore >= 70) rank = 'Top 25%';
  else if (overallScore >= 60) rank = 'Above Average';
  else if (overallScore < 40) rank = 'Needs Improvement';
  
  return {
    overallScore,
    trend,
    rank,
    metrics: {
      teamHealth: { 
        score: teamHealthScore, 
        trend: bdi < (baseline.bdi || 50) ? 'up' : 'stable' 
      },
      responseTime: { 
        score: responseScore, 
        trend: responseTime < (baseline.responseMedianMins || 45) ? 'up' : 'down' 
      },
      oneOnOneConsistency: { 
        score: oneOnOneScore, 
        trend: 'stable' 
      },
      teamSentiment: { 
        score: sentimentScore, 
        trend: 'up' 
      }
    }
  };
}

/**
 * Generate 1:1 agenda suggestions
 */
function generateOneOnOneAgenda(teamMetrics, baseline) {
  const agenda = [];
  
  // After-hours topic
  const afterHoursRate = teamMetrics.afterHoursRate || 0;
  const baselineAfterHours = baseline.afterHoursRate || 15;
  if (afterHoursRate > baselineAfterHours * 1.2) {
    const percentIncrease = Math.round(((afterHoursRate - baselineAfterHours) / baselineAfterHours) * 100);
    agenda.push({
      topic: 'Workload & After-Hours',
      context: `Team after-hours activity is ${percentIncrease}% above baseline`,
      suggestedQuestion: "I've noticed the team has been putting in some late hours recently. How are you feeling about your current workload? Is there anything blocking progress during core hours?",
      priority: percentIncrease > 30 ? 'high' : 'medium'
    });
  }
  
  // Meeting effectiveness topic
  const meetingLoad = teamMetrics.meetingLoadIndex || 20;
  const baselineMeetings = baseline.meetingLoadIndex || 20;
  if (meetingLoad > baselineMeetings * 1.1) {
    agenda.push({
      topic: 'Meeting Effectiveness',
      context: `Meeting time increased from ${Math.round(baselineMeetings)}% to ${Math.round(meetingLoad)}% of work week`,
      suggestedQuestion: 'We seem to have more meetings lately. Which ones feel valuable and which feel like they could be an email or async update?',
      priority: 'medium'
    });
  }
  
  // Focus time topic
  const focusTime = teamMetrics.focusTimeRatio || 0.3;
  const baselineFocus = baseline.focusTimeRatio || 0.3;
  if (focusTime < baselineFocus * 0.9) {
    agenda.push({
      topic: 'Deep Work & Focus Time',
      context: 'Team focus time has decreased compared to baseline',
      suggestedQuestion: "How has your ability to do deep, focused work been lately? Are there interruptions or context switches we could reduce?",
      priority: 'medium'
    });
  }
  
  // Recognition topic (always good to include)
  agenda.push({
    topic: 'Recognition & Growth',
    context: 'Regular check-in on motivation and development',
    suggestedQuestion: "What's something you've accomplished recently that you're proud of? And what's something you'd like to learn or work on next?",
    priority: 'low'
  });
  
  // Collaboration topic
  agenda.push({
    topic: 'Collaboration & Dependencies',
    context: 'Understanding cross-team dynamics',
    suggestedQuestion: 'How are things going with collaborating across teams? Are there any dependencies or handoffs that have been tricky lately?',
    priority: 'low'
  });
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  agenda.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return agenda.slice(0, 4); // Return top 4
}

/**
 * GET /api/manager-coaching/:teamId
 * Get coaching data for a team's manager
 */
router.get('/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Get baseline
    const baseline = team.baseline?.signals || {
      afterHoursRate: 15,
      meetingLoadIndex: 20,
      focusTimeRatio: 0.35,
      responseMedianMins: 40,
      bdi: 45
    };
    
    // Get recent metrics
    const since = new Date();
    since.setDate(since.getDate() - 7);
    
    const recentMetrics = await MetricsDaily.find({
      teamId,
      date: { $gte: since }
    }).sort({ date: -1 });
    
    // Average recent metrics
    const avgMetrics = {
      afterHoursRate: 0,
      meetingLoadIndex: 0,
      focusTimeRatio: 0,
      responseMedianMins: 0,
      bdi: 0
    };
    
    if (recentMetrics.length > 0) {
      recentMetrics.forEach(m => {
        avgMetrics.afterHoursRate += m.afterHoursRate || 0;
        avgMetrics.meetingLoadIndex += m.meetingLoadIndex || 0;
        avgMetrics.focusTimeRatio += m.focusTimeRatio || 0;
        avgMetrics.responseMedianMins += m.responseMedianMins || 0;
      });
      
      Object.keys(avgMetrics).forEach(k => {
        avgMetrics[k] = avgMetrics[k] / recentMetrics.length;
      });
    } else {
      // Demo data if no real metrics
      avgMetrics.afterHoursRate = 22;
      avgMetrics.meetingLoadIndex = 26;
      avgMetrics.focusTimeRatio = 0.32;
      avgMetrics.responseMedianMins = 55;
      avgMetrics.bdi = 58;
    }
    
    // Get team member count
    const memberCount = await User.countDocuments({ teamId });
    
    // Generate coaching data
    const nudges = generateNudges(avgMetrics, baseline, team.name);
    const scorecard = generateScorecard(avgMetrics, baseline);
    const oneOnOneAgenda = generateOneOnOneAgenda(avgMetrics, baseline);
    
    // Generate team signals summary
    const teamSignals = [];
    
    const afterHoursChange = Math.round(((avgMetrics.afterHoursRate - baseline.afterHoursRate) / baseline.afterHoursRate) * 100);
    if (Math.abs(afterHoursChange) > 10) {
      teamSignals.push({
        type: 'after-hours',
        severity: afterHoursChange > 30 ? 'high' : 'medium',
        message: `After-hours activity ${afterHoursChange > 0 ? '+' : ''}${afterHoursChange}% vs baseline`,
        metric: 'afterHoursRate',
        percentChange: afterHoursChange
      });
    }
    
    const meetingChange = Math.round(((avgMetrics.meetingLoadIndex - baseline.meetingLoadIndex) / baseline.meetingLoadIndex) * 100);
    if (Math.abs(meetingChange) > 10) {
      teamSignals.push({
        type: 'meeting-load',
        severity: meetingChange > 25 ? 'high' : 'medium',
        message: `Meeting load ${meetingChange > 0 ? '+' : ''}${meetingChange}% vs baseline`,
        metric: 'meetingLoad',
        percentChange: meetingChange
      });
    }
    
    const focusChange = Math.round(((avgMetrics.focusTimeRatio - baseline.focusTimeRatio) / baseline.focusTimeRatio) * 100);
    if (Math.abs(focusChange) > 10) {
      teamSignals.push({
        type: 'focus-time',
        severity: focusChange < -20 ? 'high' : 'low',
        message: `Focus time ${focusChange > 0 ? '+' : ''}${focusChange}% vs baseline`,
        metric: 'focusTime',
        percentChange: focusChange
      });
    }
    
    res.json({
      teamId,
      teamName: team.name,
      memberCount: memberCount || 10,
      weeklyNudges: nudges,
      scorecard,
      teamSignals,
      oneOnOneAgenda
    });
    
  } catch (error) {
    console.error('[Manager Coaching API] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/manager-coaching/nudge/:nudgeId/dismiss
 * Dismiss a nudge
 */
router.post('/nudge/:nudgeId/dismiss', authenticateToken, async (req, res) => {
  try {
    // In production, this would store the dismissal in a database
    res.json({ success: true, message: 'Nudge dismissed' });
  } catch (error) {
    console.error('[Manager Coaching API] Dismiss error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
