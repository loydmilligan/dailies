# MVP - Dailies Content Curation System

## MVP Scope

The Minimum Viable Product focuses on solving the core problem: retention and synthesis of US politics and news content consumed daily.

## Core Features

### 1. Content Capture
- **Browser Extension** (Chrome/Firefox)
  - Simple "save this page" button
  - Captures entire web pages and full YouTube videos
  - Automatic metadata extraction (URL, title, timestamp, source)

### 2. Content Classification
- **AI-Powered Categorization**
  - Automatic detection of US politics/news content
  - Fallback to manual tagging if AI classification fails
  - Binary classification: "US Politics/News" vs "General Content"

### 3. Enhanced Processing (US Politics/News Only)
- **Content Analysis**
  - Political bias detection (left/right leaning)
  - Content quality scoring (1-10 scale)
  - Comprehensive summary generation
  - Potential implications analysis
  - Loaded language detection

### 4. Basic Storage (Non-Politics Content)
- **Simple JSON Structure**
  - URL, title, summary, timestamp
  - Basic metadata only
  - Minimal processing overhead

### 5. Daily Digest Generation
- **Content Organization**
  - Topic clustering of political content
  - Importance-based ranking within clusters
  - Markdown format with structured sections

### 6. Delivery System
- **Multi-Format Output**
  - Email delivery of markdown digest
  - TTS (Text-to-Speech) audio generation
  - Local storage for historical access

## Technical Stack

### Database
- **PostgreSQL** for structured data storage
- Content JSON objects with flexible schema
- Metadata indexing for efficient querying

### AI Integration
- **Primary**: Gemini API for content processing
- **Backup**: OpenAI/Anthropic for fallback scenarios
- **Processing Pipeline**: Classification → Analysis → Summarization

### Infrastructure
- **Self-hosted** on home server
- **Web Interface** for content management
- **Automated Scheduling** for daily digest generation

## Success Criteria

1. **Content Capture**: Successfully bookmark and process 25-50 items daily
2. **Classification Accuracy**: 90%+ correct identification of political content
3. **Digest Quality**: Daily summaries that provide actionable insights
4. **User Adoption**: Daily engagement with generated digests
5. **System Reliability**: 99% uptime for content capture and processing

## MVP Limitations

### Out of Scope for MVP
- Multi-category content processing
- Flashcard generation
- Browsing helper agent
- Obsidian integration
- Plugin system
- Advanced content types (audio, specialized formats)

### Known Constraints
- Manual tagging fallback for failed AI classification
- Limited to Chrome/Firefox browsers
- Single-user system (no multi-tenancy)
- Basic bias detection (political leaning only)

## Development Timeline

**Phase 1** (Weeks 1-2): Core Infrastructure
- Database schema design
- Basic web interface
- Content capture API

**Phase 2** (Weeks 3-4): Browser Extension
- Chrome/Firefox extension development
- Content capture functionality
- Metadata extraction

**Phase 3** (Weeks 5-6): AI Processing Pipeline
- Gemini API integration
- Content classification system
- Enhanced analysis for political content

**Phase 4** (Weeks 7-8): Digest Generation
- Daily digest creation
- Email delivery system
- TTS generation

**MVP Completion**: 8 weeks from start