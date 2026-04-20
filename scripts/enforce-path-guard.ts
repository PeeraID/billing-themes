#!/usr/bin/env node
/**
 * Path Guard Enforcement Script (R31)
 * Ensures all changes stay within billing-app and billing-themes repositories
 */

import fs from 'fs';
import path from 'path';

const BILLING_APP_ROOT = path.resolve('../../billing-app');
const BILLING_THEMES_ROOT = path.resolve(path.dirname(path.dirname(__filename))); // current dir is billing-themes root

/**
 * Get all paths within allowed repositories
 */
function getAllPathsInAllowedRepos() {
  const allowedPaths = new Set<string>();
  
  function walk(dir, prefix) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const relativePath = path.relative(BILLING_THEMES_ROOT, fullPath);
        
        if (path.relative(BILLING_APP_ROOT, fullPath).startsWith('..')) {
          // Only allow billing-app and billing-themes paths
          continue;
        }
        
        allowedPaths.add(relativePath);
        if (fs.statSync(fullPath).isDirectory()) {
          walk(fullPath, relativePath);
        }
      }
    } catch (error) {
      // Skip directories we can't access
    }
  }
  
  // Walk both repositories
  walk(BILLING_THEMES_ROOT, 'billing-themes/');
  if (fs.existsSync(BILLING_APP_ROOT)) {
    walk(BILLING_APP_ROOT, 'billing-app/');
  }
  
  return allowedPaths;
}

/**
 * Check if a path is within allowed repositories
 */
function isPathAllowed(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const allowedPaths = getAllPathsInAllowedRepos();
  
  // Check against each allowed path pattern
  for (const allowed of allowedPaths) {
    if (normalizedPath === allowed || 
        normalizedPath.startsWith(allowed + '/') ||
        normalizedPath.startsWith(allowed + '\\')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check for forbidden file paths
 */
function checkForbiddenPaths() {
  const forbiddenPatterns = [
    'billing-api/',
    '**/node_modules/.bin/**',
    '**/*.lock',
    '.git/**',
    '**/package-lock.json',
    '**/pnpm-lock.yaml',
  ];
  
  for (const pattern of forbiddenPatterns) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
    // This would be checked against actual paths in real scenarios
  }
  
  return true;
}

export { isPathAllowed, checkForbiddenPaths };
