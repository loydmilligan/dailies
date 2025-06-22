---
title: Research Session
query: "Chrome vs Firefox Manifest V3 browser extension differences: manifest.json structure, permissions, background scripts service workers vs background pages, WebExtensions API differences, storage API, context menu API, content script injection, Firefox-specific requirements and limitations for cross-browser extension development"
date: 6/21/2025
time: 3:27:53 AM
timestamp: 2025-06-21T10:27:53.277Z
exchanges: 1
---

# Research Session

## Initial Query

**Question:** Chrome vs Firefox Manifest V3 browser extension differences: manifest.json structure, permissions, background scripts service workers vs background pages, WebExtensions API differences, storage API, context menu API, content script injection, Firefox-specific requirements and limitations for cross-browser extension development

**Response:**

## Manifest V3: Chrome vs Firefox Extension Differences

### **Manifest.json Structure**

- **Core Similarities:** Both Chrome and Firefox support the core Manifest V3 structure, including keys like `"manifest_version"`, `"name"`, and `"version"`, which are mandatory in both browsers[1].
- **Browser-Specific Keys:** Firefox supports additional keys such as `browser_specific_settings` (for specifying browser-specific options) and `developer` (for developer info), which Chrome does not recognize[1].
- **Optionality:** Most keys are optional except for the core required ones. However, some features or APIs may require additional keys in one browser but not the other[1].
- **Best Practice:** For cross-browser support, maintain a base manifest and generate browser-specific variants as needed, especially if you use Firefox-only or Chrome-only keys[1].

### **Permissions**

- **General Permissions:** Both browsers use the `"permissions"` array in the manifest to declare required permissions.
- **API Differences:** Some permissions (e.g., `"declarativeNetRequest"`) are implemented differently or have different capabilities. Chrome restricts certain permissions more tightly, especially with Manifest V3’s security model[5].
- **Firefox-Specific:** Firefox may allow some permissions that Chrome restricts, and vice versa. Always check the compatibility of each permission for both browsers[1][4].

### **Background Scripts: Service Workers vs Background Pages**

- **Chrome:** Manifest V3 requires background logic to run in a service worker, which is event-driven and short-lived. Persistent background pages are no longer supported[5].
- **Firefox:** As of Manifest V3 support (Firefox 109+), Firefox still supports persistent background pages, but is moving towards service worker support for parity with Chrome[1][4].
- **Cross-Browser Strategy:** If you want to support both browsers, you may need to implement both a service worker (for Chrome) and a background page (for Firefox), or use polyfills and conditional logic to handle differences[1].

### **WebExtensions API Differences**

- **API Coverage:** Both browsers implement the WebExtensions API, but there are differences in coverage and behavior. Chrome often implements new APIs first, while Firefox may lag or provide alternative APIs[1][4].
- **Promise Support:** Firefox APIs are generally promise-based, while Chrome’s APIs are callback-based, though Chrome is moving towards promise support in newer APIs[5].
- **Notable Differences:** Some APIs (e.g., `declarativeNetRequest`, `scripting`) have different capabilities or are not fully supported in Firefox[4].

### **Storage API**

- **Commonality:** Both browsers support the `storage` API (`chrome.storage` / `browser.storage`), including `sync`, `local`, and `managed` areas.
- **Differences:** Firefox may have different quota limits or sync behaviors. Always check the documentation for storage limits and sync behavior in both browsers[1][4].

### **Context Menu API**

- **Support:** Both browsers support the `contextMenus` API for adding custom items to the right-click menu.
- **Differences:** Some context menu features or event properties may behave differently or be unavailable in one browser. For example, Firefox may support additional context types or menu item options[1][4].

### **Content Script Injection**

- **Execution Contexts:** Chrome uses "isolated worlds" for content scripts, while Firefox uses "Xray vision." This affects how scripts interact with the page’s JavaScript objects[1].
- **DOM Access:** Both allow DOM manipulation, but Firefox provides APIs for content scripts to share objects with page scripts, which Chrome does not[1].
- **CSP Differences:** Content Security Policy (CSP) enforcement may differ, affecting what scripts can do or load in each browser[1].

### **Firefox-Specific Requirements and Limitations**

- **browser_specific_settings:** Required for certain Firefox-only features or to specify minimum/maximum supported versions[1].
- **API Gaps:** Some Chrome APIs (notably `declarativeNetRequest` and advanced scripting APIs) are not fully implemented or behave differently in Firefox[4].
- **Background Script Support:** Firefox still supports persistent background pages, but this may change as service worker support matures[1][4].
- **Manifest V3 Maturity:** Firefox’s Manifest V3 implementation is newer and may lack some features or have bugs not present in Chrome[4].
- **Testing:** Always test your extension in both browsers, as subtle differences in API behavior, permissions, and manifest parsing can cause issues[1][4].

---

## **Comparison Table: Key Differences**

| Feature/Aspect            | Chrome (Manifest V3)            | Firefox (Manifest V3)                |
|--------------------------|----------------------------------|--------------------------------------|
| Background Scripts       | Service workers only             | Background pages (persistent) + SW   |
| Manifest.json Keys       | No `browser_specific_settings`    | Supports `browser_specific_settings` |
| Permissions              | Stricter, some APIs restricted   | Some APIs more permissive            |
| WebExtensions API        | Broad, some Chrome-only APIs     | Broad, some gaps/alternatives        |
| Storage API              | Standard, Chrome quotas          | Standard, Firefox quotas             |
| Context Menu API         | Supported, Chrome-specific props | Supported, some Firefox extensions   |
| Content Script Context   | Isolated worlds                  | Xray vision, object sharing possible |
| CSP Enforcement          | Strict, Chrome rules             | Slightly different, Firefox rules    |

---

## **Actionable Guidance for Cross-Browser Extension Development**

- **Manifest Management:** Use a build step to generate browser-specific manifests, especially if you need `browser_specific_settings` or other browser-only keys.
- **Background Logic:** Abstract background logic to support both service workers and background pages, or use a compatibility layer.
- **API Usage:** Stick to the common subset of WebExtensions APIs, and use feature detection or polyfills for browser-specific APIs.
- **Testing:** Rigorously test in both browsers, focusing on permissions, background script behavior, and content script injection.
- **Documentation:** Refer to MDN’s cross-browser extension guide and each browser’s extension documentation for up-to-date compatibility notes[1][4].

---

For your project (one-click bookmarking with visual confirmation), pay special attention to background script implementation (service worker vs background page), context menu API differences, and content script injection nuances to ensure seamless operation in both Chrome and Firefox.


---

*Generated by Task Master Research Command*  
*Timestamp: 2025-06-21T10:27:53.277Z*
