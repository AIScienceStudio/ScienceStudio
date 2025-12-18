# OnlyOffice Cursor Offset Issue in VS Code WebView

**Status:** Unresolved
**Priority:** Critical (blocks usability)
**Date:** December 2024
**Environment:** VS Code WebView + OnlyOffice DocumentServer 9.2.0 in Docker

## Problem Description

When OnlyOffice Document Editor is embedded in a VS Code WebView, clicking in the document selects text/places cursor at an offset position (approximately 0.5 inch above the actual click location). This makes the editor unusable for precise text selection and editing.

## Symptoms

- Click position and actual cursor/selection position are misaligned
- Offset is approximately half an inch upward from click position
- Selecting specific words or phrases results in wrong text being selected
- Issue persists across document zoom levels
- Makes inline AI features (Cmd+K) impossible to implement properly

## Root Causes Identified

### 1. Chrome 128+ CSS Zoom Property Standardization

**Primary Cause:** Chrome 128 standardized the CSS zoom property, which broke coordinate calculations.

- **OnlyOffice Issue:** [#2859](https://github.com/ONLYOFFICE/DocumentServer/issues/2859)
- **Technical Details:** The `_getCoordinates` function in OnlyOffice's sdkjs calculates element positions for cell/text selection. Chrome's zoom standardization caused it to return incorrect coordinate values.
- **Fix Released:** Version 8.1.3 (commits: ONLYOFFICE/sdkjs@10706df, ONLYOFFICE/sdkjs@e35d5d8)
- **Our Version:** 9.2.0 (should have fix)

### 2. VS Code WebView Zoom Level

**Secondary Cause:** VS Code applies its own zoom level to WebViews.

- **Issue:** [microsoft/vscode#10965](https://github.com/microsoft/vscode/issues/10965)
- **Issue:** [microsoft/vscode#5745](https://github.com/microsoft/vscode/issues/5745)
- **Discussion:** [vscode-discussions#1933](https://github.com/microsoft/vscode-discussions/discussions/1933)
- **Technical Details:** WebViews inherit VS Code's global zoom level (`window.zoomLevel` setting). When zoom is not 0 (100%), coordinate transformations can break.
- **API Status:** No official API exists to set relative zoom for WebViews ([#70921](https://github.com/microsoft/vscode/issues/70921) marked out-of-scope)

### 3. devicePixelRatio on Retina/HiDPI Displays

**Contributing Factor:** High-DPI displays report `devicePixelRatio > 1`.

- **W3C Issue:** [w3c/uievents#40](https://github.com/w3c/uievents/issues/40)
- **Technical Details:** Mouse coordinates are in CSS pixels, not physical pixels. Canvas-based editors like OnlyOffice must transform coordinates properly.
- **OnlyOffice Issues:**
  - [DesktopEditors#673](https://github.com/ONLYOFFICE/DesktopEditors/issues/673) - Mouse position randomly incorrect
  - [DesktopEditors#217](https://github.com/ONLYOFFICE/DesktopEditors/issues/217) - HiDPI scaling detection issues
  - [DocumentServer#3083](https://github.com/ONLYOFFICE/DocumentServer/issues/3083) - Cell selection misalignment on 14-inch laptop

### 4. Nested Iframe Coordinate Systems

**Architectural Issue:** VS Code WebViews use nested iframes.

- **Reference:** [Matt Bierner's Blog on VS Code WebViews](https://blog.mattbierner.com/vscode-webview-web-learnings/)
- **Technical Details:** VS Code uses Electron's `<webview>` tag internally, which creates nested iframe environments. Each iframe has its own coordinate system, and transformations may not propagate correctly.

## Related OnlyOffice Issues

| Issue | Description | Status |
|-------|-------------|--------|
| [#2859](https://github.com/ONLYOFFICE/DocumentServer/issues/2859) | Chrome 128 CSS zoom property bug | Fixed in 8.1.3 |
| [#3083](https://github.com/ONLYOFFICE/DocumentServer/issues/3083) | Cell click misalignment in Edge | Closed (upgrade recommended) |
| [#1846](https://github.com/ONLYOFFICE/DocumentServer/issues/1846) | Presentation cursor misplacing | Closed (linked to #2859) |
| [#673](https://github.com/ONLYOFFICE/DesktopEditors/issues/673) | Mouse position randomly incorrect | Resolved in 8.1 |
| [#665](https://github.com/ONLYOFFICE/Docker-DocumentServer/issues/665) | UI scaling in Docker | No config option available |

## Related VS Code Issues

| Issue | Description | Status |
|-------|-------------|--------|
| [#10965](https://github.com/microsoft/vscode/issues/10965) | WebView not scaled correctly when zooming | Duplicate of #5745 |
| [#5745](https://github.com/microsoft/vscode/issues/5745) | WebView: apply window.zoomLevel too | Electron bug |
| [#70921](https://github.com/microsoft/vscode/issues/70921) | API request: Set relative zoom level of webview | Out-of-scope |

## Attempted Solutions (Not Working)

### 1. CSS Zoom Reset
```css
body, html {
    zoom: 1 !important;
}
#editor-container iframe {
    zoom: 1 !important;
}
```
**Result:** No effect

### 2. Transform Scale Counter-scaling
```javascript
if (dpr > 1) {
    iframe.style.transform = 'scale(' + (1/dpr) + ')';
    iframe.style.transformOrigin = 'top left';
    iframe.style.width = (100 * dpr) + '%';
    iframe.style.height = (100 * dpr) + '%';
}
```
**Result:** No effect

### 3. Viewport Meta Tag
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```
**Result:** No effect

### 4. OnlyOffice Embedding Type Change
```javascript
type: 'desktop' // vs 'embedded'
```
**Result:** No effect

## Potential Solutions (Not Yet Tried)

### 1. Community Workaround from Issue #2859

Detect Chrome version ≥127 and apply zoom compensation:

```javascript
// Calculate the current zoom level
const zoomLevel = Math.round(window.devicePixelRatio * 100);
const b = 100; // base zoom
const ratio = (b * b) / zoomLevel;
iframe.style.zoom = ratio + '%';
```

### 2. Get VS Code Zoom Level from Extension

```typescript
// In extension.ts
const zoomLevel = vscode.workspace.getConfiguration('window').get('zoomLevel') || 0;
const zoomFactor = Math.pow(1.2, zoomLevel); // Each level is 20% change

// Pass to WebView
webviewPanel.webview.postMessage({ type: 'setZoom', zoomFactor });
```

### 3. Mouse Event Interception

Intercept all mouse events on the iframe container and transform coordinates before they reach OnlyOffice:

```javascript
container.addEventListener('mousedown', (e) => {
    const transformedY = e.clientY * correctionFactor;
    // Dispatch new event with corrected coordinates
}, true);
```

### 4. OnlyOffice Plugin API

Use OnlyOffice's plugin API for mouse handling:
- `window.Asc.plugin.executeMethod('MouseMoveWindow', ...)`

### 5. Alternative Embedding Approaches

- Use OnlyOffice Desktop Editors with `--force-scale=1` instead of Document Server
- Embed via external browser window instead of VS Code WebView
- Use a reverse proxy to inject coordinate correction JavaScript

## Configuration Options Explored

### OnlyOffice Editor Config

```javascript
editorConfig: {
    customization: {
        zoom: 100, // Document zoom (not UI zoom)
        // No UI scaling options available via API
    }
}
```

### Docker Environment Variables

```yaml
environment:
  - ALLOW_PRIVATE_IP_ADDRESS=true  # Required for host.docker.internal
  - ALLOW_META_IP_ADDRESS=true
  # No scaling-related env vars available
```

## Key Insights

1. **Version is not the issue:** We're running OnlyOffice 9.2.0, which includes all known fixes.

2. **VS Code WebView is the culprit:** The issue likely stems from VS Code's nested iframe architecture and zoom handling, not OnlyOffice itself.

3. **No official API:** Neither VS Code nor OnlyOffice provides an API to properly handle this scenario.

4. **Common in embedded scenarios:** This is a known class of issues when embedding canvas-based editors in nested iframe environments.

## Recommendations

### Short-term
1. Document the limitation for users
2. Test with VS Code zoom level reset to 0 (`View > Appearance > Reset Zoom`)
3. Consider showing OnlyOffice in external browser window as fallback

### Medium-term
1. Implement community workaround from Issue #2859
2. Pass VS Code zoom level to WebView and apply compensation
3. Test on different displays (non-Retina, various DPI settings)

### Long-term
1. Report issue to OnlyOffice with VS Code WebView reproduction steps
2. Consider contributing fix to OnlyOffice sdkjs if root cause identified
3. Explore alternative embedding methods (Electron BrowserView, external window)
4. Watch for VS Code API updates for WebView zoom control

## References

### OnlyOffice Documentation
- [API Config/Editor](https://api.onlyoffice.com/editors/config/editor)
- [Customization Options](https://api.onlyoffice.com/editors/config/editor/customization)
- [Embedding FAQ](https://api.onlyoffice.com/editors/faq/embedding)

### VS Code Documentation
- [WebView API](https://code.visualstudio.com/api/extension-guides/webview)

### Technical Resources
- [Transforming Mouse Coordinates to Canvas Coordinates](https://roblouie.com/article/617/transforming-mouse-coordinates-to-canvas-coordinates/)
- [MDN: devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio)
- [W3 UIEvents Mouse Coordinates Issue](https://github.com/w3c/uievents/issues/40)

### Videos
- [Top 7 Open Source AI Agent Frameworks](https://www.youtube.com/watch?v=F8NKVhkZZWI) - Context on why ScienceStudio is unique

---

*Last updated: December 2024*
