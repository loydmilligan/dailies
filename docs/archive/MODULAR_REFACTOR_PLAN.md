# **Dailies: Modular Refactor Implementation Plan**

## **1\. Overview**

This document provides a prioritized, actionable to-do list for refactoring the Dailies backend from its current state to the flexible, data-driven architecture outlined in the "Modular Content Processing Architecture" plan. The tasks are organized into phases to ensure a logical and iterative development process, starting with the database foundation and moving through core logic, specialized processors, and final testing.

## **2\. Implementation Phases & Task Checklist**

### **Phase 1: Database Foundation (High Priority)**

*The goal of this phase is to establish the database schema required to support the entire modular system. This must be completed before application logic is written.*

* \[ \] **Create Database Migration Script:** Write a single SQL script to create the new tables: categories, actions, matchers, category\_actions, and category\_aliases.  
* \[ \] **Alter content\_items Table:** Add the new ai\_raw\_category (VARCHAR) column to the existing content\_items table.  
* \[ \] **Add is\_fallback Constraint:** Add the is\_fallback (BOOLEAN) column to the categories table and implement a database-level constraint to ensure only one category can be the designated fallback.  
* \[ \] **Seed Initial Data: Categories:** Populate the categories table with the initial set: "US Politics", "Technology", "Sports", "3D Printing", "DIY Electronics", "Homelab/DevOps", "Software Development", "Smart Home", and a fallback "Uncategorized" category (with is\_fallback=true).  
* \[ \] **Seed Initial Data: Actions:** Populate the actions table with the initial set of processing actions: analyze\_bias, score\_quality, summarize, extract\_tech\_trends, extract\_sports\_stats, extract\_print\_settings.  
* \[ \] **Seed Initial Data: Relationships:** Populate the category\_actions join table to link the initial categories to their respective actions (e.g., link "US Politics" to political analysis actions, link "Uncategorized" to the summarize action).  
* \[ \] **Create Database Service Layer:** In the backend code, create new service functions in database/index.js for CRUD operations on the Categories, Actions, and CategoryAliases tables.

### **Phase 2: Core Logic Refactor (High Priority)**

*With the database in place, this phase focuses on refactoring the core application pipeline to be data-driven.*

* \[ \] **Add Comprehensive Logging:** From the start, implement detailed logging for the new classification, resolution, and dispatch pipeline to aid in debugging.  
* \[ \] **Refactor aiClassification.js Service:**  
  * Modify the service to accept contextual "hints" from the Matchers table.  
  * Implement the fallback logic (e.g., Google NL \-\> Gemini) if the primary AI service fails.  
* \[ \] **Refactor server.js Pipeline:**  
  * **Implement Category Resolution:** Write the logic that takes the raw AI output, checks for a primary category, then checks for an alias, and finally assigns the fallback category if no match is found.  
  * **Build Action Dispatcher Service:** Create a new service (ActionService) that, given a category\_id, queries the category\_actions table and executes the corresponding service\_handler functions in the correct order.  
  * **Replace Old Logic:** Remove the hardcoded if/else block that checks for "US\_Politics\_News" and replace it with the call to the new Action Dispatcher.  
* \[ \] **Create API for Alias Management:** Build the POST /api/categories/aliases endpoint that the UI will use. This endpoint will receive a raw category string and a primary category\_id and create a new entry in the category\_aliases table.

### **Phase 3: Specialized Processors & Features (Medium Priority)**

*This phase involves creating the new, specialized content processors and the rules that will help route content to them.*

* \[ \] **Implement Matchers Hint System:** Write the logic to query the Matchers table based on a new content item's URL/domain and pass the results as "hints" to the aiClassificationService.  
* \[ \] **Seed Matchers for 3D Printing:** Populate the Matchers table with domain-based rules for thingiverse.com, printables.com, etc., to hint that content from these sites belongs to the "3D Printing" category.  
* \[ \] **Create PrintingContentProcessor:**  
  * Build the new service for 3D printing content.  
  * Implement logic to extract specific metadata: .stl/.3mf file links, license info, and print settings (layer height, infill, material).  
  * Implement keyword-based classification to categorize the model (e.g., functional, cosmetic).  
* \[ \] **Create TechContentProcessor:** Build the new service for Technology, Software, and Electronics categories.  
* \[ \] **Create SportsContentProcessor:** Build the new service for Sports content.  
* \[ \] **Update PoliticalContentAnalyzer:** Adapt the existing analyzer to function as an "action" that can be called by the new Action Dispatcher, ensuring no loss of functionality.  
* \[ \] **Update API Routes:** Ensure existing API routes (e.g., for retrieving content) can now filter based on the new, expanded set of categories.

### **Phase 4: Testing & Cleanup (Medium Priority)**

*Thorough testing is critical to ensure the refactor is successful and reliable.*

* \[ \] **Write Unit Tests for New Services:** Create tests for the ActionService, each new ContentProcessor, and the aiClassificationService's hint and fallback logic.  
* \[ \] **Write Integration Tests:** Test the entire processing pipeline, from content capture to action execution, for several different target categories.  
* \[ \] **Test Fallback and Alias Systems:**  
  * Simulate AI service failure to ensure the fallback to the next provider works.  
  * Send content with a novel ai\_raw\_category to verify it's assigned to the "Uncategorized" category.  
  * Use the alias API to map the novel category, then re-send the content to ensure it's now correctly routed.  
* \[ \] **Database Cleanup:** Clean any old or test data from the content\_items table to ensure a fresh start with the new system (as there is no legacy user data to preserve).

### **Phase 5: Documentation & Polish (Low Priority)**

*Final steps to complete the refactor.*

* \[ \] **Update Project Documentation:** Update README.md, architecture.md, and any other relevant documents to reflect the new modular architecture.  
* \[ \] **Create API Documentation for New Endpoints:** Add Swagger/OpenAPI documentation for the new category and alias management routes.