/**
 * Monthly Leadership Report Service
 * 
 * Generates executive-focused monthly reports for CEO and Board members.
 * Available only in Leadership Intelligence (€199) and Custom plans.
 * 
 * CRITICAL DIFFERENCES FROM HR REPORTS:
 * - Organizational trajectory, not team metrics
 * - Structural risks, not individual performance
 * - Decision prompts, not action items
 * - No individual names
 * - No tactical recommendations
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MonthlyLeadershipReportService {
  constructor() {
    this.strategicPrompt = null;
  }

  /**
   * Load strategic AI prompt template
   */
  async loadStrategicPrompt() {
    if (!this.strategicPrompt) {
      const promptPath = path.join(__dirname, '../prompts/monthlyStrategicAiPrompt_v1.json');
      const promptData = await fs.readFile(promptPath, 'utf-8');
      this.strategicPrompt = JSON.parse(promptData);
    }
    return this.strategicPrompt;
  }

  /**
   * Generate monthly leadership report
   * 
   * @param {Object} organization - Organization with subscription check
   * @param {Date} monthOf - Month to generate report for
   * @param {Object} options - Additional options
   * @returns {Object} Leadership report
   */
  async generateReport(organization, monthOf, options = {}) {
    // Validate subscription tier (should be checked by middleware, but double-check)
    if (!['leadership', 'custom'].includes(organization.subscriptionPlanId)) {
      throw new Error('Leadership reports require Leadership Intelligence plan or higher');
    }

    const prompt = await this.loadStrategicPrompt();

    // Gather organizational-level data
    const orgData = await this.gatherOrganizationalData(organization, monthOf);

    // Generate strategic AI synthesis
    const strategicInsights = await this.generateStrategicInsights(orgData, prompt);

    // Optionally include industry benchmarks (if plan allows)
    let benchmarkContext = null;
    if (organization.subscriptionPlanId === 'leadership' || organization.subscriptionPlanId === 'custom') {
      benchmarkContext = await this.getBenchmarkContext(organization, orgData);
    }

    // Build report structure
    const report = {
      reportType: 'monthly_leadership',
      organization: {
        id: organization._id,
        name: organization.name,
        industry: organization.industry,
        size: organization.size
      },
      period: {
        month: monthOf,
        generatedAt: new Date()
      },
      narrative: strategicInsights.narrative,
      structuralRisks: strategicInsights.structuralRisks,
      leveragePoints: strategicInsights.leveragePoints,
      executionAnalysis: strategicInsights.executionAnalysis,
      decisionPrompts: strategicInsights.decisionPrompts,
      retentionExposure: strategicInsights.retentionExposure,
      benchmarks: benchmarkContext,
      metadata: {
        aiMode: 'strategic',
        promptVersion: prompt.version,
        subscriptionPlan: organization.subscriptionPlanId
      }
    };

    // Validate report doesn't leak tactical/individual data
    this.validateLeadershipReport(report);

    return report;
  }

  /**
   * Gather organizational-level data (aggregated, no individual details)
   */
  async gatherOrganizationalData(organization, monthOf) {
    // This would aggregate from various sources
    // Implementation depends on existing data models
    
    return {
      bdiTrend: await this.calculateBDITrend(organization, monthOf),
      structuralRisks: await this.identifyStructuralRisks(organization, monthOf),
      attritionExposure: await this.calculateAttritionExposure(organization, monthOf),
      executionDrag: await this.calculateExecutionDrag(organization, monthOf),
      crossTeamPatterns: await this.analyzeCrossTeamPatterns(organization, monthOf),
      orgSize: organization.size,
      industry: organization.industry,
      monthOf,
      previousMonth: await this.getPreviousMonthComparison(organization, monthOf)
    };
  }

  /**
   * Generate strategic insights using AI
   */
  async generateStrategicInsights(orgData, prompt) {
    // This would call your AI service with the strategic prompt
    // For now, return structure based on prompt template
    
    // TODO: Integrate with actual AI service
    // const aiResponse = await aiService.generate(prompt.userPromptTemplate, orgData);
    
    // Placeholder implementation
    return {
      narrative: {
        trajectory: 'stable',
        summary: 'Organization showing stable performance with identified growth opportunities.',
        inflectionPoints: []
      },
      structuralRisks: [],
      leveragePoints: [],
      executionAnalysis: {
        dragSources: [],
        capacityUtilization: 'Moderate',
        bottlenecks: []
      },
      decisionPrompts: [],
      retentionExposure: {
        highRiskSegments: [],
        structuralDrivers: [],
        interventionScope: 'Monitoring recommended'
      }
    };
  }

  /**
   * Get industry benchmark context (Leadership plan and above)
   */
  async getBenchmarkContext(organization, orgData) {
    // Would fetch from IndustryBenchmark model
    // Return percentile-based comparisons only
    
    return null; // Placeholder
  }

  /**
   * Validate that report contains no individual data or tactical recommendations
   */
  validateLeadershipReport(report) {
    const reportStr = JSON.stringify(report).toLowerCase();
    
    // Prohibited terms that indicate tactical/individual leakage
    const prohibited = [
      'employee name',
      'manager should',
      'schedule a meeting',
      '1:1',
      'one-on-one',
      'coaching',
      'performance review'
    ];

    for (const term of prohibited) {
      if (reportStr.includes(term)) {
        throw new Error(`Leadership report contains prohibited term: ${term}`);
      }
    }

    return true;
  }

  /**
   * Archive leadership report when downgrading
   */
  async archiveReportOnDowngrade(organizationId, reportId) {
    // Mark report as archived but keep read-only access for HR
    // Implementation depends on report storage model
    
    return {
      archived: true,
      archivedAt: new Date(),
      reason: 'Plan downgrade'
    };
  }

  // Helper methods (to be implemented based on existing data models)

  async calculateBDITrend(organization, monthOf) {
    // Aggregate BDI across org
    return { trend: 'stable', avgBDI: 72, deltaVsPrevious: 0 };
  }

  async identifyStructuralRisks(organization, monthOf) {
    // Identify org-wide patterns
    return [];
  }

  async calculateAttritionExposure(organization, monthOf) {
    // Calculate retention risk at segment level
    return { exposure: 'low', highRiskSegments: 0 };
  }

  async calculateExecutionDrag(organization, monthOf) {
    // Measure organizational execution efficiency
    return { drag: 'medium', sources: [] };
  }

  async analyzeCrossTeamPatterns(organization, monthOf) {
    // Find patterns across teams
    return [];
  }

  async getPreviousMonthComparison(organization, monthOf) {
    // Get comparison data
    return null;
  }
}

// Singleton instance
const monthlyLeadershipReportService = new MonthlyLeadershipReportService();

export default monthlyLeadershipReportService;
