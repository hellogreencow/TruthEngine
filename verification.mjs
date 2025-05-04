/**
 * Universal Twitter Verification System - Test Script
 * Allows testing verification logic using direct Ollama calls for isolated testing.
 * Incorporates current date/time for temporal context.
 */

// Use ES Module imports at the top level for Node built-ins
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import readline from "readline";
import { fileURLToPath } from 'url';

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up colored logging
const log = {
  info: (...args) => console.log('\x1b[36m[INFO]\x1b[0m', ...args),
  warn: (...args) => console.log('\x1b[33m[WARN]\x1b[0m', ...args),
  error: (...args) => console.log('\x1b[31m[ERROR]\x1b[0m', ...args),
  success: (...args) => console.log('\x1b[32m[SUCCESS]\x1b[0m', ...args),
  result: (...args) => console.log('\x1b[35m[RESULT]\x1b[0m', ...args)
};

// Simple HTTP/HTTPS request function (Used by Ollama Direct Mode)
function request(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;
    
    const req = lib.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(body);
            resolve({ ok: true, status: res.statusCode, data: json });
          } catch (e) {
            resolve({ ok: true, status: res.statusCode, data: body });
          }
        } else {
          resolve({ ok: false, status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

// Get Firecrawl API key (Used by both modes)
function getApiKey(runtime = null) { 
  if (runtime && typeof runtime.getSetting === 'function') {
      const key = runtime.getSetting("FIRECRAWL_API_KEY");
      if (key) return key;
  }
  if (process.env.FIRECRAWL_API_KEY) {
    return process.env.FIRECRAWL_API_KEY;
  }
  try {
    const envPath = path.resolve(__dirname, '.env'); // Use path.resolve
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/FIRECRAWL_API_KEY=([^\r\n]+)/);
      if (match && match[1]) return match[1];
    }
  } catch (error) {
    log.error("Error reading .env file:", error.message);
  }
  return null; 
}

// Helper to get other keys from env/.env
function getEnvVar(key) {
    if (process.env[key]) {
        return process.env[key];
    }
     try {
        const envPath = path.resolve(__dirname, '.env'); // Use path.resolve
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            const match = content.match(new RegExp(`^${key}=([^\r\n]+)`, 'm'));
            if (match && match[1]) return match[1];
        }
    } catch (error) {
        // ignore
    }
    return null;
}


// --- Ollama Direct Mode Functions ---
// (Remain unchanged)

async function searchFirecrawlDirect(query, apiKey) {
  log.info(`(Direct) Searching Firecrawl for: "${query}"`);
  if (!apiKey) {
      log.error("Firecrawl API Key missing for direct search.");
      return null;
  }
  try {
    const enhancedQuery = query;
    log.info(`(Direct) Using query: "${enhancedQuery}"`);
    
    const response = await request("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    }, {
      query: enhancedQuery,
      limit: 10, 
      country: "us",
      scrapeOptions: {
        onlyMainContent: true, 
        formats: ["markdown"] 
      }
    });
    
    if (!response.ok) {
      log.error(`(Direct) API error: ${response.status}`);
      return null;
    }
    
    log.success(`(Direct) Search successful: ${response.data?.data?.length || 0} results`);
    return response.data; 
  } catch (error) {
    log.error(`(Direct) Search error: ${error.message}`);
    return null;
  }
}

async function analyzeWithOllama(tweet, currentDateTime) {
   log.info("(Direct) Analyzing claims using Ollama...");
   const ollamaUrl = getEnvVar("OLLAMA_URL") || "http://localhost:11434"; 
  try {
    try {
      const check = await request(`${ollamaUrl}/api/tags`); 
      if (!check.ok) throw new Error(`Ollama not available at ${ollamaUrl}`);
      
      const models = check.data.models?.map(m => m.name) || [];
      const model = models.find(m => m.includes("llama") || m.includes("mistral")) || models[0] || "llama3";
      log.info(`(Direct) Using Ollama model for claim extraction: ${model}`);
      
      const response = await request(`${ollamaUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      }, {
        model,
        prompt: `
You are an expert fact-checker analyzing a tweet. The current date and time is ${currentDateTime}.

TWEET:
"${tweet}"

Instructions:
1. Identify ALL distinct factual claims made in the tweet that could potentially be verified through web search. Claims can be numerical, statistical, or statements of fact.
2. For each claim, extract the exact text segment representing the claim.
3. For each claim, generate 2-3 diverse and specific search queries that could be used to find authoritative information to verify or refute the claim. Focus on finding primary sources or reputable reporting, considering the current date for relevance (e.g., add "current", "latest", "${new Date().getFullYear()}" to queries where appropriate).
4. Output the results strictly as a JSON object matching the provided schema.

{
  "claims": [
    {
      "claimText": "The exact text segment of the claim from the tweet.",
      "searchQueries": [
        "Specific search query 1",
        "Specific search query 2",
        "Potentially a third specific query"
      ]
    }
    // ... more claims if found
  ]
}

Ensure the output is ONLY the JSON object, with no introductory text or explanations.`,
        stream: false
      });
      
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      try {
        let responseText = response.data.response;
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            responseText = jsonMatch[1];
        }
        const result = JSON.parse(responseText);
        if (result.claims && Array.isArray(result.claims)) {
          return result.claims;
        }
      } catch (parseError) {
        const match = response.data.response.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const extracted = JSON.parse(match[0]);
            if (extracted.claims && Array.isArray(extracted.claims)) {
              return extracted.claims;
            }
          } catch (e) {}
        }
      }
      log.warn("(Direct) Ollama response did not contain valid JSON for claims.");
    } catch (ollamaError) {
      log.warn(`(Direct) Ollama unavailable for claim extraction: ${ollamaError.message}`);
    }
  } catch (error) {
    log.error(`(Direct) Claim analysis error: ${error.message}`);
  }
  return [];
}

async function analyzeSearchResultsWithOllama(claimText, searchResultsText, currentDateTime) {
  log.info(`(Direct) Analyzing search results for claim: "${claimText}"`);
  const ollamaUrl = getEnvVar("OLLAMA_URL") || "http://localhost:11434";
  if (!searchResultsText || searchResultsText.trim().length === 0) {
    log.warn("(Direct) No search result text to analyze.");
    return null;
  }

  try {
    const check = await request(`${ollamaUrl}/api/tags`);
    if (!check.ok) throw new Error(`Ollama not available at ${ollamaUrl} for result analysis`);

    const models = check.data.models?.map(m => m.name) || [];
    const model = models.find(m => m.includes("llama") || m.includes("mistral")) || models[0] || "llama3";
    log.info(`(Direct) Using Ollama model for analysis: ${model}`);

    const prompt = `
You are a meticulous fact-checker analyzing search results to verify a specific claim from a tweet. The current date and time is ${currentDateTime}.

Original Claim from Tweet:
"${claimText}"

Combined Search Results Text:
--- START RESULTS ---
${searchResultsText.substring(0, 3500)} 
--- END RESULTS --- 
(Note: Results may be truncated for brevity)

Instructions:
1. Carefully read the Original Claim.
2. Analyze the Combined Search Results Text to find the most credible and relevant information that directly verifies or refutes the Original Claim. Pay attention to dates mentioned in the results to assess timeliness relative to the current date (${currentDateTime}).
3. Prioritize information from authoritative sources if identifiable (e.g., official statistics, reputable news, scientific studies mentioned in the text) and information that is most recent.
4. Extract the single most accurate fact or value found that addresses the claim.
5. Identify the source URL or domain where this fact was found, if possible from the results text (look for 'Source: ...' lines).
6. Determine if the extracted fact confirms, refutes, or is unrelated to the original claim, considering its timeliness.
7. Output the results strictly as a JSON object matching the provided schema.

{
  "verifiedFact": "The single most accurate fact or value found (e.g., '3.9%', '1.1°C', 'confirmed by BLS report'). State 'Not Found' if no relevant fact is identified.",
  "source": "The source URL or domain name (e.g., 'bls.gov', 'example.com/article', 'Source mentioned in text'). State 'Unknown' if not identifiable.",
  "status": "One of: 'Confirms', 'Refutes', 'Outdated', 'Unrelated', 'Uncertain'" 
}

Ensure the output is ONLY the JSON object, with no introductory text or explanations.`;

    const response = await request(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    }, {
      model,
      prompt,
      stream: false,
      options: { 
        temperature: 0.2 
      }
    });

    if (!response.ok) throw new Error(`Ollama API error: ${response.status}`);

    try {
       let responseText = response.data.response;
       const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
       if (jsonMatch && jsonMatch[1]) {
           responseText = jsonMatch[1];
       }
      const result = JSON.parse(responseText);
      if (result && typeof result.verifiedFact === 'string' && typeof result.source === 'string' && typeof result.status === 'string') {
         log.success(`(Direct) Ollama analysis successful: Status - ${result.status}, Fact - ${result.verifiedFact}`);
        return result;
      }
    } catch (parseError) {
       const match = response.data.response.match(/\{[\s\S]*\}/);
       if (match) {
         try {
           const extracted = JSON.parse(match[0]);
            if (extracted && typeof extracted.verifiedFact === 'string' && typeof extracted.source === 'string' && typeof extracted.status === 'string') {
              log.success(`(Direct) Ollama analysis successful (extracted JSON): Status - ${extracted.status}, Fact - ${extracted.verifiedFact}`);
             return extracted;
           }
         } catch (e) {}
       }
    }
    log.warn("(Direct) Ollama response did not contain valid JSON analysis.");
    return null;

  } catch (error) {
    log.error(`(Direct) Ollama result analysis error: ${error.message}`);
    return null;
  }
}

async function rewriteTweetWithOllama(originalTweet, claimText, verifiedFact, source, currentDateTime) {
  log.info(`\n----- (Direct) TWEET REWRITE ATTEMPT (Ollama) -----`);
  const ollamaUrl = getEnvVar("OLLAMA_URL") || "http://localhost:11434";
  log.info(`Original claim text: "${claimText}"`);
  log.info(`Verified fact: ${verifiedFact} (${source})`);
  log.info(`Original tweet: "${originalTweet}"`);
  log.info(`Current time context: ${currentDateTime}`);

  try {
    const check = await request(`${ollamaUrl}/api/tags`);
    if (!check.ok) throw new Error(`Ollama not available at ${ollamaUrl} for rewriting`);

    const models = check.data.models?.map(m => m.name) || [];
    const model = models.find(m => m.includes("llama") || m.includes("mistral")) || models[0] || "llama3";
    log.info(`(Direct) Using Ollama model for rewriting: ${model}`);

    const sourceAttribution = source !== 'Unknown' ? ` (Source: ${source})` : '';

    const prompt = `
You are an expert tweet editor. Your task is to rewrite a given tweet to incorporate a verified fact, replacing an original claim. The current date and time is ${currentDateTime}.

Original Tweet:
"${originalTweet}"

Original Claim Segment Identified in Tweet:
"${claimText}"

Verified Fact:
"${verifiedFact}"

Source of Fact:
"${source}"

Instructions:
1. Locate the part of the Original Tweet that corresponds to the Original Claim Segment.
2. Rewrite that part of the tweet to accurately reflect the Verified Fact.
3. Incorporate the Source naturally into the rewritten segment, if the source is not 'Unknown'. Use a format like "(Source: [Source Name])".
4. Maintain the original tone and style of the tweet as much as possible.
5. Ensure the rewritten tweet is concise and ideally stays within typical Twitter character limits (though exact counting isn't required here). Add temporal context (like "as of [date]" or "currently") only if it makes sense and the verified fact implies it.
6. Output ONLY the complete rewritten tweet text. Do not include explanations, introductions, or the original tweet.

Rewritten Tweet:`; 

    const response = await request(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, {
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.5, 
        stop: ["\n\n", "Original Tweet:", "Rewritten Tweet:"] 
      }
    });

    if (!response.ok) throw new Error(`Ollama API error: ${response.status}`);

    const rewrittenTweet = response.data.response.trim();

    if (rewrittenTweet && rewrittenTweet !== originalTweet) {
      log.success(`(Direct) Ollama successfully rewrote tweet.`);
      log.info(`Rewritten Tweet: "${rewrittenTweet}"`);
      return rewrittenTweet;
    } else if (rewrittenTweet === originalTweet) {
       log.warn("(Direct) Ollama rewrite resulted in the original tweet. No changes applied.");
       return originalTweet;
    } else {
       log.warn("(Direct) Ollama rewrite resulted in empty content. No changes applied.");
       return originalTweet;
    }

  } catch (error) {
    log.error(`(Direct) Ollama tweet rewriting error: ${error.message}`);
    return originalTweet; // Fallback
  }
}

async function verifyTweetDirect(tweet, apiKey) {
  const currentDateTime = new Date().toISOString(); 
  log.info(`(Direct) Verification started at: ${currentDateTime}`);
  log.info("\n=== (Direct) INITIAL TWEET ===");
  log.info(tweet);
  
  log.info("\n=== (Direct) ANALYZING CLAIMS (Ollama) ===");
  const claims = await analyzeWithOllama(tweet, currentDateTime); 
  log.info(`(Direct) Extracted ${claims.length} claims to verify`);
  
  claims.forEach((claim, i) => {
    log.info(`(Direct) Claim ${i+1}: "${claim.claimText || 'N/A'}"`);
    log.info(`  Search Queries: ${claim.searchQueries?.join(' | ') || 'N/A'}`);
  });
  
  log.info("\n=== (Direct) VERIFYING CLAIMS ===");
  let verifiedTweet = tweet;
  const verificationResults = [];
  
  for (const claim of claims) {
    if (!claim.searchQueries || claim.searchQueries.length === 0) {
      log.warn(`(Direct) Skipping claim without search queries: "${claim.claimText}"`);
      continue;
    }
    
    const primarySearchQuery = claim.searchQueries[0];
    log.info(`(Direct) Searching for claim "${claim.claimText}" using query: "${primarySearchQuery}"`);
    const searchResponse = await searchFirecrawlDirect(primarySearchQuery, apiKey); 
    
    if (!searchResponse || !searchResponse.data || searchResponse.data.length === 0) {
      log.warn(`(Direct) No search results for claim: "${claim.claimText}" (Query: ${primarySearchQuery})`);
      continue;
    }
    
    const combinedResultsText = searchResponse.data
      .map(item => `Source: ${item.url || 'N/A'}\nTitle: ${item.title || ""}\nContent:\n${item.markdown || ""}`)
      .join("\n\n---\n\n");

    log.info(`(Direct) Analyzing ${searchResponse.data.length} search results with Ollama...`);
    const analysisResult = await analyzeSearchResultsWithOllama(claim.claimText, combinedResultsText, currentDateTime); 

    if (!analysisResult) {
      log.warn(`(Direct) LLM analysis failed for claim: "${claim.claimText}"`);
      continue;
    }
     
    if ((analysisResult.status === 'Confirms' || analysisResult.status === 'Refutes') && analysisResult.verifiedFact !== 'Not Found') {
        const oldTweet = verifiedTweet;
        verifiedTweet = await rewriteTweetWithOllama( 
            verifiedTweet, 
            claim.claimText, 
            analysisResult.verifiedFact, 
            analysisResult.source,
            currentDateTime 
        ); 

        if (verifiedTweet !== oldTweet) {
            log.success(`(Direct) Successfully updated tweet based on verification status: ${analysisResult.status}`);
            verificationResults.push({
                claim: claim.claimText,
                originalValue: claim.claimText.match(/(\d+(?:\.\d+)?%?)/)?.[0] || claim.claimText, 
                verifiedValue: analysisResult.verifiedFact, 
                source: analysisResult.source,
                status: analysisResult.status
            });
        } else {
             log.warn(`(Direct) Tweet rewrite attempt did not change the tweet for claim: "${claim.claimText}" (Status: ${analysisResult.status})`);
        }
    } else {
         log.info(`(Direct) No update applied for claim "${claim.claimText}" (Status: ${analysisResult.status}, Fact: ${analysisResult.verifiedFact})`);
    }
  }
  
  log.info("\n=== (Direct) VERIFICATION SUMMARY ===");
  if (verificationResults.length > 0) {
    verificationResults.forEach(result => {
      log.result(`(Direct) Claim: '${result.claim}' | Status: ${result.status} | Original: ${result.originalValue || '?'} | Verified: ${result.verifiedValue} (${result.source})`);
    });
  } else {
    log.warn("(Direct) No claims were successfully verified and updated");
  }
  
  log.info("\n=== (Direct) FINAL TWEET ===");
  log.info(verifiedTweet);
  
  return {
    originalTweet: tweet,
    verifiedTweet,
    changes: verificationResults.length,
    results: verificationResults
  };
}

// --- Test Setup & Execution ---

// Test tweets
const TEST_TWEETS = [
  "The economy is showing signs of improvement with unemployment at 3.7% but inflation remains high at 2.4% despite Fed's efforts.",
  "Apple's market share reached 23.4% in the smartphone market last quarter, while Google's Android maintains 76.1% global dominance.",
  "Global temperatures have risen by 1.2°C since pre-industrial times, with CO2 levels now at 419ppm, the highest in 800,000 years.",
  "New research shows 42.3% of adults are not getting enough sleep, which increases heart disease risk by 34% according to the study.",
  "Inflation is currently at an astronomical 10.1% percent, Americans are really starting to lose jobs with a 13% unemployment rate."
];

// Interactive tweet selection
function selectTweet() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log("\nSelect a tweet to verify:");
    TEST_TWEETS.forEach((tweet, i) => console.log(`${i+1}. ${tweet}`));
    console.log(`${TEST_TWEETS.length+1}. Enter custom tweet`);
    rl.question("\nEnter selection: ", answer => {
      rl.close();
      const num = parseInt(answer);
      if (num === TEST_TWEETS.length+1) {
        const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl2.question("\nEnter your tweet: ", tweet => { rl2.close(); resolve(tweet); });
      } else if (num >= 1 && num <= TEST_TWEETS.length) {
        resolve(TEST_TWEETS[num-1]);
      } else {
        resolve(TEST_TWEETS[0]); // Default
      }
    });
  });
}

// Main function
async function main() {
  try {
    log.info("Starting Universal Twitter Verification System Test");
    const apiKey = getApiKey();
    if (!apiKey) {
      log.warn("FIRECRAWL_API_KEY not found in environment or .env file. Search functionality will be unavailable.");
    } else {
      log.info("Firecrawl API key loaded successfully.");
    }
    
    const tweet = await selectTweet();
    log.info("--- Running Ollama Direct Test ---");
    await verifyTweetDirect(tweet, apiKey);
  } catch (error) {
    log.error("Error in main execution:", error);
  }
}

// Start the script
main();

