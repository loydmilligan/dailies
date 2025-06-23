# **Dailies: Plan for a Modular Content Processing Architecture**

## **1\. Executive Summary**

This document outlines the architectural evolution for the Dailies content curation system. The goal is to transition from the current MVP's hardcoded processing logic to a flexible, data-driven pipeline. This new architecture will support multiple content categories and customizable processing actions, laying a scalable foundation for future features, including a user-facing configuration UI. The core of this change is to better leverage AI for nuanced categorization while using a rules-based system to guide and interpret its output.

## **2\. Current State Analysis**

A review of the existing codebase confirms the following:

* **AI-Powered Categorization:** The system correctly uses external AI services (Google Gemini, OpenAI, Anthropic) for its core task of assigning a category to captured content. This is handled by the aiClassification.js service.  
* **Hardcoded Logic:** The subsequent processing steps are handled by conditional logic within the server.js file. The application explicitly checks if the assigned category is "US\_Politics\_News" and then calls the appropriate analysis service (politicalContentAnalyzer or generalContentProcessor).

This hardcoded approach, while effective for the initial MVP, creates a bottleneck for expansion. Adding new categories or processing actions would require direct code modification, making the system rigid and harder to maintain.

## **3\. Proposed Architecture: AI-Assisted, Human-Guided Processing**

We will refactor the backend into a modular system where processing rules are defined as data, not code. This creates a powerful feedback loop where the AI provides nuanced classification, and a rules engine provides consistency and learns from user input over time.

The key principles are:

1. **AI Provides the Initial "Guess":** The AI remains the primary classifier, providing detailed, specific categories (e.g., "California Politics," "Semiconductor Industry News").  
2. **Matchers Provide "Hints":** We will create a system of rules (e.g., domain lists, URL patterns) that provide contextual hints to the AI, gently guiding it toward preferred categorizations without overriding its analytical capabilities.  
3. **Categories Define "Actions":** We will define a set of primary, high-level categories (e.g., "US Politics," "Technology"). Each category will have a corresponding set of processing actions (e.g., analyze\_bias, summarize).  
4. **Aliases Create the "Bridge":** A new aliasing system will map the AI's specific outputs to our primary categories. This is a manual, user-driven process via the UI that allows the system to "learn" and adapt over time.

## **4\. Proposed Database Schema Changes**

To support this new architecture, the following changes and additions to the PostgreSQL schema are required.

#### **Table: categories**

Stores the primary, high-level categories for content.

| Column | Type | Description |
| :---- | :---- | :---- |
| id | SERIAL | **Primary Key** |
| name | VARCHAR | Unique name (e.g., "US Politics", "Tech") |
| description | TEXT | Description of the category. |
| priority | INTEGER | Determines order for matching conflicts. |
| is\_active | BOOLEAN | Toggles the category on or off. |
| **is\_fallback** | BOOLEAN | **(New)** If true, this is the default category for unmapped content. A constraint will ensure only one can exist. |

#### **Table: actions**

Defines the library of available processing functions.

| Column | Type | Description |
| :---- | :---- | :---- |
| id | SERIAL | **Primary Key** |
| name | VARCHAR | Unique action name (e.g., "analyze\_bias"). |
| description | TEXT | Description of the action. |
| service\_handler | VARCHAR | Key that maps to the function in the code (e.g., political.bias). |

#### **Table: matchers**

Defines the rules used to provide hints to the AI.

| Column | Type | Description |
| :---- | :---- | :---- |
| id | SERIAL | **Primary Key** |
| category\_id | INTEGER (FK) | Links to a categories.id. |
| matcher\_type | ENUM('domain', 'keyword') | The type of rule. |
| pattern | VARCHAR | The pattern to match (e.g., 'techcrunch.com', 'AI'). |
| is\_exclusion | BOOLEAN | If true, this rule excludes a match. |

#### **Join Table: category\_actions**

Links categories to actions in a many-to-many relationship.

| Column | Type | Description |
| :---- | :---- | :---- |
| category\_id | INTEGER (FK) | Links to categories.id. |
| action\_id | INTEGER (FK) | Links to actions.id. |
| execution\_order | INTEGER | Defines the order in which actions should run. |
| config | JSONB | Action-specific parameters (e.g., summary length). |

#### **Table: category\_aliases**

Maps raw AI outputs to primary categories.

| Column | Type | Description |
| :---- | :---- | :---- |
| id | SERIAL | **Primary Key** |
| alias | VARCHAR | Raw AI category output (e.g., "geopolitics"). |
| category\_id | INTEGER (FK) | The primary category this alias maps to. |

#### **Modification: content\_items Table**

A new field will be added to store the AI's direct output.

| Column | Type | Description |
| :---- | :---- | :---- |
| **ai\_raw\_category** | VARCHAR | **(New)** Stores the AI's raw classification. |

## **5\. The New Processing Pipeline**

The backend logic will be refactored to follow this data-driven flow:

1. **Content Ingest:** A new article is captured and sent to the /api/content endpoint.  
2. **Hint Generation:** The system checks the content's URL, domain, and title against the Matchers table to find any relevant "hints."  
3. **AI Categorization:** The content, along with any hints, is passed to the aiClassificationService. The AI returns a raw category string (e.g., "California Politics").  
4. **Store Raw Category:** The ai\_raw\_category field on the content\_items record is updated with the AI's raw output.  
5. Category Resolution: The system performs a lookup:  
   a. Does the raw category string exist as a primary Category?  
   b. If not, does it exist in the CategoryAliases table?  
   c. If an alias is found, retrieve its associated primary Category.  
   d. (New) If no primary category or alias is found, assign the content to the designated is\_fallback category.  
6. **Action Dispatch:** Once the final primary category is determined, the system queries the CategoryActions table to get the list of associated actions.  
7. **Execution:** The system iterates through the actions in the specified execution\_order, calling the corresponding service\_handler for each one (e.g., triggering bias analysis, then quality scoring).

## **6\. Benefits of this Approach**

* **Extensibility:** New content types and processing actions can be added by inserting rows into the database, with no code changes required for the core pipeline.  
* **Flexibility:** System behavior can be modified on the fly by changing data in the Categories, Actions, and Matchers tables.  
* **Future-Proofing for UI:** The database structure directly supports a user interface where users can define their own categories and workflows.  
* **Improved Data Richness:** Storing both the raw AI category and the mapped primary category allows for more granular future analytics and insights.  
* **System Intelligence:** The aliasing system allows the platform to "learn" from user guidance, improving its accuracy and relevance over time.  
* **Reduced Maintenance:** Decouples the business logic (what to do) from the service implementation (how to do it), making the codebase cleaner.  
* **Resilience:** The fallback category ensures all content is processed at a baseline level, preventing items from being lost in an unprocessed state.

## **7\. Next Steps: Initial Implementation**

1. **Database Migration:** Write and apply a SQL migration script to implement the schema changes described in Section 4\.  
2. **Backend Refactoring:**  
   * Update server.js to implement the new data-driven processing pipeline, including the fallback logic.  
   * Modify aiClassification.js to accept and use "hints."  
   * Create a new ActionService to dispatch and execute actions based on the service\_handler key.  
3. **Seed Initial Data:**  
   * Create a "US Politics" category and an "Uncategorized" category (with is\_fallback=true).  
   * Create Actions for analyze\_bias, score\_quality, and summarize.  
   * Associate the political actions with the "US Politics" category.  
   * Associate the summarize action with the "Uncategorized" category.  
4. **Testing:** Update existing tests and create new ones to validate the new dynamic pipeline, including alias resolution and fallback behavior.

## **8\. UI/UX Workflow for Category Management**

The new architecture enables a powerful user workflow for managing content. The future web UI should include the following:

#### **8.1. Content Views ("Inboxes")**

* The UI will feature distinct views for each primary Category (e.g., a "US Politics" screen, a "Technology" screen).  
* A dedicated view for the is\_fallback category will serve as the "Uncategorized" or "Needs Review" inbox.  
* Each view will display a grid or list of the content items belonging to it.

#### **8.2. Content Grid**

The grid in each view will display key details about the captured content, including:

* Title  
* Source Domain  
* Capture Date  
* **AI Raw Category:** This column is crucial. In the "Uncategorized" view, it shows the user exactly what the AI suggested.

#### **8.3. Action Buttons**

Each item in the grid will have action buttons:

* **Standard Actions:** View, Delete, Favorite, etc.  
* **Contextual Action (in Fallback View):** A "Map Category" button will be visible on items in the fallback/uncategorized view.

#### **8.4. Alias Mapping Workflow**

1. User clicks the "Map Category" button on an item in the fallback view (e.g., an item with ai\_raw\_category \= "California Politics").  
2. A modal window appears, displaying the raw category: "Map 'California Politics' to a primary category."  
3. The modal contains a dropdown populated with all primary Categories from the database.  
4. The user selects "US Politics" from the dropdown and saves.  
5. This action creates a new entry in the CategoryAliases table, linking the alias "california politics" to the ID of the "US Politics" category.  
6. (Optional) The system could then offer to re-process the current item and all other items with the same raw category using the newly mapped actions.