# Gemini Project Configuration

This file helps Gemini understand the project's goals, conventions, and operational procedures. By maintaining this file, you can ensure that Gemini's assistance is consistent, efficient, and aligned with your project's specific needs.

## Project Overview

*   **Goal:** Dailies is a comprehensive content curation and knowledge management system that processes web content, YouTube videos, and other media into structured knowledge with AI-powered analysis, daily digests, and retention tools. It solves the common problem of consuming large amounts of digital content without proper retention or synthesis. Target users are individuals who want to better organize and retain knowledge from their daily web browsing, particularly for news and political content analysis.
*   **Tech Stack:** Node.js, Express.js, EJS templating, PostgreSQL with Prisma ORM, Redis, Docker, HTMX, Tailwind CSS, Chart.js, AI APIs (Gemini primary, OpenAI/Anthropic fallbacks), Chrome/Firefox browser extensions

## Project Directory Structure

```
dailies/
├── README.md                     # Project overview and getting started guide
├── ROADMAP.md                   # Development roadmap and feature planning
├── CLAUDE.md                    # Claude Code integration guide and commands
├── docker-compose.yml           # Multi-service container orchestration
├── .taskmaster/                 # Task Master AI project management
│   ├── tasks/tasks.json         # Main task database
│   └── config.json              # AI model configuration
├── backend/                     # Node.js Express API server
│   ├── package.json             # Dependencies and scripts
│   ├── prisma/schema.prisma     # Database schema and models
│   ├── src/
│   │   ├── server.js            # Main Express application
│   │   ├── worker.js            # Background job processor
│   │   ├── database/index.js    # Database service layer
│   │   ├── routes/              # API route handlers
│   │   ├── services/            # Business logic services
│   │   ├── middleware/          # Express middleware
│   │   └── config/              # Configuration files
│   ├── views/                   # EJS templates for web interface
│   │   ├── layouts/main.ejs     # Main layout template
│   │   ├── pages/               # Page templates
│   │   └── partials/            # Reusable template components
│   ├── public/                  # Static assets (CSS, JS, images)
│   └── test/                    # Jest test files
├── extension/                   # Chrome browser extension
│   ├── manifest.json            # Extension configuration
│   ├── popup/                   # Extension popup interface
│   ├── content/                 # Content script for web pages
│   └── background/              # Service worker
├── firefox-extension/           # Firefox browser extension
├── nginx/                       # Nginx reverse proxy configuration
└── docs/                        # Project documentation
    ├── architecture.md          # System architecture overview
    ├── database-schema.md       # Database design documentation
    └── feature-spec.md          # Feature specifications
```

## Development Conventions

*   **Code Style:** ESLint for JavaScript code style enforcement. Prettier for code formatting. Follow standard JavaScript conventions with 2-space indentation. Use semicolons and prefer const/let over var.
*   **Commit Messages:** Use conventional commit format: `type(scope): description`. Types include feat, fix, docs, style, refactor, test, chore. Example: `feat(api): add content classification endpoint`
*   **Branching Strategy:** Git Flow model with `main` as production branch, `develop` for integration, `feature/*` for new features, and `hotfix/*` for critical fixes.
*   **Testing:** Jest testing framework. Tests located in `backend/test/` directory. Write unit tests for services, integration tests for API endpoints. Test files should follow `*.test.js` naming convention.

## Important Commands

*   **Run application:** `docker-compose up -d` (full stack) or `cd backend && npm run dev` (backend only)
*   **Run tests:** `cd backend && npm test`
*   **Lint code:** `cd backend && npm run lint`
*   **Build project:** `docker-compose build`
*   **Database migration:** `cd backend && npm run migrate`
*   **Worker process:** `cd backend && npm run worker`
*   **Task management:** `task-master next` (get next task), `task-master list` (view all tasks)

## User Preferences

*   **Planning & Deliberation:** Always take your time to think through problems carefully. Be deliberate about what you are trying to accomplish by planning each step methodically. Use logic and reasoning to make informed decisions rather than rushing to implementation.

*   **Information Gathering:** Ask for more information instead of making large assumptions. If you're uncertain about requirements, implementation details, or project context, ask specific clarifying questions rather than guessing.

*   **Review & Validation:** After completing any task or making changes, always review your work to ensure the plan achieved the intended goal. Check that code works as expected, follows project conventions, and meets the stated requirements.

*   **Critical Thinking:** Think hard about each step in your process:
    1. **Understanding**: What exactly is being asked?
    2. **Planning**: What's the best approach to solve this?
    3. **Implementation**: How can this be done correctly and efficiently?
    4. **Verification**: Does the solution work and meet the requirements?

*   **Correction & Feedback:** Always correct me if I am wrong about technical details, project structure, or implementation approaches. Your knowledge and analysis should guide accurate solutions, and you should speak up if you notice errors or inconsistencies in my requests or assumptions.

*   **Task Management:** Use the TodoWrite and TodoRead tools frequently to track progress on complex tasks. Break down larger features into smaller, manageable subtasks and update the todo list as work progresses.

*   **Code Quality:** Maintain high code quality standards. Follow existing patterns in the codebase, write clear and maintainable code, and ensure proper error handling and logging.