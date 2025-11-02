// Micro-playbook recommendations based on drift metric and direction
export function getRecommendation(metric, direction) {
  const playbooks = {
    sentiment: {
      negative: 'Tone drop detected → Encourage recognition posts or 1:1 check-ins to surface concerns.',
      positive: 'Tone improving → Celebrate wins and maintain momentum with team shout-outs.'
    },
    response: {
      negative: 'Response latency rising → Check workload distribution and consider reducing meeting load.',
      positive: 'Response times improving → Team coordination is strong; maintain current rhythm.'
    },
    meetings: {
      negative: 'Meeting overload → Implement a no-meeting day or consolidate recurring syncs.',
      positive: 'Meeting balance improving → Continue optimizing calendar for focus time.'
    },
    afterHours: {
      negative: 'After-hours activity spiking → Discuss boundaries and encourage time-off.',
      positive: 'Off-hours activity normalizing → Team respecting work-life balance.'
    },
    network: {
      negative: 'Collaboration shrinking → Encourage cross-functional touchpoints or team socials.',
      positive: 'Network breadth expanding → Team engaging broadly; foster continued collaboration.'
    },
    focus: {
      negative: 'Focus time dropping → Block dedicated deep work hours and reduce interruptions.',
      positive: 'Focus time improving → Protect these gains by maintaining calendar discipline.'
    },
    recovery: {
      negative: 'Recovery taking longer → Check for persistent stressors and adjust workload.',
      positive: 'Team bouncing back quickly → Resilience is strong; sustain current practices.'
    },
    energy: {
      negative: 'Energy Index dropping → Review top contributors and implement targeted interventions.',
      positive: 'Energy Index rising → Momentum is positive; keep reinforcing healthy habits.'
    }
  };
  return playbooks[metric]?.[direction] || 'Monitor closely and review team feedback.';
}

export default { getRecommendation };
