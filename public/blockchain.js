/**
 * Blockchain.js - Truth Engine
 * Handles frontend blockchain integration for verification on the blockchain
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const connectWalletButton = document.getElementById('connect-wallet');
  const walletInfo = document.getElementById('wallet-info');
  const walletAddress = document.getElementById('wallet-address');
  const blockchainVerificationStatus = document.getElementById('blockchain-verification-status');

  // Web3 state
  let provider = null;
  let signer = null;
  let contract = null;
  let userAddress = null;
  let isConnected = false;
  
  // Contract ABI (simplified version just for interaction)
  const contractABI = [
    "function storeVerification(string memory _contentHash, string memory _resultsHash, uint8 _trustScore, uint256 _claimCount) public",
    "function getVerification(string memory _contentHash) public view returns (string memory contentHash, string memory resultsHash, uint256 timestamp, uint8 trustScore, uint256 claimCount, address verifier)",
    "function verificationExists(string memory _contentHash) public view returns (bool)"
  ];
  
  // Connect wallet button event listener
  connectWalletButton.addEventListener('click', async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      showError('Failed to connect wallet: ' + error.message);
    }
  });

  /**
   * Initialize blockchain functionality
   */
  async function initBlockchain() {
    try {
      // Check if MetaMask is installed
      if (window.ethereum) {
        // Create ethers provider
        provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Check if previously connected
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          await connectWallet(false); // Connect silently
        }
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', () => window.location.reload());
      } else {
        console.log('Web3 provider not detected');
      }
    } catch (error) {
      console.error('Blockchain initialization error:', error);
    }
  }
  
  /**
   * Connect to wallet
   * @param {boolean} showPrompt Whether to show the wallet connection prompt
   */
  async function connectWallet(showPrompt = true) {
    try {
      if (!window.ethereum) {
        if (showPrompt) {
          showError('No Ethereum wallet detected. Please install MetaMask or another Web3 wallet.');
        }
        return false;
      }
      
      let accounts;
      if (showPrompt) {
        // Request account access if needed
        accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      } else {
        // Just get the accounts without prompting
        accounts = await provider.listAccounts();
      }
      
      if (accounts.length === 0) return false;
      
      // Get the user's address
      userAddress = accounts[0];
      
      // Update UI
      walletInfo.classList.remove('hidden');
      walletAddress.textContent = formatAddress(userAddress);
      connectWalletButton.innerHTML = '<i class="fas fa-wallet"></i> Connected';
      connectWalletButton.classList.add('connected');
      
      // Get signer
      signer = provider.getSigner();
      
      // Create contract instance
      const contractAddress = await getContractAddress();
      if (contractAddress) {
        contract = new ethers.Contract(contractAddress, contractABI, signer);
      }
      
      isConnected = true;
      return true;
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      showError('Failed to connect wallet: ' + error.message);
      return false;
    }
  }
  
  /**
   * Handle account changes
   * @param {Array} accounts 
   */
  function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      // User disconnected
      disconnectWallet();
    } else if (accounts[0] !== userAddress) {
      // Account changed
      userAddress = accounts[0];
      walletAddress.textContent = formatAddress(userAddress);
    }
  }
  
  /**
   * Disconnect wallet
   */
  function disconnectWallet() {
    userAddress = null;
    walletInfo.classList.add('hidden');
    connectWalletButton.innerHTML = '<i class="fas fa-wallet"></i> Connect Wallet';
    connectWalletButton.classList.remove('connected');
    isConnected = false;
  }
  
  /**
   * Format address for display
   * @param {string} address 
   * @returns {string}
   */
  function formatAddress(address) {
    return address ? `${address.substring(0, 6)}...${address.substring(38)}` : 'Not connected';
  }
  
  /**
   * Get contract address from backend
   * @returns {Promise<string>}
   */
  async function getContractAddress() {
    try {
      const response = await fetch('/api/blockchain/contract-address');
      const data = await response.json();
      return data.address;
    } catch (error) {
      console.error('Error getting contract address:', error);
      return null;
    }
  }
  
  /**
   * Show error message
   * @param {string} message 
   */
  function showError(message) {
    // Check if error toast function exists (defined in app.js)
    if (typeof window.showError === 'function') {
      window.showError(message);
    } else {
      console.error(message);
      alert(message);
    }
  }
  
  /**
   * Check if a verification exists on the blockchain
   * @param {string} content The content to check
   * @returns {Promise<boolean>}
   */
  async function checkVerificationExists(content) {
    try {
      if (!isConnected || !contract) return false;
      
      // Hash the content
      const contentHash = ethers.utils.id(content);
      
      // Check if verification exists
      return await contract.verificationExists(contentHash);
    } catch (error) {
      console.error('Error checking verification:', error);
      return false;
    }
  }
  
  /**
   * Get verification from blockchain
   * @param {string} content The content to get verification for
   * @returns {Promise<Object|null>}
   */
  async function getVerification(content) {
    try {
      if (!isConnected || !contract) return null;
      
      // Hash the content
      const contentHash = ethers.utils.id(content);
      
      // Check if verification exists
      const exists = await contract.verificationExists(contentHash);
      if (!exists) return null;
      
      // Get verification
      const verification = await contract.getVerification(contentHash);
      
      // Format the result
      return {
        contentHash: verification[0],
        resultsHash: verification[1],
        timestamp: new Date(Number(verification[2]) * 1000),
        trustScore: Number(verification[3]),
        claimCount: Number(verification[4]),
        verifier: verification[5]
      };
    } catch (error) {
      console.error('Error getting verification:', error);
      return null;
    }
  }
  
  /**
   * Store verification on blockchain
   * @param {Object} result The verification result
   * @returns {Promise<Object|null>}
   */
  async function storeVerification(result) {
    try {
      if (!isConnected || !contract) {
        throw new Error('Wallet not connected or contract not available');
      }
      
      // Call the backend to store verification
      const response = await fetch('/api/blockchain/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ verificationResult: result })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error storing verification');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error storing verification:', error);
      showError('Failed to store verification: ' + error.message);
      return null;
    }
  }
  
  /**
   * Show blockchain verification status
   * @param {boolean} verified 
   * @param {Object} data Additional verification data
   */
  function showBlockchainVerification(verified, data = null) {
    if (verified) {
      blockchainVerificationStatus.classList.remove('hidden');
      
      // Add additional data if available
      if (data && data.timestamp) {
        const timestamp = new Date(data.timestamp).toLocaleString();
        const badgeElement = blockchainVerificationStatus.querySelector('.blockchain-badge');
        
        badgeElement.setAttribute('title', `Verified on blockchain at ${timestamp}`);
      }
    } else {
      blockchainVerificationStatus.classList.add('hidden');
    }
  }
  
  // Initialize blockchain functionality on page load
  initBlockchain();
  
  // Export functions for use in other scripts
  window.blockchain = {
    connectWallet,
    disconnectWallet,
    checkVerificationExists,
    getVerification,
    storeVerification,
    showBlockchainVerification,
    isWalletConnected: () => isConnected
  };
});