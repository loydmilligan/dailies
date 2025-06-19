# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dailies is a personal content curation and knowledge management system that processes web content, YouTube videos, and other media into structured knowledge with AI-powered analysis. The system specializes in US politics and news content, providing daily digests and retention tools.

## Architecture

**Tech Stack:**
- Backend: Node.js 20+ with Express 4.18+
- Database: PostgreSQL 15+ with Redis 7.0+ for caching
- AI: Google Gemini (primary), OpenAI/Anthropic (fallbacks), Perplexity (research)
- Infrastructure: Docker Compose with Nginx reverse proxy
- Job Processing: Bull queues for background tasks

**Key Components:**
- `backend/`: Express API server with JWT auth and AI integration
- `database/`: PostgreSQL schema with political content analysis tables
- `nginx/`: Reverse proxy with rate limiting and security headers
- `frontend/`: Web interface (planned)
- `extension/`: Browser extension (planned)

## Development Commands

**Environment Setup:**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f [service-name]

# Database operations
docker-compose exec postgres psql -U dailies_user -d dailies_db

# Redis CLI
docker-compose exec redis redis-cli
```

**Backend Development:**
```bash
cd backend
npm install
npm run dev          # Development server with hot reload
npm test            # Run test suite
npm run lint        # ESLint
npm run format      # Prettier
```

**Task Management:**
This project uses Task Master AI for project management:
```bash
# View current tasks
taskmaster get-tasks

# Get next task to work on
taskmaster next-task

# Update task status
taskmaster set-task-status <id> <status>
```

## Database Schema

The PostgreSQL schema includes specialized tables for content analysis:

- `content_items`: Core content with deduplication and metadata
- `political_analysis`: Enhanced processing for US politics/news with bias detection, quality scoring, and loaded language analysis
- `daily_digests`: Generated summaries and insights
- `users`/`user_preferences`: Multi-user support with personalization
- `content_categories`/`tags`: Organization and categorization

Key patterns:
- JSONB columns for flexible metadata storage
- ENUM types for standardized categorization
- Proper indexing for content search and filtering
- Timestamps for content freshness tracking

## AI Integration

**Configuration:**
- Primary: Google Gemini API (configured in `.env`)
- Fallbacks: OpenAI and Anthropic APIs
- Research: Perplexity API for fact-checking and context
- Model selection via `.taskmaster/config.json`

**Content Processing Pipeline:**
1. Classification (US Politics vs General content)
2. Quality scoring (1-10 scale)
3. Bias detection (left/center/right)
4. Loaded language identification
5. Summary generation and topic extraction

## Code Patterns

**Cursor Rules Integration:**
Follow patterns in `.cursor/rules/` for:
- Consistent error handling and logging
- Database query optimization
- AI API integration patterns
- Security best practices for content processing

**Environment Configuration:**
- Use `.env.example` as template for required variables
- All secrets must be environment variables
- AI provider keys: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
- Database: `DATABASE_URL`, `REDIS_URL`

## Security Considerations

- JWT-based authentication with proper token validation
- Rate limiting configured in Nginx
- Input sanitization for content processing
- Encrypted storage recommendations (LUKS/VeraCrypt)
- HTTPS termination with security headers

## Content Processing

**Political Content Analysis:**
- Bias detection using AI analysis
- Quality scoring based on factual accuracy and objectivity
- Loaded language detection for emotional manipulation
- Source credibility assessment
- Potential implications analysis

**Daily Digest Generation:**
- Topic clustering and summarization
- Email delivery with SMTP configuration
- Optional TTS podcast generation (Google Cloud TTS)
- Retention tools and spaced repetition

## Development Workflow

1. Check Task Master for current priorities: `taskmaster next-task`
2. Use Docker Compose for consistent development environment
3. Follow database schema patterns for new content types
4. Test AI integrations with multiple providers for fallback resilience
5. Update task status as work progresses
6. Ensure all content processing respects user privacy and data retention policies