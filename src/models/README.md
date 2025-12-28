# AI Models and Game Mechanics

This directory contains the AI-powered models and game mechanics for Digital Attention Rescue.

## Core Components

### AI & Classification
- **AIModelEngine.ts**: Machine learning engine for distraction prediction with feature extraction and feedback learning
- **RuleBasedClassifier.ts**: Baseline classifier using pattern matching and context-aware rules
- **ClassificationManager.ts**: Manages site classifications with priority system (User > AI > Rules)
- **PatternMatcher.ts**: Historical pattern similarity detection for improved predictions

### Prediction & Intervention
- **DistractionPredictor.ts**: Multi-signal distraction assessment with configurable thresholds
- **ChallengeGenerator.ts**: Context-aware micro-challenge generation (reflection, intention, quick-task, breathing)
- **DismissalAdaptation.ts**: Adaptive intervention frequency based on user dismissal patterns

### Gamification
- **StreakManager.ts**: Attention streak tracking with state machine and multiplier system
- **RewardSystem.ts**: Point calculation, level progression, and achievement system
  - 10 levels with exponential point thresholds
  - 13 achievements for various milestones
  - Streak multipliers for bonus points
  - Automatic notifications for level-ups and achievements

### Learning & Feedback
- **FeedbackService.ts**: Processes user feedback to improve AI predictions
  - Manual classifications
  - Intervention completions/dismissals
  - Productive/distracted sessions

## Reward System Details

### Point Values
- Intervention completed: 10 points
- Productive sessions: 5-60 points (based on duration)
- Streak milestones: 50 points
- Personal best: 100 points
- Daily goal met: 25 points

### Levels
1. Level 1: 0 points
2. Level 2: 100 points
3. Level 3: 250 points
4. Level 4: 500 points
5. Level 5: 1,000 points
6. Level 6: 2,000 points
7. Level 7: 4,000 points
8. Level 8: 8,000 points
9. Level 9: 15,000 points
10. Level 10: 30,000 points

### Achievements
- **First Step**: Complete your first intervention
- **Getting Started**: Reach a 5-minute streak
- **Building Momentum**: Reach a 10-minute streak
- **Focused Mind**: Reach a 25-minute streak
- **Deep Work**: Reach a 50-minute streak
- **Flow State**: Reach a 100-minute streak
- **Rising Star**: Reach level 5
- **Focus Master**: Reach level 10
- **Committed**: Complete 10 interventions
- **Dedicated**: Complete 50 interventions
- **Unstoppable**: Complete 100 interventions
- **Week Warrior**: Maintain focus for 7 days
- **Productivity Pro**: Accumulate 1000 productive minutes

## Integration

All models are exported as singleton instances and integrated with the BackgroundService:
- Points awarded automatically for interventions and streaks
- Achievements unlock with notifications
- Level-ups trigger celebratory notifications
- User progress accessible via message passing
