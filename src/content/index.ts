// Content Script Entry Point
import { activityTracker } from './ActivityTracker';
import { interventionUI } from './InterventionUI';
import { MessageType } from '../background/BackgroundService';
import './styles.css';

console.log('Digital Attention Rescue - Content Script loaded on:', window.location.href);

// The activityTracker is automatically initialized when imported
// It sets up all necessary event listeners and starts tracking

// Listen for intervention triggers from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MessageType.TRIGGER_INTERVENTION) {
    const { challenge, reason } = message.payload;
    
    // Show intervention UI
    interventionUI.show(challenge, async (response) => {
      // Send response back to background
      try {
        await chrome.runtime.sendMessage({
          type: MessageType.INTERVENTION_RESPONSE,
          payload: {
            interventionResponse: response,
            url: window.location.href,
            context: activityTracker.getCurrentContext()
          }
        });
      } catch (error) {
        console.error('Failed to send intervention response:', error);
      }
    });

    sendResponse({ success: true });
  }

  return true; // Keep message channel open for async response
});
