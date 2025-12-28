import { SiteClassification, BrowsingContext } from '../types';
import { storageManager } from '../storage/StorageManager';
import { aiModelEngine } from './AIModelEngine';
import { ruleBasedClassifier } from './RuleBasedClassifier';
import { extractDomain } from '../utils/contextExtractor';

/**
 * Classification suggestion for user confirmation
 */
export interface ClassificationSuggestion {
  url: string;
  suggestedCategory: 'productive' | 'distraction' | 'neutral';
  confidence: number;
  reason: string;
}

/**
 * Classification Manager handles site classification logic
 */
export class ClassificationManager {
  /**
   * Get classification for a URL
   * Priority: User manual > AI model > Rule-based
   */
  public async getClassification(url: string, context: BrowsingContext): Promise<SiteClassification> {
    // Check for user manual classification first
    const userClassification = await storageManager.getSiteClassification(url);
    if (userClassification && userClassification.source === 'user') {
      return userClassification;
    }

    // Try domain-level classification if exact URL not found
    const domain = extractDomain(url);
    const domainClassification = await storageManager.getSiteClassification(domain);
    if (domainClassification && domainClassification.source === 'user') {
      return {
        ...domainClassification,
        url // Update URL to current page
      };
    }

    // Use AI model for prediction
    const aiClassification = aiModelEngine.classifySite(url, context);
    
    // If AI confidence is low, fall back to rule-based
    if (aiClassification.confidence < 0.6) {
      const ruleClassification = ruleBasedClassifier.classify(url, context);
      
      // Use whichever has higher confidence
      if (ruleClassification.confidence > aiClassification.confidence) {
        return ruleClassification;
      }
    }

    return aiClassification;
  }

  /**
   * Save user manual classification
   */
  public async saveUserClassification(
    url: string,
    category: 'productive' | 'distraction' | 'neutral' | 'custom',
    customLabel?: string
  ): Promise<void> {
    const classification: SiteClassification = {
      url,
      category,
      confidence: 1.0,
      source: 'user',
      customLabel,
      lastUpdated: Date.now()
    };

    await storageManager.saveSiteClassification(url, classification);
    console.log(`User classified ${url} as ${category}`);
  }

  /**
   * Save domain-level classification
   */
  public async saveDomainClassification(
    url: string,
    category: 'productive' | 'distraction' | 'neutral' | 'custom',
    customLabel?: string
  ): Promise<void> {
    const domain = extractDomain(url);
    
    const classification: SiteClassification = {
      url: domain,
      category,
      confidence: 1.0,
      source: 'user',
      customLabel,
      lastUpdated: Date.now()
    };

    await storageManager.saveSiteClassification(domain, classification);
    console.log(`User classified domain ${domain} as ${category}`);
  }

  /**
   * Get classification suggestion for user confirmation
   */
  public async getSuggestion(url: string, context: BrowsingContext): Promise<ClassificationSuggestion> {
    // Get AI prediction
    const prediction = aiModelEngine.predict(context);
    
    // Get rule-based classification for explanation
    const ruleClassification = ruleBasedClassifier.classify(url, context);
    const reason = ruleBasedClassifier.explainClassification(url, context);

    // Use AI prediction if confident, otherwise use rules
    let suggestedCategory: 'productive' | 'distraction' | 'neutral';
    
    if (prediction.confidence > 0.6) {
      suggestedCategory = prediction.isDistraction ? 'distraction' : 'productive';
    } else {
      // Filter out 'custom' category for suggestions
      suggestedCategory = ruleClassification.category === 'custom' 
        ? 'neutral' 
        : ruleClassification.category;
    }

    const confidence = prediction.confidence > 0.6
      ? prediction.confidence
      : ruleClassification.confidence;

    return {
      url,
      suggestedCategory,
      confidence,
      reason
    };
  }

  /**
   * Bulk classify URLs from history
   */
  public async bulkClassify(urls: string[], context: BrowsingContext): Promise<Map<string, SiteClassification>> {
    const classifications = new Map<string, SiteClassification>();

    for (const url of urls) {
      const classification = await this.getClassification(url, context);
      classifications.set(url, classification);
    }

    return classifications;
  }

  /**
   * Get all user classifications
   */
  public async getUserClassifications(): Promise<Record<string, SiteClassification>> {
    const allClassifications = await storageManager.getAllClassifications();
    
    // Filter to only user-defined classifications
    const userClassifications: Record<string, SiteClassification> = {};
    for (const [url, classification] of Object.entries(allClassifications)) {
      if (classification.source === 'user') {
        userClassifications[url] = classification;
      }
    }

    return userClassifications;
  }

  /**
   * Remove classification for a URL
   */
  public async removeClassification(url: string): Promise<void> {
    // We can't directly remove from storage, but we can overwrite with neutral
    const classification: SiteClassification = {
      url,
      category: 'neutral',
      confidence: 0.5,
      source: 'default',
      lastUpdated: Date.now()
    };

    await storageManager.saveSiteClassification(url, classification);
    console.log(`Removed classification for ${url}`);
  }

  /**
   * Update classification based on user behavior
   */
  public async updateFromBehavior(
    url: string,
    wasProductive: boolean,
    context: BrowsingContext
  ): Promise<void> {
    // Provide feedback to AI model
    aiModelEngine.updateWithFeedback({
      url,
      wasDistraction: !wasProductive,
      timestamp: Date.now(),
      context
    });

    // Get current classification
    const currentClassification = await storageManager.getSiteClassification(url);

    // If no user classification exists, update AI classification
    if (!currentClassification || currentClassification.source !== 'user') {
      const newClassification = aiModelEngine.classifySite(url, context);
      await storageManager.saveSiteClassification(url, newClassification);
    }
  }

  /**
   * Get classification statistics
   */
  public async getStatistics(): Promise<{
    totalClassifications: number;
    userClassifications: number;
    aiClassifications: number;
    productiveSites: number;
    distractionSites: number;
    neutralSites: number;
  }> {
    const allClassifications = await storageManager.getAllClassifications();
    const entries = Object.values(allClassifications);

    return {
      totalClassifications: entries.length,
      userClassifications: entries.filter(c => c.source === 'user').length,
      aiClassifications: entries.filter(c => c.source === 'ai').length,
      productiveSites: entries.filter(c => c.category === 'productive').length,
      distractionSites: entries.filter(c => c.category === 'distraction').length,
      neutralSites: entries.filter(c => c.category === 'neutral').length
    };
  }

  /**
   * Export classifications for backup
   */
  public async exportClassifications(): Promise<Record<string, SiteClassification>> {
    return storageManager.getAllClassifications();
  }

  /**
   * Import classifications from backup
   */
  public async importClassifications(classifications: Record<string, SiteClassification>): Promise<void> {
    for (const [url, classification] of Object.entries(classifications)) {
      await storageManager.saveSiteClassification(url, classification);
    }
    console.log(`Imported ${Object.keys(classifications).length} classifications`);
  }
}

// Export singleton instance
export const classificationManager = new ClassificationManager();
