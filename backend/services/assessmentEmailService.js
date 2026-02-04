import { Resend } from 'resend';
import { ccSuperadmin } from './superadminNotifyService.js';

// Initialize Resend client
const getResendClient = () => {
  if (process.env.RESEND_API_KEY) {
    return new Resend(process.env.RESEND_API_KEY);
  }
  return null;
};

const FROM_EMAIL = process.env.EMAIL_FROM || 'SignalTrue <notifications@signaltrue.ai>';
const INTERNAL_NOTIFICATION_EMAIL = 'sten.kreisberg@signaltrue.ai';

/**
 * Format currency for email
 */
function formatCurrency(value) {
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `€${Math.round(value / 1000).toLocaleString()}K`;
  }
  return `€${Math.round(value).toLocaleString()}`;
}

/**
 * Generate AI-powered recommendations based on assessment data
 */
function generateRecommendations(result, inputs) {
  const recommendations = [];
  const { workload, company, retention } = inputs;
  const riskLevel = result.riskScore?.level;
  const factors = result.riskScore?.factors || {};

  // Meeting Load Recommendations
  if (factors.meetingLoad >= 15) {
    recommendations.push({
      category: 'Meeting Optimization',
      priority: 'High',
      icon: '📅',
      title: 'Reduce Meeting Density',
      description: `With ${workload.meetingHoursPerWeek}h of meetings per week, your team has limited time for focused work. Research shows productivity drops significantly when meetings exceed 10h/week.`,
      actions: [
        'Audit recurring meetings – cancel or reduce frequency of meetings without clear outcomes',
        'Implement "No Meeting" blocks (e.g., Tuesday/Thursday mornings)',
        'Set default meeting durations to 25 or 50 minutes instead of 30/60',
        'Require agenda and desired outcomes for all meetings'
      ],
      expectedImpact: 'Recovering 2-3 hours per person weekly can yield 5-8% productivity gains'
    });
  } else if (factors.meetingLoad >= 10) {
    recommendations.push({
      category: 'Meeting Optimization',
      priority: 'Medium',
      icon: '📅',
      title: 'Optimize Meeting Efficiency',
      description: `Your meeting load (${workload.meetingHoursPerWeek}h/week) is above the recommended threshold for knowledge workers.`,
      actions: [
        'Review meeting necessity – could this be an async update?',
        'Shorten standing meetings by 10-15 minutes',
        'Designate one meeting-free day per week'
      ],
      expectedImpact: 'Small reductions compound: 1h/week saved = 52 hours/year per person'
    });
  }

  // Fragmentation Recommendations
  if (workload.backToBackFrequency === 'high') {
    recommendations.push({
      category: 'Calendar Fragmentation',
      priority: 'High',
      icon: '🔄',
      title: 'Address Back-to-Back Meeting Patterns',
      description: 'High frequency of consecutive meetings creates context-switching overhead and eliminates recovery time between sessions.',
      actions: [
        'Implement 5-10 minute buffer policies between meetings',
        'Block "focus time" in calendars as non-negotiable',
        'Use scheduling tools that enforce gaps (Clockwise, Reclaim)',
        'Encourage walking meetings for 1:1s to create natural transitions'
      ],
      expectedImpact: 'Reducing fragmentation can improve deep work capacity by 20-30%'
    });
  } else if (workload.backToBackFrequency === 'medium') {
    recommendations.push({
      category: 'Calendar Fragmentation',
      priority: 'Medium',
      icon: '🔄',
      title: 'Reduce Calendar Fragmentation',
      description: 'Moderate back-to-back patterns suggest opportunities to consolidate meetings and protect focus time.',
      actions: [
        'Group similar meetings on specific days',
        'Schedule collaborative work in morning, focus work in afternoon (or vice versa)',
        'Review meeting distribution across the week'
      ],
      expectedImpact: 'Better time-blocking can add 1-2 focused hours daily'
    });
  }

  // After-Hours Recommendations
  if (workload.afterHoursPerWeek >= 5) {
    recommendations.push({
      category: 'Work-Life Boundaries',
      priority: 'High',
      icon: '🌙',
      title: 'Address After-Hours Work Culture',
      description: `${workload.afterHoursPerWeek} hours of after-hours work weekly indicates workload spillover or boundary challenges. This pattern strongly correlates with burnout risk.`,
      actions: [
        'Audit after-hours drivers: Is it workload, timezone issues, or cultural expectations?',
        'Implement "quiet hours" policies for non-urgent communications',
        'Use scheduled send for emails/messages',
        'Lead by example – leaders avoiding after-hours sets cultural norms',
        'Review workload distribution – some team members may be overloaded'
      ],
      expectedImpact: 'Reducing after-hours work by 50% can decrease burnout indicators by 35%'
    });
  } else if (workload.afterHoursPerWeek >= 2) {
    recommendations.push({
      category: 'Work-Life Boundaries',
      priority: 'Medium',
      icon: '🌙',
      title: 'Monitor After-Hours Patterns',
      description: `Some after-hours work (${workload.afterHoursPerWeek}h/week) may indicate workload distribution issues or cultural expectations.`,
      actions: [
        'Identify root causes: deadlines, timezone collaboration, or overflow work',
        'Set clear expectations about response times outside work hours',
        'Consider async-first policies for non-urgent items'
      ],
      expectedImpact: 'Proactive boundary management prevents escalation to burnout'
    });
  }

  // Team Size / Coordination Recommendations
  if (company.teamSize >= 50) {
    recommendations.push({
      category: 'Coordination Overhead',
      priority: 'Medium',
      icon: '👥',
      title: 'Optimize Team Coordination at Scale',
      description: `At ${company.teamSize} people, coordination overhead compounds quickly. Small inefficiencies multiply across the organization.`,
      actions: [
        'Invest in async documentation and knowledge bases',
        'Implement clear decision-making frameworks (RACI, DRI)',
        'Use team topologies to reduce cross-team dependencies',
        'Regular review of meeting necessity across teams'
      ],
      expectedImpact: 'Reducing coordination tax by 10% at this scale = significant cost savings'
    });
  }

  // Attrition Risk Recommendations
  if (retention.attritionPercent >= 15 || riskLevel === 'high') {
    recommendations.push({
      category: 'Retention Risk',
      priority: 'High',
      icon: '⚠️',
      title: 'Proactive Retention Strategy',
      description: `Your combination of workload patterns and ${retention.attritionPercent}% attrition rate suggests elevated turnover risk. Each departure costs ${retention.roleType === 'manager' ? '200%' : '80%'} of annual salary.`,
      actions: [
        'Identify high-risk individuals through workload patterns (not content monitoring)',
        'Implement stay interviews for key talent',
        'Review workload distribution for equity',
        'Create clear growth paths and recognition systems',
        'Address systemic issues revealed by exit interviews'
      ],
      expectedImpact: 'Reducing attrition by 2% could save ' + formatCurrency(company.teamSize * 0.02 * company.averageSalary * (retention.roleType === 'manager' ? 2 : 0.8))
    });
  }

  // Focus Time Recommendations
  if (factors.focusTimeLoss >= 15) {
    recommendations.push({
      category: 'Focus Time Protection',
      priority: 'High',
      icon: '🎯',
      title: 'Reclaim Deep Work Capacity',
      description: 'Your team\'s focus time is significantly compromised by meetings and fragmentation. Knowledge workers need 4+ hours of uninterrupted time for complex work.',
      actions: [
        'Audit available focus blocks across the team',
        'Implement "Maker Schedule" principles – cluster meetings, protect mornings or afternoons',
        'Create team agreements about interruption protocols',
        'Consider "Focus Fridays" or similar initiatives'
      ],
      expectedImpact: 'Each additional hour of focus time can increase output quality by 15-25%'
    });
  }

  return recommendations;
}

/**
 * Calculate derived metrics for the report
 */
function calculateDerivedMetrics(result, inputs) {
  const { workload, company, retention } = inputs;
  const hoursPerYear = 2080;
  
  // Focus Time Available
  const workHoursPerWeek = 40;
  const focusTimePerWeek = Math.max(0, workHoursPerWeek - workload.meetingHoursPerWeek - (workload.afterHoursPerWeek * 0.5));
  const focusTimePercent = (focusTimePerWeek / workHoursPerWeek * 100).toFixed(0);
  
  // Collaboration Tax
  const collaborationTaxPercent = ((workload.meetingHoursPerWeek / workHoursPerWeek) * 100).toFixed(0);
  
  // Burnout Risk Indicator (simplified)
  let burnoutRisk = 'Low';
  if (workload.afterHoursPerWeek >= 5 || (workload.meetingHoursPerWeek >= 15 && workload.backToBackFrequency === 'high')) {
    burnoutRisk = 'High';
  } else if (workload.afterHoursPerWeek >= 2 || workload.meetingHoursPerWeek >= 12) {
    burnoutRisk = 'Moderate';
  }
  
  // Productivity Potential
  const wastedMeetingHours = workload.meetingHoursPerWeek * (result.assumptions?.meetingWastePercent || 0.25);
  const potentialRecoveryHoursYear = wastedMeetingHours * company.teamSize * 52;
  
  // Cost per hour of waste
  const loadedHourlyRate = (company.averageSalary * company.overheadMultiplier) / hoursPerYear;
  
  return {
    focusTimePerWeek: focusTimePerWeek.toFixed(1),
    focusTimePercent,
    collaborationTaxPercent,
    burnoutRisk,
    wastedMeetingHours: wastedMeetingHours.toFixed(1),
    potentialRecoveryHoursYear: Math.round(potentialRecoveryHoursYear),
    loadedHourlyRate: loadedHourlyRate.toFixed(2),
    meetingCostPerPersonWeek: formatCurrency(workload.meetingHoursPerWeek * loadedHourlyRate),
    totalMeetingCostWeek: formatCurrency(workload.meetingHoursPerWeek * loadedHourlyRate * company.teamSize)
  };
}

/**
 * Send comprehensive assessment results email to the user
 */
export async function sendAssessmentResultsEmail(email, result, inputs) {
  const resend = getResendClient();
  
  if (!resend) {
    console.log('⚠️ Resend not configured. Skipping user results email.');
    return { success: false, reason: 'resend_not_configured' };
  }

  const riskLevel = result.riskScore?.level || 'unknown';
  const riskScore = result.riskScore?.total || 0;
  const factors = result.riskScore?.factors || {};
  const costLow = formatCurrency(result.costBreakdown?.totalCostLow || 0);
  const costHigh = formatCurrency(result.costBreakdown?.totalCostHigh || 0);
  const teamSize = inputs.company?.teamSize || 0;

  const recommendations = generateRecommendations(result, inputs);
  const metrics = calculateDerivedMetrics(result, inputs);

  const riskColors = {
    low: '#22c55e',
    emerging: '#f59e0b', 
    high: '#ef4444'
  };

  const riskLabels = {
    low: 'Low Risk',
    emerging: 'Emerging Risk',
    high: 'High Risk'
  };

  const riskDescriptions = {
    low: 'Your organization shows healthy workload patterns. Continue monitoring to maintain this balance.',
    emerging: 'Your organization shows patterns that often precede overload. Proactive intervention is recommended.',
    high: 'Your organization shows significant workload risk patterns. Immediate attention is recommended to prevent burnout and attrition.'
  };

  // Generate recommendations HTML
  const recommendationsHtml = recommendations.map((rec, index) => `
    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 16px; border-left: 4px solid ${rec.priority === 'High' ? '#ef4444' : '#f59e0b'};">
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 24px; margin-right: 12px;">${rec.icon}</span>
        <div>
          <span style="display: inline-block; padding: 2px 8px; background: ${rec.priority === 'High' ? '#fef2f2' : '#fffbeb'}; color: ${rec.priority === 'High' ? '#dc2626' : '#d97706'}; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">${rec.priority} Priority</span>
          <h4 style="margin: 0; color: #1a1a2e; font-size: 16px;">${rec.title}</h4>
        </div>
      </div>
      <p style="color: #475569; margin: 0 0 12px 0; font-size: 14px; line-height: 1.5;">${rec.description}</p>
      <div style="background: white; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #1a1a2e; font-size: 13px;">Recommended Actions:</p>
        <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 13px;">
          ${rec.actions.map(action => `<li style="margin-bottom: 6px;">${action}</li>`).join('')}
        </ul>
      </div>
      <p style="margin: 0; color: #6366f1; font-size: 13px; font-weight: 500;">💡 Expected Impact: ${rec.expectedImpact}</p>
    </div>
  `).join('');

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Your SignalTrue Workload Assessment Report - ${riskLabels[riskLevel] || 'Complete'}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; margin: 0; padding: 0; background-color: #f5f5f7;">
  <div style="max-width: 680px; margin: 0 auto; padding: 40px 20px;">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #6366f1; margin: 0; font-size: 28px; font-weight: 700;">SignalTrue</h1>
      <p style="color: #64748b; margin-top: 8px; font-size: 16px;">Workload Assessment Report</p>
    </div>

    <!-- Executive Summary Card -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%); border-radius: 20px; padding: 32px; margin-bottom: 24px; color: white;">
      <p style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8;">Executive Summary</p>
      <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700;">Your Team Workload Analysis</h2>
      
      <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
        <!-- Risk Score -->
        <div style="flex: 1; min-width: 140px; background: rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; text-align: center;">
          <div style="display: inline-block; padding: 6px 14px; background: ${riskColors[riskLevel]}30; border-radius: 20px; margin-bottom: 8px;">
            <span style="color: ${riskColors[riskLevel]}; font-weight: 600; font-size: 13px;">${riskLabels[riskLevel]}</span>
          </div>
          <div style="font-size: 42px; font-weight: 700;">${riskScore}<span style="font-size: 20px; opacity: 0.7;">/100</span></div>
          <p style="margin: 4px 0 0 0; opacity: 0.7; font-size: 12px;">Workload Risk Index</p>
        </div>
        
        <!-- Cost Exposure -->
        <div style="flex: 1; min-width: 140px; background: rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; text-align: center;">
          <p style="margin: 0 0 4px 0; opacity: 0.7; font-size: 12px;">Annual Cost Exposure</p>
          <div style="font-size: 24px; font-weight: 700;">${costLow} – ${costHigh}</div>
          <p style="margin: 4px 0 0 0; opacity: 0.7; font-size: 12px;">${teamSize} team members</p>
        </div>
      </div>
      
      <p style="margin: 0; opacity: 0.9; font-size: 14px; line-height: 1.6;">${riskDescriptions[riskLevel] || ''}</p>
    </div>

    <!-- Key Metrics Dashboard -->
    <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <h3 style="margin: 0 0 20px 0; color: #1a1a2e; font-size: 18px;">📊 Key Metrics Dashboard</h3>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
        <!-- Focus Time -->
        <div style="background: #f0fdf4; border-radius: 10px; padding: 16px;">
          <p style="margin: 0 0 4px 0; color: #166534; font-size: 12px; font-weight: 600;">FOCUS TIME AVAILABLE</p>
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #166534;">${metrics.focusTimePerWeek}h <span style="font-size: 14px; font-weight: 400;">/ week</span></p>
          <p style="margin: 4px 0 0 0; color: #15803d; font-size: 12px;">${metrics.focusTimePercent}% of work hours</p>
        </div>
        
        <!-- Collaboration Tax -->
        <div style="background: #fef3c7; border-radius: 10px; padding: 16px;">
          <p style="margin: 0 0 4px 0; color: #92400e; font-size: 12px; font-weight: 600;">COLLABORATION TAX</p>
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #92400e;">${metrics.collaborationTaxPercent}%</p>
          <p style="margin: 4px 0 0 0; color: #a16207; font-size: 12px;">Time spent in meetings</p>
        </div>
        
        <!-- Burnout Risk -->
        <div style="background: ${metrics.burnoutRisk === 'High' ? '#fef2f2' : metrics.burnoutRisk === 'Moderate' ? '#fffbeb' : '#f0fdf4'}; border-radius: 10px; padding: 16px;">
          <p style="margin: 0 0 4px 0; color: ${metrics.burnoutRisk === 'High' ? '#991b1b' : metrics.burnoutRisk === 'Moderate' ? '#92400e' : '#166534'}; font-size: 12px; font-weight: 600;">BURNOUT RISK INDICATOR</p>
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${metrics.burnoutRisk === 'High' ? '#dc2626' : metrics.burnoutRisk === 'Moderate' ? '#d97706' : '#16a34a'};">${metrics.burnoutRisk}</p>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 12px;">Based on workload patterns</p>
        </div>
        
        <!-- Weekly Meeting Cost -->
        <div style="background: #eff6ff; border-radius: 10px; padding: 16px;">
          <p style="margin: 0 0 4px 0; color: #1e40af; font-size: 12px; font-weight: 600;">WEEKLY MEETING COST</p>
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #1e40af;">${metrics.totalMeetingCostWeek}</p>
          <p style="margin: 4px 0 0 0; color: #3b82f6; font-size: 12px;">${metrics.meetingCostPerPersonWeek} per person</p>
        </div>
      </div>
    </div>

    <!-- Risk Factor Breakdown -->
    <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <h3 style="margin: 0 0 20px 0; color: #1a1a2e; font-size: 18px;">🎯 Risk Factor Analysis</h3>
      
      <!-- Meeting Load -->
      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: #475569; font-size: 14px;">Meeting Load</span>
          <span style="color: #1a1a2e; font-weight: 600;">${factors.meetingLoad || 0}/25</span>
        </div>
        <div style="background: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden;">
          <div style="background: ${(factors.meetingLoad || 0) > 15 ? '#ef4444' : (factors.meetingLoad || 0) > 10 ? '#f59e0b' : '#22c55e'}; height: 100%; width: ${((factors.meetingLoad || 0) / 25) * 100}%; border-radius: 4px;"></div>
        </div>
        <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">${inputs.workload?.meetingHoursPerWeek || 0} hours of meetings per person per week</p>
      </div>
      
      <!-- Fragmentation -->
      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: #475569; font-size: 14px;">Calendar Fragmentation</span>
          <span style="color: #1a1a2e; font-weight: 600;">${factors.fragmentation || 0}/25</span>
        </div>
        <div style="background: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden;">
          <div style="background: ${(factors.fragmentation || 0) > 15 ? '#ef4444' : (factors.fragmentation || 0) > 10 ? '#f59e0b' : '#22c55e'}; height: 100%; width: ${((factors.fragmentation || 0) / 25) * 100}%; border-radius: 4px;"></div>
        </div>
        <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">Back-to-back meeting frequency: ${inputs.workload?.backToBackFrequency || 'N/A'}</p>
      </div>
      
      <!-- After-Hours -->
      <div style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: #475569; font-size: 14px;">After-Hours Work</span>
          <span style="color: #1a1a2e; font-weight: 600;">${factors.afterHoursWork || 0}/25</span>
        </div>
        <div style="background: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden;">
          <div style="background: ${(factors.afterHoursWork || 0) > 15 ? '#ef4444' : (factors.afterHoursWork || 0) > 10 ? '#f59e0b' : '#22c55e'}; height: 100%; width: ${((factors.afterHoursWork || 0) / 25) * 100}%; border-radius: 4px;"></div>
        </div>
        <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">${inputs.workload?.afterHoursPerWeek || 0} hours of after-hours work per person per week</p>
      </div>
      
      <!-- Focus Time Loss -->
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: #475569; font-size: 14px;">Focus Time Loss</span>
          <span style="color: #1a1a2e; font-weight: 600;">${factors.focusTimeLoss || 0}/25</span>
        </div>
        <div style="background: #e2e8f0; border-radius: 4px; height: 8px; overflow: hidden;">
          <div style="background: ${(factors.focusTimeLoss || 0) > 15 ? '#ef4444' : (factors.focusTimeLoss || 0) > 10 ? '#f59e0b' : '#22c55e'}; height: 100%; width: ${((factors.focusTimeLoss || 0) / 25) * 100}%; border-radius: 4px;"></div>
        </div>
        <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">Derived from meeting load and fragmentation patterns</p>
      </div>
    </div>

    <!-- Cost Breakdown -->
    <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <h3 style="margin: 0 0 20px 0; color: #1a1a2e; font-size: 18px;">💰 Detailed Cost Analysis</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 0; color: #475569;">Loaded Hourly Rate</td>
          <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #1a1a2e;">€${metrics.loadedHourlyRate}/hour</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 0; color: #475569;">
            Annual Meeting Cost<br>
            <span style="font-size: 12px; color: #94a3b8;">${inputs.workload?.meetingHoursPerWeek}h × ${teamSize} people × €${metrics.loadedHourlyRate}/hr × 52 weeks</span>
          </td>
          <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #1a1a2e;">${formatCurrency(result.costBreakdown?.annualMeetingCost || 0)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 0; color: #475569;">
            Estimated Meeting Waste<br>
            <span style="font-size: 12px; color: #94a3b8;">${((result.assumptions?.meetingWastePercent || 0.25) * 100).toFixed(0)}% of meeting time (${metrics.wastedMeetingHours}h/week per person)</span>
          </td>
          <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #f59e0b;">${formatCurrency(result.costBreakdown?.meetingWasteCost || 0)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 0; color: #475569;">
            Turnover Exposure (Range)<br>
            <span style="font-size: 12px; color: #94a3b8;">${inputs.retention?.attritionPercent}% attrition × ${(result.assumptions?.replacementMultiplier * 100).toFixed(0)}% replacement cost</span>
          </td>
          <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #ef4444;">${formatCurrency(result.costBreakdown?.turnoverExposureLow || 0)} – ${formatCurrency(result.costBreakdown?.turnoverExposureHigh || 0)}</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="padding: 16px 12px; font-weight: 700; color: #1a1a2e; font-size: 16px;">Total Annual Cost Exposure</td>
          <td style="padding: 16px 12px; text-align: right; font-weight: 700; color: #6366f1; font-size: 20px;">${costLow} – ${costHigh}</td>
        </tr>
      </table>
      
      <div style="margin-top: 16px; padding: 12px; background: #fefce8; border-radius: 8px; border: 1px solid #fef08a;">
        <p style="margin: 0; color: #854d0e; font-size: 13px;">
          <strong>Formula:</strong> Total Cost Exposure = Meeting Waste Cost + Turnover Exposure Cost
        </p>
      </div>
    </div>

    <!-- AI Recommendations -->
    <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <h3 style="margin: 0 0 8px 0; color: #1a1a2e; font-size: 18px;">🤖 AI-Powered Recommendations</h3>
      <p style="margin: 0 0 20px 0; color: #64748b; font-size: 14px;">Based on your assessment data, here are prioritized recommendations:</p>
      
      ${recommendationsHtml || '<p style="color: #64748b;">Your workload patterns look healthy! Continue monitoring.</p>'}
    </div>

    <!-- Recovery Potential -->
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px; padding: 24px; margin-bottom: 24px; color: white;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px;">✨ Recovery Potential</h3>
      <p style="margin: 0 0 20px 0; opacity: 0.9; font-size: 14px;">If you address the meeting waste alone, here's what you could recover:</p>
      
      <div style="display: flex; flex-wrap: wrap; gap: 16px;">
        <div style="flex: 1; min-width: 120px; background: rgba(255,255,255,0.15); border-radius: 10px; padding: 16px; text-align: center;">
          <p style="margin: 0; font-size: 28px; font-weight: 700;">${metrics.potentialRecoveryHoursYear.toLocaleString()}</p>
          <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 12px;">Hours / Year</p>
        </div>
        <div style="flex: 1; min-width: 120px; background: rgba(255,255,255,0.15); border-radius: 10px; padding: 16px; text-align: center;">
          <p style="margin: 0; font-size: 28px; font-weight: 700;">${formatCurrency(result.costBreakdown?.meetingWasteCost || 0)}</p>
          <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 12px;">Cost Saved</p>
        </div>
      </div>
    </div>

    <!-- Assumptions Block -->
    <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h4 style="margin: 0 0 12px 0; color: #475569; font-size: 14px;">📋 Assumptions Used in This Report</h4>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 13px; color: #64748b;">
        <div>Average Salary: <strong style="color: #1a1a2e;">€${(inputs.company?.averageSalary || 0).toLocaleString()}</strong></div>
        <div>Overhead Multiplier: <strong style="color: #1a1a2e;">${inputs.company?.overheadMultiplier || 1.3}x</strong></div>
        <div>Meeting Waste: <strong style="color: #1a1a2e;">${((result.assumptions?.meetingWastePercent || 0.25) * 100).toFixed(0)}%</strong></div>
        <div>Attrition Rate: <strong style="color: #1a1a2e;">${inputs.retention?.attritionPercent || 10}%</strong></div>
        <div>Replacement Cost: <strong style="color: #1a1a2e;">${((result.assumptions?.replacementMultiplier || 0.8) * 100).toFixed(0)}%</strong></div>
        <div>Team Size: <strong style="color: #1a1a2e;">${teamSize} people</strong></div>
      </div>
      <p style="margin: 12px 0 0 0; color: #64748b; font-size: 12px; font-style: italic;">
        These estimates are based on your inputs and commonly used HR cost models. SignalTrue replaces these assumptions with real workload signals once connected.
      </p>
    </div>

    <!-- CTA Section -->
    <div style="background: white; border-radius: 16px; padding: 32px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      <h3 style="margin: 0 0 12px 0; color: #1a1a2e; font-size: 20px;">Ready to Replace Estimates with Real Data?</h3>
      <p style="margin: 0 0 20px 0; color: #64748b; font-size: 14px;">SignalTrue measures actual collaboration patterns from your tools—no surveys, no guesswork.</p>
      
      <a href="https://signaltrue.ai/register" style="display: inline-block; background: #6366f1; color: white; padding: 16px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 16px; margin-bottom: 16px;">Get a Demo →</a>
      
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
          🔒 Privacy-first: Metadata only • No message content • Team-level insights (min 5 people)
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; color: #94a3b8; font-size: 12px;">
      <p style="margin: 0;">© 2026 SignalTrue. All rights reserved.</p>
      <p style="margin: 8px 0;">
        <a href="https://signaltrue.ai" style="color: #6366f1; text-decoration: none;">signaltrue.ai</a> • 
        <a href="https://signaltrue.ai/how-it-works" style="color: #6366f1; text-decoration: none;">How It Works</a> • 
        <a href="https://signaltrue.ai/pricing" style="color: #6366f1; text-decoration: none;">Pricing</a>
      </p>
    </div>
  </div>
</body>
</html>
      `
    });

    // CC superadmin for verification
    await ccSuperadmin({
      subject: `Your SignalTrue Workload Assessment Report - ${riskLabels[riskLevel] || 'Complete'}`,
      html: `Workload Assessment results for ${email}`,
      originalRecipient: email,
      reportType: 'workload_assessment',
      orgName: email.split('@')[1] || 'Unknown'
    });

    console.log(`[Assessment Email] Comprehensive report sent to: ${email}`);
    return { success: true };

  } catch (error) {
    console.error('[Assessment Email] Failed to send results:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send internal notification about new assessment lead
 */
export async function sendAssessmentLeadNotification(email, result, inputs) {
  const resend = getResendClient();
  
  if (!resend) {
    console.log('⚠️ Resend not configured. Skipping internal notification.');
    return { success: false, reason: 'resend_not_configured' };
  }

  const riskLevel = result.riskScore?.level || 'unknown';
  const riskScore = result.riskScore?.total || 0;
  const costLow = formatCurrency(result.costBreakdown?.totalCostLow || 0);
  const costHigh = formatCurrency(result.costBreakdown?.totalCostHigh || 0);
  const teamSize = inputs.company?.teamSize || 0;
  const meetingHours = inputs.workload?.meetingHoursPerWeek || 0;
  const afterHours = inputs.workload?.afterHoursPerWeek || 0;

  const riskLabels = {
    low: '🟢 Low Risk',
    emerging: '🟡 Emerging Risk',
    high: '🔴 High Risk'
  };

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: INTERNAL_NOTIFICATION_EMAIL,
      subject: `🎯 New Assessment Lead: ${email} (${riskLabels[riskLevel] || riskLevel})`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; margin: 0; padding: 20px;">
  <h2 style="color: #6366f1; margin-top: 0;">New Assessment Lead</h2>
  
  <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Email</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><a href="mailto:${email}">${email}</a></td>
    </tr>
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Risk Level</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${riskLabels[riskLevel] || riskLevel} (${riskScore}/100)</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Cost Exposure</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${costLow} – ${costHigh} / year</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Team Size</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${teamSize} people</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Meeting Hours</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${meetingHours}h / week per person</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">After-Hours Work</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${afterHours}h / week per person</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Back-to-Back</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${inputs.workload?.backToBackFrequency || 'N/A'}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; font-weight: 600;">Attrition Rate</td>
      <td style="padding: 8px 0;">${inputs.retention?.attritionPercent || 10}%</td>
    </tr>
  </table>

  ${result.insights && result.insights.length > 0 ? `
  <h3 style="margin-top: 24px;">Key Insights</h3>
  <ul>
    ${result.insights.map(insight => `<li>${insight}</li>`).join('')}
  </ul>
  ` : ''}

  <p style="margin-top: 24px; color: #64748b; font-size: 12px;">
    Submitted at: ${new Date().toISOString()}
  </p>
</body>
</html>
      `
    });

    console.log(`[Assessment Email] Lead notification sent for: ${email}`);
    return { success: true };

  } catch (error) {
    console.error('[Assessment Email] Failed to send lead notification:', error);
    return { success: false, error: error.message };
  }
}
