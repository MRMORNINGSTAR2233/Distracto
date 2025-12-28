# Analytics Guide

## Overview

Digital Attention Rescue provides comprehensive analytics to help you understand your browsing patterns, identify productivity trends, and receive actionable insights for improvement.

## Analytics Engine

### Statistics Summary

Get aggregated statistics for any time period:

```typescript
// Get today's statistics
const stats = await analyticsEngine.getStatistics('today');

// Get weekly statistics
const weekStats = await analyticsEngine.getStatistics('week');

// Get monthly statistics
const monthStats = await analyticsEngine.getStatistics('month');

// Get all-time statistics
const allStats = await analyticsEngine.getStatistics('all');
```

**Statistics Include:**
- Total browsing time
- Productive vs distracted minutes
- Productivity rate (percentage)
- Interventions triggered and completed
- Completion rate
- Longest streak
- Average session duration
- Sites visited count
- Top 5 productive sites
- Top 5 distraction sites

### Daily Statistics

Get detailed statistics for a specific day:

```typescript
// Get today's stats
const today = await analyticsEngine.getDailyStatistics();

// Get stats for specific date
const date = new Date('2024-01-15');
const dayStats = await analyticsEngine.getDailyStatistics(date);
```

**Daily Stats Include:**
- Date
- Productive minutes
- Distracted minutes
- Interventions triggered/completed
- Longest streak
- Sites visited
- Top productive/distraction sites

### Hourly Breakdown

Analyze productivity by hour of day:

```typescript
const hourly = await analyticsEngine.getHourlyBreakdown('week');

// Returns array of 24 hours with:
// - hour (0-23)
// - productiveMinutes
// - distractedMinutes
// - totalMinutes
// - productivityRate (0-1)
```

**Use Cases:**
- Identify peak productivity hours
- Find low-productivity periods
- Optimize work schedule
- Set appropriate quiet hours

### Daily Breakdown

Track productivity trends over time:

```typescript
const daily = await analyticsEngine.getDailyBreakdown('month');

// Returns array of days with:
// - date (ISO string)
// - productiveMinutes
// - distractedMinutes
// - totalMinutes
// - productivityRate
// - longestStreak
// - interventionsCompleted
```

**Use Cases:**
- Visualize productivity trends
- Compare weekdays vs weekends
- Track improvement over time
- Identify patterns

### Site Statistics

Analyze time spent on specific sites:

```typescript
const sites = await analyticsEngine.getSiteStatistics('week');

// Returns:
// {
//   productive: [{ url, minutes, visits }, ...],
//   distraction: [{ url, minutes, visits }, ...]
// }
```

**Use Cases:**
- Identify time-consuming sites
- Find productive tools
- Discover distraction sources
- Inform whitelist decisions

### Export Statistics

Export all analytics data as JSON:

```typescript
const json = await analyticsEngine.exportStatistics('all');

// Download or save the JSON
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
// ... trigger download
```

## Insights Engine

### Generate Insights

Get personalized, actionable insights:

```typescript
const insights = await insightsEngine.generateInsights('week');

// Returns array of insights sorted by priority
```

**Insight Types:**

1. **Peak Productivity Hours**
   - Identifies your most productive times
   - Suggests scheduling important work
   - Priority: High

2. **Distraction Triggers**
   - Finds common distraction sources
   - Suggests whitelist additions
   - Priority: High/Medium based on frequency

3. **Productivity Trends**
   - Analyzes improvement or decline
   - Provides encouragement or suggestions
   - Priority: High (declining), Medium (improving)

4. **Streak Opportunities**
   - Identifies underutilized productive hours
   - Suggests extending focus sessions
   - Priority: Medium

5. **Whitelist Suggestions**
   - Finds productive sites with interventions
   - Recommends adding to whitelist
   - Priority: Medium

6. **Schedule Optimization**
   - Identifies inefficient time blocks
   - Suggests quiet hours or breaks
   - Priority: Medium

### Productivity Trends

Analyze long-term productivity changes:

```typescript
const trend = await insightsEngine.getProductivityTrend('month');

// Returns:
// {
//   direction: 'improving' | 'stable' | 'declining',
//   changePercent: number,
//   currentRate: number,
//   previousRate: number,
//   confidence: number (0-1)
// }
```

**Interpretation:**
- **Improving**: Productivity increased by X%
- **Stable**: Productivity consistent (±5%)
- **Declining**: Productivity decreased by X%
- **Confidence**: Based on data points (more data = higher confidence)

### Peak Hours Analysis

Get detailed peak productivity information:

```typescript
const peaks = await insightsEngine.getPeakHours('week');

// Returns:
// {
//   mostProductive: [hour1, hour2, hour3],
//   leastProductive: [hour1, hour2, hour3],
//   averageProductivity: number (0-1)
// }
```

**Use Cases:**
- Schedule deep work during peak hours
- Avoid important tasks during low hours
- Set quiet hours strategically
- Optimize daily routine

### Distraction Patterns

Identify recurring distraction patterns:

```typescript
const patterns = await insightsEngine.getDistractionPatterns('week');

// Returns array of:
// {
//   trigger: string (domain),
//   frequency: number,
//   averageDuration: number (minutes),
//   timeOfDay: number[] (hours),
//   dayOfWeek: number[] (0-6)
// }
```

**Use Cases:**
- Understand distraction habits
- Identify temporal patterns
- Target specific triggers
- Adjust settings accordingly

## Message Passing API

Access analytics from popup or content scripts:

```typescript
// Get statistics
chrome.runtime.sendMessage({
  type: MessageType.GET_ANALYTICS,
  payload: { period: 'week' }
}, (response) => {
  console.log('Statistics:', response.data);
});

// Get insights
chrome.runtime.sendMessage({
  type: MessageType.GET_INSIGHTS,
  payload: { period: 'week' }
}, (response) => {
  console.log('Insights:', response.data);
});

// Get daily stats
chrome.runtime.sendMessage({
  type: MessageType.GET_DAILY_STATS,
  payload: { date: '2024-01-15' }
}, (response) => {
  console.log('Daily stats:', response.data);
});
```

## Visualization Ideas

### Productivity Chart
```
100% |     ████
 75% |   ██████
 50% | ████████
 25% |██████████
  0% |──────────
     0  6  12 18 24
     Hour of Day
```

### Weekly Trend
```
Productivity Rate
100% |    ╱╲
 75% |   ╱  ╲
 50% |  ╱    ╲╱
 25% | ╱
  0% |╱
     Mon Tue Wed Thu Fri Sat Sun
```

### Site Distribution
```
Productive:   ████████████ 60%
Distracted:   ██████ 30%
Neutral:      ██ 10%
```

## Best Practices

### 1. Regular Review
- Check daily stats each evening
- Review weekly insights every Monday
- Analyze monthly trends for long-term planning

### 2. Act on Insights
- Implement suggested whitelist additions
- Adjust quiet hours based on peak productivity
- Address declining trends promptly

### 3. Track Progress
- Export statistics monthly
- Compare trends over time
- Celebrate improvements

### 4. Optimize Settings
- Use hourly breakdown to set quiet hours
- Use site statistics to refine whitelist
- Use distraction patterns to adjust frequency

### 5. Set Goals
- Use average productivity as baseline
- Aim for gradual improvement (5-10% per month)
- Focus on consistency over perfection

## Example Workflow

### Morning Routine
1. Check yesterday's daily stats
2. Review any new insights
3. Adjust settings if needed
4. Set intention for today

### Weekly Review
1. Get weekly statistics
2. Generate insights
3. Identify top 3 distractions
4. Update whitelist/quiet hours
5. Set goals for next week

### Monthly Analysis
1. Export monthly statistics
2. Analyze productivity trend
3. Compare to previous month
4. Adjust long-term strategy
5. Celebrate achievements

## Interpreting Metrics

### Productivity Rate
- **>70%**: Excellent focus
- **50-70%**: Good balance
- **30-50%**: Room for improvement
- **<30%**: Consider adjusting settings

### Completion Rate
- **>80%**: Challenges are appropriate
- **50-80%**: Good engagement
- **<50%**: Challenges may be too difficult

### Average Session Duration
- **>30 min**: Deep work sessions
- **15-30 min**: Focused browsing
- **<15 min**: Fragmented attention

### Streak Consistency
- **Daily streaks >25 min**: Building habits
- **Frequent breaks**: Normal pattern
- **No streaks**: May need adjustment

## Privacy Note

All analytics data:
- Stored locally only
- Never sent to servers
- Exportable as JSON
- Deletable at any time
- Included in data export

Your browsing data remains completely private and under your control.
