/**
 * Blockchain Verifier Module for Truth Engine
 * Handles verification storage and retrieval on the blockchain
 */

import { 
  hashContent, 
  storeOnIPFS, 
  storeVerificationOnChain, 
  verificationExistsOnChain,
  getVerificationFromChain
} from './web3-utils.js';

// Set up colored logging
const log = {
  info: (...args) => { console.log('\x1b[36m[BLOCKCHAIN]\x1b[0m', ...args); },
  warn: (...args) => { console.log('\x1b[33m[BLOCKCHAIN]\x1b[0m', ...args); },
  error: (...args) => { console.log('\x1b[31m[BLOCKCHAIN]\x1b[0m', ...args); },
  success: (...args) => { console.log('\x1b[32m[BLOCKCHAIN]\x1b[0m', ...args); }
};

/**
 * Check if a verification exists on the blockchain
 * @param {String} content The content to check
 * @returns {Promise<Boolean>} Whether the verification exists
 */
export async function checkVerificationExists(content) {
  try {
    const contentHash = hashContent(content);
    log.info(`Checking if verification exists for content hash: ${contentHash.substring(0, 10)}...`);
    
    return await verificationExistsOnChain(contentHash);
  } catch (error) {
    log.error(`Error checking verification: ${error.message}`);
    return false;
  }
}

/**
 * Get existing verification from the blockchain
 * @param {String} content The content to get verification for
 * @returns {Promise<Object|null>} The verification data or null if not found
 */
export async function getExistingVerification(content) {
  try {
    const contentHash = hashContent(content);
    log.info(`Getting verification for content hash: ${contentHash.substring(0, 10)}...`);
    
    // Check if verification exists
    const exists = await verificationExistsOnChain(contentHash);
    if (!exists) {
      log.info(`No verification found for content hash: ${contentHash.substring(0, 10)}...`);
      return null;
    }
    
    // Get the verification data
    const verification = await getVerificationFromChain(contentHash);
    log.success(`Retrieved verification from blockchain with trust score: ${verification.trustScore}`);
    
    return verification;
  } catch (error) {
    log.error(`Error getting verification: ${error.message}`);
    return null;
  }
}

/**
 * Store verification on the blockchain and IPFS
 * @param {Object} verificationResult The verification result from the engine
 * @returns {Promise<Object>} The blockchain transaction receipt
 */
export async function storeVerification(verificationResult) {
  try {
    const contentHash = hashContent(verificationResult.originalContent);
    log.info(`Storing verification for content hash: ${contentHash.substring(0, 10)}...`);
    
    // Check if verification already exists
    const exists = await verificationExistsOnChain(contentHash);
    if (exists) {
      log.warn(`Verification already exists for content hash: ${contentHash.substring(0, 10)}...`);
      // Return existing verification
      return await getExistingVerification(verificationResult.originalContent);
    }
    
    // Store verification data on IPFS
    log.info('Storing verification data on IPFS...');
    const ipfsCid = await storeOnIPFS(verificationResult);
    log.success(`Verification data stored on IPFS with CID: ${ipfsCid}`);
    
    // Store verification on the blockchain
    log.info('Storing verification on blockchain...');
    const trustScore = verificationResult.trustScore || 0;
    const claimCount = verificationResult.claims?.length || 0;
    
    const receipt = await storeVerificationOnChain(
      contentHash,
      ipfsCid,
      trustScore,
      claimCount
    );
    
    log.success(`Verification stored on blockchain in transaction: ${receipt.transactionHash}`);
    
    // Return the receipt with IPFS CID
    return {
      receipt,
      ipfsCid,
      contentHash
    };
  } catch (error) {
    log.error(`Error storing verification: ${error.message}`);
    throw error;
  }
}

/**
 * Enhance verification result with blockchain data
 * @param {Object} verificationResult The original verification result
 * @returns {Promise<Object>} The enhanced verification result
 */
export async function enhanceVerificationWithBlockchain(verificationResult) {
  try {
    // Create a copy of the result
    const enhancedResult = { ...verificationResult };
    
    // Add blockchain verification flag
    enhancedResult.blockchainVerified = false;
    
    // Try to get verification from blockchain
    const existingVerification = await getExistingVerification(enhancedResult.originalContent);
    
    if (existingVerification) {
      // Found an existing verification
      enhancedResult.blockchainVerified = true;
      enhancedResult.blockchainData = {
        contentHash: existingVerification.contentHash,
        resultsHash: existingVerification.resultsHash,
        timestamp: existingVerification.timestamp,
        trustScore: existingVerification.trustScore,
        claimCount: existingVerification.claimCount,
        verifier: existingVerification.verifier
      };
      
      // If the verification data includes the full data set, use it
      if (existingVerification.data) {
        // Check if we should use the blockchain data instead
        const blockchainTimestamp = new Date(existingVerification.timestamp).getTime();
        const currentResultTimestamp = new Date(enhancedResult.timestamp || Date.now()).getTime();
        
        // Use blockchain data if it's newer
        if (blockchainTimestamp > currentResultTimestamp) {
          log.info('Using blockchain verification data (newer than current result)');
          
          // Merge blockchain data with current result
          enhancedResult.claims = existingVerification.data.claims || enhancedResult.claims;
          enhancedResult.results = existingVerification.data.results || enhancedResult.results;
          enhancedResult.verifiedContent = existingVerification.data.verifiedContent || enhancedResult.verifiedContent;
          enhancedResult.trustScore = existingVerification.data.trustScore || enhancedResult.trustScore;
          enhancedResult.changes = existingVerification.data.changes || enhancedResult.changes;
        }
      }
    }
    
    return enhancedResult;
  } catch (error) {
    log.error(`Error enhancing verification with blockchain data: ${error.message}`);
    // Return the original result if there's an error
    return verificationResult;
  }
}