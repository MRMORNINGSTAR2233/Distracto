# Reward System Guide

## Overview

The Digital Attention Rescue reward system gamifies focus with points, levels, and achievements. It motivates users to stay productive and complete interventions.

## How It Works

### Earning Points

**Intervention Completion** (10 points)
- Complete any micro-challenge when an intervention appears
- Instant reward for making conscious choices

**Productive Sessions** (5-60 points)
- 5+ minutes: 5 points
- 15+ minutes: 15 points
- 30+ minutes: 30 points
- 60+ minutes: 60 points
- Points multiplied by current streak multiplier (1.0x - 2.5x)

**Streak Milestones** (50 points)
- Awarded when reaching 5, 10, 25, 50, 100, 250, 500, 1000 minute streaks

**Personal Best** (100 points)
- Break your longest streak record

**Daily Goal** (25 points)
- Meet your daily productivity target

### Level Progression

Progress through 10 levels with exponential point requirements:

| Level | Points Required | Total Points |
|-------|----------------|--------------|
| 1 | Starting level | 0 |
| 2 | 100 points | 100 |
| 3 | 150 more | 250 |
| 4 | 250 more | 500 |
| 5 | 500 more | 1,000 |
| 6 | 1,000 more | 2,000 |
| 7 | 2,000 more | 4,000 |
| 8 | 4,000 more | 8,000 |
| 9 | 7,000 more | 15,000 |
| 10 | 15,000 more | 30,000 |

**Level-Up Rewards:**
- Celebratory notification
- Special achievements at levels 5 and 10
- Increased status and bragging rights

### Achievements

Unlock 13 achievements by completing various milestones:

**Intervention Achievements**
- 🎯 **First Step** - Complete your first intervention
- ✅ **Committed** - Complete 10 interventions
- 🎖️ **Dedicated** - Complete 50 interventions
- 🏆 **Unstoppable** - Complete 100 interventions

**Streak Achievements**
- 🔥 **Getting Started** - Reach a 5-minute streak
- 💪 **Building Momentum** - Reach a 10-minute streak
- 🧠 **Focused Mind** - Reach a 25-minute streak
- ⚡ **Deep Work** - Reach a 50-minute streak
- 🌊 **Flow State** - Reach a 100-minute streak

**Level Achievements**
- ⭐ **Rising Star** - Reach level 5
- 👑 **Focus Master** - Reach level 10

**Special Achievements**
- 📅 **Week Warrior** - Maintain focus for 7 days
- ⏱️ **Productivity Pro** - Accumulate 1000 productive minutes

## Notifications

The system automatically notifies you of:
- **Level-ups** with your new level and points to next level
- **Achievement unlocks** with title, description, and icon
- **Streak milestones** with encouragement
- **Personal bests** with celebration

## Integration

The reward system is fully integrated with:
- **Background Service** - Automatically awards points
- **Streak Manager** - Applies multipliers and milestone bonuses
- **Notification Manager** - Celebrates your progress
- **Badge Manager** - Visual feedback on extension icon

## Accessing Your Progress

Use message passing to get your current progress:

```typescript
// Get user progress
chrome.runtime.sendMessage({
  type: MessageType.GET_USER_PROGRESS
}, (response) => {
  console.log('Level:', response.data.level);
  console.log('Points:', response.data.totalPoints);
  console.log('To next level:', response.data.pointsToNextLevel);
  console.log('Achievements:', response.data.achievements.length);
});

// Get achievements
chrome.runtime.sendMessage({
  type: MessageType.GET_ACHIEVEMENTS
}, (response) => {
  console.log('Unlocked:', response.data.unlocked);
  console.log('Locked:', response.data.locked);
});
```

## Tips for Maximizing Points

1. **Complete interventions** - Easy 10 points each time
2. **Build streaks** - Multipliers boost session points
3. **Aim for milestones** - 50 bonus points per milestone
4. **Stay consistent** - Daily goals add up
5. **Go for personal bests** - 100 point jackpot

## Future Enhancements

Planned features:
- Goal setting and tracking (Task 16.3)
- Visual progress bars in popup
- Achievement showcase in dashboard
- Weekly/monthly leaderboards (local only)
- Custom achievement creation
