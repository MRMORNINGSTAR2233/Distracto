/**
 * Activity Detector identifies special browsing states
 * that should pause interventions (video calls, presentations, etc.)
 */
export class ActivityDetector {
  private pausedUntil: number = 0;
  private manuallyPaused: boolean = false;

  /**
   * Video call domains and patterns
   */
  private readonly VIDEO_CALL_PATTERNS = [
    'zoom.us',
    'meet.google.com',
    'teams.microsoft.com',
    'webex.com',
    'whereby.com',
    'jitsi',
    'discord.com/channels',
    'slack.com/call',
    'skype.com',
    'facetime',
    'bluejeans.com',
    'gotomeeting.com',
    'ringcentral.com'
  ];

  /**
   * Presentation and screen sharing patterns
   */
  private readonly PRESENTATION_PATTERNS = [
    'slides.google.com/present',
    'powerpoint.live.com/present',
    'prezi.com/present',
    'canva.com/design',
    '/present',
    '/presentation',
    '/slideshow'
  ];

  /**
   * Check if URL indicates a video call
   */
  public isVideoCall(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    return this.VIDEO_CALL_PATTERNS.some(pattern => 
      lowerUrl.includes(pattern.toLowerCase())
    );
  }

  /**
   * Check if URL indicates a presentation
   */
  public isPresentation(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    return this.PRESENTATION_PATTERNS.some(pattern => 
      lowerUrl.includes(pattern.toLowerCase())
    );
  }

  /**
   * Check if interventions should be paused
   */
  public shouldPauseInterventions(url: string): boolean {
    // Check manual pause
    if (this.manuallyPaused) {
      return true;
    }

    // Check temporary pause
    if (Date.now() < this.pausedUntil) {
      return true;
    }

    // Check for video call or presentation
    return this.isVideoCall(url) || this.isPresentation(url);
  }

  /**
   * Manually pause interventions
   */
  public pause(durationMinutes: number = 60): void {
    this.pausedUntil = Date.now() + (durationMinutes * 60 * 1000);
    console.log(`Interventions paused for ${durationMinutes} minutes`);
  }

  /**
   * Resume interventions
   */
  public resume(): void {
    this.pausedUntil = 0;
    this.manuallyPaused = false;
    console.log('Interventions resumed');
  }

  /**
   * Toggle manual pause
   */
  public toggleManualPause(): boolean {
    this.manuallyPaused = !this.manuallyPaused;
    
    if (this.manuallyPaused) {
      console.log('Interventions manually paused');
    } else {
      console.log('Interventions manually resumed');
    }

    return this.manuallyPaused;
  }

  /**
   * Check if currently paused
   */
  public isPaused(): boolean {
    return this.manuallyPaused || Date.now() < this.pausedUntil;
  }

  /**
   * Get pause status
   */
  public getPauseStatus(): {
    isPaused: boolean;
    isManual: boolean;
    remainingMinutes: number;
    reason: string;
  } {
    const now = Date.now();
    const isPaused = this.isPaused();
    const remainingMs = Math.max(0, this.pausedUntil - now);
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));

    let reason = 'Not paused';
    if (this.manuallyPaused) {
      reason = 'Manually paused';
    } else if (now < this.pausedUntil) {
      reason = `Paused for ${remainingMinutes} more minutes`;
    }

    return {
      isPaused,
      isManual: this.manuallyPaused,
      remainingMinutes,
      reason
    };
  }

  /**
   * Add custom video call pattern
   */
  public addVideoCallPattern(pattern: string): void {
    if (!this.VIDEO_CALL_PATTERNS.includes(pattern)) {
      this.VIDEO_CALL_PATTERNS.push(pattern);
      console.log(`Added video call pattern: ${pattern}`);
    }
  }

  /**
   * Add custom presentation pattern
   */
  public addPresentationPattern(pattern: string): void {
    if (!this.PRESENTATION_PATTERNS.includes(pattern)) {
      this.PRESENTATION_PATTERNS.push(pattern);
      console.log(`Added presentation pattern: ${pattern}`);
    }
  }

  /**
   * Detect activity type from URL
   */
  public detectActivityType(url: string): 'video-call' | 'presentation' | 'normal' {
    if (this.isVideoCall(url)) {
      return 'video-call';
    }
    if (this.isPresentation(url)) {
      return 'presentation';
    }
    return 'normal';
  }

  /**
   * Get activity detection statistics
   */
  public getStatistics(): {
    isPaused: boolean;
    pauseReason: string;
    videoCallPatternsCount: number;
    presentationPatternsCount: number;
  } {
    const status = this.getPauseStatus();

    return {
      isPaused: status.isPaused,
      pauseReason: status.reason,
      videoCallPatternsCount: this.VIDEO_CALL_PATTERNS.length,
      presentationPatternsCount: this.PRESENTATION_PATTERNS.length
    };
  }
}

// Export singleton instance
export const activityDetector = new ActivityDetector();
