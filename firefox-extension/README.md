# 🦊 Dailies Firefox Extension

> **Content Curator** - Intelligent one-click content capture and curation

A Firefox browser extension that transforms your browsing into personalized daily digests with AI-powered analysis.

## Features

✅ **Content Extraction** - Extracts articles, videos, posts with Readability.js  
✅ **Visual Confirmation** - Toast notifications for user feedback  
✅ **Backend Communication** - Secure API integration with retry logic  
✅ **Multi-Platform Support** - YouTube, Twitter, Reddit, LinkedIn, Instagram, etc.
✅ **Context Menu Integration** - Right-click to capture selected text or full pages

## Installation (Development)

### Firefox Developer Edition or Nightly (Recommended)
1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the left sidebar
3. Click "Load Temporary Add-on..."
4. Navigate to the `firefox-extension/` directory
5. Select the `manifest.json` file
6. The Dailies extension should now appear in your extensions list

### Firefox Stable (Alternative)
1. Navigate to `about:config`
2. Search for `extensions.manifestV3.enabled`
3. Set the value to `true` (if not already enabled)
4. Follow the installation steps above

## Configuration

Before using, configure the extension:
1. Click the extension icon and go to "Settings" 
2. Set your backend server URL (default: http://localhost:3000)
3. Optionally set an API key for authentication
4. Test the connection to verify setup

## Testing

After loading the extension, test content extraction on various page types:

### Test Sites:
1. **Articles**: CNN, BBC, New York Times articles  
2. **YouTube Videos**: Any youtube.com/watch?v= URL
3. **Social Media**: Twitter/X posts, Reddit threads, LinkedIn posts
4. **Generic Pages**: Any other website

### Verification Steps:
1. Click extension popup and note content type detection
2. Click "Capture" button and check browser console for extraction logs
3. Try right-clicking to capture selected text or full pages
4. Verify toast notifications appear and auto-dismiss
5. Check that no JavaScript errors occur in console

### Expected Features:
- **Smart Content Type Detection**: Automatically detects articles, videos, posts
- **Platform-Specific Icons**: Different icons for different content types
- **Toast Notifications**: Success/error feedback without page interruption
- **Context Menu**: Right-click options for quick capture
- **Cross-Browser API**: Uses Firefox's promise-based APIs where available

## Firefox-Specific Features

### API Compatibility
- Uses Firefox's promise-based `browser.*` APIs when available
- Falls back to Chrome-style `chrome.*` APIs for compatibility
- Optimized for Firefox's WebExtension implementation

### Manifest V3 Support
- Requires Firefox 109+ for full Manifest V3 support
- Uses Firefox-specific `browser_specific_settings` configuration
- Service worker implementation optimized for Firefox

### Storage Integration
- Uses Firefox's enhanced storage APIs
- Cross-browser sync storage compatibility
- Secure API key storage with Firefox's encryption

## Development

### Project Structure
```
firefox-extension/
├── manifest.json          # Firefox-specific Manifest V3
├── background/
│   └── service-worker.js   # Cross-browser service worker
├── content/
│   └── content-script.js   # Content extraction logic
├── popup/
│   ├── popup.html         # Extension popup interface
│   ├── popup.css          # Styling with Dailies branding
│   └── popup.js           # Cross-browser popup logic
├── options/
│   ├── options.html       # Configuration page
│   └── options.js         # Firefox-compatible settings
├── icons/                 # Extension icons (16px, 48px, 128px)
└── lib/
    └── readability.js     # Mozilla Readability library
```

### Cross-Browser Compatibility
The Firefox extension is designed to work with both Firefox's promise-based APIs and Chrome's callback-based APIs:

```javascript
// API compatibility layer
const api = (function() {
  if (typeof browser !== 'undefined') {
    return browser; // Firefox (promise-based)
  }
  return chrome; // Chrome/fallback (callback-based)
})();
```

### Testing Requirements
- Firefox Developer Edition 109+ or Nightly build
- Enable Manifest V3 support in `about:config`
- Backend server running on localhost:3000 (optional for testing)

## Browser Support

- **Firefox 109+**: Full Manifest V3 support
- **Firefox 91-108**: Limited support, may require developer flags
- **Firefox ESR**: Check compatibility with specific ESR version

## Differences from Chrome Extension

1. **Manifest**: Includes `browser_specific_settings` for Firefox
2. **APIs**: Uses Firefox's promise-based APIs when available
3. **Options UI**: Uses `options_ui` instead of `options_page` for better integration
4. **Storage**: Optimized for Firefox's storage implementation
5. **Service Worker**: Enhanced compatibility for Firefox's implementation

## Known Issues

1. **Manifest V3**: Requires recent Firefox version (109+)
2. **Service Workers**: Some Firefox versions may have limited support
3. **Content Scripts**: May need manual injection on some sites
4. **Storage Sync**: Cross-device sync requires Firefox Account

## Contributing

When contributing to the Firefox extension:
1. Test on Firefox Developer Edition or Nightly
2. Ensure cross-browser compatibility with Chrome extension
3. Use the promise-based API pattern where possible
4. Test manifest.json validation with Firefox web-ext tool

## Support

For Firefox-specific issues:
- Check Firefox WebExtension documentation
- Use Firefox Developer Tools for debugging
- Test with `web-ext` CLI tool for validation

---

*Firefox Extension v1.0.0*  
*Compatible with Dailies backend API*  
*Cross-browser codebase shared with Chrome extension*