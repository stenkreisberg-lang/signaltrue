import React, { useState } from 'react';
import {
  Building2,
  Users,
  Clock,
  TrendingUp,
  ChevronDown,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { AssessmentInputs, CompanyInputs, WorkloadInputs, RetentionInputs } from './types';

interface AssessmentFormProps {
  onSubmit: (inputs: AssessmentInputs) => void;
  onTrackEvent?: (event: string, data?: Record<string, unknown>) => void;
}

// Default values
const DEFAULT_COMPANY: CompanyInputs = {
  teamSize: 50,
  averageSalary: 60000,
  overheadMultiplier: 1.3,
};

const DEFAULT_WORKLOAD: WorkloadInputs = {
  meetingHoursPerWeek: 10,
  backToBackFrequency: 'medium',
  afterHoursPerWeek: 2,
};

const DEFAULT_RETENTION: RetentionInputs = {
  attritionPercent: 10,
  roleType: 'professional',
};

const SALARY_BANDS = [
  { label: '€30K – €50K', value: 40000 },
  { label: '€50K – €70K', value: 60000 },
  { label: '€70K – €100K', value: 85000 },
  { label: '€100K – €150K', value: 125000 },
  { label: '€150K+', value: 175000 },
  { label: 'Custom', value: 0 },
];

export const AssessmentForm: React.FC<AssessmentFormProps> = ({ onSubmit, onTrackEvent }) => {
  const [company, setCompany] = useState<CompanyInputs>(DEFAULT_COMPANY);
  const [workload, setWorkload] = useState<WorkloadInputs>(DEFAULT_WORKLOAD);
  const [retention, setRetention] = useState<RetentionInputs>(DEFAULT_RETENTION);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customSalary, setCustomSalary] = useState(false);
  const [meetingWastePercent, setMeetingWastePercent] = useState(25);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onTrackEvent?.('assessment_completed', {
      teamSize: company.teamSize,
      riskFactors: {
        meetingHours: workload.meetingHoursPerWeek,
        backToBack: workload.backToBackFrequency,
        afterHours: workload.afterHoursPerWeek,
      },
    });
    onSubmit({ company, workload, retention });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Company Inputs Section */}
      <div className="bg-card rounded-2xl border border-border/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Company Inputs</h3>
            <p className="text-sm text-muted-foreground">Estimates are fine – no validation shaming here</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Team Size */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Team Size
              <span className="text-muted-foreground font-normal ml-2">(number of people)</span>
            </label>
            <Input
              type="number"
              min="1"
              max="10000"
              value={company.teamSize}
              onChange={(e) => setCompany({ ...company, teamSize: parseInt(e.target.value) || 1 })}
              className="w-full"
              placeholder="e.g., 50"
            />
          </div>

          {/* Average Salary */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Average Annual Salary
              <span className="text-muted-foreground font-normal ml-2">(estimate)</span>
            </label>
            {!customSalary ? (
              <div className="relative">
                <select
                  value={company.averageSalary}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value === 0) {
                      setCustomSalary(true);
                    } else {
                      setCompany({ ...company, averageSalary: value });
                    }
                  }}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground appearance-none cursor-pointer"
                >
                  {SALARY_BANDS.map((band) => (
                    <option key={band.value} value={band.value}>
                      {band.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="10000"
                  max="500000"
                  value={company.averageSalary}
                  onChange={(e) => setCompany({ ...company, averageSalary: parseInt(e.target.value) || 50000 })}
                  className="flex-1"
                  placeholder="e.g., 75000"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomSalary(false)}
                >
                  Use bands
                </Button>
              </div>
            )}
          </div>

          {/* Overhead Multiplier (Advanced) */}
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              {showAdvanced ? 'Hide' : 'Show'} overhead multiplier
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>
            {showAdvanced && (
              <div className="mt-4 p-4 rounded-lg bg-secondary/30">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Benefits & Overhead Multiplier
                  <span className="text-muted-foreground font-normal ml-2">(default: 1.3x = 30% overhead)</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  max="2"
                  step="0.1"
                  value={company.overheadMultiplier}
                  onChange={(e) => setCompany({ ...company, overheadMultiplier: parseFloat(e.target.value) || 1.3 })}
                  className="w-32"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Typical range: 1.2 (lean) to 1.5 (comprehensive benefits)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workload & Collaboration Inputs */}
      <div className="bg-card rounded-2xl border border-border/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Workload & Collaboration</h3>
            <p className="text-sm text-muted-foreground">Your best estimate of current patterns</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Meeting Hours */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Meeting Hours Per Person / Week
            </label>
            <Input
              type="number"
              min="0"
              max="40"
              value={workload.meetingHoursPerWeek}
              onChange={(e) => setWorkload({ ...workload, meetingHoursPerWeek: parseInt(e.target.value) || 0 })}
              className="w-full"
              placeholder="e.g., 10"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Industry average: 10-15 hours/week for knowledge workers
            </p>
          </div>

          {/* Back-to-Back Frequency */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Back-to-Back Meetings
            </label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setWorkload({ ...workload, backToBackFrequency: freq })}
                  className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    workload.backToBackFrequency === freq
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border text-foreground hover:bg-secondary/50'
                  }`}
                >
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              How often do meetings run consecutively without breaks?
            </p>
          </div>

          {/* After-Hours Work */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              After-Hours Work Per Person / Week
              <span className="text-muted-foreground font-normal ml-2">(hours)</span>
            </label>
            <Input
              type="number"
              min="0"
              max="20"
              value={workload.afterHoursPerWeek}
              onChange={(e) => setWorkload({ ...workload, afterHoursPerWeek: parseInt(e.target.value) || 0 })}
              className="w-32"
              placeholder="e.g., 2"
            />
          </div>
        </div>
      </div>

      {/* Retention Risk Inputs */}
      <div className="bg-card rounded-2xl border border-border/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Retention Risk</h3>
            <p className="text-sm text-muted-foreground">Estimate turnover exposure</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Attrition Rate */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Estimated Regrettable Attrition %
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="50"
                value={retention.attritionPercent}
                onChange={(e) => setRetention({ ...retention, attritionPercent: parseInt(e.target.value) || 0 })}
                className="w-24"
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Industry average: 10-15% for knowledge workers
            </p>
          </div>

          {/* Role Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Primary Role Type
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="roleType"
                  checked={retention.roleType === 'professional'}
                  onChange={() => setRetention({ ...retention, roleType: 'professional', customReplacementCost: undefined })}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm text-foreground">Professional / Technical</span>
                <span className="text-xs text-muted-foreground">(80% replacement cost)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="roleType"
                  checked={retention.roleType === 'manager'}
                  onChange={() => setRetention({ ...retention, roleType: 'manager', customReplacementCost: undefined })}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm text-foreground">Manager / Lead</span>
                <span className="text-xs text-muted-foreground">(200% replacement cost)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="roleType"
                  checked={retention.roleType === 'custom'}
                  onChange={() => setRetention({ ...retention, roleType: 'custom', customReplacementCost: 100 })}
                  className="w-4 h-4 text-primary"
                />
                <span className="text-sm text-foreground">Custom %</span>
                {retention.roleType === 'custom' && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="10"
                      max="400"
                      value={retention.customReplacementCost || 100}
                      onChange={(e) => setRetention({ ...retention, customReplacementCost: parseInt(e.target.value) || 100 })}
                      className="w-20 h-8"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Meeting Waste Adjustment */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              Estimated Meeting Waste
              <span className="text-muted-foreground font-normal ml-2">(default: 25%)</span>
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="10"
                max="50"
                value={meetingWastePercent}
                onChange={(e) => setMeetingWastePercent(parseInt(e.target.value))}
                className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-sm font-medium text-foreground w-12">{meetingWastePercent}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Research suggests 25-40% of meeting time may not add value
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button type="submit" variant="hero" size="xl" className="min-w-[280px]">
          Calculate Cost Exposure
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </form>
  );
};

export default AssessmentForm;
