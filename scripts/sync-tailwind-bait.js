#!/usr/bin/env node
/**
 * sync-tailwind-bait.js
 * Scan semua class Tailwind dari catalog/layouts/**\/*.json
 * dan designs/tenants/**\/*.json (termasuk layout_overrides per tenant)
 * dan output hasilnya ke stdout sebagai JSON array of classes.
 * Dipakai oleh billing-app workflow untuk update tailwind-bait.ts.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __dirname = dirname(fileURLToPath(import.meta.url));

function extractClassesFromString(str) {
  const classes = new Set();
  const classAttrRegex = /class=['"]([^'"]+)['"]/g;
  let match;
  while ((match = classAttrRegex.exec(str)) !== null) {
    match[1].trim().split(/\s+/).forEach(cls => {
      if (cls) classes.add(cls);
    });
  }
  const classNameRegex = /className=['"]([^'"]+)['"]/g;
  while ((match = classNameRegex.exec(str)) !== null) {
    match[1].trim().split(/\s+/).forEach(cls => {
      if (cls) classes.add(cls);
    });
  }
  return classes;
}

function extractClassesFromJson(obj, classes = new Set()) {
  if (typeof obj === 'string') {
    extractClassesFromString(obj).forEach(c => classes.add(c));
  } else if (Array.isArray(obj)) {
    obj.forEach(item => extractClassesFromJson(item, classes));
  } else if (obj && typeof obj === 'object') {
    Object.values(obj).forEach(val => extractClassesFromJson(val, classes));
  }
  return classes;
}

const rootDir = join(__dirname, '..');
const files = [
  ...await glob('catalog/layouts/**/*.json', { cwd: rootDir, absolute: true }),
  ...await glob('designs/tenants/**/*.json', { cwd: rootDir, absolute: true }),
];

const allClasses = new Set();

for (const file of files) {
  try {
    const content = readFileSync(file, 'utf-8');
    const json = JSON.parse(content);
    extractClassesFromJson(json, allClasses);
  } catch (e) {
    process.stderr.write(`Warning: could not parse ${file}: ${e.message}\n`);
  }
}

const validClasses = [...allClasses].filter(cls => {
  if (cls.includes('{{') || cls.includes('}}')) return false;
  if (cls.startsWith('http') || cls.startsWith('/')) return false;
  if (cls.length === 0 || cls.length > 100) return false;
  return true;
}).sort();

console.log(JSON.stringify(validClasses));
