import mongoose from 'mongoose';

const metricsDailySchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true, required: true },
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    date: { type: Date, index: true, required: true }, // normalized to 00:00 UTC
    // Core high-impact metrics only
    // 1. Meeting Load Index
    meetingHoursWeek: { type: Number, default: 0 },
    meetingLoadIndex: { type: Number, default: 0 }, // meeting hours / 40
    // 2. After-Hours Activity Rate
    afterHoursRate: { type: Number, default: 0 },
    // 3. Response Latency Trend
    responseMedianMins: { type: Number, default: 0 },
    responseLatencyTrend: { type: Number, default: 0 },
    // 4. Sentiment / Tone Shift
    sentimentAvg: { type: Number, default: 0 },
    sentimentShift: { type: Number, default: 0 },
    // 5. Collaboration Network Breadth
    uniqueContacts: { type: Number, default: 0 },
    networkBreadthChange: { type: Number, default: 0 },
    // 6. Focus Time Ratio
    focusTimeRatio: { type: Number, default: 0 },
    focusHoursWeek: { type: Number, default: 0 }, // explicit hours for clarity
    // 7. Engagement Recovery Index
    recoveryDays: { type: Number, default: 0 },
    // 8. Team Energy Index (Composite - auto-tuned weights)
    energyIndex: { type: Number, default: 0 }, // 0..100
    energyWeights: { type: Object, default: {} }, // stores auto-tuned coefficients
    // 9. Meeting texture
    backToBackBlocks: { type: Number, default: 0 }, // count of back-to-back meeting blocks
    meetingFragmentScore: { type: Number, default: 0 }, // 0–1 calendar fragmentation index
    // 10. After-hours / weekend
    weekendActivityRate: { type: Number, default: 0 }, // fraction of events on weekends
    // 11. Cross-team collaboration
    crossTeamContacts: { type: Number, default: 0 }, // unique contacts outside own team
    // 12. Async participation index
    messageCount: { type: Number, default: 0 }, // total messages sent in period
    asyncParticipationIdx: { type: Number, default: 0 }, // normalised 0–1
    // 13. Data quality
    dataQuality: { type: Number, default: 0 }, // 0–1 coverage score for the day
    activeUserCount: { type: Number, default: 0 }, // distinct users with data this day
  },
  { timestamps: true }
);

metricsDailySchema.index({ teamId: 1, date: 1 }, { unique: true });

export default mongoose.model('MetricsDaily', metricsDailySchema);
