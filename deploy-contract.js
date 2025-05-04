/**
 * Deployment script for TruthVerification contract
 * 
 * This script deploys the TruthVerification smart contract to a local development
 * blockchain (like Hardhat or Ganache) or a testnet/mainnet.
 * 
 * To run:
 * 1. Make sure you have Node.js and npm installed
 * 2. Install dependencies: npm install ethers hardhat @nomiclabs/hardhat-ethers dotenv
 * 3. Run: node deploy-contract.js
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { ethers } = require('ethers');

// Load environment variables
dotenv.config();

// Configuration
const NETWORK = process.env.ETHEREUM_NETWORK || 'development';
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

// Default provider configuration for development
let provider;
let signer;

async function main() {
  console.log(`Deploying TruthVerification contract to ${NETWORK}...`);
  
  // Setup provider based on network
  setupProvider();
  
  // Compile contract if needed
  await compileContract();
  
  // Deploy contract
  const contractAddress = await deployContract();
  
  // Update .env file with contract address
  updateEnvFile(contractAddress);
  
  console.log('Deployment complete!');
}

function setupProvider() {
  try {
    // Setup provider based on network
    if (NETWORK === 'development') {
      // Local development network (Hardhat node, Ganache)
      provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
      
      // For local development, we can use a random wallet if no private key is provided
      if (!PRIVATE_KEY) {
        const wallet = ethers.Wallet.createRandom();
        signer = wallet.connect(provider);
        console.log(`Using random wallet: ${signer.address}`);
      } else {
        signer = new ethers.Wallet(PRIVATE_KEY, provider);
      }
    } else {
      // For testnets and mainnet, a private key is required
      if (!PRIVATE_KEY) {
        throw new Error('DEPLOYER_PRIVATE_KEY is required for non-development networks');
      }
      
      // Connect to the appropriate network
      if (NETWORK === 'goerli') {
        provider = new ethers.providers.InfuraProvider('goerli');
      } else if (NETWORK === 'sepolia') {
        provider = new ethers.providers.InfuraProvider('sepolia');
      } else if (NETWORK === 'mainnet') {
        provider = new ethers.providers.InfuraProvider('mainnet');
      } else {
        throw new Error(`Unsupported network: ${NETWORK}`);
      }
      
      signer = new ethers.Wallet(PRIVATE_KEY, provider);
    }
    
    console.log(`Connected to ${NETWORK} network`);
    console.log(`Deployer address: ${signer.address}`);
  } catch (error) {
    console.error('Error setting up provider:', error);
    process.exit(1);
  }
}

async function compileContract() {
  try {
    // Check if the contract is already compiled
    const buildDir = path.join(__dirname, 'build', 'contracts');
    const artifactPath = path.join(buildDir, 'TruthVerification.json');
    
    if (fs.existsSync(artifactPath)) {
      console.log('Contract already compiled. Skipping compilation.');
      return;
    }
    
    console.log('Compiling contract...');
    
    // Create build directory if it doesn't exist
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }
    
    // Read the contract source code
    const sourcePath = path.join(__dirname, 'contracts', 'TruthVerification.sol');
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Contract source file not found: ${sourcePath}`);
    }
    
    // For this simple example, we'll use solc directly to compile the contract
    // In a real project, you'd use Hardhat or Truffle for compilation
    const solc = require('solc');
    
    const source = fs.readFileSync(sourcePath, 'utf8');
    
    const input = {
      language: 'Solidity',
      sources: {
        'TruthVerification.sol': {
          content: source
        }
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode']
          }
        }
      }
    };
    
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    // Check for errors
    if (output.errors) {
      const errors = output.errors.filter(error => error.severity === 'error');
      if (errors.length > 0) {
        throw new Error(`Compilation failed: ${errors[0].message}`);
      }
    }
    
    // Get the contract artifacts
    const contractOutput = output.contracts['TruthVerification.sol']['TruthVerification'];
    const artifact = {
      abi: contractOutput.abi,
      bytecode: contractOutput.evm.bytecode.object
    };
    
    // Write the artifacts to the build directory
    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
    
    console.log('Contract compiled successfully!');
  } catch (error) {
    console.error('Error compiling contract:', error);
    process.exit(1);
  }
}

async function deployContract() {
  try {
    console.log('Deploying contract...');
    
    // Load the contract artifacts
    const artifactPath = path.join(__dirname, 'build', 'contracts', 'TruthVerification.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    
    // Create contract factory
    const contractFactory = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      signer
    );
    
    // Deploy the contract
    const contract = await contractFactory.deploy();
    
    // Wait for deployment to be confirmed
    await contract.deployed();
    
    console.log(`Contract deployed to: ${contract.address}`);
    return contract.address;
  } catch (error) {
    console.error('Error deploying contract:', error);
    process.exit(1);
  }
}

function updateEnvFile(contractAddress) {
  try {
    console.log('Updating .env file with contract address...');
    
    // Read the .env file
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update the CONTRACT_ADDRESS variable
    if (envContent.includes('CONTRACT_ADDRESS=')) {
      envContent = envContent.replace(
        /CONTRACT_ADDRESS=.*/,
        `CONTRACT_ADDRESS=${contractAddress}`
      );
    } else {
      envContent += `\nCONTRACT_ADDRESS=${contractAddress}\n`;
    }
    
    // Write the updated content back to the .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log('.env file updated successfully!');
  } catch (error) {
    console.error('Error updating .env file:', error);
  }
}

// Run the deployment script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });