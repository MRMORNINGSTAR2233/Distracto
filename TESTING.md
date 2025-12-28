# Testing Digital Attention Rescue

## Loading the Extension in Chrome

1. **Build the extension:**
   ```bash
   npm run build
   ```

2. **Load in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

3. **Verify installation:**
   - Extension icon should appear in toolbar
   - Badge should show "0" (no streak yet)
   - Click icon to see popup (currently minimal)

## Testing Features

### 1. Activity Tracking
- Navigate to different websites
- Check browser console (F12) for "Activity Tracker initialized" messages
- Activity events are being sent to background service

### 2. Distraction Detection
- Visit social media sites (facebook.com, twitter.com, youtube.com)
- After a few seconds, an intervention overlay should appear
- The overlay shows a micro-challenge

### 3. Intervention System
- **Complete a challenge:** Click "Continue" or "Submit"
  - Streak should increment
  - Badge updates with new streak number
- **Dismiss a challenge:** Click "Dismiss"
  - Streak breaks
  - Badge resets to 0

### 4. Streak Tracking
- Complete multiple interventions to build a streak
- Watch the badge color change:
  - Gray (0) → Green (1-4) → Blue (5-9) → Purple (10-24) → Orange (25-49) → Red (50+)
- Hover over extension icon to see streak tooltip

### 5. Notifications
- Reach milestone streaks (5, 10, 25, 50, 100)
- Chrome notifications should appear celebrating achievements
- Personal best notifications when you beat your record
- Level-up notifications when you gain a level
- Achievement unlock notifications with icons

### 6. Reward System
- **Points:** Complete interventions and check console for point awards (10 points each)
- **Productive sessions:** Browse productive sites to earn 5-60 points based on duration
- **Level-ups:** Accumulate points to progress through 10 levels
- **Achievements:** Unlock 13 different achievements:
  - First Step (complete first intervention)
  - Streak milestones (5, 10, 25, 50, 100 minutes)
  - Intervention counts (10, 50, 100 completions)
  - Level milestones (level 5, level 10)
  - Special achievements (Week Warrior, Productivity Pro)
- **Check progress:** Open background service worker console to see point awards and level-ups

### 7. Dismissal Adaptation
- Dismiss interventions 3+ times on the same site
- System adapts by:
  - Increasing cooldown period
  - Reducing intervention frequency
  - Suggesting whitelist additions

### 7. Settings (via storage)
Currently settings are managed through storage. To test:
- Open Chrome DevTools (F12)
- Go to Application → Storage → Extension Storage
- View/modify settings

## Current Limitations

**Not Yet Implemented:**
- Popup UI (shows minimal content)
- Dashboard page (empty)
- Settings UI (no interface yet)
- Onboarding flow

**Working Features:**
✅ Activity tracking
✅ AI-powered distraction detection
✅ Intervention overlays with micro-challenges
✅ Streak tracking with badge updates
✅ Notifications for milestones
✅ Dismissal adaptation
✅ Pattern learning
✅ Site classification
✅ Reward system with points, levels, and achievements

## Debugging

### View Logs
- **Background service:** `chrome://extensions/` → Click "service worker" under extension
- **Content script:** Open DevTools (F12) on any webpage
- **Storage:** DevTools → Application → Storage → Extension Storage

### Common Issues

**Interventions not showing:**
- Check if in learning mode (default: true for first 3 days)
- Check if in quiet hours
- Check if site is whitelisted
- Verify intervention cooldown hasn't been triggered

**Badge not updating:**
- Check background service worker logs
- Verify streak manager is initialized
- Check for errors in console

**Build errors:**
- Run `npm install` to ensure dependencies are installed
- Run `npm run type-check` to verify TypeScript
- Check webpack output for specific errors

## Next Steps

After testing, continue implementation with:
- Task 17: User settings management
- Task 18: Analytics engine
- Tasks 19-23: UI components (popup, dashboard, onboarding)
- Tasks 24-25: Final integration and polish
