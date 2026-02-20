/**
 * Journey Timeline Service
 * Manages recovery journey events and timeline visualization
 */

import JourneyEvent from '../models/journeyEvent.js';
import OARScore from '../models/oarScore.js';
import Intervention from '../models/intervention.js';
import Goal from '../models/goal.js';
import DriftEvent from '../models/driftEvent.js';

/**
 * Create a journey event
 */
export async function createJourneyEvent(eventData) {
  // Get current OAR score if not provided
  if (!eventData.oarScore && eventData.orgId) {
    const currentOAR = await OARScore.findOne({
      orgId: eventData.orgId,
      teamId: eventData.teamId || null
    }).sort({ periodEnd: -1 }).lean();
    
    if (currentOAR) {
      eventData.oarScore = currentOAR.score;
    }
  }
  
  // Calculate delta from previous event
  if (eventData.oarScore) {
    const previousEvent = await JourneyEvent.findOne({
      orgId: eventData.orgId,
      teamId: eventData.teamId || null,
      oarScore: { $ne: null }
    }).sort({ createdAt: -1 }).lean();
    
    if (previousEvent && previousEvent.oarScore) {
      eventData.oarDelta = eventData.oarScore - previousEvent.oarScore;
    }
  }
  
  // Get type styling
  const style = JourneyEvent.getTypeStyle(eventData.type);
  eventData.icon = eventData.icon || style.icon;
  eventData.color = eventData.color || style.color;
  
  const event = new JourneyEvent(eventData);
  await event.save();
  
  return event;
}

/**
 * Get journey timeline for an organization
 */
export async function getJourneyTimeline(orgId, options = {}) {
  const {
    teamId = null,
    limit = 50,
    offset = 0,
    types = null,
    startDate = null,
    endDate = null
  } = options;
  
  const query = { orgId };
  
  if (teamId) {
    query.teamId = teamId;
  }
  
  if (types && types.length > 0) {
    query.type = { $in: types };
  }
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  const [events, total] = await Promise.all([
    JourneyEvent.find(query)
      .populate('teamId', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    JourneyEvent.countDocuments(query)
  ]);
  
  return {
    events,
    total,
    hasMore: offset + events.length < total
  };
}

/**
 * Get journey summary statistics
 */
export async function getJourneySummary(orgId, teamId = null) {
  const query = { orgId };
  if (teamId) query.teamId = teamId;
  
  // Get first and latest OAR events
  const [firstEvent, latestEvent] = await Promise.all([
    JourneyEvent.findOne({ ...query, oarScore: { $ne: null } }).sort({ createdAt: 1 }).lean(),
    JourneyEvent.findOne({ ...query, oarScore: { $ne: null } }).sort({ createdAt: -1 }).lean()
  ]);
  
  const startingOAR = firstEvent?.oarScore || 50;
  const currentOAR = latestEvent?.oarScore || 50;
  const totalGain = currentOAR - startingOAR;
  
  // Calculate days since start
  const startDate = firstEvent?.createdAt || new Date();
  const daysSinceStart = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
  
  // Count events by type
  const eventCounts = await JourneyEvent.aggregate([
    { $match: query },
    { $group: { _id: '$type', count: { $sum: 1 } } }
  ]);
  
  const counts = {};
  eventCounts.forEach(ec => {
    counts[ec._id] = ec.count;
  });
  
  // Get highlight events
  const highlights = await JourneyEvent.find({ ...query, isHighlight: true })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();
  
  return {
    startingOAR,
    currentOAR,
    totalGain,
    gainDirection: totalGain > 0 ? 'positive' : totalGain < 0 ? 'negative' : 'neutral',
    daysSinceStart,
    startDate,
    eventCounts: counts,
    totalEvents: Object.values(counts).reduce((sum, c) => sum + c, 0),
    highlights,
    milestones: counts.milestone || 0,
    interventions: counts.intervention || 0,
    alerts: counts.alert || 0,
    recoveries: counts.recovery || 0
  };
}

/**
 * Get OAR trend data for chart
 */
export async function getOARTrendData(orgId, options = {}) {
  const { teamId = null, limit = 20 } = options;
  
  const query = { orgId, oarScore: { $ne: null } };
  if (teamId) query.teamId = teamId;
  else query.teamId = null;
  
  const events = await JourneyEvent.find(query)
    .select('createdAt oarScore oarDelta type title')
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
  
  // Also get OAR history for more data points
  const oarHistory = await OARScore.find({
    orgId,
    teamId: teamId || null
  }).sort({ periodEnd: 1 }).limit(limit).lean();
  
  // Merge and deduplicate by date
  const dataPoints = [];
  const seenDates = new Set();
  
  oarHistory.forEach(oar => {
    const dateKey = oar.periodEnd.toISOString().split('T')[0];
    if (!seenDates.has(dateKey)) {
      seenDates.add(dateKey);
      dataPoints.push({
        date: oar.periodEnd,
        score: oar.score,
        source: 'oar'
      });
    }
  });
  
  events.forEach(event => {
    const dateKey = event.createdAt.toISOString().split('T')[0];
    if (!seenDates.has(dateKey)) {
      seenDates.add(dateKey);
      dataPoints.push({
        date: event.createdAt,
        score: event.oarScore,
        source: 'event',
        eventType: event.type,
        eventTitle: event.title
      });
    }
  });
  
  // Sort by date
  dataPoints.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return dataPoints;
}

/**
 * Auto-create journey events from system activities
 */
export async function autoCreateJourneyEvent(type, data) {
  const eventData = {
    ...data,
    isAutomated: true
  };
  
  switch (type) {
    case 'intervention-complete':
      eventData.type = 'intervention';
      eventData.title = data.title || 'Intervention Completed';
      eventData.relatedEntities = { interventionId: data.interventionId };
      eventData.impact = {
        type: data.impactDelta > 0 ? 'positive' : data.impactDelta < 0 ? 'negative' : 'neutral',
        magnitude: Math.abs(data.impactDelta || 0),
        description: data.impactDescription
      };
      break;
      
    case 'goal-achieved':
      eventData.type = 'goal-complete';
      eventData.title = data.title || 'Goal Achieved';
      eventData.relatedEntities = { goalId: data.goalId };
      eventData.isHighlight = true;
      break;
      
    case 'drift-detected':
      eventData.type = 'alert';
      eventData.title = data.title || 'Drift Detected';
      eventData.relatedEntities = { driftEventId: data.driftEventId };
      eventData.impact = { type: 'negative', magnitude: data.magnitude };
      break;
      
    case 'crisis-resolved':
      eventData.type = 'recovery';
      eventData.title = data.title || 'Crisis Resolved';
      eventData.isHighlight = true;
      break;
      
    case 'baseline-established':
      eventData.type = 'baseline-set';
      eventData.title = data.title || 'Baseline Established';
      eventData.isHighlight = true;
      break;
      
    case 'oar-milestone':
      eventData.type = 'milestone';
      eventData.title = data.title || `OAR reached ${data.oarScore}`;
      eventData.isHighlight = true;
      break;
      
    default:
      eventData.type = type;
  }
  
  return await createJourneyEvent(eventData);
}

/**
 * Delete a journey event
 */
export async function deleteJourneyEvent(eventId, orgId) {
  const result = await JourneyEvent.findOneAndDelete({ _id: eventId, orgId });
  return result !== null;
}

/**
 * Update a journey event
 */
export async function updateJourneyEvent(eventId, updates, orgId) {
  const event = await JourneyEvent.findOne({ _id: eventId, orgId });
  
  if (!event) {
    throw new Error('Event not found');
  }
  
  const allowedFields = ['title', 'description', 'isHighlight', 'impact'];
  allowedFields.forEach(field => {
    if (updates[field] !== undefined) {
      event[field] = updates[field];
    }
  });
  
  await event.save();
  return event;
}

/**
 * Get board-ready narrative summary
 */
export async function getNarrativeSummary(orgId) {
  const summary = await getJourneySummary(orgId);
  const recentHighlights = summary.highlights.slice(0, 3);
  
  // Build narrative
  let narrative = '';
  
  if (summary.totalGain > 0) {
    narrative = `Over the past ${summary.daysSinceStart} days, organizational agility has improved from ${summary.startingOAR} to ${summary.currentOAR} (+${summary.totalGain} points). `;
  } else if (summary.totalGain < 0) {
    narrative = `Over the past ${summary.daysSinceStart} days, organizational agility has declined from ${summary.startingOAR} to ${summary.currentOAR} (${summary.totalGain} points). `;
  } else {
    narrative = `Over the past ${summary.daysSinceStart} days, organizational agility has remained stable at ${summary.currentOAR}. `;
  }
  
  if (summary.interventions > 0) {
    narrative += `${summary.interventions} interventions were implemented. `;
  }
  
  if (summary.milestones > 0) {
    narrative += `${summary.milestones} milestones were achieved. `;
  }
  
  return {
    narrative,
    summary,
    highlights: recentHighlights,
    recommendation: summary.totalGain < 0 
      ? 'Consider reviewing recent changes and implementing targeted interventions.'
      : summary.totalGain > 10 
        ? 'Great progress! Continue current practices and share learnings across teams.'
        : 'Maintain current trajectory and monitor for emerging issues.'
  };
}

export default {
  createJourneyEvent,
  getJourneyTimeline,
  getJourneySummary,
  getOARTrendData,
  autoCreateJourneyEvent,
  deleteJourneyEvent,
  updateJourneyEvent,
  getNarrativeSummary
};
