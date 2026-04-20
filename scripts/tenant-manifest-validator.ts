#!/usr/bin/env node

/**
 * Tenant manifest validator - ensures tenant layouts match existing manifests
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import type { LayoutArtifactTree } from '../../src/contracts/layout-artifact/layoutArtifactSchema';

const TENANTS_DIR = join(__dirname, '..', 'designs', 'tenants');
const TEMPLATES_DIR = join(__dirname, '..', 'designs', 'templates');

export interface TenantManifestValidator {
  validateTenantLayout: (layoutTree: LayoutArtifactTree) => string[];
  validateAgainstExisting: (layoutTree: LayoutArtifactTree, tenantCode: string) => void;
}

/**
 * Validate that layout tree matches existing tenant manifest structure
 */
export const validateTenantLayout = (layoutTree: LayoutArtifactTree): string[] => {
  const errors: string[] = [];

  // R28 - Check layout tree depth (max 14 levels)
  const depth = getTreeDepth(layoutTree.composition);
  if (depth > 14) {
    errors.push(`Layout tree depth exceeds maximum of 14 (actual: ${depth})`);
  }

  // R29 - Check node count (max 320 nodes)
  const nodeCount = getTreeNodeCount(layoutTree);
  if (nodeCount > 320) {
    errors.push(`Layout tree node count exceeds maximum of 320 (actual: ${nodeCount})`);
  }

  // Check for forbidden paths (R31a)
  const forbiddenPaths = ['/billing-api', '/internal/', '/admin/'];
  const pathViolation = checkPathViolation(layoutTree, forbiddenPaths);
  if (pathViolation) {
    errors.push(`Forbidden path detected: ${pathViolation}`);
  }

  // Check for secrets/PII (R31b)
  const securityViolation = detectSecretsInLayout(layoutTree);
  if (securityViolation) {
    errors.push(`Security violation detected: ${securityViolation}`);
  }

  return errors;
};

/**
 * Get depth of layout tree composition
 */
export const getTreeDepth = (composition: any): number => {
  let maxDepth = 0;
  
  const traverse = (node: any, currentDepth: number) => {
    if (!node || typeof node !== 'object') return;
    
    for (const [key, value] of Object.entries(node)) {
      if (Array.isArray(value)) {
        value.forEach(item => traverse(item, currentDepth + 1));
      } else if (typeof value === 'object' && value !== null) {
        traverse(value, currentDepth + 1);
      }
    }
    
    maxDepth = Math.max(maxDepth, currentDepth);
  };
  
  traverse(composition, 0);
  return maxDepth;
};

/**
 * Count total nodes in layout tree
 */
export const getTreeNodeCount = (layoutTree: LayoutArtifactTree): number => {
  let count = 0;
  
  // Count screens
  if (Array.isArray(layoutTree.screens)) {
    count += layoutTree.screens.length;
    
    layoutTree.screens.forEach(screen => {
      if (screen && typeof screen === 'object' && screen.zones) {
        if (Array.isArray(screen.zones)) {
          count += screen.zones.length;
          
          screen.zones.forEach(zone => {
            if (zone && typeof zone === 'object') {
              for (const [key, value] of Object.entries(zone)) {
                if (Array.isArray(value)) {
                  count += value.length;
                } else if (typeof value === 'object' && value !== null) {
                  count++;
                }
              }
            }
          });
        }
      }
    });
  }
  
  // Count composition zones
  if (layoutTree.composition && typeof layoutTree.composition === 'object') {
    for (const [key, value] of Object.entries(layoutTree.composition)) {
      if (Array.isArray(value)) {
        count += value.length;
      } else if (typeof value === 'object' && value !== null) {
        count++;
      }
    }
  }
  
  // Add base layout structure
  count += 5; // screens, composition, zones as top-level
  
  return count;
};

/**
 * Check for forbidden paths in layout tree
 */
export const checkPathViolation = (layoutTree: LayoutArtifactTree, forbiddenPaths: string[]): string | null => {
  const findPathString = (node: any): string | null => {
    if (!node || typeof node !== 'object') return null;
    
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'string' && forbiddenPaths.includes(value)) {
        return value;
      }
      
      if (Array.isArray(value)) {
        const result = findPathStringInArray(value);
        if (result) return result;
      } else if (typeof value === 'object' && value !== null) {
        const result = findPathString(value);
        if (result) return result;
      }
    }
    
    return null;
  };
  
  const findPathStringInArray = (arr: any[]): string | null => {
    for (const item of arr) {
      if (typeof item === 'string') {
        const match = forbiddenPaths.find(path => item.includes(path));
        if (match) return match;
      } else if (typeof item === 'object' && item !== null) {
        const result = findPathString(item);
        if (result) return result;
      }
    }
    return null;
  };
  
  return findPathString(layoutTree);
};

/**
 * Detect secrets and PII in layout tree
 */
export const detectSecretsInLayout = (layoutTree: LayoutArtifactTree): string | null => {
  const secretPatterns = [
    /api[_-]?key/i,
    /password/i,
    /secret/i,
    /token/i,
    /auth[_-]?code/i,
    /\$\{/,
    /\/\/[\w\s]*[A-Z0-9]{16,}/i, // API keys
  ];
  
  const secretKeywords = [
    'password', 'passwd', 'secret_key', 'api_key', 
    'apikey', 'access_token', 'auth_token'
  ].map(k => k.toLowerCase());

  const findSecrets = (node: any): string | null => {
    if (!node || typeof node !== 'object') return null;
    
    for (const [key, value] of Object.entries(node)) {
      // Check key names
      const lowerKey = key.toLowerCase();
      const isSensitiveKey = secretKeywords.some(kw => lowerKey.includes(kw));
      if (isSensitiveKey) {
        return `Sensitive key detected in layout structure: ${key}`;
      }
      
      // Check string values for secrets/PII
      if (typeof value === 'string') {
        const match = secretPatterns.find(pattern => pattern.test(value));
        if (match) {
          return `Potential secret or PII detected in value "${value}": ${match}`;
        }
        
        // Email detection (PII)
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return `PII detected: email address found in layout`;
        }
        
        // Phone number detection (PII)
        if (/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./]?[0-9]{3}[-\s\./]?[0-9]{3}[-\s\./]?[0-9]{4}$/.test(value)) {
          return `PII detected: phone number found in layout`;
        }
      } else if (Array.isArray(value)) {
        const result = findSecretsInArray(value);
        if (result) return result;
      } else if (typeof value === 'object' && value !== null) {
        const result = findSecrets(value);
        if (result) return result;
      }
    }
    
    return null;
  };
  
  const findSecretsInArray = (arr: any[]): string | null => {
    for (const item of arr) {
      if (typeof item === 'string') {
        const match = secretPatterns.find(pattern => pattern.test(item));
        if (match) return `Potential secret detected in array: "${item}"`;
      } else if (typeof item === 'object' && item !== null) {
        const result = findSecrets(item);
        if (result) return result;
      }
    }
    return null;
  };
  
  return findSecrets(layoutTree);
};

/**
 * Validate against existing tenant manifest
 */
export const validateAgainstExistingManifest = async (
  layoutTree: LayoutArtifactTree,
  tenantCode: string
): Promise<void> => {
  try {
    // Check if tenant has a manifest in designs/tenants/{tenant_code}/manifest.json
    const tenantDir = join(TENANTS_DIR, tenantCode);
    const manifests = await readdirAsync(tenantDir);
    
    const manifestFile = manifests.find(f => f.startsWith('manifest'));
    if (!manifestFile) {
      // No existing manifest - allow new tenant layouts
      return;
    }
    
    // Read existing manifest for comparison
    const manifestPath = join(tenantDir, manifestFile);
    const manifestData = await readFileSync(manifestPath, 'utf8');
    const existingManifest = JSON.parse(manifestData) as { screens: any[] };
    
    // Compare screen keys to ensure compatibility (R30)
    const existingScreenKeys = new Set(existingManifest.screens.map(s => s.key));
    const layoutScreenKeys = new Set(layoutTree.screens?.map(s => s.key) || []);
    
    const missingScreens = Array.from(existingScreenKeys).filter(key => !layoutScreenKeys.has(key));
    if (missingScreens.length > 0) {
      console.warn(`Missing screens from existing manifest: ${missingScreens.join(', ')}`);
    }
    
  } catch (error) {
    console.error('Failed to validate against tenant manifest:', error);
    throw error;
  }
};

export default {
  validateTenantLayout,
  getTreeDepth,
  getTreeNodeCount,
  checkPathViolation,
  detectSecretsInLayout,
  validateAgainstExistingManifest
};
