/**
 * Web3 Utilities for Truth Engine
 * Handles blockchain and IPFS interactions
 */

import { ethers } from 'ethers';
import { create as ipfsHttpClient } from 'ipfs-http-client';
import TruthVerificationArtifact from './build/contracts/TruthVerification.json';
import Web3Modal from 'web3modal';
import { Buffer } from 'buffer';

// Use a public IPFS gateway - in production, you'd want your own node or a dedicated service
const ipfs = ipfsHttpClient({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: `Basic ${Buffer.from(
      process.env.INFURA_IPFS_PROJECT_ID + ':' + process.env.INFURA_IPFS_PROJECT_SECRET
    ).toString('base64')}`
  }
});

// Contract address - will be set after deployment
const contractAddress = process.env.CONTRACT_ADDRESS || '';

/**
 * Get the current Ethereum provider
 * @returns {Promise<Object>} The provider and signer
 */
export async function getProvider() {
  // Initialize web3modal
  const web3Modal = new Web3Modal({
    network: "mainnet", // Can be "mainnet", "rinkeby", etc.
    cacheProvider: true,
    providerOptions: {} // Configure providers if needed
  });
  
  try {
    // Connect to the provider (MetaMask, etc.)
    const instance = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(instance);
    const signer = provider.getSigner();
    
    // Return both provider and signer
    return { provider, signer };
  } catch (error) {
    console.error("Error connecting to wallet:", error);
    throw error;
  }
}

/**
 * Get the TruthVerification contract instance
 * @param {Object} signer The signer to use for transactions
 * @returns {Promise<Object>} The contract instance
 */
export async function getContract(signer) {
  if (!contractAddress) {
    throw new Error('Contract address not set');
  }
  
  const contract = new ethers.Contract(
    contractAddress,
    TruthVerificationArtifact.abi,
    signer
  );
  
  return contract;
}

/**
 * Store verification data on IPFS
 * @param {Object} verificationData The verification data to store
 * @returns {Promise<String>} The IPFS CID (Content Identifier)
 */
export async function storeOnIPFS(verificationData) {
  try {
    // Convert data to JSON string
    const jsonData = JSON.stringify(verificationData);
    
    // Add to IPFS
    const result = await ipfs.add(Buffer.from(jsonData));
    
    // Return the CID
    return result.path;
  } catch (error) {
    console.error("Error storing data on IPFS:", error);
    throw error;
  }
}

/**
 * Retrieve verification data from IPFS
 * @param {String} cid The IPFS CID (Content Identifier)
 * @returns {Promise<Object>} The verification data
 */
export async function retrieveFromIPFS(cid) {
  try {
    const chunks = [];
    
    // Stream the data from IPFS
    for await (const chunk of ipfs.cat(cid)) {
      chunks.push(chunk);
    }
    
    // Combine chunks and parse JSON
    const data = Buffer.concat(chunks).toString();
    return JSON.parse(data);
  } catch (error) {
    console.error("Error retrieving data from IPFS:", error);
    throw error;
  }
}

/**
 * Store verification results on the blockchain
 * @param {String} contentHash Hash of the original content
 * @param {String} ipfsCid IPFS CID of the verification results
 * @param {Number} trustScore Overall trust score (0-100)
 * @param {Number} claimCount Number of claims verified
 * @returns {Promise<Object>} Transaction receipt
 */
export async function storeVerificationOnChain(contentHash, ipfsCid, trustScore, claimCount) {
  try {
    // Get provider and contract
    const { signer } = await getProvider();
    const contract = await getContract(signer);
    
    // Store the verification
    const tx = await contract.storeVerification(
      contentHash,
      ipfsCid,
      trustScore,
      claimCount
    );
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error("Error storing verification on blockchain:", error);
    throw error;
  }
}

/**
 * Check if verification exists on the blockchain
 * @param {String} contentHash Hash of the content to check
 * @returns {Promise<Boolean>} Whether the verification exists
 */
export async function verificationExistsOnChain(contentHash) {
  try {
    // Get provider and contract (read-only)
    const { provider } = await getProvider();
    const contract = new ethers.Contract(
      contractAddress,
      TruthVerificationArtifact.abi,
      provider
    );
    
    // Check if verification exists
    return await contract.verificationExists(contentHash);
  } catch (error) {
    console.error("Error checking verification on blockchain:", error);
    throw error;
  }
}

/**
 * Get verification details from the blockchain
 * @param {String} contentHash Hash of the content to look up
 * @returns {Promise<Object>} The verification details and data
 */
export async function getVerificationFromChain(contentHash) {
  try {
    // Get provider and contract (read-only)
    const { provider } = await getProvider();
    const contract = new ethers.Contract(
      contractAddress,
      TruthVerificationArtifact.abi,
      provider
    );
    
    // Get the verification record
    const record = await contract.getVerification(contentHash);
    
    // Format the record
    const formattedRecord = {
      contentHash: record[0],
      resultsHash: record[1],
      timestamp: new Date(record[2].toNumber() * 1000),
      trustScore: record[3],
      claimCount: record[4].toNumber(),
      verifier: record[5]
    };
    
    // If results hash exists, get the data from IPFS
    if (formattedRecord.resultsHash) {
      formattedRecord.data = await retrieveFromIPFS(formattedRecord.resultsHash);
    }
    
    return formattedRecord;
  } catch (error) {
    console.error("Error getting verification from blockchain:", error);
    throw error;
  }
}

/**
 * Generate a hash for content
 * @param {String} content The content to hash
 * @returns {String} The keccak256 hash
 */
export function hashContent(content) {
  return ethers.utils.id(content);
}

/**
 * Check if a user has a Web3 wallet connected
 * @returns {Promise<Boolean>} Whether a wallet is connected
 */
export async function isWalletConnected() {
  try {
    const web3Modal = new Web3Modal({
      cacheProvider: true
    });
    
    return web3Modal.cachedProvider ? true : false;
  } catch (error) {
    console.error("Error checking wallet connection:", error);
    return false;
  }
}

/**
 * Disconnect the current wallet
 */
export async function disconnectWallet() {
  try {
    const web3Modal = new Web3Modal({
      cacheProvider: true
    });
    
    web3Modal.clearCachedProvider();
  } catch (error) {
    console.error("Error disconnecting wallet:", error);
  }
}