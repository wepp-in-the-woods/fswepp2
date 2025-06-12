#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { glob } = require("glob");

/**
 * Tailwind CSS v3 to v4 Migration Script
 *
 * This script automatically converts Tailwind CSS v3 classes to v4 classes
 * based on the official upgrade guide.
 */

// Class mapping from v3 to v4
const CLASS_MAPPINGS = {
  // Shadow utilities
  "shadow-sm": "shadow-xs",
  "shadow\\b(?!-)": "shadow-sm", // 'shadow' but not followed by hyphen
  "drop-shadow-sm": "drop-shadow-xs",
  "drop-shadow\\b(?!-)": "drop-shadow-sm",

  // Blur utilities
  "blur-sm": "blur-xs",
  "blur\\b(?!-)": "blur-sm",
  "backdrop-blur-sm": "backdrop-blur-xs",
  "backdrop-blur\\b(?!-)": "backdrop-blur-sm",

  // Border radius utilities
  "rounded-sm": "rounded-xs",
  "rounded\\b(?!-)": "rounded-sm",

  // Outline utilities
  "outline-none": "outline-hidden",
  "ring\\b(?!-)": "ring-3", // 'ring' but not followed by hyphen

  // Deprecated opacity utilities
  "bg-opacity-(\\d+)": "bg-black/$1", // This is simplified - actual implementation would need color context
  "text-opacity-(\\d+)": "text-black/$1",
  "border-opacity-(\\d+)": "border-black/$1",
  "divide-opacity-(\\d+)": "divide-black/$1",
  "ring-opacity-(\\d+)": "ring-black/$1",
  "placeholder-opacity-(\\d+)": "placeholder-black/$1",

  // Flex utilities
  "flex-shrink-(\\d+)": "shrink-$1",
  "flex-grow-(\\d+)": "grow-$1",

  // Text utilities
  "overflow-ellipsis": "text-ellipsis",
  "decoration-slice": "box-decoration-slice",
  "decoration-clone": "box-decoration-clone",
};

// More complex transformations that need special handling
const COMPLEX_TRANSFORMATIONS = [
  {
    // CSS variable shorthand syntax change
    pattern: /\[(--[\w-]+)\]/g,
    replacement: "($1)",
  },
  {
    // Stacked variants order change (simplified example)
    pattern: /first:\*:([\w-]+)\s+last:\*:([\w-]+)/g,
    replacement: "*:first:$1 *:last:$2",
  },
  {
    // Outline utilities that need combination
    pattern: /outline\s+outline-([0-9]+)/g,
    replacement: "outline-$1",
  },
];

// File extensions to process
const FILE_EXTENSIONS = [
  "**/*.html",
  "**/*.jsx",
  "**/*.tsx",
  "**/*.js",
  "**/*.ts",
  "**/*.vue",
  "**/*.svelte",
  "**/*.astro",
  "**/*.php",
  "**/*.twig",
  "**/*.blade.php",
];

// Directories to exclude
const EXCLUDE_PATTERNS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.git/**",
  "**/coverage/**",
];

class TailwindMigrator {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    this.backupDir = options.backupDir || ".tailwind-migration-backup";
    this.stats = {
      filesProcessed: 0,
      filesModified: 0,
      totalReplacements: 0,
    };
  }

  /**
   * Main migration function
   */
  async migrate(targetPath = ".") {
    console.log("🚀 Starting Tailwind CSS v3 to v4 migration...\n");

    if (this.dryRun) {
      console.log("📋 Running in DRY RUN mode - no files will be modified\n");
    } else {
      await this.createBackup(targetPath);
    }

    const files = await this.findFiles(targetPath);
    console.log(`📁 Found ${files.length} files to process\n`);

    for (const file of files) {
      await this.processFile(file);
    }

    this.printStats();
  }

  /**
   * Find all files to process
   */
  async findFiles(targetPath) {
    const patterns = FILE_EXTENSIONS.map((ext) => path.join(targetPath, ext));
    const files = [];

    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        ignore: EXCLUDE_PATTERNS,
        nodir: true,
      });
      files.push(...matches);
    }

    return [...new Set(files)]; // Remove duplicates
  }

  /**
   * Create backup of files before modification
   */
  async createBackup(targetPath) {
    const backupPath = path.join(targetPath, this.backupDir);

    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
      console.log(`💾 Created backup directory: ${backupPath}\n`);
    }
  }

  /**
   * Process a single file
   */
  async processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const modifiedContent = this.transformContent(content, filePath);

      if (content !== modifiedContent) {
        this.stats.filesModified++;

        if (!this.dryRun) {
          // Create backup
          const backupPath = path.join(
            path.dirname(filePath),
            this.backupDir,
            path.basename(filePath),
          );
          const backupDir = path.dirname(backupPath);

          if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
          }

          fs.writeFileSync(backupPath, content);
          fs.writeFileSync(filePath, modifiedContent);
        }

        if (this.verbose) {
          console.log(`✅ Modified: ${filePath}`);
        }
      }

      this.stats.filesProcessed++;
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  /**
   * Transform content by applying all class mappings
   */
  transformContent(content, filePath) {
    let modified = content;
    let replacements = 0;

    // Apply simple class mappings
    for (const [pattern, replacement] of Object.entries(CLASS_MAPPINGS)) {
      const regex = new RegExp(`\\b${pattern}\\b`, "g");
      const beforeCount = (modified.match(regex) || []).length;
      modified = modified.replace(regex, replacement);
      const afterCount = beforeCount - (modified.match(regex) || []).length;
      replacements += afterCount;
    }

    // Apply complex transformations
    for (const transformation of COMPLEX_TRANSFORMATIONS) {
      const beforeCount = (modified.match(transformation.pattern) || []).length;
      modified = modified.replace(
        transformation.pattern,
        transformation.replacement,
      );
      const afterCount =
        beforeCount - (modified.match(transformation.pattern) || []).length;
      replacements += afterCount;
    }

    // Handle opacity modifiers (more sophisticated approach needed for real implementation)
    modified = this.handleOpacityModifiers(modified);

    // Handle gradient preservation in variants
    modified = this.handleGradientVariants(modified);

    this.stats.totalReplacements += replacements;

    if (replacements > 0 && this.verbose) {
      console.log(`  └─ ${replacements} replacements made`);
    }

    return modified;
  }

  /**
   * Handle opacity modifier transformations
   * This is a simplified implementation - a real implementation would need
   * to parse the full class context to determine the correct color
   */
  handleOpacityModifiers(content) {
    // Example: bg-red-500 bg-opacity-50 -> bg-red-500/50
    const opacityPattern =
      /(bg|text|border|divide|ring|placeholder)-([\w-]+)-(\d+)\s+(bg|text|border|divide|ring|placeholder)-opacity-(\d+)/g;

    return content.replace(
      opacityPattern,
      (match, prefix1, color, shade, prefix2, opacity) => {
        if (prefix1 === prefix2) {
          return `${prefix1}-${color}-${shade}/${opacity}`;
        }
        return match; // Return original if prefixes don't match
      },
    );
  }

  /**
   * Handle gradient variant preservation
   */
  handleGradientVariants(content) {
    // Look for cases where gradients might need explicit via-none
    const gradientPattern =
      /(bg-gradient-to-[rltb])\s+([^"'\s]*via-[^"'\s]*)\s+([^"'\s]*dark:[^"'\s]*from-[^"'\s]*)/g;

    return content.replace(
      gradientPattern,
      (match, direction, viaClasses, darkClasses) => {
        if (!darkClasses.includes("via-")) {
          return `${direction} ${viaClasses} ${darkClasses.replace("dark:", "dark:via-none dark:")}`;
        }
        return match;
      },
    );
  }

  /**
   * Print migration statistics
   */
  printStats() {
    console.log("\n📊 Migration Summary:");
    console.log("─".repeat(40));
    console.log(`Files processed: ${this.stats.filesProcessed}`);
    console.log(`Files modified: ${this.stats.filesModified}`);
    console.log(`Total replacements: ${this.stats.totalReplacements}`);

    if (this.dryRun) {
      console.log("\n📋 This was a dry run - no files were actually modified");
      console.log("Run without --dry-run to apply changes");
    } else {
      console.log(`\n💾 Backups created in: ${this.backupDir}/`);
    }

    console.log("\n⚠️  Important manual steps after migration:");
    console.log(
      '1. Update your CSS imports: @tailwind -> @import "tailwindcss"',
    );
    console.log(
      "2. Install new packages: npm install @tailwindcss/cli @tailwindcss/postcss",
    );
    console.log("3. Update build commands to use @tailwindcss/cli");
    console.log("4. Review and test your application thoroughly");
    console.log(
      "5. Check for any border/ring colors that need explicit values",
    );
  }
}

// CLI Interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    verbose: false,
    targetPath: ".",
    backupDir: ".tailwind-migration-backup",
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--dry-run":
      case "-d":
        options.dryRun = true;
        break;
      case "--verbose":
      case "-v":
        options.verbose = true;
        break;
      case "--path":
      case "-p":
        options.targetPath = args[++i];
        break;
      case "--backup-dir":
      case "-b":
        options.backupDir = args[++i];
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Tailwind CSS v3 to v4 Migration Script

Usage: node migrate-tailwind.js [options]

Options:
  -d, --dry-run        Run without making changes (preview mode)
  -v, --verbose        Show detailed output
  -p, --path <path>    Target directory to migrate (default: current directory)
  -b, --backup-dir     Backup directory name (default: .tailwind-migration-backup)
  -h, --help           Show this help message

Examples:
  node migrate-tailwind.js --dry-run
  node migrate-tailwind.js --path ./src --verbose
  node migrate-tailwind.js --backup-dir ./backups
`);
}

// Main execution
async function main() {
  try {
    const options = parseArgs();
    const migrator = new TailwindMigrator(options);
    await migrator.migrate(options.targetPath);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

// Export for use as module or run as script
if (require.main === module) {
  main();
}

module.exports = { TailwindMigrator };
