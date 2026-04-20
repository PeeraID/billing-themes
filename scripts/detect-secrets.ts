#!/usr/bin/env node
/**
 * Secret/PII Detection Script (R30)
 * Scans repository for potential secrets, PII, and sensitive data
 */

import fs from 'fs';

const COMMON_SECRET_PATTERNS = [
  { name: 'GitHub Token', pattern: /ghp_[A-Za-z0-9]{36}/ },
  { name: 'GitHub App Token', pattern: /gho_[A-Za-z0-9]{36}/ },
  { name: 'Personal Access Token', pattern: /github_pat_[A-Za-z0-9]+\.[A-Za-z0-9]+/ },
  { name: 'Generic API Key', pattern: /(?:api[_\-]?key|apikey)\s*[=:]\s*["']?([A-Za-z0-9_\-]{20,})["'?]/gi },
  { name: 'AWS Access Key', pattern: /AKIA[AI09VU][KZTFX ][QJGSN ]/ },
  { name: 'AWS Secret Key', pattern: /[A-Za-z0-9\/+=]{40}/ },
  { name: 'Private Key Header', pattern: /-----BEGIN (?:RSA |DSA |EC )?PRIVATE KEY-----/i },
  { name: 'Secret Password', pattern: /(password|passwd|pwd)\s*[=:]\s*["']?([^"'\n\r]{4,})["'?]/gi },
  { name: 'Stripe Key', pattern: /sk_live_[A-Za-z0-9]{24,}/ },
  { name: 'Secret Stripe Key', pattern: /rk_live_[A-Za-z0-9]{24,}/ },
];

const PII_PATTERNS = [
  { name: 'Email (partial)', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ },
  { name: 'SSN-like', pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/ },
  { name: 'Phone (US)', pattern: /\(\d{3}\)\s*\d{3}[-.]?\d{4}/ },
];

/**
 * Scan file content for secrets and PII
 */
function scanFileForSecrets(filePath) {
  const results = {
    filePath,
    secrets: [] as Array<{type: string; line: number; match: string}>,
    pii: [],
    warnings: [] as Array<{message: string; severity?: 'info' | 'warning' | 'error'}>,
  };

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines and obvious non-code files
      if (!line.trim() || line.includes('//') || line.includes('/*')) {
        continue;
      }

      // Check for secrets
      for (const secretPattern of COMMON_SECRET_PATTERNS) {
        const matches = line.match(secretPattern.pattern);
        if (matches) {
          results.secrets.push({
            type: `SECRET:${secretPattern.name}`,
            line: i + 1,
            match: matches[0],
          });
        }
      }

      // Check for PII (less strict, more warnings)
      for (const piiPattern of PII_PATTERNS) {
        const matches = line.match(piiPattern.pattern);
        if (matches && piiPattern.name.includes('Email')) {
          // Email in comments/config is common and usually safe
          results.warnings.push({
            message: `Possible ${piiPattern.name}: "${matches[0].substring(0, 20)}..."`,
            severity: 'info',
          });
        }
      }
    }
  } catch (error) {
    // Skip files we can't read
    results.warnings.push({ message: `Could not read file: ${error.message}`, severity: 'warning' });
  }

  return results;
}

/**
 * Scan directory recursively for secrets and PII
 */
function scanDirectoryForSecrets(dir, maxDepth = 3) {
  const allResults = [] as ReturnType<typeof scanFileForSecrets>[];

  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Skip node_modules, .git, etc.
        if (file === 'node_modules' || file === '.git') {
          continue;
        }
        
        const relativeDir = path.relative('.', dir);
        scanDirectoryForSecrets(filePath, maxDepth - 1);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || 
                 file.endsWith('.js') || file.endsWith('.jsx') ||
                 file.endsWith('.json') || file.endsWith('.yml') || 
                 file.endsWith('.yaml') || file.endsWith('.env')) {
        allResults.push(scanFileForSecrets(filePath));
      }
    }
  } catch (error) {
    // Directory listing failed
  }

  return allResults;
}

/**
 * Generate report of findings
 */
function generateReport(results: ReturnType<typeof scanDirectoryForSecrets>[]) {
  let totalSecrets = 0;
  let totalPii = 0;
  
  for (const result of results) {
    if (result.secrets.length > 0 || result.pii.length > 0) {
      console.log(`\n--- ${result.filePath} ---`);
      
      for (const secret of result.secrets) {
        console.log(`  🔴 SECRET: ${secret.type}`);
        console.log(`     Line ${secret.line}: ${secret.match.substring(0, 50)}...`);
        totalSecrets++;
      }
      
      for (const pii of result.pii) {
        console.log(`  🟠 PII: ${pii.name} found on line ${pii.line}`);
        totalPii++;
      }
      
      if (result.warnings.length > 0) {
        console.log('\n  ⚠️ Warnings:');
        for (const warning of result.warnings) {
          console.log(`     ${warning.severity}: ${warning.message}`);
        }
      }
    }
  }

  console.log(`\n\n=== SUMMARY ===`);
  console.log(`Total secrets found: ${totalSecrets}`);
  console.log(`Total PII occurrences: ${totalPii}`);
  
  return { totalSecrets, totalPii };
}

export { scanFileForSecrets, scanDirectoryForSecrets, generateReport };
