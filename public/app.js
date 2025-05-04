/**
 * Truth Engine - Frontend JavaScript
 * Handles user interactions, API requests, and result display
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const claimForm = document.getElementById('claim-form');
  const contentInput = document.getElementById('content-input');
  const verifyButton = document.getElementById('verify-button');
  const examplesList = document.getElementById('examples-list');
  const resultsContainer = document.getElementById('results-container');
  const loadingIndicator = document.getElementById('loading-indicator');
  const resultsDisplay = document.getElementById('results-display');
  const progressFill = document.getElementById('progress-fill');
  const progressPercentage = document.getElementById('progress-percentage');
  const statusMessage = document.getElementById('status-message');
  const claimsList = document.getElementById('claims-list');
  const verificationResults = document.getElementById('verification-results');
  const originalText = document.getElementById('original-text');
  const verifiedText = document.getElementById('verified-text');
  const newVerificationButton = document.getElementById('new-verification');
  const errorToast = document.getElementById('error-toast');
  const errorMessage = document.getElementById('error-message');
  const closeErrorButton = document.getElementById('close-error');
  
  // Web3 connection state
  let isWeb3Connected = false;
  let userAddress = null;

  // Example content handler
  examplesList.addEventListener('click', (e) => {
    e.preventDefault();
    if (e.target.tagName === 'A') {
      contentInput.value = e.target.dataset.content;
      contentInput.focus();
    }
  });

  // New verification button handler
  newVerificationButton.addEventListener('click', () => {
    resultsContainer.classList.add('hidden');
    contentInput.value = '';
    contentInput.focus();
  });

  // Close error toast
  closeErrorButton.addEventListener('click', () => {
    errorToast.classList.add('hidden');
  });

  // Show error toast
  function showError(message) {
    errorMessage.textContent = message;
    errorToast.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorToast.classList.add('hidden');
    }, 5000);
  }

  // Terminal logs display
  const terminalLogs = document.getElementById('terminal-logs');
  
  // Function to add log entries to terminal
  function addLogEntry(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = message;
    
    // Insert before terminal cursor
    const cursor = terminalLogs.querySelector('.terminal-cursor');
    terminalLogs.insertBefore(logEntry, cursor);
    
    // Auto-scroll to bottom
    terminalLogs.scrollTop = terminalLogs.scrollHeight;
    
    // Flash effect for latest log
    logEntry.style.animation = 'none';
    setTimeout(() => {
      logEntry.style.animation = 'fadeIn 0.3s ease forwards';
    }, 10);
    
    return logEntry;
  }
  
  // Update progress bar
  function updateProgress(percent) {
    progressFill.style.width = `${percent}%`;
    progressPercentage.textContent = `${percent}%`;
  }

  // Form submission handler
  claimForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const content = contentInput.value.trim();
    if (!content) {
      showError('Please enter content to verify.');
      return;
    }
    
    // Show loading state
    verifyButton.disabled = true;
    resultsContainer.classList.remove('hidden');
    loadingIndicator.classList.remove('hidden');
    resultsDisplay.classList.add('hidden');
    updateProgress(5);
    statusMessage.textContent = 'Initializing verification...';
    
    // Clear previous logs and initialize terminal
    terminalLogs.innerHTML = '<span class="terminal-cursor"></span>';
    addLogEntry('FactChecker v2.5 initialized...', 'info');
    addLogEntry('Loading truth verification modules...', 'info');
    
    try {
      // Add hacker-style logs
      addLogEntry('Establishing secure connection to verification servers...', 'info');
      
      // Check if blockchain verification exists
      addLogEntry('Checking blockchain for existing verification...', 'info');
      try {
        const blockchainCheck = await fetch('/api/blockchain/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content })
        });
        
        const blockchainResult = await blockchainCheck.json();
        
        if (blockchainResult.exists && blockchainResult.verification) {
          addLogEntry('Verified content found on blockchain!', 'success');
          addLogEntry(`Blockchain verification from: ${new Date(blockchainResult.verification.timestamp).toLocaleString()}`, 'info');
          addLogEntry(`Trust score from blockchain: ${blockchainResult.verification.trustScore}/100`, 'info');
        } else {
          addLogEntry('No existing blockchain verification found. Proceeding with new verification...', 'info');
        }
      } catch (blockchainError) {
        addLogEntry(`Blockchain check failed: ${blockchainError.message}`, 'error');
        addLogEntry('Proceeding with standard verification...', 'warning');
      }
      
      addLogEntry('Connection established. Transmitting content...', 'success');
      
      // Call the API
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      
      addLogEntry('Data successfully transmitted. Awaiting response...', 'info');
      
      if (!response.ok) {
        throw new Error(`Verification failed with status ${response.status}`);
      }
      
      const result = await response.json();
      
      // In a real application, we'd use WebSockets or Server-Sent Events for real-time updates
      // For this demo, we'll simulate progress
      simulateProgress(result);
      
    } catch (error) {
      console.error('Verification error:', error);
      statusMessage.textContent = `Error: ${error.message}`;
      showError(`Verification failed: ${error.message}`);
      addLogEntry(`ERROR: Verification process failed: ${error.message}`, 'error');
      addLogEntry('System attempting recovery...', 'warning');
      updateProgress(100);
      progressFill.style.backgroundColor = 'var(--error-color)';
      loadingIndicator.classList.add('hidden');
      verifyButton.disabled = false;
    }
  });
  
  // Simulate progress updates (in a real app, this would come from WebSockets/SSE)
  function simulateProgress(finalResult) {
    let currentProgress = 5;
    const totalSteps = 20;
    const interval = setInterval(() => {
      currentProgress += 5;
      updateProgress(currentProgress);
      
      // Update status messages to simulate the verification process
      if (currentProgress === 10) {
        statusMessage.textContent = 'Analyzing content for claims...';
        addLogEntry('Running semantic analysis on input...', 'info');
        addLogEntry('Identifying factual claims in content...', 'info');
      } else if (currentProgress === 20) {
        addLogEntry('Identified ' + (finalResult.claims?.length || '0') + ' potential claims', 'success');
        addLogEntry('Preparing search algorithms...', 'info');
      } else if (currentProgress === 30) {
        statusMessage.textContent = 'Extracting factual statements...';
        addLogEntry('Extracting verifiable assertions from claims...', 'info');
        addLogEntry('Generating search queries for verification...', 'info');
      } else if (currentProgress === 40) {
        addLogEntry('Initiating distributed search across trusted sources...', 'info');
      } else if (currentProgress === 50) {
        statusMessage.textContent = 'Searching for relevant information...';
        addLogEntry('Accessing trusted databases...', 'info');
        addLogEntry('Scanning primary sources...', 'info');
      } else if (currentProgress === 60) {
        addLogEntry('Evaluating source credibility metrics...', 'info');
        if (finalResult.trustScore > 70) {
          addLogEntry('High credibility sources identified', 'success');
        } else if (finalResult.trustScore > 40) {
          addLogEntry('Mixed credibility sources identified', 'warning');
        } else {
          addLogEntry('Low credibility sources detected', 'error');
          addLogEntry('Expanding search parameters...', 'info');
        }
      } else if (currentProgress === 70) {
        statusMessage.textContent = 'Verifying claims against sources...';
        addLogEntry('Cross-referencing claims with verified data...', 'info');
        addLogEntry('Running factual consistency algorithms...', 'info');
      } else if (currentProgress === 80) {
        addLogEntry('Generating verification confidence scores...', 'info');
      } else if (currentProgress === 85) {
        statusMessage.textContent = 'Finalizing results...';
        addLogEntry('Compiling verification results...', 'info');
        addLogEntry('Generating trust score metrics...', 'info');
      } else if (currentProgress === 90) {
        if (finalResult.blockchainVerified) {
          addLogEntry('Results verified on blockchain', 'success');
          addLogEntry(`Blockchain verification timestamp: ${new Date(finalResult.blockchainData?.timestamp || Date.now()).toLocaleString()}`, 'info');
        } else {
          addLogEntry('Preparing to store verification on blockchain...', 'info');
        }
      } else if (currentProgress === 95) {
        addLogEntry('Verification complete with trust score: ' + finalResult.trustScore + '/100', 'success');
        addLogEntry('Preparing results for display...', 'info');
      }
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          statusMessage.textContent = 'Verification complete!';
          displayResults(finalResult);
        }, 500);
      }
    }, 300);
  }
  
  // Display verification results
  function displayResults(result) {
    // Clear previous results
    claimsList.innerHTML = '';
    verificationResults.innerHTML = '';
    
    // Display original content
    originalText.textContent = result.originalContent;
    
    // Display claims
    if (result.claims && result.claims.length > 0) {
      result.claims.forEach((claim, index) => {
        const li = document.createElement('li');
        li.textContent = `"${claim.claimText}"`;
        claimsList.appendChild(li);
      });
    } else {
      claimsList.innerHTML = '<li>No specific claims identified.</li>';
    }
    
    // Display overall trust score
    if (result.trustScore !== undefined) {
      const trustScoreEl = document.createElement('div');
      trustScoreEl.className = 'trust-score';
      
      // Determine trust level with more granularity
      let trustLevel = 'low';
      let trustLevelText;
      
      if (result.trustScore >= 85) {
        trustLevel = 'high';
        trustLevelText = 'Very High Trust';
      } else if (result.trustScore >= 70) {
        trustLevel = 'high';
        trustLevelText = 'High Trust';
      } else if (result.trustScore >= 55) {
        trustLevel = 'medium';
        trustLevelText = 'Moderate Trust';
      } else if (result.trustScore >= 40) {
        trustLevel = 'low';
        trustLevelText = 'Low Trust';
      } else {
        trustLevel = 'low';
        trustLevelText = 'Very Low Trust';
      }
      
      // Add blockchain verified badge if verified on blockchain
      const blockchainBadge = result.blockchainVerified
        ? `<div class="blockchain-badge verified" title="Verified on Blockchain"><i class="fas fa-link"></i> Blockchain Verified</div>`
        : '';
      
      // Generate a unique ID for the overall trust score
      const overallScoreId = `overall-trust-${Date.now()}`;
      
      trustScoreEl.innerHTML = `
        <div class="trust-score-label">Overall Trust Score:</div>
        <div class="trust-score-value ${trustLevel}" data-claim-id="${overallScoreId}">
          <span class="score-number">${result.trustScore}</span>
          <span class="score-max">/100</span>
          <i class="fas fa-info-circle" title="Click for detailed trust analysis"></i>
        </div>
        ${blockchainBadge}
      `;
      
      // If we have blockchain data, show additional details
      if (result.blockchainVerified && result.blockchainData) {
        const blockchainDetails = document.createElement('div');
        blockchainDetails.className = 'blockchain-details';
        blockchainDetails.innerHTML = `
          <h4><i class="fas fa-link"></i> Blockchain Verification Details</h4>
          <div class="blockchain-info">
            <p><strong>Verified:</strong> ${new Date(result.blockchainData.timestamp).toLocaleString()}</p>
            ${result.blockchainData.transactionHash ?
              `<p><strong>Transaction:</strong> <a href="https://etherscan.io/tx/${result.blockchainData.transactionHash}" target="_blank" rel="noopener">${result.blockchainData.transactionHash.substring(0, 10)}...${result.blockchainData.transactionHash.substring(56)}</a></p>` : ''}
            <p><strong>Content Hash:</strong> ${result.blockchainData.contentHash ? result.blockchainData.contentHash.substring(0, 18) + '...' : 'N/A'}</p>
            ${result.blockchainData.resultsHash ?
              `<p><strong>IPFS:</strong> <a href="https://ipfs.io/ipfs/${result.blockchainData.resultsHash}" target="_blank" rel="noopener">${result.blockchainData.resultsHash.substring(0, 10)}...${result.blockchainData.resultsHash.substring(result.blockchainData.resultsHash.length - 6)}</a></p>` : ''}
          </div>
        `;
        trustScoreEl.appendChild(blockchainDetails);
      }
      trustScoreEl.querySelector('.trust-score-value').addEventListener('click', (e) => {
        showTrustScoreDetails(e.currentTarget);
      });
      
      verificationResults.appendChild(trustScoreEl);
    }
    
    // Display verification results
    if (result.results && result.results.length > 0) {
      const resultsList = document.createElement('ul');
      result.results.forEach(item => {
        const li = document.createElement('li');
        li.className = `status-${item.status}`;
        
        // Format trust score for this item
        const itemTrustScore = item.trustScore || 50;
        let trustClass = 'low';
        if (itemTrustScore >= 75) trustClass = 'high';
        else if (itemTrustScore >= 50) trustClass = 'medium';
        
        // Generate claim ID for this result
        const claimId = item.claimId || `claim-${item.claim.replace(/\W+/g, '-').substring(0, 30)}-${Date.now()}`;
        
        // Get trust level based on score
        let trustLevel;
        if (itemTrustScore >= 85) trustLevel = "Very High Trust";
        else if (itemTrustScore >= 70) trustLevel = "High Trust";
        else if (itemTrustScore >= 55) trustLevel = "Moderate Trust";
        else if (itemTrustScore >= 40) trustLevel = "Low Trust";
        else trustLevel = "Very Low Trust";
        
        // Generate explanation based on trust level
        let explanation;
        switch (trustLevel) {
          case "Very High Trust":
            explanation = "Information from highly credible sources.";
            break;
          case "High Trust":
            explanation = "Information from reliable sources.";
            break;
          case "Moderate Trust":
            explanation = "Information from sources of mixed reliability.";
            break;
          case "Low Trust":
            explanation = "Information from sources with reliability concerns.";
            break;
          default:
            explanation = "Information from sources that lack credibility.";
        }
        
        li.innerHTML = `
          <div class="status-label ${item.status}">${item.status}</div>
          <div class="trust-indicator ${trustClass}" data-claim-id="${claimId}">${itemTrustScore}<span class="score-max">/100</span> <i class="fas fa-info-circle"></i></div>
          <strong>Claim:</strong> "${item.claim}"<br>
          <strong>Original Value:</strong> ${item.originalValue}<br>
          <strong>Verified Fact:</strong> ${item.verifiedValue}<br>
          <strong>Source:</strong> <span class="source-name">${item.source}</span>
          ${result.blockchainVerified ? '<span class="blockchain-badge small"><i class="fas fa-link"></i></span>' : ''}
          ${item.sources && item.sources.length > 1 ?
            `<span class="sources-count">(+${item.sources.length - 1} more sources)</span>` : ''}
            
          <div class="trust-score-inline">
            <div class="trust-meter">
              <div class="score-circle score-${trustClass}">${itemTrustScore}</div>
            </div>
            <div class="trust-details">
              <h4 class="trust-level">${trustLevel} <i class="fas fa-shield-alt"></i></h4>
              <p class="trust-description">${explanation}</p>
            </div>
            <div class="trust-info-box" data-claim-id="${claimId}">
              <i class="fas fa-chart-pie"></i>
            </div>
          </div>
        `;
        
        // Add event listeners to the trust indicator and info box
        setTimeout(() => {
          const trustIndicator = li.querySelector('.trust-indicator');
          const infoBox = li.querySelector('.trust-info-box');
          
          if (trustIndicator) {
            trustIndicator.addEventListener('click', (e) => {
              showTrustScoreDetails(e.currentTarget);
            });
          }
          
          if (infoBox) {
            infoBox.addEventListener('click', (e) => {
              showTrustScoreDetails(e.currentTarget);
            });
          }
        }, 0);
        resultsList.appendChild(li);
      });
      verificationResults.appendChild(resultsList);
    } else {
      verificationResults.innerHTML += '<p>No claims were successfully verified.</p>';
    }
    
    // Display verified text
    verifiedText.textContent = result.verifiedContent;
    
    // Hide loading, show results
    loadingIndicator.classList.add('hidden');
    resultsDisplay.classList.remove('hidden');
    verifyButton.disabled = false;
    
    // Highlight changes if content was modified
    if (result.originalContent !== result.verifiedContent) {
      // In a real app, we'd use a diff library to highlight specific changes
      verifiedText.style.backgroundColor = 'rgba(52, 168, 83, 0.1)';
    }
  }
  
  // Connect to Web3 wallet (Metamask, etc.)
  async function connectWallet() {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAddress = accounts[0];
        isWeb3Connected = true;
        addLogEntry(`Connected to wallet: ${userAddress.substring(0, 6)}...${userAddress.substring(38)}`, 'success');
        return true;
      } catch (error) {
        addLogEntry(`Failed to connect wallet: ${error.message}`, 'error');
        return false;
      }
    } else {
      addLogEntry('No Ethereum wallet detected. Some blockchain features will be limited.', 'warning');
      return false;
    }
  }
  
  // Check if blockchain verification is available
  async function checkBlockchainVerificationAvailable() {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      
      if (data.blockchainEnabled) {
        addLogEntry('Blockchain verification available', 'info');
        connectWallet();
      }
    } catch (error) {
      console.error('Health check error:', error);
    }
  }
  
  // Initialize
  contentInput.focus();
  
  // Try to check if blockchain is available
  checkBlockchainVerificationAvailable();
});

// Utility: Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;
    
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth'
      });
    }
  });
});