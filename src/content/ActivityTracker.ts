import { ActivityEvent, BrowsingContext } from '../types';
import { MessageType } from '../background/BackgroundService';

/**
 * Activity Tracker monitors user activity on web pages
 */
export class ActivityTracker {
  private recentHistory: string[] = [];
  private sessionStartTime: number;
  private lastActivityTime: number;
  private pageLoadTime: number;
  private isTracking: boolean = false;

  constructor() {
    this.sessionStartTime = Date.now();
    this.lastActivityTime = Date.now();
    this.pageLoadTime = Date.now();
    this.initialize();
  }

  /**
   * Initialize the activity tracker
   */
  private initialize(): void {
    console.log('Activity Tracker initialized on:', window.location.href);

    // Start tracking
    this.startTracking();

    // Track initial page load
    this.trackNavigation();

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for various user interactions
   */
  private setupEventListeners(): void {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackBlur();
      } else {
        this.trackFocus();
      }
    });

    // Track window focus/blur
    window.addEventListener('focus', () => this.trackFocus());
    window.addEventListener('blur', () => this.trackBlur());

    // Track scroll activity (throttled)
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.trackScroll();
      }, 1000); // Throttle to once per second
    });

    // Track click activity
    document.addEventListener('click', (event) => {
      this.trackClick(event);
    }, { passive: true });

    // Track before unload (page navigation away)
    window.addEventListener('beforeunload', () => {
      this.trackPageExit();
    });
  }

  /**
   * Start tracking activity
   */
  private startTracking(): void {
    this.isTracking = true;
  }

  /**
   * Stop tracking activity
   */
  public stopTracking(): void {
    this.isTracking = false;
  }

  /**
   * Build browsing context for current state
   */
  private buildContext(): BrowsingContext {
    const now = Date.now();
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    const sessionDuration = Math.floor((now - this.sessionStartTime) / (60 * 1000));
    const lastProductiveActivity = Math.floor((now - this.lastActivityTime) / (60 * 1000));

    return {
      url: window.location.href,
      title: document.title,
      timestamp: now,
      timeOfDay: currentHour,
      dayOfWeek: currentDay,
      recentHistory: [...this.recentHistory],
      sessionDuration,
      lastProductiveActivity
    };
  }

  /**
   * Get current browsing context (public accessor)
   */
  public getCurrentContext(): BrowsingContext {
    return this.buildContext();
  }

  /**
   * Send activity event to background service
   */
  private async sendActivityEvent(event: ActivityEvent): Promise<void> {
    if (!this.isTracking) {
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        type: MessageType.ACTIVITY_EVENT,
        payload: event
      });
    } catch (error) {
      console.error('Failed to send activity event:', error);
    }
  }

  /**
   * Track navigation event
   */
  private async trackNavigation(): Promise<void> {
    const context = this.buildContext();
    
    // Add to recent history
    this.addToRecentHistory(context.url);

    const event: ActivityEvent = {
      url: context.url,
      timestamp: context.timestamp,
      eventType: 'navigation',
      context
    };

    await this.sendActivityEvent(event);
    this.lastActivityTime = Date.now();
  }

  /**
   * Track focus event (tab/window gains focus)
   */
  private async trackFocus(): Promise<void> {
    const context = this.buildContext();

    const event: ActivityEvent = {
      url: context.url,
      timestamp: context.timestamp,
      eventType: 'focus',
      context
    };

    await this.sendActivityEvent(event);
    this.lastActivityTime = Date.now();
  }

  /**
   * Track blur event (tab/window loses focus)
   */
  private async trackBlur(): Promise<void> {
    const context = this.buildContext();
    const duration = Math.floor((Date.now() - this.pageLoadTime) / 1000);

    const event: ActivityEvent = {
      url: context.url,
      timestamp: context.timestamp,
      eventType: 'blur',
      duration,
      context
    };

    await this.sendActivityEvent(event);
  }

  /**
   * Track scroll event
   */
  private async trackScroll(): Promise<void> {
    const context = this.buildContext();

    const event: ActivityEvent = {
      url: context.url,
      timestamp: context.timestamp,
      eventType: 'scroll',
      context
    };

    await this.sendActivityEvent(event);
    this.lastActivityTime = Date.now();
  }

  /**
   * Track click event
   */
  private async trackClick(clickEvent: MouseEvent): Promise<void> {
    const context = this.buildContext();

    const event: ActivityEvent = {
      url: context.url,
      timestamp: context.timestamp,
      eventType: 'click',
      context
    };

    await this.sendActivityEvent(event);
    this.lastActivityTime = Date.now();
  }

  /**
   * Track page exit
   */
  private async trackPageExit(): Promise<void> {
    const context = this.buildContext();
    const duration = Math.floor((Date.now() - this.pageLoadTime) / 1000);

    const event: ActivityEvent = {
      url: context.url,
      timestamp: context.timestamp,
      eventType: 'blur',
      duration,
      context
    };

    // Use sendBeacon for reliable delivery on page unload
    const message = {
      type: MessageType.ACTIVITY_EVENT,
      payload: event
    };

    // Try to send via runtime message first
    try {
      await this.sendActivityEvent(event);
    } catch (error) {
      console.error('Failed to send page exit event:', error);
    }
  }

  /**
   * Add URL to recent history (keep last 5)
   */
  private addToRecentHistory(url: string): void {
    // Don't add duplicates of the current URL
    if (this.recentHistory.length > 0 && this.recentHistory[this.recentHistory.length - 1] === url) {
      return;
    }

    this.recentHistory.push(url);

    // Keep only last 5 URLs
    if (this.recentHistory.length > 5) {
      this.recentHistory.shift();
    }
  }

  /**
   * Get current session duration in minutes
   */
  public getSessionDuration(): number {
    return Math.floor((Date.now() - this.sessionStartTime) / (60 * 1000));
  }

  /**
   * Get time since last activity in minutes
   */
  public getTimeSinceLastActivity(): number {
    return Math.floor((Date.now() - this.lastActivityTime) / (60 * 1000));
  }

  /**
   * Get recent browsing history
   */
  public getRecentHistory(): string[] {
    return [...this.recentHistory];
  }
}

// Create and export singleton instance
export const activityTracker = new ActivityTracker();
