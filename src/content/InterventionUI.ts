import { MicroChallenge, InterventionResponse } from '../types';

/**
 * Intervention UI manages the overlay display for micro-challenges
 */
export class InterventionUI {
  private overlay: HTMLElement | null = null;
  private currentChallenge: MicroChallenge | null = null;
  private responseCallback: ((response: InterventionResponse) => void) | null = null;
  private startTime: number = 0;

  /**
   * Show intervention overlay with challenge
   */
  public show(
    challenge: MicroChallenge,
    onResponse: (response: InterventionResponse) => void
  ): void {
    // Remove existing overlay if any
    this.hide();

    this.currentChallenge = challenge;
    this.responseCallback = onResponse;
    this.startTime = Date.now();

    // Create overlay
    this.overlay = this.createOverlay(challenge);
    document.body.appendChild(this.overlay);

    // Set up timeout
    setTimeout(() => {
      if (this.overlay) {
        this.handleTimeout();
      }
    }, challenge.timeoutSeconds * 1000);
  }

  /**
   * Create overlay HTML structure
   */
  private createOverlay(challenge: MicroChallenge): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'dar-intervention-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'dar-challenge-prompt');

    const card = document.createElement('div');
    card.className = 'dar-intervention-card';

    // Header
    const header = document.createElement('div');
    header.className = 'dar-header';
    header.innerHTML = `
      <h2>🎯 Take a Moment</h2>
      <p class="dar-subtitle">Quick focus check</p>
    `;

    // Challenge prompt
    const promptEl = document.createElement('div');
    promptEl.className = 'dar-prompt';
    promptEl.id = 'dar-challenge-prompt';
    promptEl.textContent = challenge.prompt;

    // Options or input
    const interactionEl = challenge.options
      ? this.createOptions(challenge.options)
      : this.createTextInput();

    // Actions
    const actions = document.createElement('div');
    actions.className = 'dar-actions';

    const completeBtn = document.createElement('button');
    completeBtn.className = 'dar-btn dar-btn-primary';
    completeBtn.textContent = challenge.options ? 'Continue' : 'Submit';
    completeBtn.onclick = () => this.handleComplete();

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'dar-btn dar-btn-secondary';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.onclick = () => this.handleDismiss();

    actions.appendChild(completeBtn);
    actions.appendChild(dismissBtn);

    // Timer
    const timer = document.createElement('div');
    timer.className = 'dar-timer';
    timer.textContent = `${challenge.timeoutSeconds}s`;
    this.startTimer(timer, challenge.timeoutSeconds);

    // Assemble card
    card.appendChild(header);
    card.appendChild(promptEl);
    card.appendChild(interactionEl);
    card.appendChild(actions);
    card.appendChild(timer);

    overlay.appendChild(card);

    return overlay;
  }

  /**
   * Create option buttons
   */
  private createOptions(options: string[]): HTMLElement {
    const container = document.createElement('div');
    container.className = 'dar-options';

    options.forEach(option => {
      const btn = document.createElement('button');
      btn.className = 'dar-option-btn';
      btn.textContent = option;
      btn.onclick = () => {
        // Deselect others
        container.querySelectorAll('.dar-option-btn').forEach(b => {
          b.classList.remove('selected');
        });
        // Select this one
        btn.classList.add('selected');
        btn.setAttribute('data-selected', 'true');
      };
      container.appendChild(btn);
    });

    return container;
  }

  /**
   * Create text input
   */
  private createTextInput(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'dar-input-container';

    const textarea = document.createElement('textarea');
    textarea.className = 'dar-input';
    textarea.placeholder = 'Type your response...';
    textarea.rows = 3;
    textarea.id = 'dar-response-input';

    container.appendChild(textarea);
    return container;
  }

  /**
   * Start countdown timer
   */
  private startTimer(timerEl: HTMLElement, seconds: number): void {
    let remaining = seconds;

    const interval = setInterval(() => {
      remaining--;
      timerEl.textContent = `${remaining}s`;

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);
  }

  /**
   * Handle challenge completion
   */
  private handleComplete(): void {
    if (!this.currentChallenge || !this.responseCallback) return;

    let response: string | undefined;

    // Get response based on challenge type
    if (this.currentChallenge.options) {
      const selected = this.overlay?.querySelector('.dar-option-btn.selected');
      response = selected?.textContent || undefined;
    } else {
      const input = this.overlay?.querySelector('#dar-response-input') as HTMLTextAreaElement;
      response = input?.value || undefined;
    }

    const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);

    this.responseCallback({
      challengeId: this.currentChallenge.id,
      completed: true,
      dismissed: false,
      response,
      timeSpent
    });

    this.hide();
  }

  /**
   * Handle challenge dismissal
   */
  private handleDismiss(): void {
    if (!this.currentChallenge || !this.responseCallback) return;

    const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);

    this.responseCallback({
      challengeId: this.currentChallenge.id,
      completed: false,
      dismissed: true,
      timeSpent
    });

    this.hide();
  }

  /**
   * Handle timeout
   */
  private handleTimeout(): void {
    if (!this.currentChallenge || !this.responseCallback) return;

    const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);

    this.responseCallback({
      challengeId: this.currentChallenge.id,
      completed: false,
      dismissed: true,
      timeSpent
    });

    this.hide();
  }

  /**
   * Hide and remove overlay
   */
  public hide(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.currentChallenge = null;
    this.responseCallback = null;
  }

  /**
   * Check if intervention is currently showing
   */
  public isShowing(): boolean {
    return this.overlay !== null;
  }
}

// Export singleton instance
export const interventionUI = new InterventionUI();
