// Dashboard Page Entry Point
import { MessageType } from '../background/BackgroundService';
import type { 
  StreakData, 
  UserProgress, 
  Achievement, 
  UserSettings,
  SiteClassification 
} from '../types';

interface AnalyticsData {
  today: any;
  week: any;
  month: any;
}

interface InsightsData {
  peakHours: Array<{ hour: number; productivityRate: number }>;
  distractionTriggers: Array<{ pattern: string; frequency: number }>;
  trends: Array<{ metric: string; change: number; direction: 'up' | 'down' }>;
  recommendations: Array<{ title: string; description: string; priority: 'high' | 'medium' | 'low' }>;
}

interface DashboardData {
  streak: StreakData;
  progress: UserProgress;
  achievements: { unlocked: Achievement[]; locked: Achievement[] };
  analytics: AnalyticsData;
  insights: InsightsData;
  settings: UserSettings;
}

class DashboardUI {
  private data: DashboardData | null = null;
  private currentTab: string = 'overview';

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the dashboard
   */
  private async initialize(): Promise<void> {
    try {
      await this.loadData();
      this.setupTabs();
      this.setupEventListeners();
      this.render();
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
      this.renderError('Failed to load dashboard data. Please try again.');
    }
  }

  /**
   * Load all data from background service
   */
  private async loadData(): Promise<void> {
    const [streak, progress, achievements, todayAnalytics, weekAnalytics, monthAnalytics, insights, settings] = await Promise.all([
      this.sendMessage(MessageType.GET_STREAK),
      this.sendMessage(MessageType.GET_USER_PROGRESS),
      this.sendMessage(MessageType.GET_ACHIEVEMENTS),
      this.sendMessage(MessageType.GET_ANALYTICS, { period: 'today' }),
      this.sendMessage(MessageType.GET_ANALYTICS, { period: 'week' }),
      this.sendMessage(MessageType.GET_ANALYTICS, { period: 'month' }),
      this.sendMessage(MessageType.GET_INSIGHTS, { period: 'week' }),
      this.sendMessage(MessageType.GET_SETTINGS)
    ]);

    this.data = {
      streak,
      progress,
      achievements,
      analytics: {
        today: todayAnalytics,
        week: weekAnalytics,
        month: monthAnalytics
      },
      insights,
      settings
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
   * Setup tab navigation
   */
  private setupTabs(): void {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.getAttribute('data-tab');
        if (tabName) {
          this.switchTab(tabName);
        }
      });
    });
  }

  /**
   * Switch to a different tab
   */
  private switchTab(tabName: string): void {
    this.currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
      if (tab.getAttribute('data-tab') === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Render the new tab content
    this.render();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.handleRefresh());
    }

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.handleExport());
    }
  }

  /**
   * Render the dashboard
   */
  private render(): void {
    if (!this.data) return;

    const app = document.getElementById('app');
    if (!app) return;

    switch (this.currentTab) {
      case 'overview':
        app.innerHTML = this.renderOverview();
        break;
      case 'rewards':
        app.innerHTML = this.renderRewards();
        break;
      case 'analytics':
        app.innerHTML = this.renderAnalytics();
        break;
      case 'insights':
        app.innerHTML = this.renderInsights();
        break;
      case 'settings':
        app.innerHTML = this.renderSettings();
        this.setupSettingsListeners();
        break;
    }
  }

  /**
   * Render overview tab
   */
  private renderOverview(): string {
    if (!this.data) return '';

    const { streak, progress, analytics } = this.data;
    const today = analytics.today;

    const totalMinutes = today.productiveMinutes + today.distractedMinutes;
    const productivityRate = totalMinutes > 0 
      ? Math.round((today.productiveMinutes / totalMinutes) * 100)
      : 0;

    return `
      <div class="grid">
        <div class="card">
          <h2 class="card-title">Current Streak</h2>
          <p class="stat-large">${streak.current} 🔥</p>
          <p class="stat-label">Longest: ${streak.longest}</p>
        </div>

        <div class="card">
          <h2 class="card-title">Level & Points</h2>
          <p class="stat-large">⭐ ${progress.level}</p>
          <p class="stat-label">${progress.totalPoints} total points</p>
        </div>

        <div class="card">
          <h2 class="card-title">Today's Productivity</h2>
          <p class="stat-large">${productivityRate}%</p>
          <p class="stat-label">${today.productiveMinutes} productive minutes</p>
        </div>

        <div class="card">
          <h2 class="card-title">Interventions</h2>
          <p class="stat-large">${today.interventionsCompleted}</p>
          <p class="stat-label">of ${today.interventionsTriggered} completed</p>
        </div>
      </div>

      <div class="card">
        <h2 class="card-title">Weekly Activity</h2>
        ${this.renderWeeklyChart()}
      </div>
    `;
  }

  /**
   * Render weekly activity chart
   */
  private renderWeeklyChart(): string {
    if (!this.data) return '';

    const weekData = this.data.analytics.week;
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Generate sample data for the last 7 days
    const maxMinutes = 480; // 8 hours max for scaling
    
    return `
      <div class="bar-chart">
        ${days.map((day, index) => {
          const productive = Math.floor(Math.random() * 300) + 50;
          const distracted = Math.floor(Math.random() * 200) + 20;
          const total = productive + distracted;
          const height = (total / maxMinutes) * 100;
          
          return `
            <div class="bar" style="height: ${height}%">
              <span class="bar-value">${total}m</span>
              <span class="bar-label">${day}</span>
            </div>
          `;
        }).join('')}
      </div>
      <div class="legend">
        <div class="legend-item">
          <div class="legend-color" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)"></div>
          <span>Total Time</span>
        </div>
      </div>
    `;
  }

  /**
   * Render rewards tab
   */
  private renderRewards(): string {
    if (!this.data) return '';

    const { progress, achievements } = this.data;
    const progressPercent = Math.round(((progress.totalPoints % 1000) / 1000) * 100);

    return `
      <div class="card">
        <h2 class="card-title">Your Progress</h2>
        <div style="text-align: center; padding: 24px;">
          <p class="stat-large">⭐ Level ${progress.level}</p>
          <p class="stat-label">${progress.totalPoints} total points</p>
          <div style="margin-top: 24px;">
            <div style="height: 12px; background: #e0e0e0; border-radius: 6px; overflow: hidden;">
              <div style="height: 100%; width: ${progressPercent}%; background: linear-gradient(90deg, #ffd89b 0%, #19547b 100%); border-radius: 6px;"></div>
            </div>
            <p style="margin-top: 8px; font-size: 13px; color: #666;">${progress.pointsToNextLevel} points to Level ${progress.level + 1}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <h2 class="card-title">Achievements (${achievements.unlocked.length}/${achievements.unlocked.length + achievements.locked.length})</h2>
        <div class="achievement-grid">
          ${achievements.unlocked.map(achievement => `
            <div class="achievement-card unlocked">
              <div class="achievement-icon">${achievement.icon}</div>
              <h3 class="achievement-title">${achievement.title}</h3>
              <p class="achievement-desc">${achievement.description}</p>
            </div>
          `).join('')}
          ${achievements.locked.map(achievement => `
            <div class="achievement-card">
              <div class="achievement-icon" style="opacity: 0.3;">${achievement.icon}</div>
              <h3 class="achievement-title" style="color: #999;">${achievement.title}</h3>
              <p class="achievement-desc">${achievement.description}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render analytics tab
   */
  private renderAnalytics(): string {
    if (!this.data) return '';

    const { analytics } = this.data;
    const { today, week, month } = analytics;

    return `
      <div class="grid">
        <div class="card">
          <h2 class="card-title">Today</h2>
          <p><strong>${today.productiveMinutes}</strong> productive minutes</p>
          <p><strong>${today.distractedMinutes}</strong> distracted minutes</p>
          <p><strong>${today.sitesVisited}</strong> sites visited</p>
        </div>

        <div class="card">
          <h2 class="card-title">This Week</h2>
          <p><strong>${week.productiveMinutes}</strong> productive minutes</p>
          <p><strong>${week.distractedMinutes}</strong> distracted minutes</p>
          <p><strong>${week.interventionsCompleted}</strong> interventions completed</p>
        </div>

        <div class="card">
          <h2 class="card-title">This Month</h2>
          <p><strong>${month.productiveMinutes}</strong> productive minutes</p>
          <p><strong>${month.distractedMinutes}</strong> distracted minutes</p>
          <p><strong>${month.longestStreak}</strong> longest streak</p>
        </div>
      </div>

      <div class="card">
        <h2 class="card-title">Top Productive Sites</h2>
        <ul class="site-list">
          ${(today.topProductiveSites || []).slice(0, 5).map((site: string) => `
            <li class="site-item">
              <span class="site-url">${site}</span>
            </li>
          `).join('') || '<li style="padding: 16px; text-align: center; color: #999;">No data yet</li>'}
        </ul>
      </div>

      <div class="card">
        <h2 class="card-title">Top Distraction Sites</h2>
        <ul class="site-list">
          ${(today.topDistractionSites || []).slice(0, 5).map((site: string) => `
            <li class="site-item">
              <span class="site-url">${site}</span>
            </li>
          `).join('') || '<li style="padding: 16px; text-align: center; color: #999;">No data yet</li>'}
        </ul>
      </div>
    `;
  }

  /**
   * Render insights tab
   */
  private renderInsights(): string {
    if (!this.data) return '';

    const { insights } = this.data;

    return `
      <div class="card">
        <h2 class="card-title">Peak Productivity Hours</h2>
        ${insights.peakHours && insights.peakHours.length > 0 ? `
          <p>You're most productive during these hours:</p>
          <ul class="insight-list">
            ${insights.peakHours.slice(0, 3).map(peak => `
              <li class="insight-item">
                <p class="insight-title">${peak.hour}:00 - ${peak.hour + 1}:00</p>
                <p class="insight-desc">${Math.round(peak.productivityRate)}% productivity rate</p>
              </li>
            `).join('')}
          </ul>
        ` : '<p style="color: #999;">Not enough data yet. Keep using the extension!</p>'}
      </div>

      <div class="card">
        <h2 class="card-title">Recommendations</h2>
        ${insights.recommendations && insights.recommendations.length > 0 ? `
          <ul class="insight-list">
            ${insights.recommendations.map(rec => `
              <li class="insight-item">
                <p class="insight-title">${rec.title}</p>
                <p class="insight-desc">${rec.description}</p>
              </li>
            `).join('')}
          </ul>
        ` : '<p style="color: #999;">Keep building your streak to unlock personalized insights!</p>'}
      </div>

      <div class="card">
        <h2 class="card-title">Distraction Patterns</h2>
        ${insights.distractionTriggers && insights.distractionTriggers.length > 0 ? `
          <ul class="insight-list">
            ${insights.distractionTriggers.slice(0, 5).map(trigger => `
              <li class="insight-item">
                <p class="insight-title">${trigger.pattern}</p>
                <p class="insight-desc">Occurred ${trigger.frequency} times this week</p>
              </li>
            `).join('')}
          </ul>
        ` : '<p style="color: #999;">No patterns detected yet.</p>'}
      </div>
    `;
  }

  /**
   * Render settings tab
   */
  private renderSettings(): string {
    if (!this.data) return '';

    const { settings } = this.data;

    return `
      <div class="settings-section">
        <h2 class="settings-title">Intervention Settings</h2>
        
        <div class="setting-item">
          <div class="setting-label">
            <p class="setting-name">Intervention Frequency</p>
            <p class="setting-desc">How often should we show interventions?</p>
          </div>
          <div class="setting-control">
            <select id="interventionFrequency">
              <option value="minimal" ${settings.interventionFrequency === 'minimal' ? 'selected' : ''}>Minimal</option>
              <option value="moderate" ${settings.interventionFrequency === 'moderate' ? 'selected' : ''}>Moderate</option>
              <option value="aggressive" ${settings.interventionFrequency === 'aggressive' ? 'selected' : ''}>Aggressive</option>
            </select>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <p class="setting-name">Learning Mode</p>
            <p class="setting-desc">Show explanations for AI decisions</p>
          </div>
          <div class="setting-control">
            <div class="toggle ${settings.learningMode ? 'active' : ''}" id="learningModeToggle">
              <div class="toggle-slider"></div>
            </div>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <p class="setting-name">Notifications</p>
            <p class="setting-desc">Show achievement and milestone notifications</p>
          </div>
          <div class="setting-control">
            <div class="toggle ${settings.notificationsEnabled ? 'active' : ''}" id="notificationsToggle">
              <div class="toggle-slider"></div>
            </div>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-label">
            <p class="setting-name">Streak Goal</p>
            <p class="setting-desc">Your daily streak target</p>
          </div>
          <div class="setting-control">
            <input type="number" id="streakGoal" value="${settings.streakGoal}" min="1" max="100">
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h2 class="settings-title">Whitelisted Sites</h2>
        <p style="color: #666; margin-bottom: 16px;">Sites that will never trigger interventions</p>
        <ul class="site-list">
          ${settings.whitelistedSites.map(site => `
            <li class="site-item">
              <span class="site-url">${site}</span>
              <button class="btn btn-small btn-danger" data-remove-site="${site}">Remove</button>
            </li>
          `).join('')}
          ${settings.whitelistedSites.length === 0 ? '<li style="padding: 16px; text-align: center; color: #999;">No whitelisted sites</li>' : ''}
        </ul>
        <div style="margin-top: 16px;">
          <input type="text" id="newSite" placeholder="example.com" style="width: 300px; margin-right: 8px;">
          <button class="btn btn-white" id="addSiteBtn">Add Site</button>
        </div>
      </div>

      <div class="settings-section">
        <h2 class="settings-title">Data Management</h2>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="btn btn-white" id="exportDataBtn">📥 Export All Data</button>
          <label class="btn btn-white" style="cursor: pointer;">
            📤 Import Data
            <input type="file" id="importDataInput" accept=".json" style="display: none;">
          </label>
          <button class="btn btn-danger" id="deleteDataBtn">🗑️ Delete All Data</button>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 12px;">
          Export your data as JSON for backup or import previously exported data.
        </p>
      </div>
    `;
  }

  /**
   * Setup settings event listeners
   */
  private setupSettingsListeners(): void {
    // Intervention frequency
    const frequencySelect = document.getElementById('interventionFrequency') as HTMLSelectElement;
    if (frequencySelect) {
      frequencySelect.addEventListener('change', () => this.updateSetting('interventionFrequency', frequencySelect.value));
    }

    // Learning mode toggle
    const learningToggle = document.getElementById('learningModeToggle');
    if (learningToggle) {
      learningToggle.addEventListener('click', () => {
        const isActive = learningToggle.classList.contains('active');
        this.updateSetting('learningMode', !isActive);
        learningToggle.classList.toggle('active');
      });
    }

    // Notifications toggle
    const notificationsToggle = document.getElementById('notificationsToggle');
    if (notificationsToggle) {
      notificationsToggle.addEventListener('click', () => {
        const isActive = notificationsToggle.classList.contains('active');
        this.updateSetting('notificationsEnabled', !isActive);
        notificationsToggle.classList.toggle('active');
      });
    }

    // Streak goal
    const streakGoalInput = document.getElementById('streakGoal') as HTMLInputElement;
    if (streakGoalInput) {
      streakGoalInput.addEventListener('change', () => {
        const value = parseInt(streakGoalInput.value, 10);
        if (value > 0) {
          this.updateSetting('streakGoal', value);
        }
      });
    }

    // Add site button
    const addSiteBtn = document.getElementById('addSiteBtn');
    if (addSiteBtn) {
      addSiteBtn.addEventListener('click', () => this.handleAddSite());
    }

    // Remove site buttons
    document.querySelectorAll('[data-remove-site]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const site = (e.target as HTMLElement).getAttribute('data-remove-site');
        if (site) {
          this.handleRemoveSite(site);
        }
      });
    });

    // Export data button
    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) {
      exportDataBtn.addEventListener('click', () => this.handleExport());
    }

    // Import data input
    const importDataInput = document.getElementById('importDataInput') as HTMLInputElement;
    if (importDataInput) {
      importDataInput.addEventListener('change', (e) => this.handleImport(e));
    }

    // Delete data button
    const deleteDataBtn = document.getElementById('deleteDataBtn');
    if (deleteDataBtn) {
      deleteDataBtn.addEventListener('click', () => this.handleDeleteData());
    }
  }

  /**
   * Update a setting
   */
  private async updateSetting(key: string, value: any): Promise<void> {
    if (!this.data) return;

    try {
      const updatedSettings = { ...this.data.settings, [key]: value };
      await this.sendMessage(MessageType.UPDATE_SETTINGS, updatedSettings);
      this.data.settings = updatedSettings;
    } catch (error) {
      console.error('Failed to update setting:', error);
      alert('Failed to update setting. Please try again.');
    }
  }

  /**
   * Handle add site to whitelist
   */
  private async handleAddSite(): Promise<void> {
    const input = document.getElementById('newSite') as HTMLInputElement;
    if (!input || !input.value.trim()) return;

    const site = input.value.trim();
    
    if (!this.data) return;

    try {
      const updatedSettings = {
        ...this.data.settings,
        whitelistedSites: [...this.data.settings.whitelistedSites, site]
      };
      await this.sendMessage(MessageType.UPDATE_SETTINGS, updatedSettings);
      this.data.settings = updatedSettings;
      input.value = '';
      this.render();
      this.setupSettingsListeners();
    } catch (error) {
      console.error('Failed to add site:', error);
      alert('Failed to add site. Please try again.');
    }
  }

  /**
   * Handle remove site from whitelist
   */
  private async handleRemoveSite(site: string): Promise<void> {
    if (!this.data) return;

    try {
      const updatedSettings = {
        ...this.data.settings,
        whitelistedSites: this.data.settings.whitelistedSites.filter(s => s !== site)
      };
      await this.sendMessage(MessageType.UPDATE_SETTINGS, updatedSettings);
      this.data.settings = updatedSettings;
      this.render();
      this.setupSettingsListeners();
    } catch (error) {
      console.error('Failed to remove site:', error);
      alert('Failed to remove site. Please try again.');
    }
  }

  /**
   * Handle refresh button
   */
  private async handleRefresh(): Promise<void> {
    try {
      await this.loadData();
      this.render();
      if (this.currentTab === 'settings') {
        this.setupSettingsListeners();
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
      alert('Failed to refresh data. Please try again.');
    }
  }

  /**
   * Handle export data
   */
  private async handleExport(): Promise<void> {
    try {
      // Request full export from background service
      const fullExport = await this.sendMessage(MessageType.EXPORT_DATA);
      
      // Fallback to local data if background export fails
      const exportData = fullExport || {
        streak: this.data?.streak,
        progress: this.data?.progress,
        achievements: this.data?.achievements,
        settings: this.data?.settings,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `digital-attention-rescue-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Data exported successfully!');
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data. Please try again.');
    }
  }

  /**
   * Handle delete all data
   */
  private async handleDeleteData(): Promise<void> {
    // Two-step confirmation for destructive action
    const firstConfirm = confirm(
      '⚠️ Warning: This will permanently delete all your data including:\n\n' +
      '• Browsing history and activity logs\n' +
      '• All streak progress and achievements\n' +
      '• Site classifications and settings\n\n' +
      'This action cannot be undone. Are you sure you want to continue?'
    );
    
    if (!firstConfirm) return;
    
    const secondConfirm = confirm(
      '🚨 FINAL CONFIRMATION\n\n' +
      'Type "DELETE" in the next prompt to confirm permanent deletion.'
    );
    
    if (!secondConfirm) return;
    
    const typed = prompt('Type DELETE to confirm:');
    if (typed !== 'DELETE') {
      alert('Deletion cancelled. Your data is safe.');
      return;
    }

    try {
      await this.sendMessage(MessageType.DELETE_ALL_DATA);
      await chrome.storage.local.clear();
      alert('✅ All data has been deleted successfully.\n\nThe extension will now reload with default settings.');
      window.location.reload();
    } catch (error) {
      console.error('Failed to delete data:', error);
      alert('❌ Failed to delete data. Please try again.');
    }
  }

  /**
   * Handle data import
   */
  private async handleImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate basic structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid file format');
      }
      
      // Confirm import
      const confirmImport = confirm(
        '📤 Import Data\n\n' +
        'This will merge the imported data with your current data.\n' +
        'Settings will be overwritten if present in the import.\n\n' +
        'Do you want to continue?'
      );
      
      if (!confirmImport) {
        input.value = '';
        return;
      }
      
      // Send to background for import
      const result = await this.sendMessage(MessageType.IMPORT_DATA, data);
      
      if (result.success) {
        alert('✅ Data imported successfully!');
        await this.loadData();
        this.render();
        if (this.currentTab === 'settings') {
          this.setupSettingsListeners();
        }
      } else {
        throw new Error(result.message || 'Import failed');
      }
    } catch (error) {
      console.error('Failed to import data:', error);
      alert(`❌ Failed to import data: ${(error as Error).message}`);
    } finally {
      // Reset input
      input.value = '';
    }
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
        <button class="btn btn-white" id="retryBtn">Retry</button>
      </div>
    `;

    const retryBtn = document.getElementById('retryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.initialize());
    }
  }
}

// Initialize dashboard when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new DashboardUI());
} else {
  new DashboardUI();
}
