#!/usr/bin/env node
/**
 * Layout Complexity Checker (R31)
 * Validates layout trees against complexity constraints before storage
 */

import fs from 'fs';

const MAX_DEPTH = 14;
const MAX_NODES = 320;

/**
 * Recursively count nodes and depth in layout structure
 */
function analyzeLayoutTree(tree, currentDepth = 0) {
  if (!tree || typeof tree !== 'object' || Array.isArray(tree)) {
    return { valid: false, error: 'Invalid tree root' };
  }

  let totalNodes = 1;
  let maxDepth = currentDepth;
  
  for (const key of Object.keys(tree)) {
    const value = tree[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        const result = analyzeLayoutTree(item, currentDepth + 1);
        totalNodes += result.nodes || 0;
        maxDepth = Math.max(maxDepth, result.maxDepth || currentDepth + 1);
      }
    } else if (typeof value === 'object' && value !== null) {
      const result = analyzeLayoutTree(value, currentDepth + 1);
      totalNodes += result.nodes || 0;
      maxDepth = Math.max(maxDepth, result.maxDepth || currentDepth + 1);
    }
  }

  return { nodes: totalNodes, maxDepth };
}

/**
 * Check layout complexity against limits
 */
function checkLayoutComplexity(tree) {
  const stats = analyzeLayoutTree(tree);
  
  const issues: Array<{rule: string; severity: 'error' | 'warning'; message: string}> = [];
  
  if (stats.maxDepth > MAX_DEPTH) {
    issues.push({
      rule: 'MAX_DEPTH',
      severity: 'error',
      message: `Layout depth ${stats.maxDepth} exceeds maximum allowed ${MAX_DEPTH}`,
    });
  } else {
    console.log(`✓ Layout depth: ${stats.maxDepth}/${MAX_DEPTH}`);
  }
  
  if (stats.nodes > MAX_NODES) {
    issues.push({
      rule: 'MAX_NODES',
      severity: 'error',
      message: `Layout node count ${stats.nodes} exceeds maximum allowed ${MAX_NODES}`,
    });
  } else {
    console.log(`✓ Layout nodes: ${stats.nodes}/${MAX_NODES}`);
  }

  return {
    valid: issues.length === 0,
    issues,
    stats: { maxDepth: stats.maxDepth, totalNodes: stats.nodes },
  };
}

/**
 * Analyze layout for potential performance issues
 */
function analyzeLayoutPerformance(tree) {
  const deepNestingScore = 0; // Will be calculated based on structure
  const itemCount = 0; // Will be calculated
  
  let totalItems = 0;
  let maxZoneDepth = 0;
  
  function countItemsAndDepth(node, depth = 0) {
    if (!node || typeof node !== 'object') return { items: 0, maxDepth: depth };
    
    let items = 0;
    let localMaxDepth = depth;
    
    for (const key of Object.keys(node)) {
      const value = node[key];
      
      if (Array.isArray(value)) {
        for (const item of value) {
          items += 1; // Each item in a zone
          const result = countItemsAndDepth(item, depth + 1);
          items += result.items;
          localMaxDepth = Math.max(localMaxDepth, result.maxDepth);
        }
      } else if (typeof value === 'object' && value !== null) {
        const result = countItemsAndDepth(value, depth + 1);
        items += result.items;
        localMaxDepth = Math.max(localMaxDepth, result.maxDepth);
      }
    }
    
    return { items, maxDepth: localMaxDepth };
  }
  
  const stats = countItemsAndDepth(tree);
  totalItems = stats.items;
  maxZoneDepth = stats.maxDepth - 1; // Subtract root depth
  
  return {
    totalItems,
    maxZoneDepth,
    hasOptimizationHints: false, // Could add hints here in future
  };
}

/**
 * Validate layout structure completeness
 */
function validateLayoutCompleteness(tree) {
  const requiredKeys = ['screens'];
  
  for (const key of requiredKeys) {
    if (!(key in tree)) {
      return { valid: false, missingKeys: [key] };
    }
  }
  
  // Check screens array
  const screens = tree.screens;
  if (!Array.isArray(screens) || screens.length === 0) {
    return { valid: false, missingKeys: ['screens'] };
  }
  
  for (let i = 0; i < screens.length; i++) {
    const screen = screens[i];
    if (!screen.screen_id || !screen.composition) {
      return { 
        valid: false, 
        missingKeys: [`Screen ${i + 1}: screen_id or composition`},
      };
    }
    
    const composition = screen.composition;
    if (composition.type && composition.type !== 'shell' && composition.type !== 'screen') {
      return { 
        valid: false, 
        missingKeys: [`Screen ${i + 1}: unsupported type ${composition.type}`},
      };
    }
    
    if (!Array.isArray(composition.zones) || composition.zones.length === 0) {
      return { valid: false, missingKeys: [`Screen ${i + 1}: zones`},
      };
    }
    
    for (let j = 0; j < composition.zones.length; j++) {
      const zone = composition.zones[j];
      if (!zone.id) {
        return { 
          valid: false, 
          missingKeys: [`Screen ${i + 1}, Zone ${j + 1}: id`},
        };
      }
      
      if (!Array.isArray(zone.items) || zone.items.length === 0) {
        return { 
          valid: false, 
          missingKeys: [`Screen ${i + 1}, Zone ${j + 1}: items`},
        };
      }
    }
  }
  
  return { valid: true };
}

export { checkLayoutComplexity, analyzeLayoutPerformance, validateLayoutCompleteness };
