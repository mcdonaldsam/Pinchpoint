#!/bin/bash

# Script to adapt Claude Code prompts for Arete
# Replaces tool variable placeholders with Arete's tool names

TARGET_DIR="c:/Users/samcd/Projects/Git-Repos/Arete/4.0 Prompt Design/4.3 Claude Code (Arete Adapted)"

echo "Adapting Claude Code prompts for Arete..."
echo "Target directory: $TARGET_DIR"
echo ""

# Count files to process
TOTAL_FILES=$(find "$TARGET_DIR" -name "*.md" -not -name "TOOL_MAPPING.md" -not -name "README.md" | wc -l)
echo "Processing $TOTAL_FILES markdown files..."
echo ""

# Counter for progress
COUNT=0

# Find all .md files except TOOL_MAPPING.md and README.md (already updated)
find "$TARGET_DIR" -name "*.md" -not -name "TOOL_MAPPING.md" -not -name "README.md" -type f | while read -r file; do
  COUNT=$((COUNT + 1))
  FILENAME=$(basename "$file")

  # Create a temporary file
  TEMP_FILE="${file}.tmp"

  # Perform replacements
  sed \
    -e 's/\${BASH_TOOL_NAME}/bash/g' \
    -e 's/\${READ_TOOL_NAME}/read-file/g' \
    -e 's/\${WRITE_TOOL_NAME}/write-file/g' \
    -e 's/\${GREP_TOOL_NAME}/search/g' \
    -e 's/\${WEB_SEARCH_TOOL_NAME}/web-search/g' \
    -e 's/\${GLOB_TOOL_NAME}/[glob pattern matching - use bash find instead]/g' \
    -e 's/\${EDIT_TOOL_NAME}/[in-place edit - use write-file to overwrite instead]/g' \
    -e 's/Claude Code/Arete/g' \
    -e "s/Anthropic's official CLI for Claude/desktop workspace assistant/g" \
    "$file" > "$TEMP_FILE"

  # Only replace if changes were made
  if ! cmp -s "$file" "$TEMP_FILE"; then
    mv "$TEMP_FILE" "$file"
    echo "[$COUNT/$TOTAL_FILES] ✓ Updated: $FILENAME"
  else
    rm "$TEMP_FILE"
    echo "[$COUNT/$TOTAL_FILES] - No changes: $FILENAME"
  fi
done

echo ""
echo "✅ Adaptation complete!"
echo ""
echo "Note: The following substitutions were made:"
echo "  - \${BASH_TOOL_NAME} → bash"
echo "  - \${READ_TOOL_NAME} → read-file"
echo "  - \${WRITE_TOOL_NAME} → write-file"
echo "  - \${GREP_TOOL_NAME} → search"
echo "  - \${WEB_SEARCH_TOOL_NAME} → web-search"
echo "  - \${GLOB_TOOL_NAME} → [glob pattern matching - use bash find instead]"
echo "  - \${EDIT_TOOL_NAME} → [in-place edit - use write-file to overwrite instead]"
echo "  - 'Claude Code' → 'Arete'"
echo ""
echo "Review TOOL_MAPPING.md for details on tool availability."
