import { MicroChallenge, ChallengeType, BrowsingContext } from '../types';
import { isWorkHours, isLateNight, categorizeUrl } from '../utils/contextExtractor';

/**
 * Challenge templates for each type
 */
interface ChallengeTemplate {
  prompts: string[];
  options?: string[][];
  timeoutSeconds: number;
  difficulty: number;
}

const CHALLENGE_TEMPLATES: Record<ChallengeType, ChallengeTemplate> = {
  reflection: {
    prompts: [
      'What were you looking for when you opened this page?',
      'Is this helping you accomplish your goals right now?',
      'What task were you working on before this?',
      'Will this page help you be productive?',
      'Is this the best use of your time right now?'
    ],
    timeoutSeconds: 30,
    difficulty: 1
  },
  intention: {
    prompts: [
      'Set a 10-minute focus goal before continuing',
      'What do you want to accomplish in the next 15 minutes?',
      'Name one task you\'ll complete before browsing further',
      'Set a timer for focused work before continuing',
      'What\'s your priority task right now?'
    ],
    options: [
      ['Work on current task', 'Take a short break', 'Switch to priority task'],
      ['Focus for 15 min', 'Focus for 30 min', 'Focus for 1 hour'],
      ['Complete one task', 'Make progress on project', 'Clear my inbox']
    ],
    timeoutSeconds: 45,
    difficulty: 2
  },
  'quick-task': {
    prompts: [
      'Name 3 things you want to accomplish today',
      'List 2 tasks you can complete in the next hour',
      'What\'s the most important thing you should do right now?',
      'Name one thing you\'ve accomplished so far today',
      'What will make today feel productive?'
    ],
    timeoutSeconds: 60,
    difficulty: 2
  },
  breathing: {
    prompts: [
      'Take 3 deep breaths before proceeding',
      'Pause and take 5 slow breaths',
      'Close your eyes and breathe deeply for 10 seconds',
      'Take a moment to breathe and refocus',
      'Breathe in for 4, hold for 4, out for 4'
    ],
    timeoutSeconds: 20,
    difficulty: 1
  }
};

/**
 * Challenge Generator creates contextual micro-challenges
 */
export class ChallengeGenerator {
  private usedPrompts: Map<ChallengeType, Set<string>> = new Map();
  private difficultyLevel: number = 1;

  constructor() {
    // Initialize used prompts tracking
    for (const type of Object.keys(CHALLENGE_TEMPLATES) as ChallengeType[]) {
      this.usedPrompts.set(type, new Set());
    }
  }

  /**
   * Generate a challenge based on context and preferences
   */
  public generate(
    type: ChallengeType,
    context: BrowsingContext,
    preferredTypes?: ChallengeType[]
  ): MicroChallenge {
    // Select type based on context if not specified
    const selectedType = type || this.selectTypeForContext(context, preferredTypes);
    
    // Get template
    const template = CHALLENGE_TEMPLATES[selectedType];
    
    // Select prompt (avoid recently used ones)
    const prompt = this.selectPrompt(selectedType, template.prompts);
    
    // Select options if available
    const options = template.options 
      ? template.options[Math.floor(Math.random() * template.options.length)]
      : undefined;

    // Adjust difficulty based on context
    const difficulty = this.calculateDifficulty(context, template.difficulty);

    // Adjust timeout based on difficulty
    const timeoutSeconds = Math.round(template.timeoutSeconds * (1 + (difficulty - 1) * 0.2));

    return {
      id: `${selectedType}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      type: selectedType,
      prompt,
      options,
      timeoutSeconds,
      difficulty
    };
  }

  /**
   * Generate challenge (convenience method)
   */
  public generateChallenge(context: BrowsingContext, preferredTypes?: ChallengeType[]): MicroChallenge {
    return this.generate(null as any, context, preferredTypes);
  }

  /**
   * Select challenge type based on context
   */
  private selectTypeForContext(
    context: BrowsingContext,
    preferredTypes?: ChallengeType[]
  ): ChallengeType {
    // Use preferred types if provided
    if (preferredTypes && preferredTypes.length > 0) {
      return preferredTypes[Math.floor(Math.random() * preferredTypes.length)];
    }

    const category = categorizeUrl(context.url);

    // Context-based selection
    if (isLateNight(context.timestamp)) {
      // Late night: breathing or reflection
      return Math.random() > 0.5 ? 'breathing' : 'reflection';
    }

    if (isWorkHours(context.timestamp)) {
      // Work hours: intention or quick-task
      return Math.random() > 0.5 ? 'intention' : 'quick-task';
    }

    if (category === 'social-media' || category === 'video-streaming') {
      // Distracting sites: reflection or intention
      return Math.random() > 0.5 ? 'reflection' : 'intention';
    }

    // Default: random selection weighted by difficulty
    const types: ChallengeType[] = ['breathing', 'reflection', 'intention', 'quick-task'];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Select a prompt, avoiding recently used ones
   */
  private selectPrompt(type: ChallengeType, prompts: string[]): string {
    const used = this.usedPrompts.get(type)!;
    
    // Get unused prompts
    const unused = prompts.filter(p => !used.has(p));
    
    // If all prompts used, reset
    if (unused.length === 0) {
      used.clear();
      return prompts[Math.floor(Math.random() * prompts.length)];
    }

    // Select random unused prompt
    const selected = unused[Math.floor(Math.random() * unused.length)];
    used.add(selected);

    // Keep only last 3 used prompts
    if (used.size > 3) {
      const first = Array.from(used)[0];
      used.delete(first);
    }

    return selected;
  }

  /**
   * Calculate difficulty based on context
   */
  private calculateDifficulty(context: BrowsingContext, baseDifficulty: number): number {
    let difficulty = baseDifficulty;

    // Increase difficulty for longer sessions
    if (context.sessionDuration > 60) {
      difficulty += 1;
    }

    // Increase difficulty if user hasn't been productive recently
    if (context.lastProductiveActivity > 30) {
      difficulty += 1;
    }

    // Cap difficulty at 5
    return Math.min(difficulty, 5);
  }

  /**
   * Validate challenge response
   */
  public validateResponse(challenge: MicroChallenge, response: string): boolean {
    // For challenges with options, check if response matches one
    if (challenge.options) {
      return challenge.options.includes(response);
    }

    // For free-form responses, check if not empty
    return response.trim().length > 0;
  }

  /**
   * Adjust difficulty level based on user performance
   */
  public adjustDifficulty(completed: boolean): void {
    if (completed) {
      // Gradually increase difficulty
      this.difficultyLevel = Math.min(this.difficultyLevel + 0.1, 5);
    } else {
      // Decrease difficulty on dismissal
      this.difficultyLevel = Math.max(this.difficultyLevel - 0.2, 1);
    }
  }

  /**
   * Get current difficulty level
   */
  public getDifficultyLevel(): number {
    return this.difficultyLevel;
  }

  /**
   * Reset difficulty to default
   */
  public resetDifficulty(): void {
    this.difficultyLevel = 1;
  }

  /**
   * Generate multiple challenges for selection
   */
  public generateMultiple(
    count: number,
    context: BrowsingContext,
    preferredTypes?: ChallengeType[]
  ): MicroChallenge[] {
    const challenges: MicroChallenge[] = [];
    const types = preferredTypes || ['reflection', 'intention', 'quick-task', 'breathing'];

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      challenges.push(this.generate(type, context, preferredTypes));
    }

    return challenges;
  }

  /**
   * Get challenge statistics
   */
  public getStatistics(): {
    difficultyLevel: number;
    usedPromptsCount: number;
  } {
    let totalUsed = 0;
    this.usedPrompts.forEach(set => {
      totalUsed += set.size;
    });

    return {
      difficultyLevel: this.difficultyLevel,
      usedPromptsCount: totalUsed
    };
  }
}

// Export singleton instance
export const challengeGenerator = new ChallengeGenerator();
