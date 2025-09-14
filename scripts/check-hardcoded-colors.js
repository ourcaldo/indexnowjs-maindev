#!/usr/bin/env node

/**
 * Color Detection Script - IndexNow Studio
 * Scans codebase for hardcoded colors and suggests CSS variable alternatives
 * 
 * Usage: node scripts/check-hardcoded-colors.js [--fix] [--verbose]
 */

const fs = require('fs');
const path = require('path');

const COLOR_PATTERNS = {
  hex: /#([0-9A-Fa-f]{3,6})\b/g,
  rgb: /rgb\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g,
  rgba: /rgba\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/g,
  hsl: /hsl\s*\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)/g,
  hsla: /hsla\s*\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*[\d.]+\s*\)/g,
  tailwindHex: /(?:bg|text|border)-\[#[0-9A-Fa-f]{3,6}\]/g,
  inlineStyle: /style\s*=\s*\{\s*\{[^}]*(?:color|background|border)[^}]*#[0-9A-Fa-f]{3,6}[^}]*\}\s*\}/g
};

// Known color mappings from project spec
const COLOR_MAPPINGS = {
  '#1A1A1A': 'bg-brand-primary / var(--brand-primary)',
  '#2C2C2E': 'bg-brand-secondary / var(--brand-secondary)', 
  '#3D8BFF': 'bg-brand-accent / var(--brand-accent)',
  '#6C757D': 'text-brand-text / var(--brand-text)',
  '#4BB543': 'bg-success / var(--success)',
  '#E63946': 'bg-error / var(--error)',
  '#F0A202': 'bg-warning / var(--warning)',
  '#FFFFFF': 'bg-background / var(--background)',
  '#F7F9FC': 'bg-secondary / var(--secondary)',
  '#E0E6ED': 'border-border / var(--border)'
};

// Files to exclude from scanning
const EXCLUDED_PATHS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'scripts',
  'app/globals.css', // This file is allowed to have hardcoded colors
  'tailwind.config.ts' // Configuration file
];

// File extensions to scan
const SCAN_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss'];

class ColorChecker {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.fix = options.fix || false;
    this.violations = [];
  }

  shouldScanFile(filePath) {
    // Check if file extension should be scanned
    const ext = path.extname(filePath);
    if (!SCAN_EXTENSIONS.includes(ext)) return false;

    // Check if path should be excluded
    return !EXCLUDED_PATHS.some(excluded => 
      filePath.includes(excluded) || filePath.startsWith(excluded)
    );
  }

  scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const violations = [];

    lines.forEach((line, lineNumber) => {
      // Skip lines that are part of email template color mappings (indicated by css: property)
      if (this.isEmailTemplateColorMapping(line, lines, lineNumber)) {
        return;
      }

      Object.entries(COLOR_PATTERNS).forEach(([patternName, pattern]) => {
        let match;
        const regex = new RegExp(pattern);
        
        while ((match = regex.exec(line)) !== null) {
          const color = match[0];
          const suggestion = this.getSuggestion(color, patternName);
          
          violations.push({
            file: filePath,
            line: lineNumber + 1,
            column: match.index + 1,
            color: color,
            type: patternName,
            suggestion: suggestion,
            context: line.trim()
          });
        }
      });
    });

    return violations;
  }

  isEmailTemplateColorMapping(line, lines, lineNumber) {
    // Check if this line is part of an email template color mapping
    // Look for lines that have both 'css:' and 'value:' properties indicating proper color mapping
    if (line.includes('css:') && line.includes('value:') && line.includes('#')) {
      return true;
    }
    
    // Check if we're inside an EMAIL_COLOR_MAPPING object
    for (let i = Math.max(0, lineNumber - 10); i <= Math.min(lines.length - 1, lineNumber + 5); i++) {
      const contextLine = lines[i];
      if (contextLine.includes('EMAIL_COLOR_MAPPING') || 
          contextLine.includes('Email Template Color System') ||
          contextLine.includes('email clients require hardcoded colors')) {
        return true;
      }
    }
    
    return false;
  }

  getSuggestion(color, type) {
    // Check if we have a direct mapping
    const normalized = color.toUpperCase();
    if (COLOR_MAPPINGS[normalized]) {
      return COLOR_MAPPINGS[normalized];
    }

    // Provide generic suggestions based on color type
    switch (type) {
      case 'hex':
        return 'Use CSS variables from globals.css or Tailwind semantic colors';
      case 'tailwindHex':
        return 'Replace with semantic Tailwind class (e.g., bg-brand-primary)';
      case 'inlineStyle':
        return 'Use className with Tailwind classes instead of inline styles';
      default:
        return 'Replace with CSS variable or Tailwind semantic color';
    }
  }

  scanDirectory(dirPath) {
    const entries = fs.readdirSync(dirPath);
    
    entries.forEach(entry => {
      const fullPath = path.join(dirPath, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !EXCLUDED_PATHS.includes(entry)) {
        this.scanDirectory(fullPath);
      } else if (stat.isFile() && this.shouldScanFile(fullPath)) {
        const fileViolations = this.scanFile(fullPath);
        this.violations.push(...fileViolations);
      }
    });
  }

  generateReport() {
    console.log('\n🎨 IndexNow Studio - Hardcoded Color Detection Report\n');
    console.log('=' .repeat(60));
    
    if (this.violations.length === 0) {
      console.log('✅ No hardcoded colors found! Great job!');
      return;
    }

    console.log(`❌ Found ${this.violations.length} hardcoded color violations\n`);

    // Group violations by file
    const byFile = this.violations.reduce((acc, violation) => {
      if (!acc[violation.file]) {
        acc[violation.file] = [];
      }
      acc[violation.file].push(violation);
      return acc;
    }, {});

    Object.entries(byFile).forEach(([file, violations]) => {
      console.log(`📄 ${file} (${violations.length} violations)`);
      console.log('-'.repeat(50));
      
      violations.forEach(violation => {
        console.log(`  Line ${violation.line}:${violation.column} - ${violation.color} (${violation.type})`);
        console.log(`    Context: ${violation.context}`);
        console.log(`    💡 Suggestion: ${violation.suggestion}`);
        console.log('');
      });
      console.log('');
    });

    // Summary by color type
    const byType = this.violations.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {});

    console.log('📊 Violation Summary:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} violations`);
    });

    console.log('\n🔧 To fix these issues:');
    console.log('1. Replace hardcoded colors with CSS variables from app/globals.css');
    console.log('2. Use Tailwind semantic colors (bg-brand-primary, text-error, etc.)');
    console.log('3. Convert inline styles to className with Tailwind utilities');
    console.log('4. Run this script with --fix flag for automated suggestions');
  }

  run() {
    console.log('🔍 Scanning codebase for hardcoded colors...');
    this.scanDirectory('./');
    this.generateReport();
    
    // Exit with error code if violations found
    process.exit(this.violations.length > 0 ? 1 : 0);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const fix = args.includes('--fix');

// Run the color checker
const checker = new ColorChecker({ verbose, fix });
checker.run();