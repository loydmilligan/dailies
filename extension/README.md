# 📰 Dailies Chrome Extension

> **Content Curator** - Intelligent one-click content capture and curation

A Chrome browser extension that transforms your browsing into personalized daily digests with AI-powered analysis.

## Installation (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select this `extension/` directory
4. The Dailies extension should now appear in your extensions list

## Features

✅ **Content Extraction** (Subtask 3.2) - Extracts articles, videos, posts with Readability.js  
✅ **Visual Confirmation** (Subtask 3.3) - Toast notifications for user feedback  
✅ **Backend Communication** (Subtask 3.4) - Secure API integration with retry logic

## Configuration

Before using, configure the extension:
1. Click the extension icon and go to "Options" 
2. Set your backend server URL (default: http://localhost:3000)
3. Optionally set an API key for authentication
4. Test the connection to verify setup

## Testing

After loading the extension, test content extraction on various page types:

### Test Sites:
1. **Test Article**: Open `extension/test-page.html` in browser
2. **News Article**: Try CNN, BBC, or New York Times articles  
3. **YouTube Video**: Any youtube.com/watch?v= URL
4. **Social Media**: Twitter/X posts, Reddit comments
5. **Generic Pages**: Any other website

### Verification Steps:
1. Click extension popup and note content type detection (Article/Video/Post/Page)
2. Click "Capture" button and check browser console for extraction logs
3. Try selecting text on page and capturing selection
4. Verify no JavaScript errors in console

### Expected Console Output:
```
Dailies content script loaded on: [URL]
Dailies content script initialized for: [article/video/post/other]
Extracting content from: [URL]
Readability.js loaded successfully (for articles)
Content extraction completed: {type, titleLength, contentLength}
```

### Features Tested:
- ✅ Readability.js integration for clean article extraction
- ✅ YouTube video metadata extraction (ID, title, channel)
- ✅ Social media post detection and extraction
- ✅ Selected text capture with context
- ✅ Content type auto-detection
- ✅ Metadata extraction (author, description, publish date)
- ✅ Content hash generation for deduplication
- ✅ Size limit warnings for large content

## Features (Current - Subtask 3.2)

- **Enhanced Content Extraction**: Comprehensive content parsing with Readability.js
- **Content Type Detection**: Automatic classification (article, video, post, other)
- **Article Processing**: Clean content extraction with Mozilla Readability.js
- **YouTube Integration**: Video metadata extraction (ID, title, channel, description)
- **Social Media Support**: Twitter/X, Reddit, Facebook post extraction
- **Metadata Extraction**: Author, description, publish date, word count
- **Selected Text Capture**: Text selection with surrounding context
- **Content Deduplication**: Hash generation for duplicate detection
- **Size Management**: Content size warnings and limits
- **Popup Interface**: Dynamic content type indicators
- **Options Page**: Settings configuration for backend URL and API key
- **Context Menu**: Right-click options for page and selection capture
- **Service Worker**: Enhanced message passing and extraction coordination

## Features (Planned)

- Visual capture confirmation (Subtask 3.3)
- Backend API integration (Subtask 3.4)
- Advanced content type handlers (Subtask 3.5)

## Directory Structure

```
extension/
├── manifest.json           # Extension configuration (Manifest V3)
├── background/
│   └── service-worker.js   # Background processing & message coordination
├── content/
│   └── content-script.js   # Enhanced content extraction logic
├── lib/
│   └── readability.js     # Mozilla Readability.js library
├── popup/
│   ├── popup.html         # Popup interface
│   ├── popup.js           # Popup logic with content type detection
│   └── popup.css          # Popup styling
├── options/
│   ├── options.html       # Settings page
│   └── options.js         # Settings logic
├── icons/
│   └── *.png             # Extension icons
└── test-page.html         # Test article for validation
```

## Implementation Notes

- **Manifest V3**: Future-compatible Chrome extension architecture
- **Readability.js**: Mozilla's battle-tested article extraction library
- **Content Scripts**: Injected into all pages for universal content access
- **Message Passing**: Secure communication between extension components
- **CSP Compliance**: All scripts bundled locally, no external dependencies
- **Error Handling**: Graceful fallbacks for extraction failures
- **Performance**: Size limits and optimization for large content
- **Privacy**: No data transmitted outside browser (backend integration in subtask 3.4)