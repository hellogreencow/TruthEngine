/**
 * Trust Score Popup Script
 * Handles the trust score popup functionality, source analysis display,
 * and detailed breakdowns of trust scoring components
 */

document.addEventListener('DOMContentLoaded', () => {
  // Add the required HTML for the popup to the document
  createTrustScorePopupElements();
  
  // Find all trust score indicators and add click listeners
  document.addEventListener('click', (e) => {
    const trustScoreElement = e.target.closest('.trust-score-value, .trust-indicator');
    if (trustScoreElement) {
      e.preventDefault();
      showTrustScoreDetails(trustScoreElement);
    }
  });
  
  // Close popup when clicking the close button or overlay
  document.getElementById('trust-popup-close').addEventListener('click', closeTrustScorePopup);
  document.getElementById('trust-popup-overlay').addEventListener('click', closeTrustScorePopup);
  
  // Close popup when pressing Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTrustScorePopup();
    }
  });
});

/**
 * Create the HTML elements needed for the trust score popup
 */
function createTrustScorePopupElements() {
  // Create the overlay
  const overlay = document.createElement('div');
  overlay.id = 'trust-popup-overlay';
  overlay.className = 'trust-popup-overlay';
  
  // Create the popup container
  const popup = document.createElement('div');
  popup.id = 'trust-score-popup';
  popup.className = 'trust-score-popup';
  
  // Create popup content
  popup.innerHTML = `
    <div class="trust-popup-header">
      <h2><span class="trust-icon">🔍</span> Trust Score Analysis</h2>
      <button id="trust-popup-close" class="trust-popup-close">×</button>
    </div>
    <div class="trust-popup-content">
      <div id="trust-popup-loader" style="text-align: center; padding: 40px;">
        <div class="spinner"></div>
        <p>Analyzing source credibility...</p>
      </div>
      <div id="trust-score-details" style="display: none;"></div>
    </div>
  `;
  
  // Add elements to the body
  document.body.appendChild(overlay);
  document.body.appendChild(popup);
  
  // Add link to the stylesheet if not already present
  if (!document.querySelector('link[href="trust-score-popup.css"]')) {
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = 'trust-score-popup.css';
    document.head.appendChild(linkElement);
  }
}

/**
 * Show the trust score details popup
 * @param {HTMLElement} element - The clicked trust score element
 */
async function showTrustScoreDetails(element) {
  const trustScorePopup = document.getElementById('trust-score-popup');
  const overlay = document.getElementById('trust-popup-overlay');
  const loader = document.getElementById('trust-popup-loader');
  const detailsContainer = document.getElementById('trust-score-details');
  
  // Show the popup and overlay
  trustScorePopup.classList.add('visible');
  overlay.classList.add('visible');
  loader.style.display = 'block';
  detailsContainer.style.display = 'none';
  
  try {
    // Get claim ID from the element or its parent
    let claimId = element.dataset.claimId;
    
    // If not directly on element, check parents
    if (!claimId) {
      const parentItem = element.closest('[data-claim-id]');
      if (parentItem) claimId = parentItem.dataset.claimId;
    }
    
    // If still no claim ID, try to get the score directly
    let trustScore;
    if (!claimId) {
      const scoreText = element.textContent.match(/(\d+)\/100/);
      trustScore = scoreText ? parseInt(scoreText[1], 10) : null;
    }
    
    if (claimId || trustScore !== null) {
      // Fetch the detailed analysis from the API
      const analysis = await fetchTrustScoreAnalysis(claimId, trustScore);
      renderTrustScoreDetails(analysis, detailsContainer);
    } else {
      throw new Error('Could not determine which claim to analyze');
    }
  } catch (error) {
    detailsContainer.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #721c24; background-color: #f8d7da; border-radius: 8px;">
        <h3>Error Loading Trust Score Details</h3>
        <p>${error.message || 'An unexpected error occurred while loading trust score details.'}</p>
      </div>
    `;
  } finally {
    // Hide loader and show details
    loader.style.display = 'none';
    detailsContainer.style.display = 'block';
  }
}

/**
 * Close the trust score popup
 */
function closeTrustScorePopup() {
  const trustScorePopup = document.getElementById('trust-score-popup');
  const overlay = document.getElementById('trust-popup-overlay');
  
  trustScorePopup.classList.remove('visible');
  overlay.classList.remove('visible');
}

/**
 * Fetch trust score analysis from the API
 * @param {string} claimId - The ID of the claim to analyze
 * @param {number} fallbackScore - Fallback score if no claim ID is available
 * @returns {Promise<Object>} The trust score analysis
 */
async function fetchTrustScoreAnalysis(claimId, fallbackScore) {
  try {
    // If we have a claim ID, fetch the data from the API
    if (claimId) {
      const response = await fetch(`/api/trust-analysis/${claimId}`);
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } 
    // Otherwise, generate a demo analysis with the fallback score
    else {
      return generateDemoAnalysis(fallbackScore);
    }
  } catch (error) {
    console.error('Error fetching trust score analysis:', error);
    
    // If the API fails, generate a demo analysis
    return generateDemoAnalysis(fallbackScore);
  }
}

/**
 * Generate a demo trust score analysis for display purposes
 * This is used when the API is not available
 * @param {number} trustScore - The overall trust score
 * @returns {Object} A demo trust score analysis
 */
function generateDemoAnalysis(trustScore = 70) {
  // Default to 70 if no score provided
  trustScore = trustScore || 70;
  
  // Generate trust level based on score
  let trustLevel;
  if (trustScore >= 85) trustLevel = "Very High";
  else if (trustScore >= 70) trustLevel = "High";
  else if (trustScore >= 55) trustLevel = "Moderate";
  else if (trustScore >= 40) trustLevel = "Low";
  else trustLevel = "Very Low";
  
  // Create explanation based on trust level
  let explanation;
  switch (trustLevel) {
    case "Very High":
      explanation = "This information is extremely reliable and comes from highly credible sources with strong reputation for accuracy.";
      break;
    case "High":
      explanation = "This information is reliable and comes from generally trustworthy sources, though minor aspects may benefit from additional verification.";
      break;
    case "Moderate":
      explanation = "This information comes from sources of mixed reliability. Key claims should be verified through additional sources.";
      break;
    case "Low":
      explanation = "This information comes from sources with significant reliability concerns. Claims should be treated with skepticism and verified through more reliable sources.";
      break;
    default:
      explanation = "This information comes from sources that lack credibility or have serious reliability issues. Claims should not be trusted without substantial verification.";
  }
  
  // Create a realistic demo analysis
  return {
    overall: trustScore,
    trustLevel,
    explanation,
    sourceDetails: [
      {
        domain: 'wikipedia.org',
        url: 'https://en.wikipedia.org/wiki/Example',
        title: 'Example page on Wikipedia',
        overall: Math.min(95, trustScore + 15),
        components: [
          { 
            name: "Authority", 
            score: 85, 
            weight: 0.3,
            description: "Wikipedia is generally a reliable source, though individual articles may vary in quality depending on editor contributions and citations."
          },
          { 
            name: "Content Quality", 
            score: 80, 
            weight: 0.25,
            description: "Content is generally well-structured with citations, though depth varies by article."
          },
          { 
            name: "Ownership Transparency", 
            score: 95, 
            weight: 0.2,
            description: "Wikipedia has exceptional transparency as a non-profit organization operated by the Wikimedia Foundation."
          },
          { 
            name: "Citations", 
            score: 85, 
            weight: 0.15,
            description: "Wikipedia articles typically include numerous citations to verify claims."
          },
          { 
            name: "Bias Assessment", 
            score: 75, 
            weight: 0.1,
            description: "Most articles strive for a neutral point of view, though some topics may show subtle bias."
          }
        ],
        ownershipInfo: {
          owner: "Wikimedia Foundation",
          type: "Non-profit organization",
          founded: "2001",
          headquarters: "San Francisco, CA, USA",
          ownership: "Non-profit, user-contributed content",
          notable: "Community-edited encyclopedia with no corporate ownership"
        },
        potentialBiases: {
          politicalLeaning: "Balanced/Center",
          biasLevel: "Low",
          ownershipBias: "Non-profit foundation without commercial interests",
          contentTrends: "Neutral point of view policy, though individual articles may vary"
        }
      },
      {
        domain: 'nytimes.com',
        url: 'https://www.nytimes.com/example',
        title: 'Example article in The New York Times',
        overall: Math.max(40, trustScore - 5),
        components: [
          { 
            name: "Authority", 
            score: 90, 
            weight: 0.3,
            description: "The New York Times is a well-established news organization with rigorous editorial standards."
          },
          { 
            name: "Content Quality", 
            score: 85, 
            weight: 0.25,
            description: "Articles typically feature high-quality reporting with factual information and context."
          },
          { 
            name: "Ownership Transparency", 
            score: 80, 
            weight: 0.2,
            description: "The New York Times Company is publicly traded with transparent ownership structure."
          },
          { 
            name: "Citations", 
            score: 75, 
            weight: 0.15,
            description: "Articles generally cite sources, though not always with direct links or detailed attribution."
          },
          { 
            name: "Bias Assessment", 
            score: 65, 
            weight: 0.1,
            description: "Reports facts accurately but editorial stance tends to lean center-left."
          }
        ],
        ownershipInfo: {
          owner: "The New York Times Company",
          type: "Public company (NYSE: NYT)",
          founded: "1851",
          headquarters: "New York, NY, USA",
          ownership: "Publicly traded, Sulzberger family remains principal owner",
          notable: "One of the oldest and most respected news organizations"
        },
        potentialBiases: {
          politicalLeaning: "Center-Left",
          biasLevel: "Mild to Moderate",
          ownershipBias: "Publicly traded, Sulzberger family maintains control",
          contentTrends: "Generally favors liberal/progressive viewpoints in opinion section"
        }
      },
      {
        domain: 'reuters.com',
        url: 'https://www.reuters.com/example',
        title: 'Example article from Reuters',
        overall: Math.min(90, trustScore + 10),
        components: [
          { 
            name: "Authority", 
            score: 95, 
            weight: 0.3,
            description: "Reuters is a globally trusted news agency known for factual reporting."
          },
          { 
            name: "Content Quality", 
            score: 90, 
            weight: 0.25,
            description: "Reuters articles typically provide concise, factual reporting with minimal commentary."
          },
          { 
            name: "Ownership Transparency", 
            score: 85, 
            weight: 0.2,
            description: "Reuters is owned by Thomson Reuters, a publicly traded company with transparent ownership."
          },
          { 
            name: "Citations", 
            score: 80, 
            weight: 0.15,
            description: "Articles cite sources and often include quotes from relevant stakeholders."
          },
          { 
            name: "Bias Assessment", 
            score: 90, 
            weight: 0.1,
            description: "Reuters maintains a reputation for neutral reporting with minimal political bias."
          }
        ],
        ownershipInfo: {
          owner: "Thomson Reuters Corporation",
          type: "Public company (NYSE: TRI)",
          founded: "1851",
          headquarters: "Toronto, Canada",
          ownership: "Publicly traded, Thomson family is principal shareholder",
          notable: "One of the largest international news agencies"
        },
        potentialBiases: {
          politicalLeaning: "Center",
          biasLevel: "Low",
          ownershipBias: "Publicly traded news agency",
          contentTrends: "Focuses on factual reporting with minimal bias"
        }
      }
    ],
    sourceCount: 3,
    topSources: ["reuters.com", "wikipedia.org", "nytimes.com"],
    explanation: {
      trustLevel,
      summary: explanation,
      sourceBreakdown: `Based on analysis of 3 sources: 2 high-quality and 1 medium-quality sources.`,
      topSources: `Top sources include: reuters.com, wikipedia.org, nytimes.com`,
      strongestFactors: `Strongest factors: Authority (${85}/100) and Content Quality (${80}/100)`,
      weakestFactors: `Areas of concern: Bias Assessment (${70}/100) and Citations (${75}/100)`,
      recommendations: trustScore < 60 
        ? "Recommendation: Verify this information with additional authoritative sources before sharing or relying on it." 
        : "Recommendation: This information appears reliable based on source analysis."
    }
  };
}

/**
 * Render the trust score details in the popup
 * @param {Object} analysis - The trust score analysis
 * @param {HTMLElement} container - The container to render into
 */
function renderTrustScoreDetails(analysis, container) {
  if (!analysis) {
    container.innerHTML = '<p>No trust score analysis available.</p>';
    return;
  }
  
  // Create the trust score overview
  const trustScoreColorClass = analysis.overall >= 75 ? 'high' : (analysis.overall >= 50 ? 'medium' : 'low');
  const percentage = `${analysis.overall}%`;
  
  let html = `
    <div class="trust-score-overview">
      <div class="trust-score-circle" style="--percentage: ${percentage}; --color: var(--${trustScoreColorClass});">
        <span class="trust-score-number">${analysis.overall}</span>
      </div>
      <div class="trust-level-label">
        <h3>${analysis.trustLevel || 'Trust Level'}</h3>
        <p>${analysis.explanation.summary || 'No explanation available.'}</p>
      </div>
    </div>
  `;
  
  // Add source breakdown section
  html += `
    <div class="source-breakdown">
      <h3>Source Analysis</h3>
      <p>${analysis.explanation.sourceBreakdown || `Based on analysis of ${analysis.sourceCount} sources.`}</p>
      <div class="source-grid">
  `;
  
  // Add each source card
  analysis.sourceDetails.forEach(source => {
    const sourceColorClass = source.overall >= 75 ? 'high' : (source.overall >= 50 ? 'medium' : 'low');
    
    html += `
      <div class="source-card">
        <h4><span class="domain-icon">🌐</span> ${source.domain}</h4>
        <div class="source-score">
          <div class="source-score-bar">
            <div class="source-score-fill ${sourceColorClass}" style="width: ${source.overall}%;"></div>
          </div>
          <span class="source-score-number ${sourceColorClass}">${source.overall}</span>
        </div>
        <div class="source-details">
          ${source.title ? `<p><strong>Title:</strong> ${source.title}</p>` : ''}
        </div>
        <div class="ownership-info">
          <p><strong>Owner:</strong> ${source.ownershipInfo.owner}</p>
          <p><strong>Type:</strong> ${source.ownershipInfo.type}</p>
          ${source.ownershipInfo.founded ? `<p><strong>Founded:</strong> ${source.ownershipInfo.founded}</p>` : ''}
        </div>
      </div>
    `;
  });
  
  html += `
      </div>
    </div>
  `;
  
  // Add score components section
  html += `
    <div class="score-components">
      <h3>Trust Score Components</h3>
      <div class="component-box">
  `;
  
  // Only use first source components as example
  if (analysis.sourceDetails[0] && analysis.sourceDetails[0].components) {
    analysis.sourceDetails[0].components.forEach(component => {
      let componentClass = '';
      let componentIcon = '';
      
      // Set component styling based on name
      switch (component.name) {
        case 'Authority':
          componentClass = 'authority-component';
          componentIcon = '🏛️';
          break;
        case 'Content Quality':
          componentClass = 'content-quality-component';
          componentIcon = '📄';
          break;
        case 'Ownership Transparency':
          componentClass = 'ownership-component';
          componentIcon = '👁️';
          break;
        case 'Citations':
          componentClass = 'citations-component';
          componentIcon = '📚';
          break;
        case 'Bias Assessment':
          componentClass = 'bias-component';
          componentIcon = '⚖️';
          break;
      }
      
      html += `
        <div class="component-item ${componentClass}">
          <h4><span class="component-icon">${componentIcon}</span> ${component.name}</h4>
          <div class="component-score">${component.score}</div>
          <p class="component-description">${component.description || `Weight: ${component.weight * 100}%`}</p>
        </div>
      `;
    });
  }
  
  html += `
      </div>
    </div>
  `;
  
  // Add bias information section
  html += `
    <div class="bias-information">
      <h3>Potential Bias Analysis</h3>
      <div class="bias-grid">
  `;
  
  // Use the first source with bias information
  const sourceWithBias = analysis.sourceDetails.find(s => s.potentialBiases);
  if (sourceWithBias && sourceWithBias.potentialBiases) {
    const biases = sourceWithBias.potentialBiases;
    
    html += `
      <div class="bias-item">
        <h4>Political Leaning</h4>
        <p>${biases.politicalLeaning || 'Unknown'}</p>
      </div>
      <div class="bias-item">
        <h4>Bias Level</h4>
        <p>${biases.biasLevel || 'Unknown'}</p>
      </div>
      <div class="bias-item">
        <h4>Ownership Bias</h4>
        <p>${biases.ownershipBias || 'Unknown'}</p>
      </div>
      <div class="bias-item">
        <h4>Content Trends</h4>
        <p>${biases.contentTrends || 'Unknown'}</p>
      </div>
    `;
  } else {
    html += `
      <div class="bias-item" style="grid-column: 1 / -1;">
        <h4>No Detailed Bias Analysis Available</h4>
        <p>Insufficient data to provide comprehensive bias assessment for these sources.</p>
      </div>
    `;
  }
  
  html += `
      </div>
    </div>
  `;
  
  // Add recommendations section
  html += `
    <div class="recommendations">
      <h3>Recommendations</h3>
      <p>${analysis.explanation.recommendations || 'No specific recommendations available.'}</p>
    </div>
  `;
  
  // Set the HTML content
  container.innerHTML = html;
}