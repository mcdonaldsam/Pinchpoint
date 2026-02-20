#!/bin/bash
# Fetch all Claude Code system prompts from Piebald repo

BASE_URL="https://raw.githubusercontent.com/Piebald-AI/claude-code-system-prompts/main/system-prompts"
TARGET_DIR="c:/Users/samcd/Projects/Git-Repos/Arete/4.0 Prompt Design/4.3 Claude Code"

# Create subdirectories
mkdir -p "$TARGET_DIR/Agents"
mkdir -p "$TARGET_DIR/Data"
mkdir -p "$TARGET_DIR/Skills"
mkdir -p "$TARGET_DIR/System"
mkdir -p "$TARGET_DIR/Reminders"
mkdir -p "$TARGET_DIR/Tools"

# Agent Prompts (28 files)
agents=(
  "agent-prompt-agent-creation-architect.md"
  "agent-prompt-agent-hook.md"
  "agent-prompt-bash-command-description-writer.md"
  "agent-prompt-bash-command-file-path-extraction.md"
  "agent-prompt-bash-command-prefix-detection.md"
  "agent-prompt-claude-guide-agent.md"
  "agent-prompt-claudemd-creation.md"
  "agent-prompt-command-execution-specialist.md"
  "agent-prompt-conversation-summarization.md"
  "agent-prompt-explore.md"
  "agent-prompt-hook-condition-evaluator.md"
  "agent-prompt-plan-mode-enhanced.md"
  "agent-prompt-pr-comments-slash-command.md"
  "agent-prompt-prompt-suggestion-generator-for-agent-teams.md"
  "agent-prompt-prompt-suggestion-generator-stated-intent.md"
  "agent-prompt-prompt-suggestion-generator-v2.md"
  "agent-prompt-recent-message-summarization.md"
  "agent-prompt-remember-skill.md"
  "agent-prompt-review-pr-slash-command.md"
  "agent-prompt-security-review-slash-command.md"
  "agent-prompt-session-memory-update-instructions.md"
  "agent-prompt-session-search-assistant.md"
  "agent-prompt-session-title-and-branch-generation.md"
  "agent-prompt-status-line-setup.md"
  "agent-prompt-task-tool-extra-notes.md"
  "agent-prompt-task-tool.md"
  "agent-prompt-update-magic-docs.md"
  "agent-prompt-user-sentiment-analysis.md"
  "agent-prompt-webfetch-summarizer.md"
)

for file in "${agents[@]}"; do
  echo "Fetching Agents/$file..."
  curl -s "$BASE_URL/$file" -o "$TARGET_DIR/Agents/$file"
done

# Data Files (3 files)
data=(
  "data-github-actions-workflow-for-claude-mentions.md"
  "data-github-app-installation-pr-description.md"
  "data-session-memory-template.md"
)

for file in "${data[@]}"; do
  echo "Fetching Data/$file..."
  curl -s "$BASE_URL/$file" -o "$TARGET_DIR/Data/$file"
done

# Skill Files (3 files)
skills=(
  "skill-debugging.md"
  "skill-update-claude-code-config.md"
  "skill-verification-specialist.md"
)

for file in "${skills[@]}"; do
  echo "Fetching Skills/$file..."
  curl -s "$BASE_URL/$file" -o "$TARGET_DIR/Skills/$file"
done

# System Prompts (30 files)
system=(
  "system-prompt-accessing-past-sessions.md"
  "system-prompt-agent-memory-instructions.md"
  "system-prompt-agent-summary-generation.md"
  "system-prompt-censoring-assistance-with-malicious-activities.md"
  "system-prompt-chrome-browser-mcp-tools.md"
  "system-prompt-claude-in-chrome-browser-automation.md"
  "system-prompt-doing-tasks.md"
  "system-prompt-executing-actions-with-care.md"
  "system-prompt-git-status.md"
  "system-prompt-hooks-configuration.md"
  "system-prompt-insights-at-a-glance-summary.md"
  "system-prompt-insights-friction-analysis.md"
  "system-prompt-insights-on-the-horizon.md"
  "system-prompt-insights-session-facets-extraction.md"
  "system-prompt-insights-suggestions.md"
  "system-prompt-learning-mode-insights.md"
  "system-prompt-learning-mode.md"
  "system-prompt-main-system-prompt.md"
  "system-prompt-mcp-cli.md"
  "system-prompt-parallel-tool-call-note-part-of-tool-usage-policy.md"
  "system-prompt-scratchpad-directory.md"
  "system-prompt-skillify-current-session.md"
  "system-prompt-task-management.md"
  "system-prompt-teammate-communication.md"
  "system-prompt-tone-and-style.md"
  "system-prompt-tool-execution-denied.md"
  "system-prompt-tool-permission-mode.md"
  "system-prompt-tool-usage-policy.md"
  "system-prompt-tool-use-summary-generation.md"
)

for file in "${system[@]}"; do
  echo "Fetching System/$file..."
  curl -s "$BASE_URL/$file" -o "$TARGET_DIR/System/$file"
done

# System Reminders (41 files shown in listing)
reminders=(
  "system-reminder-agent-mention.md"
  "system-reminder-btw-side-question.md"
  "system-reminder-compact-file-reference.md"
  "system-reminder-delegate-mode-prompt.md"
  "system-reminder-exited-delegate-mode.md"
  "system-reminder-exited-plan-mode.md"
  "system-reminder-file-exists-but-empty.md"
  "system-reminder-file-modified-by-user-or-linter.md"
  "system-reminder-file-opened-in-ide.md"
  "system-reminder-file-shorter-than-offset.md"
  "system-reminder-file-truncated.md"
  "system-reminder-hook-additional-context.md"
  "system-reminder-hook-blocking-error.md"
  "system-reminder-hook-stopped-continuation-prefix.md"
  "system-reminder-hook-stopped-continuation.md"
  "system-reminder-hook-success.md"
  "system-reminder-invoked-skills.md"
  "system-reminder-lines-selected-in-ide.md"
  "system-reminder-malware-analysis-after-read-tool-call.md"
  "system-reminder-mcp-resource-no-content.md"
  "system-reminder-mcp-resource-no-displayable-content.md"
  "system-reminder-memory-file-contents.md"
  "system-reminder-nested-memory-contents.md"
  "system-reminder-new-diagnostics-detected.md"
  "system-reminder-output-style-active.md"
  "system-reminder-output-token-limit-exceeded.md"
  "system-reminder-plan-file-reference.md"
  "system-reminder-plan-mode-is-active-5-phase.md"
  "system-reminder-plan-mode-is-active-iterative.md"
  "system-reminder-plan-mode-is-active-subagent.md"
  "system-reminder-plan-mode-re-entry.md"
  "system-reminder-session-continuation.md"
  "system-reminder-task-status.md"
  "system-reminder-task-tools-reminder.md"
  "system-reminder-team-coordination.md"
  "system-reminder-team-shutdown.md"
  "system-reminder-todo-list-changed.md"
  "system-reminder-todo-list-empty.md"
  "system-reminder-todowrite-reminder.md"
  "system-reminder-token-usage.md"
  "system-reminder-usd-budget.md"
  "system-reminder-verify-plan-reminder.md"
)

for file in "${reminders[@]}"; do
  echo "Fetching Reminders/$file..."
  curl -s "$BASE_URL/$file" -o "$TARGET_DIR/Reminders/$file"
done

# Tool Descriptions (27 files)
tools=(
  "tool-description-askuserquestion.md"
  "tool-description-bash-git-commit-and-pr-creation-instructions.md"
  "tool-description-bash-sandbox-note.md"
  "tool-description-bash.md"
  "tool-description-computer.md"
  "tool-description-edit.md"
  "tool-description-enterplanmode.md"
  "tool-description-exitplanmode.md"
  "tool-description-glob.md"
  "tool-description-grep.md"
  "tool-description-lsp.md"
  "tool-description-notebookedit.md"
  "tool-description-readfile.md"
  "tool-description-sendmessagetool.md"
  "tool-description-skill.md"
  "tool-description-sleep.md"
  "tool-description-task.md"
  "tool-description-taskcreate.md"
  "tool-description-teamdelete.md"
  "tool-description-teammatetool.md"
  "tool-description-todowrite.md"
  "tool-description-toolsearch-extended.md"
  "tool-description-toolsearch.md"
  "tool-description-webfetch.md"
  "tool-description-websearch.md"
  "tool-description-write.md"
  "tool-parameter-computer-action.md"
)

for file in "${tools[@]}"; do
  echo "Fetching Tools/$file..."
  curl -s "$BASE_URL/$file" -o "$TARGET_DIR/Tools/$file"
done

echo "✓ All 133 Claude Code system prompt files downloaded successfully!"
