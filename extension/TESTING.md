# Dailies Chrome Extension - Testing Guide

## Overview

This document provides comprehensive testing procedures for the Dailies Chrome Extension content extraction functionality implemented in Subtask 3.2.

## Prerequisites

1. **Chrome Browser** (version 88+ for Manifest V3 support)
2. **Developer Mode Enabled** in Chrome Extensions
3. **Extension Loaded** as unpacked extension

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" toggle in top-right corner
3. Click "Load unpacked" button
4. Select the `extension/` directory from the Dailies project
5. Verify extension appears in list without errors

## Test Suite Overview

The extension should be tested across different content types to validate extraction accuracy and robustness.

## Test Case 1: Article Content Extraction

### Objective
Validate Readability.js integration and clean article content extraction.

### Test Sites
- **Local Test**: `file:///path/to/dailies/extension/test-page.html`
- **CNN Politics**: `https://www.cnn.com/politics` (any recent article)
- **BBC News**: `https://www.bbc.com/news` (any news article)
- **New York Times**: `https://www.nytimes.com` (any article - may have paywall)
- **NPR**: `https://www.npr.org` (any news story)

### Testing Procedure

1. **Navigate** to test article URL
2. **Open Extension Popup** (click Dailies icon in toolbar)
3. **Verify Content Type**: Should show "📰 Capture Article"
4. **Open Browser Console** (F12 → Console tab)
5. **Click "Capture Article"** button
6. **Monitor Console Output** for extraction logs

### Expected Results

#### Visual Confirmation (Toast Notification)
You should see a **green toast notification** appear in the top-right corner:
- **Message**: "Article captured successfully!"
- **Icon**: Green checkmark (✓)
- **Animation**: Slides in from right edge
- **Duration**: Visible for 3 seconds, then slides out
- **Style**: Non-intrusive, doesn't block page interaction

#### Console Output Pattern:
```
Dailies content script loaded on: [URL]
Dailies content script initialized for: article
Extracting content from: [URL]
Readability.js loaded successfully
Content extraction completed: {
  type: "article",
  titleLength: [number],
  contentLength: [number],
  hasSelection: false
}
```

#### Background Script Output:
```
Page content extracted: {
  url: "[URL]",
  title: "[Article Title]",
  contentType: "article",
  contentLength: [number]
}
Notification [success]: Page captured successfully
```

### Validation Checklist
- [ ] Content type correctly detected as "article"
- [ ] Readability.js loads without errors
- [ ] Article title extracted correctly
- [ ] Clean content extracted (no ads/navigation)
- [ ] Author and publish date extracted (if available)
- [ ] Word count and reading time calculated
- [ ] No JavaScript errors in console

## Test Case 2: Video Platform Extraction

### Objective
Validate video metadata extraction across multiple platforms with platform-specific extractors.

### Test Sites
- **YouTube**: `https://youtube.com/watch?v=[any-video-id]`
- **Vimeo**: `https://vimeo.com/[video-id]`
- **Twitch**: `https://twitch.tv/[streamer-name]`
- **TikTok**: `https://tiktok.com/@[user]/video/[video-id]`

### Testing Procedure

1. **Navigate** to video platform URL
2. **Wait for page to fully load** (video player/content visible)
3. **Open Extension Popup**
4. **Verify Platform Detection**: Should show platform-specific capture button:
   - YouTube: "🎥 Capture YouTube Video"
   - Vimeo: "🎥 Capture Vimeo Video" 
   - Twitch: "📺 Capture Twitch Stream"
   - TikTok: "🎵 Capture TikTok Video"
5. **Open Browser Console**
6. **Click capture button**
7. **Monitor Console Output**
8. **Test Context Menu**: Right-click page → "Capture this page with Dailies"

### Expected Results

#### Console Output Pattern:
```
Dailies content script loaded on: https://www.youtube.com/watch?v=[VIDEO_ID]
Dailies content script initialized for: video
Extracting content from: https://www.youtube.com/watch?v=[VIDEO_ID]
Content extraction completed: {
  type: "video",
  titleLength: [number],
  contentLength: 0,
  hasSelection: false
}
```

#### Expected Data Structure:
```javascript
{
  contentType: "video",
  video: {
    videoId: "[VIDEO_ID]",
    title: "[Video Title]",
    channel: "[Channel Name]",
    description: "[Video Description]",
    duration: "[Duration]",
    thumbnailUrl: "https://img.youtube.com/vi/[VIDEO_ID]/maxresdefault.jpg"
  }
}
```

### Validation Checklist
- [ ] Content type correctly detected as "video"
- [ ] Video ID extracted from URL
- [ ] Video title extracted correctly
- [ ] Channel name extracted
- [ ] Description extracted (if available)
- [ ] Duration extracted (if available)
- [ ] Thumbnail URL generated correctly
- [ ] No JavaScript errors in console

## Test Case 3: Social Media Post Extraction

### Objective
Validate social media platform-specific content extraction.

### Test Sites

#### Twitter/X Posts
- **Political Tweet**: `https://twitter.com/[any-political-account]/status/[tweet-id]`
- **News Tweet**: `https://twitter.com/[news-account]/status/[tweet-id]`
- **Thread**: `https://twitter.com/[account]/status/[first-tweet-in-thread]`

#### Reddit Posts
- **News Discussion**: `https://reddit.com/r/news/comments/[post-id]/[title]`
- **Politics**: `https://reddit.com/r/politics/comments/[post-id]/[title]`
- **Text Post**: Any Reddit text post with substantial content

### Testing Procedure

1. **Navigate** to social media post URL
2. **Wait for content to load completely**
3. **Open Extension Popup**
4. **Verify Content Type**: Should show "💬 Capture Post"
5. **Open Browser Console**
6. **Click "Capture Post"** button
7. **Monitor Console Output**

### Expected Results

#### For Twitter/X:
```javascript
{
  contentType: "post",
  social: {
    platform: "Twitter",
    author: "[Username]",
    content: "[Tweet Text]",
    timestamp: "[Time]"
  }
}
```

#### For Reddit:
```javascript
{
  contentType: "post",
  social: {
    platform: "Reddit",
    author: "[Username]",
    subreddit: "[Subreddit Name]",
    content: "[Post Content]"
  }
}
```

### Validation Checklist
- [ ] Content type correctly detected as "post"
- [ ] Platform correctly identified
- [ ] Post content extracted
- [ ] Author information extracted
- [ ] Platform-specific metadata extracted
- [ ] No JavaScript errors in console

## Test Case 4: Selected Text Extraction

### Objective
Validate selected text capture with surrounding context.

### Testing Procedure

1. **Navigate** to any article or content page
2. **Select text** by highlighting a paragraph or sentence
3. **Open Extension Popup** (selection should remain active)
4. **Verify Status**: Should show "Text selected - ready to capture"
5. **Right-click** on selected text
6. **Choose "Capture selected text"** from context menu
7. **Monitor Console Output**

### Expected Results

#### Console Output:
```
Content extraction completed: {
  type: "[content-type]",
  titleLength: [number],
  contentLength: [number],
  hasSelection: true
}
```

#### Expected Data Structure:
```javascript
{
  content: {
    selected: {
      text: "[Selected Text]",
      context: "[Surrounding Context]",
      length: [number]
    }
  }
}
```

### Validation Checklist
- [ ] Selected text captured accurately
- [ ] Surrounding context included (±100 characters)
- [ ] Selection length calculated correctly
- [ ] Context menu integration works
- [ ] No interference with page functionality

## Test Case 5: Generic Page Extraction

### Objective
Validate fallback extraction for non-specialized content types.

### Test Sites
- **Documentation**: `https://developer.mozilla.org` (any documentation page)
- **Blog Post**: Any personal blog or Medium article
- **Product Page**: Any e-commerce product page
- **GitHub Repository**: `https://github.com/[repo]`

### Testing Procedure

1. **Navigate** to generic page URL
2. **Open Extension Popup**
3. **Verify Content Type**: Should show "📄 Capture Page"
4. **Open Browser Console**
5. **Click "Capture Page"** button
6. **Monitor Console Output**

### Expected Results

#### Console Output:
```
Dailies content script initialized for: other
Content extraction completed: {
  type: "other",
  titleLength: [number],
  contentLength: [number],
  hasSelection: false
}
```

### Validation Checklist
- [ ] Content type detected as "other"
- [ ] Basic content extraction successful
- [ ] Page title extracted
- [ ] Main content area identified
- [ ] Metadata extracted where available
- [ ] No JavaScript errors in console

## Error Handling Tests

### Test Case 6: Content Script Error Handling

#### Test Sites with Potential Issues
- **Heavy JavaScript Sites**: Complex SPAs that load content dynamically
- **Sites with CSP**: Pages with strict Content Security Policies
- **Protected Content**: Sites that block content extraction
- **Large Content**: Pages with extremely large amounts of text/media

#### Testing Procedure
1. Navigate to problematic site
2. Attempt content extraction
3. Verify graceful error handling
4. Check for fallback extraction methods

#### Expected Behavior
- [ ] No unhandled JavaScript errors
- [ ] Graceful fallback to basic extraction
- [ ] Appropriate error messages in console
- [ ] Extension remains functional after errors

## Performance Tests

### Test Case 7: Large Content Handling

#### Objective
Validate content size limits and performance with large pages.

#### Testing Procedure
1. Navigate to very long article (10,000+ words)
2. Perform content extraction
3. Monitor console for size warnings
4. Verify extraction completes in reasonable time (<5 seconds)

#### Expected Results
- [ ] Size warning displayed for content >500KB
- [ ] Extraction completes without browser freeze
- [ ] Memory usage remains reasonable
- [ ] Content truncated appropriately if needed

## Integration Tests

### Test Case 8: Extension Component Integration

#### Popup Integration
1. Verify popup updates content type correctly
2. Test capture button functionality
3. Validate status messages
4. Check options page integration

#### Background Script Integration
1. Verify message passing between components
2. Test context menu functionality
3. Validate service worker lifecycle
4. Check extension icon updates

#### Content Script Integration
1. Test injection on various sites
2. Verify cross-origin functionality
3. Test Readability.js loading
4. Validate message handling

## Toast Notification Testing

### Visual Confirmation System

The extension includes a comprehensive toast notification system for user feedback.

#### Toast Types and Messages:
- **Success (Green)**: Content-specific success messages
  - "Article captured successfully!" (for articles)
  - "Video captured successfully!" (for YouTube videos)
  - "Post captured successfully!" (for social media)
  - "Content captured successfully!" (for other content)
  - "Selected text captured!" (for text selection)
- **Error (Orange)**: Failure notifications
  - "Failed to capture content"
  - "Failed to capture selection"

#### Toast Behavior Testing:
1. **Appearance**: Toast slides in from right edge of screen
2. **Position**: Fixed in top-right corner (20px from edges)
3. **Duration**: Visible for exactly 3 seconds
4. **Exit**: Slides out to right with fade effect
5. **Non-blocking**: Doesn't interfere with page interactions
6. **Single instance**: New toast replaces existing one
7. **High z-index**: Appears above all page content

#### Cross-site Compatibility:
Test toasts work properly on:
- [ ] News sites (CNN, BBC, NPR)
- [ ] YouTube
- [ ] Social media (Twitter, Reddit)
- [ ] Sites with custom CSS/high z-index elements
- [ ] Sites with strict CSP policies

## Backend Communication Testing

### API Integration Verification

Test the secure backend communication implemented in Subtask 3.4.

#### Prerequisites:
1. **Backend Server Running**: Start with `npm run dev` in backend directory
2. **Database Setup**: PostgreSQL running via `docker-compose up -d`
3. **Extension Configuration**: Set backend URL in options page

#### Testing Procedure:
1. **Configure Extension**:
   - Right-click extension icon → "Options"
   - Set Backend URL: `http://localhost:3000`
   - Click "Test Connection" - should show success
   - Save settings

2. **Test Content Submission**:
   - Capture content on any article/video/post
   - Check service worker console for API logs
   - Verify content saved in database

3. **Verify Error Handling**:
   - Stop backend server
   - Try capturing content
   - Should see retry attempts in console
   - User still gets success toast (extraction succeeded)

#### Expected Service Worker Console Output:
```
API request attempt 1: http://localhost:3000/api/content/public
Content saved to backend: {success: true, contentId: 123}
```

#### Error Scenarios:
```
API request attempt 1: http://localhost:3000/api/content/public
API request attempt 1 failed: TypeError: Failed to fetch
Retrying in 1000ms...
API request attempt 2: http://localhost:3000/api/content/public
Failed to save content to backend: [error details]
```

#### Database Verification:
Use backend test script to verify data:
```bash
cd backend
node test-server.js
```

## Context Menu Testing

### Right-Click Content Capture

Test the context menu integration implemented in Subtask 3.5.

#### Testing Procedure:
1. **Navigate** to any web page with content
2. **Select text** on the page (highlight some text)
3. **Right-click** on selected text
4. **Verify menu item**: "Capture selected text with Dailies"
5. **Click menu item** and verify capture
6. **Right-click** on page (no selection)
7. **Verify menu item**: "Capture this page with Dailies"
8. **Click menu item** and verify full page capture

#### Expected Results:
- Context menu items appear on all http/https pages
- Selected text capture shows "Selected text captured!" toast
- Page capture shows content-type-specific toast
- Both methods log to service worker console
- Content saved to backend database

#### Cross-Platform Context Menu Testing:
Test context menus work on:
- [ ] News articles (CNN, BBC, etc.)
- [ ] YouTube videos
- [ ] Social media posts (Twitter, Reddit)
- [ ] Blog posts and Medium articles
- [ ] Generic web pages
- [ ] Pages with complex CSS/JavaScript

## Debugging Guide

### Common Issues and Solutions

#### Issue: "Readability.js failed to load"
**Symptoms**: Console error about Readability.js loading
**Solution**: 
1. Check if `lib/readability.js` exists
2. Verify `web_accessible_resources` in manifest.json
3. Reload extension in chrome://extensions/

#### Issue: "Content script not responding"
**Symptoms**: No console output from content script
**Solution**:
1. Check if content script is injected (Sources tab in DevTools)
2. Verify site allows content scripts
3. Try refreshing the page after extension reload

#### Issue: "Empty content extraction"
**Symptoms**: Content extracted but empty/minimal results
**Solution**:
1. Check if site uses dynamic loading (wait for content)
2. Verify selectors for content detection
3. Test on simpler pages first

### Console Commands for Manual Testing

Open browser console and run these commands for additional testing:

```javascript
// Check if content script is loaded
chrome.runtime.sendMessage({type: 'GET_EXTENSION_STATUS'})

// Manual content extraction test
chrome.runtime.sendMessage({type: 'EXTRACT_CONTENT'})

// Check content type detection
console.log('Content type:', detectContentType())

// Test Readability.js loading
loadReadability().then(r => console.log('Readability loaded:', !!r))
```

## Test Report Template

After completing tests, document results using this template:

```markdown
## Test Report - [Date]

### Environment
- Chrome Version: [version]
- Extension Version: [version]
- Operating System: [OS]

### Test Results Summary
- [ ] Article Extraction: PASS/FAIL
- [ ] YouTube Extraction: PASS/FAIL  
- [ ] Social Media Extraction: PASS/FAIL
- [ ] Selected Text Extraction: PASS/FAIL
- [ ] Generic Page Extraction: PASS/FAIL
- [ ] Toast Notifications: PASS/FAIL
- [ ] Error Handling: PASS/FAIL
- [ ] Performance: PASS/FAIL

### Issues Found
1. [Issue description and steps to reproduce]
2. [Issue description and steps to reproduce]

### Notes
[Any additional observations or recommendations]
```

## Automated Testing (Future)

For future development, consider implementing:
- Unit tests for content extraction functions
- Automated browser testing with Puppeteer
- CI/CD integration for extension testing
- Performance benchmarking automation

---

**Note**: This testing guide covers Subtask 3.2 functionality. Additional testing procedures will be added as subsequent subtasks (3.3, 3.4, 3.5) are implemented.