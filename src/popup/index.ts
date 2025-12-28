// Popup UI Entry Point
import { MessageType } from '../background/BackgroundService';
import type { StreakData, UserProgress, Achievement, DailyStatistics } from '../types';

interface PopupData {
  streak: StreakData;
  progress: UserProgress;
  achievements: { unlocked: Achievement[]; locked: Achievement[] };
  dailyStats: DailyStatistics;
  pauseStatus: { isPaused: boolean; pausedUntil?: number };
}

class PopupUI {
  private data: PopupData | null = null;
  private updateInterval: number | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the popup UI
   */
  private async initialize(): Promise<void> {
    try {
      await this.loadData();
      this.render();
      this.setupEventListeners();
      this.startAutoUpdate();
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      this.renderError('Failed to load data. Please try again.');
    }
  }

  /**
   * Load all data from background service
   */
  private async loadData(): Promise<void> {
    const [streak, progress, achievements, dailyStats, pauseStatus] = await Promise.all([
      this.sendMessage(MessageType.GET_STREAK),
      this.sendMessage(MessageType.GET_USER_PROGRESS),
      this.sendMessage(MessageType.GET_ACHIEVEMENTS),
      this.sendMessage(MessageType.GET_DAILY_STATS),
      this.sendMessage(MessageType.GET_PAUSE_STATUS)
    ]);

    this.data = {
      streak,
      progress,
      achievements,
      dailyStats,
      pauseStatus
    };
  }

  /**
   * Send message to background service
   */
  private async sendMessage(type: MessageType, payload?: any): Promise<any> {
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

  /**
   * Render the popup UI
   */
  private render(): void {
    if (!this.data) return;

    const app = document.getElementById('app');
    if (!app) return;

    const { streak, progress, achievements, dailyStats, pauseStatus } = this.data;

    // Calculate productivity rate
    const totalMinutes = dailyStats.productiveMinutes + dailyStats.distractedMinutes;
    const productivityRate = totalMinutes > 0 
      ? Math.round((dailyStats.productiveMinutes / totalMinutes) * 100)
      : 0;

    // Calculate progress to next level
    const progressPercent = progress.pointsToNextLevel > 0
      ? Math.round(((progress.totalPoints % 1000) / 1000) * 100)
      : 0;

    app.innerHTML = `
      ${pauseStatus.isPaused ? this.renderPauseStatus(pauseStatus) : ''}
      
      <div class="card streak-display">
        <div class="streak-number">${streak.current}</div>
        <div class="streak-label">Current Streak 🔥</div>
      </div>

      <div class="card">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${dailyStats.productiveMinutes}</div>
            <div class="stat-label">Productive Min</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${dailyStats.distractedMinutes}</div>
            <div class="stat-label">Distracted Min</div>
          </div>
        </div>

        <div class="productivity-bar">
          <div class="productivity-label">
            <span>Productivity Rate</span>
            <span><strong>${productivityRate}%</strong></span>
          </div>
          <div class="bar-container">
            <div class="bar-fill" style="width: ${productivityRate}%"></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="progress-section">
          <div class="progress-header">
            <div class="level-badge">
              ⭐ Level ${progress.level}
            </div>
            <div class="points-display">
              ${progress.totalPoints} pts
            </div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
          </div>
          <div class="progress-text">
            ${progress.pointsToNextLevel} points to next level
          </div>
        </div>

        ${achievements.unlocked.length > 0 ? this.renderAchievements(achievements) : ''}
      </div>

      <div class="card actions">
        ${pauseStatus.isPaused 
          ? '<button class="btn btn-resume" id="resumeBtn">▶️ Resume Interventions</button>'
          : '<button class="btn btn-pause" id="pauseBtn">⏸️ Pause for 1 Hour</button>'
        }
        <a href="dashboard.html" target="_blank" class="btn btn-primary">
          📊 Dashboard
        </a>
      </div>
    `;
  }

  /**
   * Render pause status banner
   */
  private renderPauseStatus(pauseStatus: { isPaused: boolean; pausedUntil?: number }): string {
    if (!pauseStatus.isPaused || !pauseStatus.pausedUntil) return '';

    const remainingMinutes = Math.ceil((pauseStatus.pausedUntil - Date.now()) / (60 * 1000));
    
    return `
      <div class="pause-status">
        ⏸️ Interventions paused for ${remainingMinutes} more minutes
      </div>
    `;
  }

  /**
   * Render achievements preview
   */
  private renderAchievements(achievements: { unlocked: Achievement[]; locked: Achievement[] }): string {
    const recentUnlocked = achievements.unlocked.slice(-3).reverse();
    const nextLocked = achievements.locked.slice(0, 3 - recentUnlocked.length);
    const displayAchievements = [...recentUnlocked, ...nextLocked];

    return `
      <div class="achievements-preview">
        <div class="achievements-title">Recent Achievements</div>
        <div class="achievement-badges">
          ${displayAchievements.map(achievement => `
            <div class="achievement-badge ${achievement.unlockedAt ? '' : 'locked'}" 
                 title="${achievement.title}: ${achievement.description}">
              ${achievement.icon}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render error message
   */
  private renderError(message: string): void {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
      <div class="error">
        <p>❌ ${message}</p>
        <button class="btn btn-primary" id="retryBtn">Retry</button>
      </div>
    `;

    const retryBtn = document.getElementById('retryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.initialize());
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Pause button
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this.handlePause());
    }

    // Resume button
    const resumeBtn = document.getElementById('resumeBtn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => this.handleResume());
    }
  }

  /**
   * Handle pause button click
   */
  private async handlePause(): Promise<void> {
    try {
      const pauseStatus = await this.sendMessage(MessageType.PAUSE_INTERVENTIONS, { durationMinutes: 60 });
      if (this.data) {
        this.data.pauseStatus = pauseStatus;
      }
      this.render();
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to pause interventions:', error);
      alert('Failed to pause interventions. Please try again.');
    }
  }

  /**
   * Handle resume button click
   */
  private async handleResume(): Promise<void> {
    try {
      const pauseStatus = await this.sendMessage(MessageType.RESUME_INTERVENTIONS);
      if (this.data) {
        this.data.pauseStatus = pauseStatus;
      }
      this.render();
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to resume interventions:', error);
      alert('Failed to resume interventions. Please try again.');
    }
  }

  /**
   * Start auto-update interval
   */
  private startAutoUpdate(): void {
    // Update every 30 seconds
    this.updateInterval = window.setInterval(() => {
      this.loadData().then(() => {
        this.render();
        this.setupEventListeners();
      }).catch(error => {
        console.error('Failed to update data:', error);
      });
    }, 30000);
  }

  /**
   * Stop auto-update interval
   */
  private stopAutoUpdate(): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new PopupUI());
} else {
  new PopupUI();
}

// Cleanup on unload
window.addEventListener('unload', () => {
  // Cleanup will happen automatically
});
