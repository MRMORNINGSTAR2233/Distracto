// Background Service Worker Entry Point
import { backgroundService } from './BackgroundService';

console.log('Digital Attention Rescue - Background Service Worker initialized');

// The backgroundService is automatically initialized when imported
// It sets up all necessary listeners and state management

// Set uninstall URL to show cleanup instructions
chrome.runtime.setUninstallURL(chrome.runtime.getURL('uninstall.html'));

// Handle extension install/update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // Check if onboarding is already complete
    const result = await chrome.storage.local.get(['dar_onboarding_complete']);
    
    if (!result.dar_onboarding_complete) {
      // Open onboarding page on fresh install
      chrome.tabs.create({ url: 'onboarding.html' });
    }
  }
});
