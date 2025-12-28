# Settings Guide

## Overview

Digital Attention Rescue provides comprehensive settings to customize when and how interventions occur. All settings are managed through the SettingsManager service.

## Available Settings

### Intervention Frequency

Control how aggressively the extension intervenes:

- **Aggressive** (40% threshold) - Intervenes frequently, catches potential distractions early
- **Moderate** (60% threshold) - Balanced approach, default setting
- **Minimal** (80% threshold) - Only intervenes on high-confidence distractions

```typescript
await settingsManager.setInterventionFrequency('moderate');
```

### Quiet Hours

Define time periods when interventions are completely disabled:

```typescript
// Add quiet hours (9 AM to 5 PM)
await settingsManager.addQuietHours({ start: 9, end: 17 });

// Add overnight quiet hours (10 PM to 6 AM)
await settingsManager.addQuietHours({ start: 22, end: 6 });

// Remove quiet hours by index
await settingsManager.removeQuietHours(0);

// Clear all quiet hours
await settingsManager.clearQuietHours();

// Check if currently in quiet hours
const isQuiet = await settingsManager.isInQuietHours();
```

**Features:**
- Supports ranges that cross midnight (e.g., 22-6)
- Prevents overlapping ranges
- Automatically validates hour values (0-23)

### Whitelist

Specify sites that should never trigger interventions:

```typescript
// Add site to whitelist
await settingsManager.addToWhitelist('github.com');
await settingsManager.addToWhitelist('https://docs.google.com');

// Remove from whitelist
await settingsManager.removeFromWhitelist('github.com');

// Clear entire whitelist
await settingsManager.clearWhitelist();

// Check if URL is whitelisted
const isWhitelisted = await settingsManager.isWhitelisted('https://github.com/user/repo');
```

**Features:**
- Automatically extracts domain from full URLs
- Supports partial matching (e.g., 'github' matches 'github.com')
- Prevents duplicate entries

### Challenge Preferences

Choose which types of micro-challenges you prefer:

```typescript
// Set preferred challenges
await settingsManager.setPreferredChallenges(['reflection', 'breathing']);

// Add a challenge type
await settingsManager.addPreferredChallenge('intention');

// Remove a challenge type (must keep at least one)
await settingsManager.removePreferredChallenge('quick-task');
```

**Available Challenge Types:**
- `reflection` - Questions about your current activity
- `intention` - Setting focus goals
- `quick-task` - Listing tasks and priorities
- `breathing` - Mindfulness breathing exercises

### Learning Mode

Enable/disable learning mode (observes without intervening):

```typescript
// Enable learning mode
await settingsManager.setLearningMode(true);

// Disable learning mode
await settingsManager.setLearningMode(false);
```

**When enabled:**
- Extension observes your behavior
- No interventions are triggered
- AI model continues learning patterns
- Useful for first-time setup

### Notifications

Control whether notifications are shown:

```typescript
// Enable notifications
await settingsManager.setNotificationsEnabled(true);

// Disable notifications
await settingsManager.setNotificationsEnabled(false);
```

**Notification Types:**
- Streak milestones
- Personal bests
- Level-ups
- Achievement unlocks
- Whitelist suggestions

### Streak Goal

Set your daily streak target:

```typescript
// Set streak goal to 25 minutes
await settingsManager.setStreakGoal(25);

// Set ambitious goal
await settingsManager.setStreakGoal(100);
```

## Automatic Intervention Pausing

The extension automatically pauses interventions during:

### Video Calls
Detected domains:
- Zoom (zoom.us)
- Google Meet (meet.google.com)
- Microsoft Teams (teams.microsoft.com)
- Webex, Whereby, Jitsi, Discord, Slack, Skype, and more

### Presentations
Detected patterns:
- Google Slides presentations
- PowerPoint Live presentations
- Prezi presentations
- Any URL containing '/present' or '/presentation'

### Manual Pause

```typescript
// Pause interventions for 60 minutes (default)
activityDetector.pause();

// Pause for specific duration
activityDetector.pause(30); // 30 minutes

// Resume interventions
activityDetector.resume();

// Toggle manual pause
activityDetector.toggleManualPause();

// Check pause status
const status = activityDetector.getPauseStatus();
console.log(status.isPaused); // true/false
console.log(status.reason); // "Manually paused" or "Paused for X minutes"
```

## Settings Enforcement

Settings are enforced at multiple levels:

### DistractionPredictor
- Checks quiet hours before evaluating
- Respects whitelist
- Honors learning mode
- Applies intervention frequency thresholds
- Checks for video calls/presentations

### ChallengeGenerator
- Only generates preferred challenge types
- Adjusts difficulty based on context
- Rotates prompts to avoid repetition

### DismissalAdaptation
- Automatically adjusts intervention frequency
- Suggests whitelist additions
- Respects user dismissal patterns

## Settings Persistence

All settings are automatically saved to Chrome local storage:

```typescript
// Get current settings
const settings = await settingsManager.getSettings();

// Update multiple settings at once
await settingsManager.updateSettings({
  interventionFrequency: 'minimal',
  notificationsEnabled: true,
  streakGoal: 50
});

// Reset to defaults
await settingsManager.resetToDefaults();
```

## Settings Change Listeners

React to settings changes in real-time:

```typescript
// Add listener
settingsManager.addListener((settings) => {
  console.log('Settings changed:', settings);
  // Update UI, adjust behavior, etc.
});

// Remove listener
settingsManager.removeListener(listenerFunction);
```

## Message Passing API

Access settings from popup or content scripts:

```typescript
// Get settings
chrome.runtime.sendMessage({
  type: MessageType.GET_SETTINGS
}, (response) => {
  console.log('Settings:', response.data);
});

// Update settings
chrome.runtime.sendMessage({
  type: MessageType.UPDATE_SETTINGS,
  payload: {
    interventionFrequency: 'aggressive',
    notificationsEnabled: true
  }
}, (response) => {
  console.log('Settings updated:', response.data);
});

// Pause interventions
chrome.runtime.sendMessage({
  type: MessageType.PAUSE_INTERVENTIONS,
  payload: { durationMinutes: 30 }
}, (response) => {
  console.log('Paused:', response.data);
});

// Resume interventions
chrome.runtime.sendMessage({
  type: MessageType.RESUME_INTERVENTIONS
}, (response) => {
  console.log('Resumed:', response.data);
});

// Get pause status
chrome.runtime.sendMessage({
  type: MessageType.GET_PAUSE_STATUS
}, (response) => {
  console.log('Pause status:', response.data);
});
```

## Default Settings

```typescript
{
  interventionFrequency: 'moderate',
  quietHours: [],
  whitelistedSites: [],
  preferredChallenges: ['reflection', 'intention', 'quick-task', 'breathing'],
  learningMode: true,
  notificationsEnabled: true,
  streakGoal: 25
}
```

## Best Practices

1. **Start with Learning Mode** - Let the extension observe for a few days
2. **Set Quiet Hours** - Define your deep work periods
3. **Whitelist Carefully** - Only whitelist truly productive sites
4. **Adjust Frequency** - Start moderate, adjust based on experience
5. **Choose Challenges** - Pick types that resonate with you
6. **Use Manual Pause** - Pause during important meetings or calls
7. **Set Realistic Goals** - Start with achievable streak targets

## Troubleshooting

**Interventions not appearing:**
- Check if in quiet hours
- Verify site isn't whitelisted
- Confirm learning mode is disabled
- Check if manually paused
- Verify intervention frequency isn't too minimal

**Too many interventions:**
- Increase intervention frequency threshold (moderate → minimal)
- Add frequently-used productive sites to whitelist
- Set quiet hours for focused work periods
- Use manual pause when needed

**Wrong challenge types:**
- Update preferred challenges
- Remove unwanted types
- Keep at least one type enabled
