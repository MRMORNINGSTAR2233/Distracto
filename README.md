# Digital Attention Rescue 🎯

An AI-powered Chrome extension that helps you reclaim your focus and productivity by learning your browsing patterns, predicting distraction moments, and providing personalized interventions.

## Features

- 🧠 **AI Pattern Learning** - Learns your unique productivity patterns
- ⚡ **Distraction Prediction** - Intervenes before you fall into rabbit holes
- 🎮 **Gamified Focus** - Build attention streaks and earn rewards
- 🔒 **Privacy First** - All data stays local on your device
- 📊 **Analytics & Insights** - Understand your attention patterns
- ⚙️ **Fully Customizable** - Adapt to your personal work style

## Development

### Prerequisites

- Node.js 18+ and npm
- Chrome browser

### Setup

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Development mode (watch for changes)
npm run dev

# Run tests
npm test

# Type checking
npm run type-check
```

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `dist` folder from this project

## Project Structure

```
digital-attention-rescue/
├── src/
│   ├── background/       # Background service worker
│   ├── content/          # Content scripts
│   ├── popup/            # Extension popup UI
│   ├── dashboard/        # Dashboard page
│   ├── models/           # AI models and data structures
│   ├── storage/          # Storage management
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── dist/                 # Built extension (generated)
├── icons/                # Extension icons
└── manifest.json         # Chrome extension manifest
```

## Testing

The project uses both unit tests and property-based tests:

- **Unit tests**: Specific examples and edge cases
- **Property tests**: Universal properties using fast-check

Run tests with:
```bash
npm test
```

## Architecture

See `.kiro/specs/digital-attention-rescue/design.md` for detailed architecture documentation.

## License

MIT
