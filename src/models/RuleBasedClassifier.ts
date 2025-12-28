import { BrowsingContext, SiteClassification } from '../types';
import { 
  extractDomain,
  isSocialMedia,
  isVideoStreaming,
  isNewssite,
  isProductivitySite,
  categorizeUrl,
  isWorkHours,
  isLateNight
} from '../utils/contextExtractor';

/**
 * Rule-based classifier as a baseline/fallback for AI model
 */
export class RuleBasedClassifier {
  /**
   * Classify a site using rule-based logic
   */
  public classify(url: string, context: BrowsingContext): SiteClassification {
    const domain = extractDomain(url);
    const category = categorizeUrl(url);
    
    // Calculate confidence based on rules
    let confidence = 0.5; // Default neutral confidence
    let siteCategory: 'productive' | 'distraction' | 'neutral' = 'neutral';

    // Rule 1: Known productivity sites
    if (isProductivitySite(url)) {
      siteCategory = 'productive';
      confidence = 0.9;
    }
    // Rule 2: Social media during work hours = distraction
    else if (isSocialMedia(url)) {
      siteCategory = 'distraction';
      confidence = isWorkHours(context.timestamp) ? 0.85 : 0.7;
    }
    // Rule 3: Video streaming = likely distraction
    else if (isVideoStreaming(url)) {
      siteCategory = 'distraction';
      confidence = 0.8;
    }
    // Rule 4: News sites - context dependent
    else if (isNewssite(url)) {
      // News during work hours might be distraction
      if (isWorkHours(context.timestamp)) {
        siteCategory = 'distraction';
        confidence = 0.6;
      } else {
        siteCategory = 'neutral';
        confidence = 0.5;
      }
    }
    // Rule 5: Late night browsing = higher distraction likelihood
    else if (isLateNight(context.timestamp)) {
      siteCategory = 'distraction';
      confidence = 0.65;
    }
    // Rule 6: Long session on same site during work hours = productive
    else if (isWorkHours(context.timestamp) && context.sessionDuration > 30) {
      const recentDomains = context.recentHistory.map(u => extractDomain(u));
      const sameDomain = recentDomains.filter(d => d === domain).length;
      
      if (sameDomain >= 3) {
        siteCategory = 'productive';
        confidence = 0.7;
      }
    }

    return {
      url,
      category: siteCategory,
      confidence,
      source: 'default',
      lastUpdated: Date.now()
    };
  }

  /**
   * Get distraction score (0-1) for a URL and context
   */
  public getDistractionScore(url: string, context: BrowsingContext): number {
    const classification = this.classify(url, context);
    
    if (classification.category === 'distraction') {
      return classification.confidence;
    } else if (classification.category === 'productive') {
      return 1 - classification.confidence;
    } else {
      return 0.5; // Neutral
    }
  }

  /**
   * Check if URL matches a pattern
   */
  public matchesPattern(url: string, pattern: string): boolean {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(url);
    } catch {
      // If pattern is not a valid regex, do simple string matching
      return url.toLowerCase().includes(pattern.toLowerCase());
    }
  }

  /**
   * Classify based on custom user patterns
   */
  public classifyWithPatterns(
    url: string,
    context: BrowsingContext,
    productivePatterns: string[],
    distractionPatterns: string[]
  ): SiteClassification {
    // Check user-defined patterns first
    for (const pattern of productivePatterns) {
      if (this.matchesPattern(url, pattern)) {
        return {
          url,
          category: 'productive',
          confidence: 1.0,
          source: 'user',
          lastUpdated: Date.now()
        };
      }
    }

    for (const pattern of distractionPatterns) {
      if (this.matchesPattern(url, pattern)) {
        return {
          url,
          category: 'distraction',
          confidence: 1.0,
          source: 'user',
          lastUpdated: Date.now()
        };
      }
    }

    // Fall back to rule-based classification
    return this.classify(url, context);
  }

  /**
   * Get classification explanation
   */
  public explainClassification(url: string, context: BrowsingContext): string {
    if (isProductivitySite(url)) {
      return 'Known productivity/work site';
    }
    if (isSocialMedia(url)) {
      return isWorkHours(context.timestamp) 
        ? 'Social media during work hours'
        : 'Social media site';
    }
    if (isVideoStreaming(url)) {
      return 'Video streaming site';
    }
    if (isNewssite(url)) {
      return isWorkHours(context.timestamp)
        ? 'News site during work hours'
        : 'News site';
    }
    if (isLateNight(context.timestamp)) {
      return 'Late night browsing';
    }
    
    return 'No specific pattern detected';
  }
}

// Export singleton instance
export const ruleBasedClassifier = new RuleBasedClassifier();
