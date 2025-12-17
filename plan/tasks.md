# ScienceStudio Development Plan & Tasks

## 🏗️ Repository Structure Strategy

### Fork Architecture

```
AIScienceStudio/
├── ScienceStudio/              # Main project repo (current location)
│   ├── docs/                   # Documentation
│   ├── plan/                   # Planning documents
│   │   └── tasks.md           # This file
│   ├── extensions/            # Custom VS Code extensions
│   │   └── sciencestudio-core/  # Main extension
│   └── scripts/               # Build and sync scripts
│
└── vscode/                    # VS Code fork (separate repo)
    └── [Microsoft VS Code source]
```

### Why Separate Repositories?

1. **Clean separation** between Microsoft's code and our modifications
2. **Easier upstream syncing** without mixing our code
3. **Clear licensing** boundaries (MIT for both, but separated)
4. **Simplified CI/CD** for each component

---

## 📋 Phase 1: Fork Setup Tasks

### Task 1.1: Fork VS Code Repository ⬜
```bash
# Create vscode directory at same level as ScienceStudio
cd /Users/andy/Documents/projects/AIScienceStudio
git clone https://github.com/microsoft/vscode.git vscode
cd vscode

# Set up remotes
git remote rename origin upstream
git remote add origin git@github.com:AIScienceStudio/vscode.git

# Create our main branch
git checkout -b sciencestudio-main
git push -u origin sciencestudio-main
```

### Task 1.2: Create Sync Script ⬜
Location: `ScienceStudio/scripts/sync-upstream.sh`

```bash
#!/bin/bash
# Sync VS Code upstream changes

cd ../../vscode
git fetch upstream
git checkout main
git pull upstream main
git checkout sciencestudio-main
git merge main --no-ff -m "Merge upstream VS Code changes"
```

### Task 1.3: Initial Branding Changes ⬜
- [ ] Update `product.json`
- [ ] Change application name to "ScienceStudio"
- [ ] Update icons and branding
- [ ] Modify default settings

---

## 📋 Phase 2: Extension Architecture

### Task 2.1: Create Core Extension ⬜
Location: `ScienceStudio/extensions/sciencestudio-core/`

```
sciencestudio-core/
├── package.json
├── src/
│   ├── extension.ts         # Main entry
│   ├── editor/
│   │   ├── prosemirror/    # ProseMirror integration
│   │   └── docx/           # DOCX handling
│   ├── ui/
│   │   ├── focusMode.ts    # Zen mode UI
│   │   └── sidebar/        # Custom sidebars
│   └── ai/
│       └── bridge.ts       # AI backend connection
└── resources/
    └── schemas/            # Document schemas
```

### Task 2.2: ProseMirror Integration Strategy ⬜

**Option A: NPM Package** (Recommended)
```json
// package.json
{
  "dependencies": {
    "prosemirror-state": "^1.4.3",
    "prosemirror-view": "^1.32.7",
    "prosemirror-model": "^1.19.4"
  }
}
```

**Option B: Git Submodule** (If need to modify)
```bash
cd extensions/sciencestudio-core
git submodule add https://github.com/ProseMirror/prosemirror.git src/vendor/prosemirror
```

### Task 2.3: Build System Setup ⬜
- [ ] Configure webpack for extension bundling
- [ ] Set up TypeScript paths for clean imports
- [ ] Create development vs production builds
- [ ] Integrate with VS Code's build system

---

## 📋 Phase 3: Core Modifications

### Task 3.1: UI Simplification ⬜
Files to modify in `vscode/`:
- `src/vs/workbench/browser/parts/activitybar/` - Hide developer tools
- `src/vs/workbench/browser/parts/statusbar/` - Simplify status bar
- `src/vs/workbench/contrib/welcome/` - Custom welcome screen

### Task 3.2: Custom File Associations ⬜
- [ ] Register `.docx` handler
- [ ] Register `.research` file type
- [ ] Create custom editor providers

### Task 3.3: Settings & Configuration ⬜
- [ ] Default to "Focus Mode"
- [ ] Hide code-specific settings
- [ ] Add research-specific settings

---

## 📋 Phase 4: Development Workflow

### Daily Development Cycle
```bash
# 1. Work on extension
cd ScienceStudio/extensions/sciencestudio-core
npm run watch

# 2. Test in VS Code fork
cd ../../../vscode
./scripts/code.sh --extensionDevelopmentPath=../ScienceStudio/extensions/sciencestudio-core

# 3. Make core modifications if needed
# Edit VS Code source files
yarn watch
```

### Weekly Upstream Sync
```bash
# Run sync script
cd ScienceStudio
./scripts/sync-upstream.sh

# Resolve any conflicts
# Test everything still works
# Push updates
```

---

## 🚨 Critical Decisions Needed

### 1. Extension vs Core Changes
- **Extension**: All features that can be built as extensions (90%)
- **Core**: Only modify core when absolutely necessary (10%)

### 2. Bundling Strategy
- **Option A**: Bundle extension with VS Code fork
- **Option B**: Distribute separately via marketplace
- **Recommendation**: Start with A, move to B when stable

### 3. Version Management
- Track VS Code version in `sciencestudio.json`
- Tag our releases as `sciencestudio-v1.0.0`
- Document which VS Code version each release is based on

---

## 📊 Success Metrics

- [ ] Can build VS Code fork successfully
- [ ] Can run extension in development mode
- [ ] ProseMirror renders inside VS Code
- [ ] Upstream sync doesn't break our changes
- [ ] Clean separation of concerns

---

## 🔄 Next Steps

1. **Immediate**: Fork VS Code repository
2. **Today**: Set up basic extension structure
3. **This Week**: Get ProseMirror rendering
4. **Next Week**: Implement Focus Mode

---

## 📝 Notes

- Always commit VS Code modifications separately from extension code
- Use feature flags for experimental features
- Keep detailed logs of what core files we modify
- Consider contributing general improvements back to VS Code