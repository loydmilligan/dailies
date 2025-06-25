# Dailies Post-Refactor Strategic Planning

*December 24, 2024*

## Executive Summary

Following the successful completion of the modular content classification refactor, this document outlines the strategic planning for TaskMaster reset and comprehensive Web UI development. The refactor fundamentally changed our system from a binary classification (Political vs General) to a sophisticated 9-category modular system, requiring significant updates to our development roadmap.

## TaskMaster Impact Assessment

### Current Status Analysis
- **Total Pending Tasks**: 11 tasks with 55 subtasks
- **Tasks Heavily Impacted**: 5 out of 11 (45%)
- **Completion Rate**: 45% overall project completion

### Impact Categories

#### 🟢 **Minimal Impact (Keep As-Is)**
- **Task 9: Topic Clustering Algorithm** - Benefits from 9 categories, minor updates needed
- **Task 10: Content Importance Ranking** - Unchanged core logic, will work better with categorization
- **Task 11: Daily Digest Generation** - Minor updates needed for multi-category digest formatting
- **Task 12: Email Delivery System** - Completely unaffected by changes
- **Task 13: Text-to-Speech Audio Generation** - Completely unaffected by changes
- **Task 20: System Integration Testing** - Mostly unchanged, test cases need category updates

#### 🔴 **Major Impact (Needs Rewrite/Consolidation)**
- **Task 14: Web Interface Dashboard** - Originally designed for binary system, now needs 9 categories + HTMX approach instead of React
- **Task 15: Search and Filter Functionality** - References outdated "political classification", should merge into unified UI task
- **Task 16: Manual Content Editing** - References "political/general categorization", should merge into UI task
- **Task 17: Configuration Settings** - Scope significantly expanded (category management, AI providers), should merge into UI task
- **Task 18: System Monitoring** - Analytics scope expanded dramatically, could merge into UI task

### Key Issues with Current TaskMaster Structure

1. **Fragmentation**: UI tasks (14-17) are artificially separated when they should be one comprehensive task
2. **Outdated Scope**: Multiple task descriptions still reference binary "political/general" system
3. **Framework Mismatch**: All UI tasks assume React/Vue implementation, incompatible with HTMX + Express decision
4. **Missing Critical Features**: No tasks for category management, domain matcher configuration, AI provider management interface

## Recommendation: Clean Slate Approach

### Rationale for TaskMaster Reset

**Strong recommendation to clean out TaskMaster and rebuild** based on:

- **40% of core tasks** require major rewrites due to scope and framework changes
- **UI task fragmentation** prevents cohesive development approach
- **Fundamental scope change** from binary to 9-category system invalidates existing assumptions
- **Framework decision** (HTMX + Express vs React) invalidates all existing UI subtasks
- **New system capabilities** (category management, domain hints, multi-provider AI) not reflected in current tasks

### Benefits of Reset

1. **Unified UI Development**: Single comprehensive task instead of 4+ fragmented ones
2. **Accurate Scope**: Tasks reflect actual 9-category modular system
3. **Framework Alignment**: Tasks designed for HTMX + Express approach
4. **Complete Feature Coverage**: Include all new capabilities from modular refactor

## New PRD Structure Overview

### Backend Services (Keep/Adapt Existing Tasks)
- **Topic Clustering Algorithm** (Task 9) - Minor updates for 9 categories
- **Content Importance Ranking** (Task 10) - Minimal changes required
- **Daily Digest Generation** (Task 11) - Update for multi-category formatting
- **Email Delivery System** (Task 12) - No changes required
- **Text-to-Speech Audio Generation** (Task 13) - No changes required
- **System Integration Testing** (Task 20) - Update test cases for new system

### Unified Web Interface (New Comprehensive Task)

Replace Tasks 14-18 with single comprehensive UI development task focusing on HTMX + Express implementation.

## Detailed User Stories by Page

### 📊 **Dashboard Page**
**Primary Focus**: System overview and recent activity monitoring

#### Core User Stories:
- **US-001**: As a user, I want to see recent content captures organized by category so I can quickly understand what content has been processed
- **US-002**: As a user, I want to view real-time processing statistics (captures per day/week, success rates) so I can monitor system health
- **US-003**: As a user, I want to see AI provider usage and costs (Gemini/OpenAI/Anthropic) so I can track expenses
- **US-004**: As a user, I want to view category distribution charts so I can understand content patterns
- **US-005**: As a user, I want to see processing pipeline status for recent content so I can identify any issues
- **US-006**: As a user, I want quick access to failed classifications for manual review
- **US-007**: As a user, I want to see top domains by capture volume to understand content sources

#### Technical Requirements:
- Server-side rendered EJS templates
- Chart.js integration for visualizations
- HTMX for real-time data updates
- Responsive design with Tailwind CSS

---

### 🔍 **Content Management Page**
**Primary Focus**: Content discovery, management, and bulk operations

#### Core User Stories:
- **US-008**: As a user, I want to search content across all 9 categories using full-text search so I can find specific articles
- **US-009**: As a user, I want to filter content by category, date range, source domain, and quality score so I can narrow down results
- **US-010**: As a user, I want to see content in a paginated list with key metadata (title, category, date, source) for easy browsing
- **US-011**: As a user, I want to select multiple content items for bulk operations (delete, reprocess, change category) to manage content efficiently
- **US-012**: As a user, I want to sort content by date, quality score, or category for different viewing preferences
- **US-013**: As a user, I want to see classification confidence scores and AI provider used for transparency
- **US-014**: As a user, I want to export selected content to CSV/JSON for external analysis
- **US-015**: As a user, I want to see content processing status (successful, failed, in-progress) with error details

#### Advanced Features:
- **US-016**: As a user, I want to save custom filter combinations as presets for repeated use
- **US-017**: As a user, I want to see related content suggestions based on similarity
- **US-018**: As a user, I want to flag content for manual review or follow-up

#### Technical Requirements:
- PostgreSQL full-text search integration
- HTMX-powered filtering and pagination
- Bulk operation confirmation dialogs
- Progress indicators for long-running operations

---

### 📄 **Content Detail Modal**
**Primary Focus**: Individual content examination and editing

#### Core User Stories:
- **US-019**: As a user, I want to view full content details including raw text, summary, and extracted metadata
- **US-020**: As a user, I want to see all AI processing results (bias analysis, quality scores, extracted entities) in an organized layout
- **US-021**: As a user, I want to manually override AI classification if the category is incorrect
- **US-022**: As a user, I want to edit content metadata (title, summary, key points) to improve accuracy
- **US-023**: As a user, I want to see the classification reasoning and confidence score to understand AI decisions
- **US-024**: As a user, I want to view action execution results for each category-specific processor
- **US-025**: As a user, I want to reprocess content with different AI providers or settings
- **US-026**: As a user, I want to add manual notes or annotations to content items

#### Category-Specific Views:
- **US-027**: For political content, I want to see bias analysis, quality scores, and loaded language detection
- **US-028**: For tech content, I want to see extracted technologies, tools, and trend analysis
- **US-029**: For 3D printing content, I want to see print settings, model classification, and file information
- **US-030**: For sports content, I want to see extracted statistics, teams, and players

#### Technical Requirements:
- Modal/overlay implementation with HTMX
- Form handling for content editing
- Real-time validation and feedback
- Category-specific result displays

---

### 📅 **Digest Management Page**
**Primary Focus**: Daily digest creation, management, and scheduling

#### Core User Stories:
- **US-031**: As a user, I want to view past digests in a calendar layout so I can see digest history
- **US-032**: As a user, I want to manually trigger digest generation for any date range
- **US-033**: As a user, I want to preview digest content before sending to review formatting and content selection
- **US-034**: As a user, I want to edit digest sections (add/remove content, modify summaries) for customization
- **US-035**: As a user, I want to see digest generation status and any errors that occurred
- **US-036**: As a user, I want to configure digest frequency and delivery schedule
- **US-037**: As a user, I want to see digest analytics (open rates, click rates) if email delivery is enabled
- **US-038**: As a user, I want to regenerate digests with different content selection criteria

#### Advanced Features:
- **US-039**: As a user, I want to create themed digests (e.g., tech-only, politics-only) for targeted audiences
- **US-040**: As a user, I want to set content quality thresholds for digest inclusion
- **US-041**: As a user, I want to exclude specific sources or categories from digests

#### Technical Requirements:
- Calendar widget integration
- Markdown preview and editing
- Drag-and-drop content organization
- Email preview functionality

---

### ⚙️ **Configuration Page**
**Primary Focus**: System settings and AI provider management

#### Core User Stories:
- **US-042**: As a user, I want to configure AI provider settings (API keys, model selection, fallback order) for classification control
- **US-043**: As a user, I want to manage content categories (add, edit, disable) to customize the classification system
- **US-044**: As a user, I want to configure category aliases for better classification accuracy
- **US-045**: As a user, I want to manage domain matchers to provide classification hints
- **US-046**: As a user, I want to set email delivery preferences (SMTP settings, templates) for digest distribution
- **US-047**: As a user, I want to configure action execution settings for each category
- **US-048**: As a user, I want to set system performance parameters (timeouts, retry limits)
- **US-049**: As a user, I want to manage user accounts and permissions for multi-user scenarios

#### AI Provider Management:
- **US-050**: As a user, I want to test AI provider connectivity and view response times
- **US-051**: As a user, I want to see cost tracking per provider and set budget alerts
- **US-052**: As a user, I want to configure model-specific parameters for each provider

#### Category Management:
- **US-053**: As a user, I want to create new content categories with custom actions
- **US-054**: As a user, I want to reorder category priorities for classification preference
- **US-055**: As a user, I want to see category statistics and adjust settings accordingly

#### Technical Requirements:
- Secure form handling for API keys
- Real-time configuration validation
- Configuration backup/restore functionality
- Audit logging for configuration changes

---

### 📈 **Analytics Page**
**Primary Focus**: System insights and performance monitoring

#### Core User Stories:
- **US-056**: As a user, I want to view content trends by category over time to understand information patterns
- **US-057**: As a user, I want to monitor AI classification accuracy and confidence scores for system optimization
- **US-058**: As a user, I want to track processing costs and usage patterns across AI providers
- **US-059**: As a user, I want to see system performance metrics (processing time, error rates) for health monitoring
- **US-060**: As a user, I want to analyze content source patterns and domain reliability
- **US-061**: As a user, I want to export analytics data for external reporting

#### Advanced Analytics:
- **US-062**: As a user, I want to see correlation analysis between content characteristics and engagement
- **US-063**: As a user, I want to identify content quality trends and outliers
- **US-064**: As a user, I want to monitor digest performance and reader engagement
- **US-065**: As a user, I want to set up automated alerts for system anomalies

#### Technical Requirements:
- Interactive Chart.js visualizations
- Data export functionality
- Real-time metric updates
- Configurable dashboard widgets

## Implementation Strategy

### Framework & Technology Stack
- **Backend**: Express.js (existing) + EJS templates
- **Frontend Interactivity**: HTMX for dynamic updates
- **Styling**: Tailwind CSS (CDN, no build process)
- **Visualizations**: Chart.js for analytics
- **Database**: PostgreSQL (existing) with optimized queries

### Development Approach
1. **Page-by-Page Development**: Build one complete page before moving to next
2. **Atomic Changes**: Small, testable increments with frequent commits
3. **TaskMaster Integration**: Use subtasks for each page and major feature
4. **Testing Strategy**: Manual testing after each change, automated testing for critical paths

### Phase Rollout Plan
1. **Phase 1**: Dashboard page (foundation and navigation)
2. **Phase 2**: Content Management page (core functionality)
3. **Phase 3**: Content Detail modal (content editing)
4. **Phase 4**: Configuration page (system management)
5. **Phase 5**: Analytics page (insights and monitoring)
6. **Phase 6**: Digest Management page (content curation)

## Next Steps

1. **Review and Refine User Stories**: Validate completeness and priority
2. **Generate New PRD.txt**: Create comprehensive requirements document
3. **Reset TaskMaster**: Clear existing tasks and regenerate from new PRD
4. **Begin Implementation**: Start with Dashboard page development

---

*This document serves as the foundation for TaskMaster reset and comprehensive UI development following the successful modular classification refactor.*