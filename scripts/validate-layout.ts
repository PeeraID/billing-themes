#!/usr/bin/env node
/**
 * Layout Artifact Validator
 * Validates layout trees against schema constraints (R28)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Maximum depth and node count as per layoutArtifactSchema.ts
const MAX_DEPTH = 14;
const MAX_NODES = 320;

/**
 * Count nodes in layout tree structure
 */
function countLayoutNodes(node, depth) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return { nodes: 1, maxDepth: depth };
  }

  if (Array.isArray(node)) {
    return node.reduce(
      (acc, item) => {
        const next = countLayoutNodes(item, depth + 1);
        return {
          nodes: acc.nodes + next.nodes,
          maxDepth: Math.max(acc.maxDepth, next.maxDepth),
        };
      },
      { nodes: 1, maxDepth: depth }
    );
  }

  return Object.values(node).reduce(
    (acc, item) => {
      const next = countLayoutNodes(item, depth + 1);
      return {
        nodes: acc.nodes + next.nodes,
        maxDepth: Math.max(acc.maxDepth, next.maxDepth),
      };
    },
    { nodes: 1, maxDepth: depth }
  );
}

/**
 * Validate layout tree against constraints
 */
function validateLayoutTree(tree) {
  if (!tree || typeof tree !== 'object') {
    return { valid: false, error: 'Layout tree must be an object.' };
  }

  const stats = countLayoutNodes(tree, 1);
  
  if (stats.maxDepth > MAX_DEPTH) {
    return { 
      valid: false, 
      error: `Layout tree exceeds max depth (${MAX_DEPTH}). Current depth: ${stats.maxDepth}` 
    };
  }
  
  if (stats.nodes > MAX_NODES) {
    return { 
      valid: false, 
      error: `Layout tree exceeds max node count (${MAX_NODES}). Current count: ${stats.nodes}` 
    };
  }

  // Must have screens array with at least one screen
  const screens = tree.screens;
  if (!Array.isArray(screens) || screens.length === 0) {
    return { valid: false, error: 'Layout tree must define at least one screen composition.' };
  }

  return { valid: true };
}

/**
 * Hash a string to produce an 8-character hex string (SHA8-like)
 */
function hashToSha8(str) {
  let hash = 0;
  const strBytes = new TextEncoder().encode(str);
  
  for (let i = 0; i < strBytes.length; i++) {
    const byte = strBytes[i];
    hash = ((hash << 5) - hash) + byte;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Generate SHA8 key for layout family versioning
 */
function generateLayoutFamilyKey(canonicalUrl) {
  const prefix = 'src_';
  const hash = hashToSha8(canonicalUrl);
  return `${prefix}${hash}`;
}

export {
  validateLayoutTree,
  countLayoutNodes,
  hashToSha8,
  generateLayoutFamilyKey
};
