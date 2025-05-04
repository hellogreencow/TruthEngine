/**
 * Truth Engine - Source Analyzer Module
 * 
 * This module provides enhanced source analysis capabilities:
 * 1. Detects website ownership information
 * 2. Analyzes source credibility based on multiple factors
 * 3. Provides detailed trust score breakdowns
 * 4. Implements in-depth analysis of source motivations and biases
 */

import https from 'https';
import http from 'http';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

// Set up colored logging
const log = {
  info: (...args) => { console.log('\x1b[36m[INFO]\x1b[0m', ...args); return args.join(' '); },
  warn: (...args) => { console.log('\x1b[33m[WARN]\x1b[0m', ...args); return args.join(' '); },
  error: (...args) => { console.log('\x1b[31m[ERROR]\x1b[0m', ...args); return args.join(' '); },
  success: (...args) => { console.log('\x1b[32m[SUCCESS]\x1b[0m', ...args); return args.join(' '); },
  debug: (...args) => { console.log('\x1b[90m[DEBUG]\x1b[0m', ...args); return args.join(' '); }
};

/**
 * Comprehensive trust score calculation system
 * This calculates a detailed trust score with multiple components
 */
export function calculateTrustScore(sources) {
  if (!sources || sources.length === 0) {
    return {
      overall: 0,
      components: [],
      explanation: "No sources available for evaluation."
    };
  }

  // Calculate individual source scores
  const sourceScores = sources.map(source => {
    // Extract domain for analysis
    const domain = extractDomain(source.url);
    
    // Base authority score (0-100)
    const authorityScore = calculateAuthorityScore(domain);
    
    // Content quality score (0-100)
    const contentQualityScore = calculateContentQualityScore(source);
    
    // Ownership transparency score (0-100)
    const ownershipScore = analyzeOwnershipTransparency(source);
    
    // Citation score - does the source cite other credible sources? (0-100)
    const citationScore = analyzeCitations(source);
    
    // Bias assessment score (0-100, higher means less bias)
    const biasScore = assessBias(source);
    
    // Calculate total weighted score
    const totalScore = Math.round(
      (authorityScore * 0.3) +       // 30% weight for authority
      (contentQualityScore * 0.25) + // 25% weight for content quality
      (ownershipScore * 0.2) +       // 20% weight for ownership transparency
      (citationScore * 0.15) +       // 15% weight for citations
      (biasScore * 0.1)              // 10% weight for bias assessment
    );
    
    return {
      domain,
      url: source.url,
      title: source.title || "Unknown Title",
      overall: totalScore,
      components: [
        { name: "Authority", score: authorityScore, weight: 0.3, 
          description: explainAuthorityScore(domain, authorityScore) },
        { name: "Content Quality", score: contentQualityScore, weight: 0.25, 
          description: explainContentQualityScore(contentQualityScore) },
        { name: "Ownership Transparency", score: ownershipScore, weight: 0.2, 
          description: explainOwnershipScore(domain, ownershipScore) },
        { name: "Citations", score: citationScore, weight: 0.15, 
          description: explainCitationScore(citationScore) },
        { name: "Bias Assessment", score: biasScore, weight: 0.1, 
          description: explainBiasScore(biasScore) }
      ],
      ownershipInfo: getOwnershipInfo(domain, source),
      potentialBiases: identifyPotentialBiases(domain, source)
    };
  });
  
  // Calculate overall trust score across all sources (weighted by authority)
  let totalAuthorityWeight = 0;
  let weightedScoreSum = 0;
  
  sourceScores.forEach(source => {
    const authorityComponent = source.components.find(c => c.name === "Authority");
    const weight = Math.max(0.1, authorityComponent.score / 100); // Minimum weight of 0.1
    totalAuthorityWeight += weight;
    weightedScoreSum += source.overall * weight;
  });
  
  const overallScore = Math.round(weightedScoreSum / Math.max(1, totalAuthorityWeight));
  
  // Generate explanation
  const explanation = generateTrustScoreExplanation(sourceScores, overallScore);
  
  return {
    overall: overallScore,
    sourceDetails: sourceScores,
    explanation,
    sourceCount: sources.length,
    topSources: sourceScores
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 3)
      .map(s => s.domain)
  };
}

/**
 * Calculate authority score based on domain reputation
 */
function calculateAuthorityScore(domain) {
  // Major trusted sources (high authority)
  const highAuthoritySources = [
    { domain: 'reuters.com', score: 95, category: 'News Agency' },
    { domain: 'ap.org', score: 95, category: 'News Agency' },
    { domain: 'bbc.com', score: 90, category: 'Public Broadcaster' },
    { domain: 'bbc.co.uk', score: 90, category: 'Public Broadcaster' },
    { domain: 'npr.org', score: 85, category: 'Public Broadcaster' },
    { domain: 'nytimes.com', score: 85, category: 'Newspaper' },
    { domain: 'washingtonpost.com', score: 85, category: 'Newspaper' },
    { domain: 'theguardian.com', score: 85, category: 'Newspaper' },
    
    // Government sources
    { domain: 'gov', score: 90, category: 'Government', partial: true },
    { domain: 'fed.us', score: 90, category: 'Government', partial: true },
    { domain: 'nasa.gov', score: 95, category: 'Government Agency' },
    { domain: 'nih.gov', score: 95, category: 'Government Agency' },
    { domain: 'cdc.gov', score: 95, category: 'Government Agency' },
    { domain: 'who.int', score: 90, category: 'International Organization' },
    { domain: 'un.org', score: 90, category: 'International Organization' },
    
    // Academic sources
    { domain: 'edu', score: 85, category: 'Academic', partial: true },
    { domain: 'ac.uk', score: 85, category: 'Academic', partial: true },
    { domain: 'harvard.edu', score: 95, category: 'Academic Institution' },
    { domain: 'mit.edu', score: 95, category: 'Academic Institution' },
    { domain: 'stanford.edu', score: 95, category: 'Academic Institution' },
    { domain: 'berkeley.edu', score: 95, category: 'Academic Institution' },
    
    // Scientific publications
    { domain: 'nature.com', score: 95, category: 'Scientific Journal' },
    { domain: 'science.org', score: 95, category: 'Scientific Journal' },
    { domain: 'sciencedirect.com', score: 90, category: 'Scientific Publisher' },
    { domain: 'springer.com', score: 90, category: 'Scientific Publisher' },
    { domain: 'cell.com', score: 90, category: 'Scientific Journal' },
    { domain: 'nejm.org', score: 95, category: 'Medical Journal' },
    { domain: 'jamanetwork.com', score: 90, category: 'Medical Journal' },
    
    // Fact-checking organizations
    { domain: 'factcheck.org', score: 90, category: 'Fact-Checking Organization' },
    { domain: 'politifact.com', score: 85, category: 'Fact-Checking Organization' },
    { domain: 'snopes.com', score: 85, category: 'Fact-Checking Organization' },
    { domain: 'fullfact.org', score: 85, category: 'Fact-Checking Organization' },
    
    // Reference sources
    { domain: 'britannica.com', score: 90, category: 'Encyclopedia' },
    { domain: 'wikipedia.org', score: 75, category: 'Community Encyclopedia' },
    { domain: 'wolframalpha.com', score: 85, category: 'Computational Knowledge Engine' },
    
    // News organizations
    { domain: 'apnews.com', score: 90, category: 'News Agency' },
    { domain: 'bloomberg.com', score: 80, category: 'Financial News' },
    { domain: 'economist.com', score: 85, category: 'News Magazine' },
    { domain: 'ft.com', score: 85, category: 'Financial News' },
    { domain: 'wsj.com', score: 80, category: 'Newspaper' },
    { domain: 'time.com', score: 80, category: 'News Magazine' },
    { domain: 'theatlantic.com', score: 75, category: 'News Magazine' },
    { domain: 'newyorker.com', score: 75, category: 'News Magazine' }
  ];
  
  // Unreliable or questionable sources (low authority)
  const lowAuthoritySources = [
    { domain: 'breitbart.com', score: 35, category: 'Partisan News' },
    { domain: 'infowars.com', score: 15, category: 'Conspiracy' },
    { domain: 'naturalnews.com', score: 20, category: 'Pseudoscience' },
    { domain: 'dailycaller.com', score: 40, category: 'Partisan News' },
    { domain: 'dailykos.com', score: 40, category: 'Partisan Blog' },
    { domain: 'rt.com', score: 30, category: 'State-Controlled Media' },
    { domain: 'sputniknews.com', score: 30, category: 'State-Controlled Media' },
    { domain: 'theonion.com', score: 20, category: 'Satire' },
    { domain: 'clickhole.com', score: 20, category: 'Satire' },
    { domain: 'babylonbee.com', score: 20, category: 'Satire' },
    { domain: 'tumblr.com', score: 30, category: 'Social Media' },
    { domain: 'blogspot.com', score: 30, category: 'Blog Platform' },
    { domain: 'medium.com', score: 50, category: 'Blog Platform' }, // varies widely by author
    { domain: 'wordpress.com', score: 30, category: 'Blog Platform' },
    { domain: 'substack.com', score: 50, category: 'Newsletter Platform' } // varies by author
  ];
  
  // Check for exact and partial matches in high authority sources
  for (const source of highAuthoritySources) {
    if (source.partial && domain.includes(source.domain)) {
      return source.score;
    } else if (!source.partial && domain === source.domain) {
      return source.score;
    }
  }
  
  // Check for exact matches in low authority sources
  for (const source of lowAuthoritySources) {
    if (domain === source.domain) {
      return source.score;
    }
  }
  
  // Default score for unknown domains based on TLD
  if (domain.endsWith('.org')) return 65;
  if (domain.endsWith('.gov')) return 85;
  if (domain.endsWith('.edu')) return 80;
  if (domain.endsWith('.mil')) return 80;
  if (domain.endsWith('.int')) return 75;
  if (domain.endsWith('.museum')) return 70;
  if (domain.endsWith('.co.uk')) return 65;
  if (domain.endsWith('.com')) return 60;
  if (domain.endsWith('.net')) return 60;
  if (domain.endsWith('.info')) return 50;
  if (domain.endsWith('.biz')) return 45;
  if (domain.endsWith('.io')) return 55;
  
  // If no specific rules match, provide a default score
  return 50; // Neutral default score
}

/**
 * Analyze content quality based on multiple factors
 */
function calculateContentQualityScore(source) {
  if (!source || !source.content) return 40; // Default score for unknown content
  
  const metrics = {
    // Length metrics
    textLength: source.content.length || 0,
    wordCount: (source.content.split(/\s+/) || []).length,
    sentenceCount: (source.content.match(/[.!?]+/g) || []).length,
    
    // Structure metrics
    paragraphCount: (source.content.match(/\n\s*\n/g) || []).length + 1,
    headingCount: (source.content.match(/[#]{1,6}\s+.+/g) || []).length,
    
    // Content quality signals
    citationCount: countCitations(source.content),
    containsNumbers: /\d+(?:\.\d+)?%?/.test(source.content),
    containsDates: /(?:19|20)\d{2}[-/]\d{1,2}[-/]\d{1,2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2},? \d{4}/i.test(source.content),
    
    // Negative signals
    errorPatterns: checkErrorPatterns(source.content),
    clickbait: checkClickbaitPatterns(source.content),
    
    // Sentiment analysis (simplified)
    sentiment: analyzeSentiment(source.content)
  };
  
  // Calculate scores for different aspects
  const lengthScore = Math.min(100, (metrics.textLength / 1000) * 50) + 
                     Math.min(50, (metrics.wordCount / 500) * 50);
  
  const structureScore = Math.min(100, (metrics.paragraphCount / 5) * 40 + 
                                   (metrics.sentenceCount / metrics.paragraphCount) * 30 +
                                   (metrics.headingCount / 3) * 30);
  
  const qualitySignalsScore = (metrics.citationCount * 15) +
                             (metrics.containsNumbers ? 20 : 0) +
                             (metrics.containsDates ? 20 : 0);
  
  // Negative signal penalties
  const errorPenalty = metrics.errorPatterns * 20;
  const clickbaitPenalty = metrics.clickbait * 15;
  
  // Calculate sentiment bias penalty (0-30)
  const sentimentBiasPenalty = Math.abs(metrics.sentiment) * 30; 
  
  // Calculate final score (0-100)
  let finalScore = ((lengthScore * 0.3) + 
                   (structureScore * 0.3) + 
                   (Math.min(100, qualitySignalsScore) * 0.4)) / 3;
  
  // Apply penalties
  finalScore = Math.max(0, finalScore - errorPenalty - clickbaitPenalty - sentimentBiasPenalty);
  
  return Math.round(finalScore);
}

/**
 * Analyze ownership transparency and information 
 */
function analyzeOwnershipTransparency(source) {
  // Default score for unknown sources
  let transparencyScore = 50;
  
  // Check if ownership information is available
  if (source.ownershipData) {
    transparencyScore += 25;
    
    // Add points for comprehensiveness of ownership data
    if (source.ownershipData.owner) transparencyScore += 5;
    if (source.ownershipData.parentCompany) transparencyScore += 5;
    if (source.ownershipData.founded) transparencyScore += 5;
    if (source.ownershipData.headquarters) transparencyScore += 5;
    if (source.ownershipData.fundingSources) transparencyScore += 5;
  }
  
  // Extract domain for further analysis
  const domain = extractDomain(source.url);
  
  // Transparency bonus for specific domain types
  if (domain.endsWith('.gov')) transparencyScore += 15;
  if (domain.endsWith('.edu')) transparencyScore += 10;
  if (domain.endsWith('.org')) transparencyScore += 5;
  
  // Cap at 100 maximum
  return Math.min(100, transparencyScore);
}

/**
 * Analyze citations and references in the content
 */
function analyzeCitations(source) {
  if (!source || !source.content) return 30; // Default score
  
  const content = source.content;
  
  // Count citation patterns
  const citationPatterns = [
    /\[\d+\]/g,                              // [1], [23]
    /\((?:[A-Za-z]+,\s+\d{4}(?:, p\. \d+)?)\)/g, // (Smith, 2020) or (Smith, 2020, p. 23)
    /"[^"]*"(?:\s+|&nbsp;)\((?:\d{4})\)/g,    // "quote" (2020)
    /(?:https?:\/\/[^\s]+)/g,                // URLs
    /(?:et al\.,? \d{4})/g,                  // et al., 2020
    /\b(?:according to|cited by|source:|reference:|source: [A-Z])/gi // Attribution phrases
  ];
  
  let totalCitations = 0;
  citationPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      totalCitations += matches.length;
    }
  });
  
  // Calculate base score from citation count
  let score = Math.min(80, totalCitations * 10);
  
  // Bonus for citing authoritative sources
  const authorityCitations = [
    /\b(?:study|research|survey|analysis|report|data)\b/gi,
    /\b(?:university|institute|journal|professor|scientist|expert|official)\b/gi,
    /\b(?:according to [A-Z][a-z]+ [A-Z][a-z]+)\b/g // "According to John Smith"
  ];
  
  let authorityMatches = 0;
  authorityCitations.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      authorityMatches += matches.length;
    }
  });
  
  // Add authority bonus (up to 20 points)
  score += Math.min(20, authorityMatches * 5);
  
  // Cap at 100
  return Math.min(100, Math.max(10, score));
}

/**
 * Assess potential bias in content
 */
function assessBias(source) {
  if (!source || !source.content) return 40; // Default score
  
  const content = source.content.toLowerCase();
  
  // Emotional language patterns
  const emotionalPatterns = [
    /\b(?:outrageous|shocking|horrif(?:ic|ying)|stunning|amazing|incredible|terrible|awful)\b/g,
    /\b(?:slam(?:s|med)?|blast(?:s|ed)?|destroys|wrecks|crushes|demolishes|obliterates)\b/g,
    /\b(?:wonderful|beautiful|perfect|fantastic|extraordinary|magnificent)\b/g
  ];
  
  // Political bias indicators
  const leftBiasPatterns = [
    /\b(?:progressive|liberal|left-wing|socialist|marxist)\b/g,
    /\b(?:social justice|systemic|equity|privilege|marginalized)\b/g
  ];
  
  const rightBiasPatterns = [
    /\b(?:conservative|right-wing|patriot|nationalist|traditional values)\b/g,
    /\b(?:free market|deregulation|small government|freedom|liberty)\b/g
  ];
  
  // Count matches
  let emotionalCount = 0;
  emotionalPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) emotionalCount += matches.length;
  });
  
  let leftBiasCount = 0;
  leftBiasPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) leftBiasCount += matches.length;
  });
  
  let rightBiasCount = 0;
  rightBiasPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) rightBiasCount += matches.length;
  });
  
  // Calculate word count for normalization
  const wordCount = content.split(/\s+/).length;
  
  // Normalize counts by text length (per 1000 words)
  const normalizedEmotionalCount = (emotionalCount / wordCount) * 1000;
  const normalizedPoliticalBias = Math.abs((leftBiasCount - rightBiasCount) / wordCount) * 1000;
  
  // Calculate penalties
  const emotionalPenalty = Math.min(40, normalizedEmotionalCount * 2);
  const politicalPenalty = Math.min(40, normalizedPoliticalBias * 3);
  
  // Start with perfect score and apply penalties
  const biasScore = 100 - emotionalPenalty - politicalPenalty;
  
  return Math.max(10, Math.round(biasScore));
}

/**
 * Count citations in content
 */
function countCitations(content) {
  if (!content) return 0;
  
  // Count various citation formats
  const patterns = [
    /\[\d+\]/g,                                  // [1]
    /\((?:[A-Za-z]+,\s+\d{4})\)/g,               // (Smith, 2020)
    /(?:https?:\/\/[^\s]+)/g,                    // URLs
    /(?:et al\.,? \d{4})/g,                      // et al., 2020
    /\b(?:according to|cited by|source:|reference:)/gi // Attribution phrases
  ];
  
  let count = 0;
  patterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) count += matches.length;
  });
  
  return count;
}

/**
 * Check for error patterns in content
 */
function checkErrorPatterns(content) {
  if (!content) return 3; // Default for unknown content
  
  const errorPatterns = [
    'access denied', 'forbidden', 'not found', 
    'robot', 'captcha', 'javascript required', 
    'cookies disabled', 'error', '403', '404'
  ];
  
  let errorCount = 0;
  errorPatterns.forEach(pattern => {
    if (content.toLowerCase().includes(pattern)) {
      errorCount++;
    }
  });
  
  return Math.min(5, errorCount);
}

/**
 * Check for clickbait patterns in content
 */
function checkClickbaitPatterns(content) {
  if (!content) return 2; // Default for unknown content
  
  const clickbaitPatterns = [
    /\b(?:you won't believe|mind-blowing|changed forever|shocking truth)\b/i,
    /\b(?:this one weird|one simple|secret trick|doctors hate)\b/i,
    /\b(?:\d+ (?:things|reasons|ways|tips|facts) (?:about|to|that))\b/i,
    /\b(?:(?:what|when) (?:happens|happened) next|you'll never guess)\b/i
  ];
  
  let clickbaitCount = 0;
  clickbaitPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      clickbaitCount++;
    }
  });
  
  return Math.min(5, clickbaitCount);
}

/**
 * Simple sentiment analysis
 * Returns value between -1 (very negative) and 1 (very positive)
 */
function analyzeSentiment(content) {
  if (!content) return 0;
  
  const positiveWords = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
    'outstanding', 'positive', 'beneficial', 'successful', 'effective',
    'impressive', 'remarkable', 'valuable', 'exceptional', 'favorable'
  ];
  
  const negativeWords = [
    'bad', 'poor', 'terrible', 'awful', 'horrible', 'dreadful',
    'negative', 'unsuccessful', 'ineffective', 'disappointing',
    'inadequate', 'harmful', 'detrimental', 'problematic', 'catastrophic'
  ];
  
  // Count matches
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    const regex = new RegExp('\\b' + word + '\\b', 'gi');
    const matches = content.match(regex);
    if (matches) positiveCount += matches.length;
  });
  
  negativeWords.forEach(word => {
    const regex = new RegExp('\\b' + word + '\\b', 'gi');
    const matches = content.match(regex);
    if (matches) negativeCount += matches.length;
  });
  
  // Calculate word count for normalization
  const wordCount = content.split(/\s+/).length;
  
  // Calculate sentiment score (-1 to 1)
  if (wordCount === 0) return 0;
  
  return (positiveCount - negativeCount) / (positiveCount + negativeCount + 10);
}

/**
 * Extracts domain name from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return url.split('/')[2] || 'unknown';
  }
}

/**
 * Get ownership information for a domain
 */
function getOwnershipInfo(domain, source) {
  // Known ownership data for major domains
  const knownOwnerships = {
    // News organizations
    'nytimes.com': {
      owner: 'The New York Times Company',
      type: 'Public company (NYSE: NYT)',
      founded: '1851',
      headquarters: 'New York, NY, USA',
      ownership: 'Publicly traded, Sulzberger family remains principal owner',
      notable: 'One of the oldest and most respected news organizations'
    },
    'washingtonpost.com': {
      owner: 'Nash Holdings LLC (Jeff Bezos)',
      type: 'Private company',
      founded: '1877',
      headquarters: 'Washington, D.C., USA',
      ownership: 'Owned by Jeff Bezos, founder of Amazon, since 2013',
      notable: 'Previously owned by the Graham family for 80 years'
    },
    'wsj.com': {
      owner: 'News Corp',
      type: 'Public company subsidiary',
      founded: '1889',
      headquarters: 'New York, NY, USA',
      ownership: 'Controlled by Rupert Murdoch and family',
      notable: 'Business-focused newspaper with conservative editorial stance'
    },
    'theguardian.com': {
      owner: 'Guardian Media Group',
      type: 'Private company, owned by Scott Trust Limited',
      founded: '1821',
      headquarters: 'London, UK',
      ownership: 'The Scott Trust was created to ensure editorial independence',
      notable: 'The trust structure was designed to maintain independence and liberal editorial stance'
    },
    'reuters.com': {
      owner: 'Thomson Reuters Corporation',
      type: 'Public company (NYSE: TRI)',
      founded: '1851',
      headquarters: 'Toronto, Canada',
      ownership: 'Publicly traded, Thomson family is principal shareholder',
      notable: 'One of the largest international news agencies'
    },
    'apnews.com': {
      owner: 'Associated Press',
      type: 'Non-profit cooperative',
      founded: '1846',
      headquarters: 'New York, NY, USA',
      ownership: 'Owned by its contributing newspapers and broadcasters',
      notable: 'Operates as a cooperative without corporate ownership'
    },
    'cnn.com': {
      owner: 'Warner Bros. Discovery',
      type: 'Public company subsidiary (NASDAQ: WBD)',
      founded: '1980',
      headquarters: 'Atlanta, GA, USA',
      ownership: 'Publicly traded media conglomerate',
      notable: 'Founded by Ted Turner, acquired by Time Warner in 1996'
    },
    'foxnews.com': {
      owner: 'Fox Corporation',
      type: 'Public company (NASDAQ: FOXA)',
      founded: '1996',
      headquarters: 'New York, NY, USA',
      ownership: 'Murdoch family maintains substantial voting power',
      notable: 'Known for conservative editorial stance'
    },
    'bbc.com': {
      owner: 'British Broadcasting Corporation',
      type: 'Public service broadcaster',
      founded: '1922',
      headquarters: 'London, UK',
      ownership: 'Public corporation established by Royal Charter',
      notable: 'Funded primarily through UK television license fees'
    },
    'msnbc.com': {
      owner: 'NBCUniversal (Comcast)',
      type: 'Public company subsidiary',
      founded: '1996',
      headquarters: 'New York, NY, USA',
      ownership: 'Comcast is the parent company',
      notable: 'Known for liberal editorial stance'
    },
    
    // Government sources
    'whitehouse.gov': {
      owner: 'United States Federal Government',
      type: 'Government website',
      founded: 'N/A',
      headquarters: 'Washington, D.C., USA',
      ownership: 'Executive Office of the President',
      notable: 'Official website of the White House'
    },
    'cdc.gov': {
      owner: 'United States Federal Government',
      type: 'Government agency website',
      founded: '1946',
      headquarters: 'Atlanta, GA, USA',
      ownership: 'Department of Health and Human Services',
      notable: 'Principal agency for protecting public health'
    },
    'nih.gov': {
      owner: 'United States Federal Government',
      type: 'Government agency website',
      founded: '1887',
      headquarters: 'Bethesda, MD, USA',
      ownership: 'Department of Health and Human Services',
      notable: 'Primary agency for biomedical and public health research'
    },
    
    // Technology companies
    'wikipedia.org': {
      owner: 'Wikimedia Foundation',
      type: 'Non-profit organization',
      founded: '2001',
      headquarters: 'San Francisco, CA, USA',
      ownership: 'Non-profit, user-contributed content',
      notable: 'Community-edited encyclopedia with no corporate ownership'
    },
    'facebook.com': {
      owner: 'Meta Platforms, Inc.',
      type: 'Public company (NASDAQ: META)',
      founded: '2004',
      headquarters: 'Menlo Park, CA, USA',
      ownership: 'Publicly traded, Mark Zuckerberg maintains controlling interest',
      notable: 'Mark Zuckerberg holds majority voting control'
    },
    'twitter.com': {
      owner: 'X Corp. (Elon Musk)',
      type: 'Private company',
      founded: '2006',
      headquarters: 'San Francisco, CA, USA',
      ownership: 'Privately owned by Elon Musk since 2022',
      notable: 'Previously publicly traded, taken private in 2022'
    }
  };
  
  // Check if we have known information
  for (const [knownDomain, info] of Object.entries(knownOwnerships)) {
    if (domain === knownDomain || domain.endsWith('.' + knownDomain)) {
      return info;
    }
  }
  
  // Try to extract ownership info from source data if available
  if (source.structured && source.structured.jsonLd) {
    const jsonLd = source.structured.jsonLd;
    
    // Look for publisher or creator info
    const publisher = jsonLd.publisher || jsonLd.creator || jsonLd.author;
    if (publisher) {
      return {
        owner: typeof publisher === 'string' ? publisher : publisher.name,
        type: 'Unknown',
        founded: 'Unknown',
        headquarters: 'Unknown',
        ownership: 'Information extracted from page metadata',
        notable: ''
      };
    }
  }
  
  // Default unknown ownership
  return {
    owner: 'Unknown',
    type: 'Unknown',
    founded: 'Unknown',
    headquarters: 'Unknown',
    ownership: 'No ownership information available',
    notable: ''
  };
}

/**
 * Identify potential biases based on domain and content
 */
function identifyPotentialBiases(domain, source) {
  // Known bias data for major domains
  const knownBiases = {
    'foxnews.com': {
      politicalLeaning: 'Right/Conservative',
      biasLevel: 'Strong',
      ownershipBias: 'Owned by Fox Corporation (Murdoch family)',
      contentTrends: 'Generally favors Republican/conservative viewpoints'
    },
    'breitbart.com': {
      politicalLeaning: 'Far-Right',
      biasLevel: 'Strong',
      ownershipBias: 'Founded by conservative commentator Andrew Breitbart',
      contentTrends: 'Strongly favors populist right-wing viewpoints'
    },
    'msnbc.com': {
      politicalLeaning: 'Left/Progressive',
      biasLevel: 'Moderate to Strong',
      ownershipBias: 'Owned by NBCUniversal (Comcast)',
      contentTrends: 'Generally favors Democratic/progressive viewpoints'
    },
    'huffpost.com': {
      politicalLeaning: 'Left/Progressive',
      biasLevel: 'Moderate',
      ownershipBias: 'Owned by BuzzFeed Inc.',
      contentTrends: 'Generally favors progressive viewpoints'
    },
    'wsj.com': {
      politicalLeaning: 'Center-Right (News), Right (Opinion)',
      biasLevel: 'Mild to Moderate',
      ownershipBias: 'Owned by News Corp (Murdoch family)',
      contentTrends: 'News reporting relatively neutral, editorial page conservative'
    },
    'nytimes.com': {
      politicalLeaning: 'Center-Left',
      biasLevel: 'Mild to Moderate',
      ownershipBias: 'Publicly traded, Sulzberger family maintains control',
      contentTrends: 'Generally favors liberal/progressive viewpoints'
    },
    'reuters.com': {
      politicalLeaning: 'Center',
      biasLevel: 'Low',
      ownershipBias: 'Publicly traded news agency',
      contentTrends: 'Focuses on factual reporting with minimal bias'
    },
    'apnews.com': {
      politicalLeaning: 'Center',
      biasLevel: 'Low',
      ownershipBias: 'Cooperative owned by member newspapers and broadcasters',
      contentTrends: 'Focuses on factual reporting with minimal bias'
    }
  };
  
  // Check if we have known bias information
  for (const [knownDomain, info] of Object.entries(knownBiases)) {
    if (domain === knownDomain || domain.endsWith('.' + knownDomain)) {
      return info;
    }
  }
  
  // Default for unknown domains - analyze the content
  if (source.content) {
    const content = source.content.toLowerCase();
    
    // Political bias indicators
    const leftBiasPatterns = [
      /\b(?:progressive|liberal|left-wing|democrat|leftist)\b/g,
      /\b(?:social justice|systemic|equity|privilege|marginalized)\b/g
    ];
    
    const rightBiasPatterns = [
      /\b(?:conservative|right-wing|republican|patriot|nationalist)\b/g,
      /\b(?:free market|deregulation|small government|freedom|liberty)\b/g
    ];
    
    // Count matches
    let leftBiasCount = 0;
    leftBiasPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) leftBiasCount += matches.length;
    });
    
    let rightBiasCount = 0;
    rightBiasPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) rightBiasCount += matches.length;
    });
    
    // Determine leaning based on keyword counts
    let politicalLeaning = 'Center/Unknown';
    let biasLevel = 'Unknown';
    
    if (leftBiasCount > rightBiasCount) {
      const ratio = leftBiasCount / (rightBiasCount + 1);
      if (ratio > 3) {
        politicalLeaning = 'Left/Progressive';
        biasLevel = 'Moderate to Strong';
      } else {
        politicalLeaning = 'Center-Left';
        biasLevel = 'Mild';
      }
    } else if (rightBiasCount > leftBiasCount) {
      const ratio = rightBiasCount / (leftBiasCount + 1);
      if (ratio > 3) {
        politicalLeaning = 'Right/Conservative';
        biasLevel = 'Moderate to Strong';
      } else {
        politicalLeaning = 'Center-Right';
        biasLevel = 'Mild';
      }
    } else {
      politicalLeaning = 'Balanced/Center';
      biasLevel = 'Low';
    }
    
    return {
      politicalLeaning,
      biasLevel,
      ownershipBias: 'Unknown - automated analysis based on content',
      contentTrends: 'Based on keyword analysis of available content'
    };
  }
  
  // Minimal analysis if no content
  return {
    politicalLeaning: 'Unknown',
    biasLevel: 'Unknown',
    ownershipBias: 'No ownership information available',
    contentTrends: 'Insufficient data for analysis'
  };
}

/**
 * Generate detailed explanation for trust score
 */
function explainAuthorityScore(domain, score) {
  if (score >= 90) {
    return `${domain} is a highly authoritative source, typically a government agency, academic institution, or major established news organization with rigorous fact-checking processes.`;
  } else if (score >= 75) {
    return `${domain} is a reliable source with good reputation, typically an established news organization, well-regarded publication, or authoritative reference.`;
  } else if (score >= 60) {
    return `${domain} is a generally reliable source, though may occasionally contain bias or require verification of claims.`;
  } else if (score >= 45) {
    return `${domain} has mixed reliability, requiring additional verification of claims and awareness of potential biases.`;
  } else if (score >= 30) {
    return `${domain} has significant reliability concerns, often containing bias or unverified information.`;
  } else {
    return `${domain} has serious reliability issues, often publishing misleading, biased, or false information.`;
  }
}

/**
 * Generate detailed explanation for content quality score
 */
function explainContentQualityScore(score) {
  if (score >= 90) {
    return `Exceptional content quality with comprehensive information, structured presentation, and proper citations.`;
  } else if (score >= 75) {
    return `High quality content with good depth, structure, and supporting evidence.`;
  } else if (score >= 60) {
    return `Above average content quality with reasonable depth and some supporting evidence.`;
  } else if (score >= 45) {
    return `Average content quality with basic information but limited depth or supporting evidence.`;
  } else if (score >= 30) {
    return `Below average content quality with gaps in information and minimal supporting evidence.`;
  } else {
    return `Poor content quality with significant issues in structure, depth, or accuracy.`;
  }
}

/**
 * Generate detailed explanation for ownership transparency score
 */
function explainOwnershipScore(domain, score) {
  if (score >= 90) {
    return `${domain} has exceptional transparency about ownership and funding sources.`;
  } else if (score >= 75) {
    return `${domain} provides clear information about ownership and organizational structure.`;
  } else if (score >= 60) {
    return `${domain} offers basic information about ownership but may lack complete details.`;
  } else if (score >= 45) {
    return `${domain} has limited transparency about ownership and funding.`;
  } else if (score >= 30) {
    return `${domain} provides minimal information about who owns or controls the source.`;
  } else {
    return `${domain} lacks transparency about ownership, raising questions about potential conflicts of interest.`;
  }
}

/**
 * Generate detailed explanation for citation score
 */
function explainCitationScore(score) {
  if (score >= 90) {
    return `Content is exceptionally well-cited with numerous references to authoritative sources.`;
  } else if (score >= 75) {
    return `Content includes robust citations that substantiate key claims.`;
  } else if (score >= 60) {
    return `Content provides adequate citations for most significant claims.`;
  } else if (score >= 45) {
    return `Content includes some citations but lacks references for several claims.`;
  } else if (score >= 30) {
    return `Content has minimal citations, with most claims lacking proper sourcing.`;
  } else {
    return `Content lacks citations or supporting evidence for most or all claims.`;
  }
}

/**
 * Generate detailed explanation for bias assessment score
 */
function explainBiasScore(score) {
  if (score >= 90) {
    return `Content shows minimal bias, presenting information in a balanced, neutral manner.`;
  } else if (score >= 75) {
    return `Content shows slight bias but generally maintains fairness in presentation.`;
  } else if (score >= 60) {
    return `Content has noticeable bias but attempts to acknowledge multiple perspectives.`;
  } else if (score >= 45) {
    return `Content shows significant bias that affects how information is presented.`;
  } else if (score >= 30) {
    return `Content is highly biased, primarily presenting one perspective while minimizing others.`;
  } else {
    return `Content exhibits extreme bias, potentially misleading readers through selective presentation.`;
  }
}

/**
 * Generate a comprehensive explanation of the trust score
 */
function generateTrustScoreExplanation(sourceScores, overallScore) {
  // Get source count and quality levels
  const highQualitySources = sourceScores.filter(s => s.overall >= 75).length;
  const mediumQualitySources = sourceScores.filter(s => s.overall >= 50 && s.overall < 75).length;
  const lowQualitySources = sourceScores.filter(s => s.overall < 50).length;
  
  // Get top 3 sources by authority
  const topSources = sourceScores
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 3)
    .map(s => s.domain);
  
  // Determine factors that most affected the score
  const factors = {
    authority: sourceScores.reduce((sum, s) => 
      sum + s.components.find(c => c.name === "Authority").score, 0) / sourceScores.length,
    quality: sourceScores.reduce((sum, s) => 
      sum + s.components.find(c => c.name === "Content Quality").score, 0) / sourceScores.length,
    ownership: sourceScores.reduce((sum, s) => 
      sum + s.components.find(c => c.name === "Ownership Transparency").score, 0) / sourceScores.length,
    citations: sourceScores.reduce((sum, s) => 
      sum + s.components.find(c => c.name === "Citations").score, 0) / sourceScores.length,
    bias: sourceScores.reduce((sum, s) => 
      sum + s.components.find(c => c.name === "Bias Assessment").score, 0) / sourceScores.length
  };
  
  // Sort factors by score
  const sortedFactors = Object.entries(factors)
    .sort((a, b) => b[1] - a[1])
    .map(f => ({ name: f[0], score: f[1] }));
  
  // Generate explanation based on overall score
  let trustLevel, mainExplanation;
  
  if (overallScore >= 85) {
    trustLevel = "Very High";
    mainExplanation = "This information is extremely reliable and comes from highly credible sources with strong reputation for accuracy.";
  } else if (overallScore >= 70) {
    trustLevel = "High";
    mainExplanation = "This information is reliable and comes from generally trustworthy sources, though minor aspects may benefit from additional verification.";
  } else if (overallScore >= 55) {
    trustLevel = "Moderate";
    mainExplanation = "This information comes from sources of mixed reliability. Key claims should be verified through additional sources.";
  } else if (overallScore >= 40) {
    trustLevel = "Low";
    mainExplanation = "This information comes from sources with significant reliability concerns. Claims should be treated with skepticism and verified through more reliable sources.";
  } else {
    trustLevel = "Very Low";
    mainExplanation = "This information comes from sources that lack credibility or have serious reliability issues. Claims should not be trusted without substantial verification from reliable sources.";
  }
  
  // Assemble the complete explanation
  return {
    trustLevel,
    summary: mainExplanation,
    sourceBreakdown: `Based on analysis of ${sourceScores.length} sources: ${highQualitySources} high-quality, ${mediumQualitySources} medium-quality, and ${lowQualitySources} low-quality sources.`,
    topSources: `Top sources include: ${topSources.join(', ')}`,
    strongestFactors: `Strongest factors: ${sortedFactors[0].name} (${Math.round(sortedFactors[0].score)}/100) and ${sortedFactors[1].name} (${Math.round(sortedFactors[1].score)}/100)`,
    weakestFactors: `Areas of concern: ${sortedFactors[sortedFactors.length-1].name} (${Math.round(sortedFactors[sortedFactors.length-1].score)}/100) and ${sortedFactors[sortedFactors.length-2].name} (${Math.round(sortedFactors[sortedFactors.length-2].score)}/100)`,
    recommendations: overallScore < 60 ? "Recommendation: Verify this information with additional authoritative sources before sharing or relying on it." : "Recommendation: This information appears reliable based on source analysis."
  };
}

// Export main functions
export default {
  calculateTrustScore,
  getOwnershipInfo,
  identifyPotentialBiases
};