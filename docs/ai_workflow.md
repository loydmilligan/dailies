# MQTT Note Plugin - AI Development Workflow Guide

## Using the Manifest-Driven Approach

This guide shows how to use the manifest system for developing the MQTT Note plugin.

## Initial Setup Complete ✓

The `codebase_manifest.json` has been created with the planned structure for your MVP. This acts as the "cheat sheet" for AI to understand your project without reading all the code.

## Example Workflows

### Workflow 1: Implementing the Main Plugin File

**Human Request:** "Create the main plugin file that handles the Obsidian plugin lifecycle"

**AI Process:**
1. **Check Manifest:** "Based on the manifest, main.ts should export MQTTNotePlugin class with onload() and onunload() methods. Looking at the API details:
   - MQTTNotePlugin extends Plugin
   - onload() -> Promise<void> - initializes MQTT client, loads settings, registers commands
   - onunload() -> void - disconnects MQTT client, cleans up resources"

2. **State Changes:** "I'll create main.ts that:
   - Extends Obsidian's Plugin class
   - Initializes MQTT client on load
   - Sets up command palette commands
   - Connects to MQTT broker
   - Handles plugin cleanup on unload"

3. **Make Changes:** [AI implements the main.ts file]

4. **Update Manifest:** "✓ Created main.ts with planned exports. No manifest changes needed as structure matches plan."

5. **Commit Changes:** "Task completed successfully - ready for commit_task command to save progress with proper git history."

### Workflow 2: Adding New Feature (Auto-publish on save)

**Human Request:** "Add automatic publishing when a note is saved"

**AI Process:**
1. **Check Manifest:** "Current manifest shows notePublisher.ts has:
   - publishNote(note: TFile, settings: MQTTNoteSettings) -> Promise<void>
   - shouldPublishNote(note: TFile) -> boolean
   Main.ts handles plugin lifecycle with onload() method."

2. **State Changes:** "I'll need to:
   - Add registerEvent() for file modification in main.ts
   - Add onModify(file: TFile) -> void handler to main.ts exports
   - This will write to MQTT when notes are saved"

3. **Make Changes:** [AI adds the auto-publish feature]

4. **Update Manifest:** "Updated main.ts exports to include:
   ```json
   {
     \"name\": \"onModify\",
     \"signature\": \"onModify(file: TFile) -> void\",
     \"description\": \"Handles file modification events for auto-publishing\",
     \"parameters\": {
       \"file\": \"The modified file to potentially publish\"
     },
     \"returns\": \"void\"
   }
   ```"

5. **Commit Changes:** "Feature implemented and validated - ready for commit_task command."

### Workflow 3: Creating the Settings System

**Human Request:** "Implement the settings screen for MQTT configuration"

**AI Process:**
1. **Check Manifest:** "settings.ts should export:
   - MQTTNoteSettings interface with properties: brokerUrl, username, password, outgoingPrefix, incomingTopic, incomingFolder, autoPublish
   - DEFAULT_SETTINGS constant with default values
   - MQTTNoteSettingTab class with display() -> void method that creates UI elements"

2. **State Changes:** "I'll create:
   - Interface for broker URL, username, password, topics, and folders
   - Default settings object with sensible defaults
   - Settings tab UI with form inputs and validation
   - This creates UI elements in Obsidian settings"

3. **Make Changes:** [AI implements settings.ts]

4. **Update Manifest:** "✓ Created settings.ts with all planned exports. Structure matches manifest."

## Validation Examples

### Quick Checks to Run

**After adding a new export:**
```bash
# Check if the export exists in the file
grep -n "export.*functionName" filename.ts
```

**After creating a new file:**
```bash
# Verify file was created and has basic structure
ls -la src/newFile.ts
head -10 src/newFile.ts
```

**After major refactoring:**
- Do all the planned exports still exist?
- Are the main imports still correct?
- Are the side effects still accurate?

## Manifest Update Patterns

### When Adding New Functions
```json
// Before
"exports": {
  "functions": [
    {
      "name": "existingFunction",
      "signature": "existingFunction(param: string) -> boolean",
      "description": "Existing function description",
      "parameters": {"param": "description"},
      "returns": "boolean result"
    }
  ]
}

// After  
"exports": {
  "functions": [
    {
      "name": "existingFunction",
      "signature": "existingFunction(param: string) -> boolean",
      "description": "Existing function description",
      "parameters": {"param": "description"},
      "returns": "boolean result"
    },
    {
      "name": "newFunction",
      "signature": "newFunction(data: object, callback: Function) -> Promise<void>",
      "description": "New function that processes data asynchronously",
      "parameters": {
        "data": "Input data object to process",
        "callback": "Function to call when processing completes"
      },
      "returns": "Promise that resolves when processing is complete"
    }
  ]
}
```

### When Adding New Methods to Classes
```json
// Add to existing class methods array
"methods": [
  {
    "name": "newMethod",
    "signature": "newMethod(input: string) -> number",
    "description": "Processes input and returns numeric result",
    "parameters": {"input": "String to process"},
    "returns": "Numeric result of processing"
  }
]
```

### When Creating New Files
```json
// Add to files section
"src/newFeature.ts": {
  "purpose": "Handles new feature functionality",
  "exports": {
    "functions": [
      {
        "name": "processNewFeature",
        "signature": "processNewFeature(input: FeatureInput) -> Promise<FeatureResult>",
        "description": "Processes new feature input and returns result",
        "parameters": {
          "input": "Configuration and data for the new feature"
        },
        "returns": "Promise resolving to feature processing result"
      }
    ],
    "classes": [
      {
        "name": "NewFeature",
        "description": "Main class for handling new feature operations",
        "constructor": "NewFeature(config: FeatureConfig)",
        "methods": [
          {
            "name": "initialize",
            "signature": "initialize() -> Promise<void>",
            "description": "Initializes the feature with required resources",
            "parameters": {},
            "returns": "Promise that resolves when initialization completes"
          }
        ],
        "properties": [
          {
            "name": "config",
            "type": "FeatureConfig",
            "description": "Configuration object for the feature"
          }
        ]
      }
    ],
    "constants": []
  },
  "imports": ["obsidian", "./mqttClient"],
  "sideEffects": ["modifies-files"]
}
```

### When Changing Dependencies
```json
// Update imports array
"imports": ["obsidian", "./mqttClient", "./newDependency"]
```

## Benefits You Should See

1. **Faster Context Understanding:** AI immediately knows what files exist and their purposes
2. **Better Change Planning:** AI can state exactly what will be affected before coding
3. **Consistency:** All changes follow the planned architecture
4. **Progress Tracking:** Easy to see what's implemented vs. planned
5. **Version Control Integration:** Every task completion creates a clean commit
6. **Architectural Evolution:** Proposed final manifest evolves with implementation learnings
7. **Complete Development History:** Git history tied to task completion with detailed commit messages

## Complete Development Workflow

### Core Task Implementation Cycle:
1. **process_task** - Prepare task with expected manifest
2. **implement_task** - Implement with full context
3. **check_task** - Validate against expected manifest
4. **resolve_mismatch** - Handle discrepancies (if needed)
5. **commit_task** - Save progress with proper git history

### Periodic Activities:
- **update_final_manifest** - After milestones or architectural discoveries
- **generate_manifest** - To refresh actual manifest from codebase

### Command Usage Examples:

**Starting a new task:**
```bash
claude-code process_task "Task-2.1"
```

**Implementing prepared task:**
```bash
claude-code implement_task "tasks/prepared/Task-2.1.json"
```

**Validating implementation:**
```bash
claude-code check_task "Task-2.1"
```

**Committing completed task:**
```bash
claude-code commit_task "Task-2.1"
```

**Updating architecture understanding:**
```bash
claude-code update_final_manifest
```

## Getting Started

1. **Bootstrap your project** with all planning documents and command prompts
2. **Use the provided manifest** as your project's starting point
3. **Follow the complete workflow** for each task:
   - Process → Implement → Check → Resolve (if needed) → Commit
4. **Update the manifest periodically** as you learn from implementation
5. **Keep the manifest current** as your project's source of truth

## Project Structure After Bootstrap

- `docs/mvp.md` - MVP requirements
- `docs/prd.md` - PRD specifications  
- `docs/proposed_final_manifest.json` - Target architecture
- `docs/manifest_evolution.md` - Architecture evolution log
- `tasks/task_list.md` - Implementation tasks
- `codebase_manifest.json` - Current project state
- `.claude/commands/` - All development commands

## Available Commands

### Core Development Commands:
- **generate_manifest.md** - Analyze codebase and create/update manifests
- **process_task.md** - Prepare tasks with expected post-task manifests
- **implement_task.md** - Implement prepared tasks with full context
- **check_task.md** - Validate implementation against expected manifest
- **resolve_mismatch.md** - Handle discrepancies between expected and actual

### Workflow Management Commands:
- **commit_task.md** - Commit completed tasks with proper git history
- **update_final_manifest.md** - Update proposed final manifest based on learnings

### When to Use Each Command:

- **generate_manifest** - When starting project or needing fresh manifest from code
- **process_task** - Before implementing any task (creates full context)
- **implement_task** - Only after processing task (uses prepared context)
- **check_task** - After every implementation (validates against expected)
- **resolve_mismatch** - When check_task finds discrepancies
- **commit_task** - After successful task completion (saves progress)
- **update_final_manifest** - After milestones or architectural discoveries

## Example Request Format

Instead of: "Add MQTT functionality"

Try: "Based on the manifest, implement the MQTTClient class in mqttClient.ts with these planned methods:
- connect(brokerUrl: string, username: string, password: string) -> Promise<void>
- publish(topic: string, payload: string) -> Promise<void>  
- subscribe(topic: string, callback: Function) -> Promise<void>
- disconnect() -> void
- isConnected() -> boolean

The class should handle connection retry logic and proper error handling as described in the manifest."

This gives AI much better context about what you want, where it should go, and exactly how the API should work.

## Next Steps

1. **Bootstrap your project** using the bootstrap command with all planning documents
2. **Review the created structure** and ensure all commands are properly placed
3. **Start with Task 1.1** using the complete workflow:
   - `claude-code process_task "Task-1.1"`
   - `claude-code implement_task "tasks/prepared/Task-1.1.json"`  
   - `claude-code check_task "Task-1.1"`
   - `claude-code commit_task "Task-1.1"`
4. **Continue task-by-task** through your implementation plan
5. **Update the proposed final manifest** after major milestones
6. **Use the manifest** as your project's source of truth throughout development

## Project Evolution

The manifest-driven approach ensures your project evolves systematically:
- Each task builds on the previous manifest state
- Implementation learnings update the proposed final manifest
- Git history tracks both code changes and architectural decisions
- The manifest becomes a living document of your project's architecture

This approach scales from small plugins to large applications, maintaining consistency and architectural integrity throughout the development process.