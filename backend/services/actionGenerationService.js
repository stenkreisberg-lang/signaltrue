/**
 * Action Generation Service
 * Generates recommended actions based on risk analysis
 * Now with AI-powered recommendations that learn from outcomes
 */

import TeamAction from '../models/teamAction.js';
import RiskDriver from '../models/riskDriver.js';
import { buildRecommendationContext, formatContextForPrompt } from './aiRecommendationContext.js';
import getProvider from '../utils/aiProvider.js';

/**
 * Generate action for a team based on dominant risk
 * Uses AI if enabled and sufficient context exists, falls back to templates
 */
export async function generateAction(teamId, weekStart, teamState, risks, riskDrivers) {
  // Only generate if no active action exists
  const hasActive = await TeamAction.hasActiveAction(teamId);
  if (hasActive) {
    return null;
  }
  
  // Only generate for strained or worse states
  if (teamState.state === 'healthy') {
    return null;
  }
  
  const dominantRisk = teamState.dominantRisk;
  const risk = risks.find(r => r.riskType === dominantRisk);
  
  if (!risk || risk.band === 'green') {
    return null;
  }
  
  // Get top contributors for this risk
  const drivers = riskDrivers.filter(d => d.riskType === dominantRisk)
    .sort((a, b) => (b.deviation * b.contributionWeight) - (a.deviation * a.contributionWeight));
  
  // Check if AI recommendations are enabled
  const useAI = process.env.AI_RECOMMENDATIONS_ENABLED === 'true';
  
  let actionData = null;
  let generatedBy = 'template';
  
  if (useAI) {
    try {
      // Try AI-powered recommendation
      const aiResult = await generateAIRecommendation(teamId, dominantRisk, drivers, risk.score, weekStart);
      if (aiResult && aiResult.confidence >= (parseInt(process.env.AI_CONFIDENCE_THRESHOLD) || 70)) {
        actionData = aiResult;
        generatedBy = 'ai';
        console.log(`✨ AI-generated recommendation for team ${teamId}: ${aiResult.title}`);
      } else {
        console.log(`⚠️ AI confidence too low (${aiResult?.confidence}%), using template`);
      }
    } catch (error) {
      console.error('AI recommendation failed, falling back to template:', error.message);
    }
  }
  
  // Fallback to template if AI failed or disabled
  if (!actionData) {
    actionData = selectActionTemplate(dominantRisk, drivers, risk.score);
    generatedBy = 'template';
  }
  
  if (!actionData) {
    return null;
  }
  
  const action = await TeamAction.create({
    teamId,
    createdWeek: weekStart,
    linkedRisk: dominantRisk,
    title: actionData.title,
    whyThisAction: actionData.why,
    status: 'suggested',
    duration: actionData.duration || 2,
    generatedBy
  });
  
  return action;
}

/**
 * Generate AI-powered recommendation using learned patterns
 */
async function generateAIRecommendation(teamId, riskType, drivers, riskScore, weekStart) {
  try {
    // Build comprehensive context
    const context = await buildRecommendationContext(teamId, riskType, drivers, weekStart);
    
    // Check if we have enough data for AI
    if (context.learnedPatterns.totalLearnings < 3 && context.pastExperiments.length === 0) {
      console.log('Insufficient learning data for AI recommendation, need at least 3 learnings or past experiments');
      return null;
    }
    
    // Format context for prompt
    const contextPrompt = formatContextForPrompt(context);
    
    // Build AI prompt
    const prompt = `You are an expert organizational psychologist specializing in team health and performance.

${contextPrompt}

CONSTRAINTS:
- Action must be reversible within 2-4 weeks
- Must not disrupt ongoing projects or critical deadlines
- Should align with ${context.teamProfile.industry} industry norms
- Be specific and actionable, not generic advice

TASK:
Generate a personalized action recommendation for this team. Consider:
1. What has worked for THIS specific team in the past
2. What has worked for similar teams (same function/industry/size)
3. What has NOT worked (avoid those patterns)
4. The current timing context (seasonality, quarter-end, etc.)

Respond with ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "title": "Specific, actionable title (8-15 words)",
  "why": "Why this action for THIS team given their history and context (2-3 sentences, reference specific learnings)",
  "duration": 2-4,
  "confidence": 70-100,
  "reasoning": "Brief explanation of why you chose this over alternatives (1-2 sentences)"
}

Confidence scoring:
- 90-100: Strong evidence from multiple similar successes
- 75-89: Good evidence from some similar successes
- 70-74: Limited evidence but logical fit
- <70: Insufficient evidence (will use template instead)`;

    // Call AI provider
    const provider = getProvider();
    const response = await provider.generate({ 
      prompt, 
      model: process.env.OPENAI_MODEL || process.env.ANTHROPIC_MODEL || 'gpt-4o-mini',
      max_tokens: 500 
    });
    
    const aiText = response.choices[0].message.content.trim();
    
    // Parse JSON response
    let aiRecommendation;
    try {
      // Remove markdown code blocks if present
      const cleanJson = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      aiRecommendation = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiText);
      return null;
    }
    
    // Validate response structure
    if (!aiRecommendation.title || !aiRecommendation.why || !aiRecommendation.confidence) {
      console.error('AI response missing required fields:', aiRecommendation);
      return null;
    }
    
    // Validate confidence is a number
    if (typeof aiRecommendation.confidence === 'string') {
      aiRecommendation.confidence = parseInt(aiRecommendation.confidence);
    }
    
    console.log(`AI recommendation generated with ${aiRecommendation.confidence}% confidence`);
    
    return aiRecommendation;
  } catch (error) {
    console.error('Error generating AI recommendation:', error);
    return null;
  }
}

/**
 * Select appropriate action template based on risk and drivers
 */
function selectActionTemplate(riskType, drivers, riskScore) {
  if (riskType === 'overload') {
    return selectOverloadAction(drivers, riskScore);
  } else if (riskType === 'execution') {
    return selectExecutionAction(drivers, riskScore);
  } else if (riskType === 'retention_strain') {
    return selectRetentionStrainAction(drivers, riskScore);
  }
  
  return null;
}

/**
 * Overload risk actions
 */
function selectOverloadAction(drivers, riskScore) {
  const topDriver = drivers[0];
  
  if (!topDriver) {
    return {
      title: 'Review meeting schedule and after-hours patterns',
      why: 'Work intensity is elevated above normal levels.',
      duration: 2
    };
  }
  
  // After-hours activity is top driver
  if (topDriver.metricKey === 'after_hours_activity' && topDriver.contributionWeight > 0.3) {
    return {
      title: 'Introduce quiet hours (no messages 8PM-8AM)',
      why: 'After-hours activity accounts for most of the current overload risk. Setting boundaries can help the team recover.',
      duration: 3
    };
  }
  
  // Meeting load is top driver
  if (topDriver.metricKey === 'meeting_load') {
    return {
      title: 'Reduce meeting frequency by 20%',
      why: 'Meeting load is significantly higher than baseline. Consolidating or eliminating low-value meetings can reduce coordination overhead.',
      duration: 2
    };
  }
  
  // Back-to-back meetings is top driver
  if (topDriver.metricKey === 'back_to_back_meetings') {
    return {
      title: 'Introduce 15-minute buffers between meetings',
      why: 'Back-to-back meetings are reducing recovery time. Small buffers can help restore focus and reduce fatigue.',
      duration: 2
    };
  }
  
  // Focus time is low
  if (topDriver.metricKey === 'focus_time') {
    return {
      title: 'Block 2-hour focus periods (no meetings)',
      why: 'Focus time has declined significantly. Protected time blocks can help restore deep work capacity.',
      duration: 3
    };
  }
  
  // Default overload action
  return {
    title: 'Review and reduce coordination overhead',
    why: 'Multiple work intensity signals are elevated. A holistic review of meeting and communication patterns is recommended.',
    duration: 2
  };
}

/**
 * Execution risk actions
 */
function selectExecutionAction(drivers, riskScore) {
  const topDriver = drivers[0];
  
  if (!topDriver) {
    return {
      title: 'Review team coordination norms',
      why: 'Coordination efficiency is declining.',
      duration: 2
    };
  }
  
  // Response time is top driver
  if (topDriver.metricKey === 'response_time') {
    return {
      title: 'Reset async communication norms',
      why: 'Response times have slowed significantly. Clarifying expectations for async communication can restore coordination velocity.',
      duration: 2
    };
  }
  
  // Participation drift is top driver
  if (topDriver.metricKey === 'participation_drift') {
    return {
      title: 'Re-engage quiet participants in key decisions',
      why: 'Participation patterns have shifted. Proactive inclusion can prevent coordination gaps and restore team alignment.',
      duration: 2
    };
  }
  
  // Meeting fragmentation is top driver
  if (topDriver.metricKey === 'meeting_fragmentation') {
    return {
      title: 'Consolidate decision-making meetings',
      why: 'Meeting patterns are becoming fragmented. Consolidating related discussions can improve coordination efficiency.',
      duration: 2
    };
  }
  
  // Focus time is low
  if (topDriver.metricKey === 'focus_time') {
    return {
      title: 'Establish focus time standards',
      why: 'Reduced focus time is impacting execution. Setting team-wide focus periods can improve delivery quality.',
      duration: 3
    };
  }
  
  // Default execution action
  return {
    title: 'Review coordination patterns and decision-making process',
    why: 'Multiple coordination signals indicate declining efficiency. A systematic review can identify bottlenecks.',
    duration: 2
  };
}

/**
 * Retention strain risk actions
 */
function selectRetentionStrainAction(drivers, riskScore) {
  return {
    title: 'Manager 1:1 check-ins on workload and sustainability',
    why: 'Sustained pressure patterns increase exit risk. Direct conversations about workload and wellbeing are the most effective intervention.',
    duration: 2
  };
}

/**
 * Activate a suggested action
 */
export async function activateAction(actionId, userId) {
  const action = await TeamAction.findById(actionId);
  
  if (!action || action.status !== 'suggested') {
    throw new Error('Action not found or not in suggested state');
  }
  
  // Check if team already has active action
  const hasActive = await TeamAction.hasActiveAction(action.teamId);
  if (hasActive) {
    throw new Error('Team already has an active action');
  }
  
  action.status = 'active';
  action.createdBy = userId;
  await action.save();
  
  return action;
}

/**
 * Dismiss an action
 */
export async function dismissAction(actionId, userId, reason) {
  const action = await TeamAction.findById(actionId);
  
  if (!action) {
    throw new Error('Action not found');
  }
  
  action.status = 'dismissed';
  action.dismissedBy = userId;
  action.dismissedAt = new Date();
  action.dismissalReason = reason;
  await action.save();
  
  return action;
}

export default {
  generateAction,
  activateAction,
  dismissAction
};
