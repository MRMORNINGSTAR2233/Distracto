import { BrowsingContext } from '../types';

/**
 * Context Extractor utilities for building browsing context
 */

/**
 * Extract time of day (0-23) from timestamp
 */
export function extractTimeOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  return date.getHours();
}

/**
 * Extract day of week (0-6, Sunday = 0) from timestamp
 */
export function extractDayOfWeek(timestamp: number): number {
  const date = new Date(timestamp);
  return date.getDay();
}

/**
 * Calculate session duration in minutes
 */
export function calculateSessionDuration(sessionStartTime: number, currentTime: number): number {
  return Math.floor((currentTime - sessionStartTime) / (60 * 1000));
}

/**
 * Calculate time since last activity in minutes
 */
export function calculateTimeSinceLastActivity(lastActivityTime: number, currentTime: number): number {
  return Math.floor((currentTime - lastActivityTime) / (60 * 1000));
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * Extract path from URL
 */
export function extractPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    return '';
  }
}

/**
 * Check if URL is a social media site
 */
export function isSocialMedia(url: string): boolean {
  const socialDomains = [
    'facebook.com',
    'twitter.com',
    'x.com',
    'instagram.com',
    'linkedin.com',
    'reddit.com',
    'tiktok.com',
    'snapchat.com',
    'pinterest.com',
    'tumblr.com'
  ];

  const domain = extractDomain(url);
  return socialDomains.some(social => domain.includes(social));
}

/**
 * Check if URL is a video streaming site
 */
export function isVideoStreaming(url: string): boolean {
  const videoDomains = [
    'youtube.com',
    'youtu.be',
    'netflix.com',
    'hulu.com',
    'twitch.tv',
    'vimeo.com',
    'dailymotion.com'
  ];

  const domain = extractDomain(url);
  return videoDomains.some(video => domain.includes(video));
}

/**
 * Check if URL is a news site
 */
export function isNewssite(url: string): boolean {
  const newsDomains = [
    'news',
    'cnn.com',
    'bbc.com',
    'nytimes.com',
    'theguardian.com',
    'reuters.com',
    'apnews.com',
    'bloomberg.com',
    'wsj.com'
  ];

  const domain = extractDomain(url);
  return newsDomains.some(news => domain.includes(news));
}

/**
 * Check if URL is a productivity/work site
 */
export function isProductivitySite(url: string): boolean {
  const productivityDomains = [
    'github.com',
    'gitlab.com',
    'stackoverflow.com',
    'docs.google.com',
    'notion.so',
    'trello.com',
    'asana.com',
    'slack.com',
    'teams.microsoft.com',
    'zoom.us',
    'meet.google.com'
  ];

  const domain = extractDomain(url);
  return productivityDomains.some(prod => domain.includes(prod));
}

/**
 * Categorize URL into broad category
 */
export function categorizeUrl(url: string): string {
  if (isSocialMedia(url)) return 'social-media';
  if (isVideoStreaming(url)) return 'video-streaming';
  if (isNewssite(url)) return 'news';
  if (isProductivitySite(url)) return 'productivity';
  
  return 'other';
}

/**
 * Determine if time is during work hours (9 AM - 5 PM on weekdays)
 */
export function isWorkHours(timestamp: number): boolean {
  const hour = extractTimeOfDay(timestamp);
  const day = extractDayOfWeek(timestamp);
  
  // Monday-Friday (1-5), 9 AM - 5 PM
  return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
}

/**
 * Determine if time is late night (11 PM - 5 AM)
 */
export function isLateNight(timestamp: number): boolean {
  const hour = extractTimeOfDay(timestamp);
  return hour >= 23 || hour < 5;
}

/**
 * Build a complete browsing context
 */
export function buildBrowsingContext(
  url: string,
  title: string,
  timestamp: number,
  recentHistory: string[],
  sessionStartTime: number,
  lastActivityTime: number
): BrowsingContext {
  return {
    url,
    title,
    timestamp,
    timeOfDay: extractTimeOfDay(timestamp),
    dayOfWeek: extractDayOfWeek(timestamp),
    recentHistory: [...recentHistory],
    sessionDuration: calculateSessionDuration(sessionStartTime, timestamp),
    lastProductiveActivity: calculateTimeSinceLastActivity(lastActivityTime, timestamp)
  };
}

/**
 * Analyze navigation pattern from recent history
 */
export function analyzeNavigationPattern(recentHistory: string[]): string {
  if (recentHistory.length < 2) {
    return 'single-page';
  }

  // Check if user is jumping between different domains
  const domains = recentHistory.map(url => extractDomain(url));
  const uniqueDomains = new Set(domains);

  if (uniqueDomains.size === 1) {
    return 'same-site';
  } else if (uniqueDomains.size === recentHistory.length) {
    return 'domain-hopping';
  } else {
    return 'mixed-browsing';
  }
}

/**
 * Calculate browsing velocity (pages per minute)
 */
export function calculateBrowsingVelocity(
  pageCount: number,
  sessionDuration: number
): number {
  if (sessionDuration === 0) return 0;
  return pageCount / sessionDuration;
}

/**
 * Detect if user is in a "rabbit hole" pattern
 * (rapid navigation between related content)
 */
export function detectRabbitHole(
  recentHistory: string[],
  sessionDuration: number
): boolean {
  if (recentHistory.length < 3 || sessionDuration < 5) {
    return false;
  }

  // High velocity + same category = rabbit hole
  const velocity = calculateBrowsingVelocity(recentHistory.length, sessionDuration);
  const categories = recentHistory.map(url => categorizeUrl(url));
  const uniqueCategories = new Set(categories);

  // More than 1 page per minute and mostly same category
  return velocity > 1 && uniqueCategories.size <= 2;
}

/**
 * Get contextual hints about current browsing state
 */
export interface ContextualHints {
  isWorkHours: boolean;
  isLateNight: boolean;
  category: string;
  navigationPattern: string;
  possibleRabbitHole: boolean;
  domain: string;
}

export function getContextualHints(
  url: string,
  timestamp: number,
  recentHistory: string[],
  sessionDuration: number
): ContextualHints {
  return {
    isWorkHours: isWorkHours(timestamp),
    isLateNight: isLateNight(timestamp),
    category: categorizeUrl(url),
    navigationPattern: analyzeNavigationPattern(recentHistory),
    possibleRabbitHole: detectRabbitHole(recentHistory, sessionDuration),
    domain: extractDomain(url)
  };
}
