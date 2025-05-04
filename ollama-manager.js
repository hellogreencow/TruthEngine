/**
 * Truth Engine - Ollama Manager
 * Handles Ollama service detection, startup, and model management
 */

import { exec, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';

// Set up colored logging (matches server.js)
const log = {
  info: (...args) => { console.log('\x1b[36m[INFO]\x1b[0m', ...args); return args.join(' '); },
  warn: (...args) => { console.log('\x1b[33m[WARN]\x1b[0m', ...args); return args.join(' '); },
  error: (...args) => { console.log('\x1b[31m[ERROR]\x1b[0m', ...args); return args.join(' '); },
  success: (...args) => { console.log('\x1b[32m[SUCCESS]\x1b[0m', ...args); return args.join(' '); },
};

/**
 * Simple HTTP request function
 */
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

/**
 * Checks if Ollama is installed on the system
 */
async function isOllamaInstalled() {
  try {
    // Try to detect Ollama in different ways based on platform
    const platform = os.platform();
    
    if (platform === 'darwin') { // macOS
      try {
        execSync('which ollama', { stdio: 'ignore' });
        return true;
      } catch (e) {
        return fs.existsSync('/usr/local/bin/ollama') || fs.existsSync('/opt/homebrew/bin/ollama');
      }
    } else if (platform === 'linux') {
      try {
        execSync('which ollama', { stdio: 'ignore' });
        return true;
      } catch (e) {
        return fs.existsSync('/usr/bin/ollama') || fs.existsSync('/usr/local/bin/ollama');
      }
    } else if (platform === 'win32') { // Windows
      try {
        execSync('where ollama', { stdio: 'ignore' });
        return true;
      } catch (e) {
        // Check common Windows install locations
        return fs.existsSync('C:\\Program Files\\Ollama\\ollama.exe') || 
               fs.existsSync(path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Ollama', 'ollama.exe'));
      }
    }
    
    return false;
  } catch (error) {
    log.error(`Error checking if Ollama is installed: ${error.message}`);
    return false;
  }
}

/**
 * Checks if Ollama service is running
 */
async function isOllamaRunning(ollamaUrl = 'http://localhost:11434') {
  try {
    const response = await request(`${ollamaUrl}/api/tags`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Starts the Ollama service
 */
async function startOllama() {
  return new Promise((resolve, reject) => {
    log.info('Starting Ollama service...');
    
    // Different start command based on platform
    const platform = os.platform();
    let startCmd = 'ollama serve';
    
    // On Windows, we might need to use a different approach
    if (platform === 'win32') {
      startCmd = 'start /B ollama serve';
    }
    
    const ollamaProcess = exec(startCmd, (error) => {
      if (error) {
        log.error(`Failed to start Ollama: ${error.message}`);
        reject(error);
      }
    });
    
    // Wait for Ollama to start
    let attempts = 0;
    const maxAttempts = 10;
    const checkInterval = setInterval(async () => {
      attempts++;
      if (await isOllamaRunning()) {
        clearInterval(checkInterval);
        log.success('Ollama service started successfully');
        resolve(true);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        log.error('Failed to start Ollama service after multiple attempts');
        reject(new Error('Failed to start Ollama service'));
      }
    }, 2000);
    
    // Log any output from the Ollama process
    ollamaProcess.stdout?.on('data', (data) => {
      console.log(`\x1b[90m[OLLAMA]\x1b[0m ${data.toString().trim()}`);
    });
    
    ollamaProcess.stderr?.on('data', (data) => {
      console.error(`\x1b[90m[OLLAMA ERROR]\x1b[0m ${data.toString().trim()}`);
    });
  });
}

/**
 * Checks if a specific model is available in Ollama
 */
async function isModelAvailable(modelName, ollamaUrl = 'http://localhost:11434') {
  try {
    const response = await request(`${ollamaUrl}/api/tags`);
    if (!response.ok) return false;
    
    try {
      const models = JSON.parse(response.data).models || [];
      return models.some(model => model.name === modelName);
    } catch (e) {
      log.error(`Error parsing Ollama models response: ${e.message}`);
      return false;
    }
  } catch (error) {
    log.error(`Error checking model availability: ${error.message}`);
    return false;
  }
}

/**
 * Downloads a model for Ollama
 */
async function downloadModel(modelName) {
  return new Promise((resolve, reject) => {
    log.info(`Downloading model ${modelName} - this may take a while...`);
    
    const dlProcess = exec(`ollama pull ${modelName}`, (error) => {
      if (error) {
        log.error(`Failed to download model ${modelName}: ${error.message}`);
        reject(error);
      } else {
        log.success(`Model ${modelName} successfully downloaded`);
        resolve(true);
      }
    });
    
    // Log download progress
    dlProcess.stdout?.on('data', (data) => {
      // Only log lines that contain download progress info
      const line = data.toString().trim();
      if (line.includes('pulling') || line.includes('downloading') || line.includes('verifying') || line.includes('done')) {
        console.log(`\x1b[90m[OLLAMA DOWNLOAD]\x1b[0m ${line}`);
      }
    });
  });
}

/**
 * Main function to ensure Ollama is ready with the required model
 */
export async function ensureOllamaReady(requiredModel = 'qwen2.5:7b') {
  try {
    // Step 1: Check if Ollama is installed
    const isInstalled = await isOllamaInstalled();
    if (!isInstalled) {
      log.error(`Ollama is not installed on your system. Please install it from https://ollama.ai/download`);
      log.info(`After installing, restart the Truth Engine server.`);
      return false;
    }
    
    // Step 2: Check if Ollama is running, start if not
    const isRunning = await isOllamaRunning();
    if (!isRunning) {
      try {
        await startOllama();
      } catch (error) {
        log.error(`Failed to start Ollama: ${error.message}`);
        log.info(`Please start Ollama manually and restart the Truth Engine server.`);
        return false;
      }
    }
    
    // Step 3: Check if the required model is available, download if not
    const modelAvailable = await isModelAvailable(requiredModel);
    if (!modelAvailable) {
      log.info(`Required model '${requiredModel}' is not available in Ollama`);
      try {
        await downloadModel(requiredModel);
      } catch (error) {
        log.error(`Failed to download model ${requiredModel}: ${error.message}`);
        log.info(`You can try downloading it manually with: ollama pull ${requiredModel}`);
        return false;
      }
    } else {
      log.success(`Required model '${requiredModel}' is available in Ollama`);
    }
    
    return true;
  } catch (error) {
    log.error(`Error ensuring Ollama is ready: ${error.message}`);
    return false;
  }
}