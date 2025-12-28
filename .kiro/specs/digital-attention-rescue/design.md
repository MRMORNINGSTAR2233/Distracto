# Design Document: Digital Attention Rescue

## Overview

Digital Attention Rescue is a Chrome extension that uses AI to help users maintain focus and productivity by learning their browsing patterns, predicting distraction moments, and providing personalized interventions. The system operates entirely client-side for privacy, using local machine learning models to classify browsing behavior and trigger contextual micro-challenges.

The extension consists of four main layers:
1. **Data Collection Layer** - Tracks browsing activity and context
2. **AI Analysis Layer** - Learns patterns and predicts distractions
3. **Intervention Layer** - Delivers personalized micro-challenges
4. **Gamification Layer** - Manages streaks, rewards, and user motivation

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │   Content    │      │  Background  │                     │
│  │   Script     │◄────►│   Service    │                     │
│  │              │      │   Worker     │                     │
│  └──────────────┘      └──────┬───────┘                     │
│         │                     │                              │
│         │              ┌──────▼───────┐                     │
│         │              │   AI Model   │                     │
│         │              │   Engine     │                     │
│         │              └──────┬───────┘                     │
│         │                     │                              │
│         │              ┌──────▼───────┐                     │
│         └─────────────►│   Storage    │                     │
│                        │   Manager    │                     │
│                        └──────────────┘                     │
│                                                               │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │   Popup UI   │      │  Dashboard   │                     │
│  │              │      │     Page     │                     │
│  └──────────────┘      └──────────────┘                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **Content Script** monitors page activity and sends events to Background Service Worker
2. **Background Service Worker** processes events, queries AI Model, and manages state
3. **AI Model Engine** analyzes patterns and returns predictions
4. **Storage Manager** persists data to Chrome's local storage
5. **Popup UI** displays current streak and quick actions
6. **Dashboard Page** shows detailed analytics and settings

## Components and Interfaces

### 1. Content Script

**Responsibility**: Monitor user activity on web pages and inject intervention UI

**Interface**:
```typescript
interface ContentScript {
  // Track page visibility and user interaction
  trackPageActivity(): void
  
  // Send activity data to background worker
  reportActivity(activity: ActivityEvent): void
  
  // Display intervention overlay
  showIntervention(challenge: MicroChallenge): void
  
  // Handle user response to intervention
  handleInterventionResponse(response: InterventionResponse): void
}

interface ActivityEvent {
  url: string
  timestamp: number
  eventType: 'navigation' | 'focus' | 'blur' | 'scroll' | 'click'
  duration?: number
  context: BrowsingContext
}
```

### 2. Background Service Worker

**Responsibility**: Coordinate all extension logic, manage state, and orchestrate AI predictions

**Interface**:
```typescript
interface BackgroundService {
  // Process incoming activity events
  processActivity(event: ActivityEvent): Promise<void>
  
  // Check if intervention is needed
  evaluateDistraction(context: BrowsingContext): Promise<DistractionAssessment>
  
  // Trigger intervention
  triggerIntervention(tabId: number, challenge: MicroChallenge): void
  
  // Update streak tracking
  updateStreak(isProductive: boolean): void
  
  // Handle user settings changes
  updateSettings(settings: UserSettings): void
}

interface DistractionAssessment {
  isDistraction: boolean
  confidence: number
  reason: string
  suggestedChallenge?: MicroChallenge
}
```

### 3. AI Model Engine

**Responsibility**: Learn browsing patterns and predict distraction likelihood

**Interface**:
```typescript
interface AIModelEngine {
  // Train model on historical data
  train(data: BrowsingHistory[]): Promise<void>
  
  // Predict if current activity is distraction
  predict(context: BrowsingContext): Promise<Prediction>
  
  // Update model with user feedback
  updateWithFeedback(feedback: UserFeedback): void
  
  // Classify site based on patterns
  classifySite(url: string, context: BrowsingContext): SiteClassification
}

interface Prediction {
  isDistraction: boolean
  confidence: number
  features: FeatureVector
}

interface FeatureVector {
  timeOfDay: number
  dayOfWeek: number
  recentProductiveMinutes: number
  siteCategory: string
  navigationPattern: string
  sessionDuration: number
}
```

**AI Model Approach**:
- Use a lightweight classification model (e.g., logistic regression or small neural network)
- Features: time of day, day of week, site category, navigation patterns, session duration
- Train incrementally as user provides feedback
- Store model weights in local storage
- Fallback to rule-based classification for cold start

### 4. Storage Manager

**Responsibility**: Manage all data persistence using Chrome's local storage API

**Interface**:
```typescript
interface StorageManager {
  // Save browsing activity
  saveActivity(activity: ActivityEvent): Promise<void>
  
  // Retrieve browsing history
  getHistory(timeRange: TimeRange): Promise<BrowsingHistory[]>
  
  // Save/load user settings
  saveSettings(settings: UserSettings): Promise<void>
  getSettings(): Promise<UserSettings>
  
  // Save/load site classifications
  saveSiteClassification(url: string, classification: SiteClassification): Promise<void>
  getSiteClassification(url: string): Promise<SiteClassification | null>
  
  // Save/load streak data
  saveStreak(streak: StreakData): Promise<void>
  getCurrentStreak(): Promise<StreakData>
  
  // Export/delete all data
  exportData(): Promise<ExportedData>
  deleteAllData(): Promise<void>
}
```

### 5. Intervention System

**Responsibility**: Generate and deliver personalized micro-challenges

**Interface**:
```typescript
interface InterventionSystem {
  // Generate appropriate challenge for context
  generateChallenge(context: BrowsingContext, userPreferences: UserSettings): MicroChallenge
  
  // Validate challenge completion
  validateResponse(challenge: MicroChallenge, response: InterventionResponse): boolean
  
  // Adapt challenge difficulty
  adjustDifficulty(userHistory: InterventionHistory): void
}

interface MicroChallenge {
  id: string
  type: 'reflection' | 'intention' | 'quick-task' | 'breathing'
  prompt: string
  options?: string[]
  timeoutSeconds: number
  difficulty: number
}

interface InterventionResponse {
  challengeId: string
  completed: boolean
  dismissed: boolean
  response?: string
  timeSpent: number
}
```

**Challenge Types**:
1. **Reflection**: "What were you looking for when you opened this tab?"
2. **Intention**: "Set a 10-minute focus goal before continuing"
3. **Quick Task**: "Name 3 things you accomplished today"
4. **Breathing**: "Take 3 deep breaths before proceeding"

### 6. Gamification System

**Responsibility**: Track streaks, calculate rewards, and manage achievements

**Interface**:
```typescript
interface GamificationSystem {
  // Update current streak
  updateStreak(isProductive: boolean, duration: number): StreakUpdate
  
  // Calculate points earned
  calculatePoints(session: ProductiveSession): number
  
  // Check for new achievements
  checkAchievements(userStats: UserStatistics): Achievement[]
  
  // Get current user level and progress
  getUserProgress(): UserProgress
}

interface StreakData {
  current: number
  longest: number
  lastUpdate: number
  multiplier: number
}

interface UserProgress {
  level: number
  totalPoints: number
  pointsToNextLevel: number
  achievements: Achievement[]
}
```

### 7. Analytics Engine

**Responsibility**: Generate insights and statistics from browsing data

**Interface**:
```typescript
interface AnalyticsEngine {
  // Calculate daily statistics
  getDailyStats(date: Date): DailyStatistics
  
  // Identify patterns and trends
  analyzeTrends(timeRange: TimeRange): TrendAnalysis
  
  // Find peak productivity times
  getProductivityPeaks(): ProductivityPattern[]
  
  // Identify common distractions
  getDistractionTriggers(): DistractionTrigger[]
}

interface DailyStatistics {
  date: Date
  productiveMinutes: number
  distractedMinutes: number
  interventionsTriggered: number
  interventionsCompleted: number
  longestStreak: number
  sitesVisited: number
  topProductiveSites: string[]
  topDistractionSites: string[]
}
```

## Data Models

### BrowsingContext
```typescript
interface BrowsingContext {
  url: string
  title: string
  timestamp: number
  timeOfDay: number // 0-23
  dayOfWeek: number // 0-6
  recentHistory: string[] // Last 5 URLs
  sessionDuration: number // Minutes in current session
  lastProductiveActivity: number // Minutes since last productive activity
}
```

### SiteClassification
```typescript
interface SiteClassification {
  url: string
  category: 'productive' | 'distraction' | 'neutral' | 'custom'
  confidence: number
  source: 'user' | 'ai' | 'default'
  customLabel?: string
  lastUpdated: number
}
```

### UserSettings
```typescript
interface UserSettings {
  interventionFrequency: 'aggressive' | 'moderate' | 'minimal'
  quietHours: TimeRange[]
  whitelistedSites: string[]
  preferredChallenges: ChallengeType[]
  learningMode: boolean
  notificationsEnabled: boolean
  streakGoal: number
}
```

### BrowsingHistory
```typescript
interface BrowsingHistory {
  id: string
  url: string
  title: string
  startTime: number
  endTime: number
  duration: number
  classification: SiteClassification
  wasProductive: boolean
  interventionTriggered: boolean
  interventionCompleted: boolean
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Complete Activity Recording

*For any* website visit, the Extension should record all required fields (timestamp, URL, duration, context) and store them exclusively in local storage.

**Validates: Requirements 1.2, 1.5**

### Property 2: AI Model Learning from Feedback

*For any* site that a user manually classifies as productive or distracting, subsequent AI predictions for that site should reflect the user's classification with increased confidence.

**Validates: Requirements 1.4**

### Property 3: Pattern-Based Analysis

*For any* set of browsing data exceeding the minimum threshold, the AI model should produce classifications distinguishing productive from distracted sessions.

**Validates: Requirements 1.3**

### Property 4: Context-Aware Prediction

*For any* page navigation, the AI model should generate a distraction prediction that incorporates time of day, recent activity, and site category.

**Validates: Requirements 2.1, 2.5**

### Property 5: Pattern Similarity Detection

*For any* browsing pattern that matches historical distraction events, the distraction probability score should be higher than for dissimilar patterns.

**Validates: Requirements 2.3**

### Property 6: Timely Intervention Triggering

*For any* scenario where distraction probability exceeds the threshold, an intervention should be prepared and triggered within 3 seconds.

**Validates: Requirements 2.2, 2.4**

### Property 7: Context-Appropriate Challenges

*For any* intervention trigger, the displayed micro-challenge should be appropriate for the current context (time of day, user preferences, recent activity).

**Validates: Requirements 3.1**

### Property 8: Challenge Completion Flow

*For any* successfully completed micro-challenge, the user should be able to continue browsing and the completion should be recorded in tracking data.

**Validates: Requirements 3.2**

### Property 9: Dismissal Adaptation

*For any* dismissed micro-challenge, the dismissal should be recorded and future intervention timing should be adjusted based on dismissal patterns.

**Validates: Requirements 3.3, 3.5**

### Property 10: Streak State Machine

*For any* sequence of browsing activities, the attention streak should correctly transition through states: start on productive browsing, increment during continued productivity, and end with recording on distraction events.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 11: Streak Display Consistency

*For any* current streak value, the extension icon badge should display the correct streak status.

**Validates: Requirements 4.4**

### Property 12: Achievement Notification

*For any* streak that exceeds the user's previous personal best, a celebration notification should be triggered.

**Validates: Requirements 4.5**

### Property 13: Point Calculation Consistency

*For any* productive browsing session, points awarded should be calculated based on duration and consistency, with multipliers applied for long streaks.

**Validates: Requirements 5.1, 5.4**

### Property 14: Milestone Unlocking

*For any* point total that reaches a defined milestone, the corresponding achievements and badges should be unlocked.

**Validates: Requirements 5.2**

### Property 15: Goal Progress Tracking

*For any* user-defined goal, the system should accurately track and display progress toward that goal.

**Validates: Requirements 5.5**

### Property 16: Classification Persistence

*For any* site visit, the system should apply the user's manual classification if available, otherwise use the AI model's temporary classification.

**Validates: Requirements 6.2, 6.4**

### Property 17: AI Classification Suggestions

*For any* unclassified site with sufficient data, the AI model should generate a classification suggestion for user confirmation.

**Validates: Requirements 6.3**

### Property 18: Privacy-First Data Handling

*For any* data operation (save, load, update, delete), all data should be stored exclusively in local storage with no transmission to external servers.

**Validates: Requirements 7.1, 7.2**

### Property 19: Quiet Hours Enforcement

*For any* time falling within user-defined quiet hours, interventions should not be triggered regardless of distraction probability.

**Validates: Requirements 8.2**

### Property 20: Whitelist Enforcement

*For any* site on the user's whitelist, interventions should never be triggered regardless of distraction probability or browsing patterns.

**Validates: Requirements 8.3**

### Property 21: Automatic Intervention Pausing

*For any* detected video call or presentation state, interventions should be automatically paused until the call/presentation ends.

**Validates: Requirements 8.4**

### Property 22: Challenge Preference Respect

*For any* intervention trigger, the selected micro-challenge type should match the user's stated preferences when available.

**Validates: Requirements 8.5**

### Property 23: Comprehensive Dashboard Display

*For any* user state, the dashboard should display all required information including earned rewards, current streaks, progress toward goals, and time-period statistics (daily, weekly, monthly).

**Validates: Requirements 5.3, 9.1**

### Property 24: Accurate Time Calculation

*For any* time period, the calculated time spent on productive sites versus distraction sites should sum to the total browsing time for that period.

**Validates: Requirements 9.2**

### Property 25: Pattern Identification

*For any* browsing data set with clear temporal patterns, the analytics engine should correctly identify peak productivity hours and common distraction triggers.

**Validates: Requirements 9.3**

### Property 26: Trend Detection

*For any* time series of focus metrics, the system should correctly identify whether the trend shows improvement, decline, or stability.

**Validates: Requirements 9.4**

### Property 27: Actionable Insights Generation

*For any* user's attention patterns, the system should generate at least one actionable insight that could improve focus.

**Validates: Requirements 9.5**

### Property 28: Learning Mode Behavior

*For any* user in learning mode, no active interventions should be triggered for 3 days while the system observes and learns behavior patterns.

**Validates: Requirements 10.3**

## Error Handling

### Data Storage Errors

**Scenario**: Chrome storage quota exceeded or storage API unavailable

**Handling**:
- Implement automatic data pruning for old browsing history (keep last 90 days)
- Notify user when approaching storage limits
- Provide manual data cleanup options
- Gracefully degrade to in-memory storage with warning

### AI Model Errors

**Scenario**: Model fails to load or produce predictions

**Handling**:
- Fall back to rule-based classification using URL patterns and categories
- Log errors for debugging without exposing to user
- Attempt model reload on next browsing session
- Provide user option to reset model if persistently failing

### Intervention Display Errors

**Scenario**: Content script fails to inject or display intervention

**Handling**:
- Retry injection once after 1-second delay
- If retry fails, show browser notification as fallback
- Log failure for analytics
- Don't block user's browsing

### Network Detection Errors

**Scenario**: Unable to detect video call or presentation state

**Handling**:
- Default to allowing interventions (fail open)
- Provide manual "Do Not Disturb" toggle as backup
- Use heuristics (screen sharing, camera access) as fallback detection

### Data Export/Import Errors

**Scenario**: Export file corrupted or import fails

**Handling**:
- Validate data structure before import
- Provide detailed error messages indicating which data is problematic
- Allow partial import of valid data
- Maintain backup of current data before import

## Testing Strategy

### Dual Testing Approach

This feature will use both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

Both testing approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across a wide range of inputs.

### Property-Based Testing

We will use **fast-check** (for TypeScript/JavaScript) as our property-based testing library. Each correctness property listed above will be implemented as a property-based test.

**Configuration**:
- Minimum 100 iterations per property test (to account for randomization)
- Each test must reference its design document property using this format:
  - **Feature: digital-attention-rescue, Property N: [property text]**

**Test Organization**:
- Property tests should be co-located with implementation files using `.test.ts` suffix
- Group related properties in the same test file
- Use descriptive test names that match the property titles

### Unit Testing

Unit tests will focus on:
- Specific examples demonstrating correct behavior (e.g., "streak increments from 5 to 6")
- Edge cases (e.g., empty browsing history, storage quota exceeded)
- Error conditions (e.g., invalid data formats, API failures)
- Integration points between components

**Test Coverage Areas**:
1. **Data Collection**: Verify activity events are captured correctly
2. **AI Model**: Test classification accuracy with known datasets
3. **Intervention System**: Test challenge generation and validation
4. **Gamification**: Test point calculations and streak logic
5. **Storage**: Test data persistence and retrieval
6. **Privacy**: Verify no external network calls with sensitive data
7. **UI Components**: Test popup and dashboard rendering

### Testing Guidelines

- Write tests before or alongside implementation (TDD approach)
- Mock Chrome APIs for unit tests
- Use realistic test data that mirrors actual browsing patterns
- Test both happy paths and error scenarios
- Ensure tests are deterministic and don't rely on timing
- Property tests should use smart generators that constrain to valid input spaces

### Example Property Test Structure

```typescript
// Feature: digital-attention-rescue, Property 1: Complete Activity Recording
test('all website visits are recorded with complete data in local storage', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.webUrl(),
      fc.string(),
      fc.nat(),
      async (url, title, timestamp) => {
        const activity = { url, title, timestamp, eventType: 'navigation' };
        await processActivity(activity);
        
        const stored = await storage.getActivity(activity.id);
        expect(stored).toBeDefined();
        expect(stored.url).toBe(url);
        expect(stored.timestamp).toBe(timestamp);
        expect(stored.context).toBeDefined();
        
        // Verify no external network calls
        expect(mockFetch).not.toHaveBeenCalled();
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

- Test complete flows: browsing → detection → intervention → response
- Verify data flows correctly between components
- Test Chrome extension lifecycle events (install, update, uninstall)
- Validate storage migrations and data format changes

### Manual Testing Checklist

While automated tests cover most functionality, manual testing should verify:
- Visual appearance of interventions across different websites
- Extension performance impact on browsing speed
- User experience of onboarding flow
- Accessibility of UI components
- Cross-browser compatibility (Chrome, Edge, Brave)
