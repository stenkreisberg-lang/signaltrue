/**
 * Intelligence Notification Service
 * Sends alerts when critical behavioral events occur
 * Integrates with existing notification system
 */

import User from '../models/user.js';
import Team from '../models/team.js';

/**
 * Notify HR/admins of high attrition risk
 */
export async function notifyAttritionRisk(teamId, riskData) {
  if (riskData.riskScore < 60) return; // Only notify for high risk (≥60)
  
  try {
    const team = await Team.findById(teamId);
    if (!team) return;
    
    const hrUsers = await User.find({ 
      orgId: team.orgId, 
      role: { $in: ['hr_admin', 'admin', 'master_admin'] }
    });
    
    const severity = riskData.riskScore >= 80 ? 'critical' : 'high';
    const userName = riskData.userId?.name || 'Team member';
    
    const notification = {
      type: 'attrition_risk',
      severity,
      title: `${severity === 'critical' ? '🚨' : '⚠️'} High Attrition Risk Detected`,
      message: `${userName} in ${team.name} shows ${riskData.riskLevel} flight risk (${riskData.riskScore}/100). Predicted exit: ${riskData.exitWindow}.`,
      data: {
        teamId,
        userId: riskData.userId,
        riskScore: riskData.riskScore,
        signals: riskData.behavioralIndicators
      },
      link: `/dashboard/attrition?userId=${riskData.userId}`
    };
    
    console.log(`[Intelligence Notification] Attrition risk alert:`, {
      user: userName,
      score: riskData.riskScore,
      recipients: hrUsers.length
    });
    
    // TODO: Integrate with your notification system
    // For now, just log. You can add email/Slack integration here.
    
    return notification;
  } catch (error) {
    console.error('Error sending attrition risk notification:', error);
  }
}

/**
 * Notify of manager needing coaching
 */
export async function notifyManagerCoaching(managerId, effectivenessData) {
  if (!effectivenessData || effectivenessData.effectivenessScore >= 65) return;
  
  try {
    const team = await Team.findOne({ managerId });
    if (!team) return;
    
    const hrUsers = await User.find({ 
      orgId: team.orgId, 
      role: { $in: ['hr_admin', 'admin', 'master_admin'] }
    });
    
    const severity = effectivenessData.effectivenessScore < 45 ? 'critical' : 'high';
    const managerName = effectivenessData.managerId?.name || 'Manager';
    
    const notification = {
      type: 'manager_coaching',
      severity,
      title: `${severity === 'critical' ? '🚨' : '⚠️'} Manager Needs Coaching`,
      message: `${managerName} (${team.name}) effectiveness: ${effectivenessData.effectivenessLevel} (${effectivenessData.effectivenessScore}/100)`,
      data: {
        managerId,
        teamId: team._id,
        score: effectivenessData.effectivenessScore,
        improvementAreas: effectivenessData.improvementAreas
      },
      link: `/dashboard/managers?managerId=${managerId}`
    };
    
    console.log(`[Intelligence Notification] Manager coaching alert:`, {
      manager: managerName,
      score: effectivenessData.effectivenessScore,
      recipients: hrUsers.length
    });
    
    return notification;
  } catch (error) {
    console.error('Error sending manager coaching notification:', error);
  }
}

/**
 * Notify of crisis event (URGENT - real-time)
 */
export async function notifyCrisisEvent(teamId, crisisData) {
  try {
    const team = await Team.findById(teamId).populate('orgId');
    if (!team) return;
    
    const hrUsers = await User.find({ 
      orgId: team.orgId, 
      role: { $in: ['hr_admin', 'admin', 'master_admin'] }
    });
    
    const crisisTypes = {
      'team-collapse': 'Team Collapse',
      'mass-exodus': 'Mass Exodus',
      'sudden-silence': 'Sudden Silence',
      'conflict-spike': 'Conflict Spike'
    };
    
    const notification = {
      type: 'crisis_event',
      severity: 'critical',
      title: `🚨 CRISIS: ${crisisTypes[crisisData.crisisType] || 'Alert'}`,
      message: `${team.name}: ${crisisData.description} (Confidence: ${crisisData.confidence}%)`,
      data: {
        teamId,
        crisisId: crisisData._id,
        crisisType: crisisData.crisisType,
        severity: crisisData.severity,
        confidence: crisisData.confidence
      },
      link: `/dashboard/overview?teamId=${teamId}`,
      urgent: true
    };
    
    console.log(`[Intelligence Notification] CRISIS ALERT:`, {
      team: team.name,
      type: crisisData.crisisType,
      severity: crisisData.severity,
      recipients: hrUsers.length
    });
    
    // TODO: Send immediate alerts (email, SMS, Slack)
    
    return notification;
  } catch (error) {
    console.error('Error sending crisis notification:', error);
  }
}

/**
 * Notify of critical succession risk
 */
export async function notifySuccessionRisk(teamId, successionData) {
  if (!successionData || successionData.busFactor >= 50) return;
  
  try {
    const team = await Team.findById(teamId);
    if (!team) return;
    
    const hrUsers = await User.find({ 
      orgId: team.orgId, 
      role: { $in: ['hr_admin', 'admin', 'master_admin'] }
    });
    
    const notification = {
      type: 'succession_risk',
      severity: successionData.busFactor < 30 ? 'critical' : 'high',
      title: `⚠️ Critical Succession Risk`,
      message: `${team.name}: Bus factor ${successionData.busFactor}/100. ${successionData.criticalRoles?.length || 0} critical knowledge holders.`,
      data: {
        teamId,
        busFactor: successionData.busFactor,
        criticalRoles: successionData.criticalRoles
      },
      link: `/dashboard/succession?teamId=${teamId}`
    };
    
    console.log(`[Intelligence Notification] Succession risk alert:`, {
      team: team.name,
      busFactor: successionData.busFactor,
      recipients: hrUsers.length
    });
    
    return notification;
  } catch (error) {
    console.error('Error sending succession risk notification:', error);
  }
}

/**
 * Notify of equity issues
 */
export async function notifyEquityIssue(teamId, equityData) {
  if (!equityData || equityData.overallEquityScore >= 70) return;
  
  try {
    const team = await Team.findById(teamId);
    if (!team) return;
    
    const hrUsers = await User.find({ 
      orgId: team.orgId, 
      role: { $in: ['hr_admin', 'admin', 'master_admin'] }
    });
    
    const issues = [];
    if (equityData.responseTimeEquity?.equityScore < 70) {
      issues.push(`Response time inequity (${equityData.responseTimeEquity.equityScore}/100)`);
    }
    if (equityData.participationEquity?.equityScore < 70) {
      issues.push(`Participation inequity (${equityData.participationEquity.equityScore}/100)`);
    }
    if (equityData.voiceEquity?.equityScore < 70) {
      issues.push(`Voice inequity (${equityData.voiceEquity.equityScore}/100)`);
    }
    
    const notification = {
      type: 'equity_issue',
      severity: equityData.overallEquityScore < 50 ? 'high' : 'medium',
      title: `⚖️ Equity Issues Detected`,
      message: `${team.name}: ${issues.join(', ')}`,
      data: {
        teamId,
        overallScore: equityData.overallEquityScore,
        issues: equityData.inequities
      },
      link: `/dashboard/equity?teamId=${teamId}`
    };
    
    console.log(`[Intelligence Notification] Equity issue alert:`, {
      team: team.name,
      score: equityData.overallEquityScore,
      recipients: hrUsers.length
    });
    
    return notification;
  } catch (error) {
    console.error('Error sending equity issue notification:', error);
  }
}

/**
 * Notify of network health issues (silos, bottlenecks)
 */
export async function notifyNetworkHealth(teamId, networkData) {
  if (!networkData || networkData.siloScore < 70) return;
  
  try {
    const team = await Team.findById(teamId);
    if (!team) return;
    
    const hrUsers = await User.find({ 
      orgId: team.orgId, 
      role: { $in: ['hr_admin', 'admin', 'master_admin'] }
    });
    
    const notification = {
      type: 'network_health',
      severity: networkData.siloScore >= 85 ? 'high' : 'medium',
      title: `🔗 Network Health Alert`,
      message: `${team.name}: Silo score ${networkData.siloScore}/100. ${networkData.bottlenecks?.length || 0} bottlenecks, ${networkData.isolatedMembers?.length || 0} isolated members.`,
      data: {
        teamId,
        siloScore: networkData.siloScore,
        bottlenecks: networkData.bottlenecks,
        isolatedMembers: networkData.isolatedMembers
      },
      link: `/dashboard/network?teamId=${teamId}`
    };
    
    console.log(`[Intelligence Notification] Network health alert:`, {
      team: team.name,
      siloScore: networkData.siloScore,
      recipients: hrUsers.length
    });
    
    return notification;
  } catch (error) {
    console.error('Error sending network health notification:', error);
  }
}

export default {
  notifyAttritionRisk,
  notifyManagerCoaching,
  notifyCrisisEvent,
  notifySuccessionRisk,
  notifyEquityIssue,
  notifyNetworkHealth
};
