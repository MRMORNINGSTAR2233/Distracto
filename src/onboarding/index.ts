// Onboarding Page Entry Point
import { MessageType } from '../background/BackgroundService';
import type { UserSettings, SiteClassification, ChallengeType } from '../types';

// Example challenges for preview
const EXAMPLE_CHALLENGES = [
  {
    type: 'reflection',
    prompt: 'What were you looking for when you opened this page?',
    options: null
  },
  {
    type: 'intention',
    prompt: 'Set a 10-minute focus goal before continuing',
    options: ['Work on current task', 'Take a short break', 'Switch to priority task']
  },
  {
    type: 'quick-task',
    prompt: 'Name 3 things you want to accomplish today',
    options: null
  },
  {
    type: 'breathing',
    prompt: 'Take 3 deep breaths before proceeding',
    options: null
  }
];

// Onboarding state
interface OnboardingState {
  currentStep: number;
  streakGoal: number;
  productiveSites: string[];
  distractionSites: string[];
  preferredChallenges: ChallengeType[];
  learningMode: boolean;
  interventionFrequency: 'aggressive' | 'moderate' | 'minimal';
}

const state: OnboardingState = {
  currentStep: 0,
  streakGoal: 25,
  productiveSites: [],
  distractionSites: [],
  preferredChallenges: ['reflection', 'intention', 'quick-task', 'breathing'],
  learningMode: true,
  interventionFrequency: 'moderate'
};

const STEPS = [
  'step-welcome',
  'step-goals',
  'step-sites',
  'step-challenges',
  'step-learning',
  'step-complete'
];

let currentChallengeIndex = 0;

/**
 * Initialize the onboarding
 */
function initialize(): void {
  console.log('Digital Attention Rescue - Onboarding initialized');
  
  // Check if already onboarded
  checkOnboardingStatus();
  
  // Render initial challenge preview
  renderChallengePreview();
  
  // Setup keyboard navigation
  setupKeyboardNavigation();
}

/**
 * Check if user has already completed onboarding
 */
async function checkOnboardingStatus(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['dar_onboarding_complete']);
    if (result.dar_onboarding_complete) {
      // Already onboarded, redirect to popup or dashboard
      window.close();
    }
  } catch (error) {
    console.error('Failed to check onboarding status:', error);
  }
}

/**
 * Setup keyboard navigation
 */
function setupKeyboardNavigation(): void {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && state.currentStep > 0 && state.currentStep < STEPS.length - 1) {
      nextStep();
    } else if (e.key === 'Escape' && state.currentStep > 0) {
      prevStep();
    }
  });
}

/**
 * Start the setup wizard
 */
function startSetup(): void {
  state.currentStep = 1;
  updateStepVisibility();
}

/**
 * Skip setup and apply default settings
 */
async function skipSetup(): Promise<void> {
  try {
    // Apply default settings
    await applyDefaultSettings();
    
    // Mark onboarding as complete
    await chrome.storage.local.set({ dar_onboarding_complete: true });
    
    // Close and open popup
    window.close();
  } catch (error) {
    console.error('Failed to skip setup:', error);
    alert('Something went wrong. Please try again.');
  }
}

/**
 * Apply default settings
 */
async function applyDefaultSettings(): Promise<void> {
  const defaultSettings: UserSettings = {
    interventionFrequency: 'moderate',
    quietHours: [],
    whitelistedSites: [],
    preferredChallenges: ['reflection', 'intention', 'quick-task', 'breathing'],
    learningMode: true,
    notificationsEnabled: true,
    streakGoal: 25
  };

  await sendMessage(MessageType.UPDATE_SETTINGS, defaultSettings);
}

/**
 * Navigate to next step
 */
function nextStep(): void {
  if (state.currentStep < STEPS.length - 1) {
    state.currentStep++;
    updateStepVisibility();
    
    // Render challenge preview when on challenges step
    if (state.currentStep === 3) {
      renderChallengePreview();
    }
  }
}

/**
 * Navigate to previous step
 */
function prevStep(): void {
  if (state.currentStep > 0) {
    state.currentStep--;
    updateStepVisibility();
  }
}

/**
 * Update step visibility
 */
function updateStepVisibility(): void {
  STEPS.forEach((stepId, index) => {
    const stepEl = document.getElementById(stepId);
    if (stepEl) {
      if (index === state.currentStep) {
        stepEl.classList.add('active');
      } else {
        stepEl.classList.remove('active');
      }
    }
  });
}

/**
 * Select radio option
 */
function selectRadio(element: HTMLElement, name: string, value: any): void {
  // Remove selected class from siblings
  const parent = element.parentElement;
  if (parent) {
    parent.querySelectorAll('.radio-option').forEach(option => {
      option.classList.remove('selected');
    });
  }
  
  // Add selected class
  element.classList.add('selected');
  
  // Update state
  if (name === 'streakGoal') {
    state.streakGoal = value;
  } else if (name === 'frequency') {
    state.interventionFrequency = value;
  }
}

/**
 * Toggle checkbox option
 */
function toggleCheckbox(element: HTMLElement): void {
  const input = element.querySelector('input[type="checkbox"]') as HTMLInputElement;
  if (!input) return;
  
  // Prevent unchecking if it's the last one
  const checkedCount = document.querySelectorAll('#challengeTypesGroup .checkbox-option.selected').length;
  if (element.classList.contains('selected') && checkedCount <= 1) {
    alert('You must have at least one challenge type selected.');
    return;
  }
  
  element.classList.toggle('selected');
  input.checked = element.classList.contains('selected');
  
  // Update state
  updatePreferredChallenges();
}

/**
 * Update preferred challenges from checkboxes
 */
function updatePreferredChallenges(): void {
  const checkboxes = document.querySelectorAll('#challengeTypesGroup input[type="checkbox"]:checked');
  state.preferredChallenges = Array.from(checkboxes).map(cb => (cb as HTMLInputElement).value as ChallengeType);
}

/**
 * Toggle learning mode
 */
function toggleLearningMode(): void {
  const toggle = document.getElementById('learningModeToggle');
  if (toggle) {
    toggle.classList.toggle('active');
    state.learningMode = toggle.classList.contains('active');
  }
}

/**
 * Add site to list
 */
function addSite(type: 'productive' | 'distraction'): void {
  const inputId = type === 'productive' ? 'productiveSiteInput' : 'distractionSiteInput';
  const input = document.getElementById(inputId) as HTMLInputElement;
  
  if (!input || !input.value.trim()) return;
  
  let site = input.value.trim().toLowerCase();
  
  // Extract domain if full URL provided
  try {
    if (site.includes('://')) {
      site = new URL(site).hostname;
    } else if (site.includes('/')) {
      site = site.split('/')[0];
    }
  } catch {
    // Keep as-is if URL parsing fails
  }
  
  // Add to state
  if (type === 'productive') {
    if (!state.productiveSites.includes(site)) {
      state.productiveSites.push(site);
    }
  } else {
    if (!state.distractionSites.includes(site)) {
      state.distractionSites.push(site);
    }
  }
  
  // Clear input
  input.value = '';
  
  // Re-render list
  renderSitesList(type);
}

/**
 * Remove site from list
 */
function removeSite(type: 'productive' | 'distraction', site: string): void {
  if (type === 'productive') {
    state.productiveSites = state.productiveSites.filter(s => s !== site);
  } else {
    state.distractionSites = state.distractionSites.filter(s => s !== site);
  }
  
  renderSitesList(type);
}

/**
 * Render sites list
 */
function renderSitesList(type: 'productive' | 'distraction'): void {
  const listId = type === 'productive' ? 'productiveSitesList' : 'distractionSitesList';
  const listEl = document.getElementById(listId);
  
  if (!listEl) return;
  
  const sites = type === 'productive' ? state.productiveSites : state.distractionSites;
  
  listEl.innerHTML = sites.map(site => `
    <div class="site-tag">
      <span>${site}</span>
      <span class="remove" onclick="removeSite('${type}', '${site}')">&times;</span>
    </div>
  `).join('');
}

/**
 * Render challenge preview
 */
function renderChallengePreview(): void {
  const previewEl = document.getElementById('challengePreview');
  if (!previewEl) return;
  
  const challenge = EXAMPLE_CHALLENGES[currentChallengeIndex];
  const typeEmoji = {
    'reflection': '🤔',
    'intention': '🎯',
    'quick-task': '⚡',
    'breathing': '🧘'
  }[challenge.type];
  
  previewEl.innerHTML = `
    <div class="challenge-preview-header">
      <span>${typeEmoji}</span>
      <h3>${capitalize(challenge.type)} Challenge</h3>
    </div>
    <p class="challenge-prompt">${challenge.prompt}</p>
    ${challenge.options ? `
      <div class="challenge-options">
        ${challenge.options.map(opt => `<div class="challenge-option">${opt}</div>`).join('')}
      </div>
    ` : `
      <textarea class="site-input" placeholder="Type your response..." rows="2" style="width: 100%; resize: none;"></textarea>
    `}
    <button class="try-another-btn" onclick="tryAnotherChallenge()">Try Another Challenge Type</button>
  `;
}

/**
 * Show next example challenge
 */
function tryAnotherChallenge(): void {
  currentChallengeIndex = (currentChallengeIndex + 1) % EXAMPLE_CHALLENGES.length;
  renderChallengePreview();
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace('-', ' ');
}

/**
 * Complete setup and save settings
 */
async function completeSetup(): Promise<void> {
  try {
    // Build settings
    const settings: UserSettings = {
      interventionFrequency: state.interventionFrequency,
      quietHours: [],
      whitelistedSites: [],
      preferredChallenges: state.preferredChallenges,
      learningMode: state.learningMode,
      notificationsEnabled: true,
      streakGoal: state.streakGoal
    };
    
    // Save settings
    await sendMessage(MessageType.UPDATE_SETTINGS, settings);
    
    // Save site classifications
    for (const site of state.productiveSites) {
      await saveSiteClassification(site, 'productive');
    }
    
    for (const site of state.distractionSites) {
      await saveSiteClassification(site, 'distraction');
    }
    
    // Mark onboarding as complete
    await chrome.storage.local.set({ dar_onboarding_complete: true });
    
    // Update summary
    updateSetupSummary();
    
    // Move to complete step
    state.currentStep = 5;
    updateStepVisibility();
    
  } catch (error) {
    console.error('Failed to complete setup:', error);
    alert('Something went wrong saving your settings. Please try again.');
  }
}

/**
 * Save site classification
 */
async function saveSiteClassification(url: string, category: 'productive' | 'distraction'): Promise<void> {
  const classification: SiteClassification = {
    url,
    category,
    confidence: 1.0,
    source: 'user',
    lastUpdated: Date.now()
  };
  
  await sendMessage(MessageType.CLASSIFY_SITE, { url, classification });
}

/**
 * Update setup summary
 */
function updateSetupSummary(): void {
  const goalEl = document.getElementById('summaryGoal');
  const freqEl = document.getElementById('summaryFrequency');
  const learningEl = document.getElementById('summaryLearning');
  const challengesEl = document.getElementById('summaryChallenges');
  
  if (goalEl) goalEl.textContent = `${state.streakGoal} minutes`;
  if (freqEl) freqEl.textContent = capitalize(state.interventionFrequency);
  if (learningEl) learningEl.textContent = state.learningMode ? 'Enabled' : 'Disabled';
  if (challengesEl) {
    const count = state.preferredChallenges.length;
    challengesEl.textContent = count === 4 ? 'All types' : `${count} types selected`;
  }
}

/**
 * Open dashboard
 */
function openDashboard(): void {
  chrome.tabs.create({ url: 'dashboard.html' });
  window.close();
}

/**
 * Send message to background service
 */
async function sendMessage(type: MessageType, payload?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response?.success) {
        resolve(response.data);
      } else {
        reject(new Error(response?.error || 'Unknown error'));
      }
    });
  });
}

// Make functions available globally for onclick handlers
declare global {
  interface Window {
    startSetup: typeof startSetup;
    skipSetup: typeof skipSetup;
    nextStep: typeof nextStep;
    prevStep: typeof prevStep;
    selectRadio: typeof selectRadio;
    toggleCheckbox: typeof toggleCheckbox;
    toggleLearningMode: typeof toggleLearningMode;
    addSite: typeof addSite;
    removeSite: typeof removeSite;
    tryAnotherChallenge: typeof tryAnotherChallenge;
    completeSetup: typeof completeSetup;
    openDashboard: typeof openDashboard;
  }
}

window.startSetup = startSetup;
window.skipSetup = skipSetup;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.selectRadio = selectRadio;
window.toggleCheckbox = toggleCheckbox;
window.toggleLearningMode = toggleLearningMode;
window.addSite = addSite;
window.removeSite = removeSite;
window.tryAnotherChallenge = tryAnotherChallenge;
window.completeSetup = completeSetup;
window.openDashboard = openDashboard;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initialize);
