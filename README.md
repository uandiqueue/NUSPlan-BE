> **⚠️ ARCHIVED NOTICE**
>
> This project is no longer maintained and the live demo site has been taken down.
> The repository is kept online **for reference and learning purposes only**.  
> Backend and frontend servers are no longer running, so setup or deployment instructions may not work as-is.

---

**![NUSPlan Logo](assets/nusplan-logo.png)**

# NUS ORBITAL - MILESTONE 3

**Leong Jia Jing**  
**Matthias Yim Wai Meng**  
**GEMINI**

---

## **Contents**
1. Project Scope  
2. Motivation  
3. Aim  
4. User Stories  
5. Features and Implementation Status  
6. User Interface and Page Flow  
7. System Architecture and Design  
   a. Overview  
   b. Data Curation & Schema  
   c. Database Architecture  
   d. Application Architecture  
   e. Backend Logic Flow  
   f. Frontend Real-Time Flow  
   g. Notable Design Decisions  
8. Tests  
9. Current Limitations and Roadmap  
10. Deployment  
11. Wireframe  

---

## **Project Scope**
A centralized academic planning tool for NUS FoS and SoC students to explore and validate combinations of majors, second majors, and minors, optimising for double-counting and requirements fulfilment.

## **Motivation** 
During NUS Open House, a friend repeatedly asked where to find accurate information on module eligibility and requirement fulfilment. This brought back memories of how tedious and confusing it was to manually verify academic requirements while planning a study path.

Currently, academic planning at NUS is a fragmented and error-prone process. Each faculty publishes its programme requirements on different platforms, often in different formats. Students are expected to manually consolidate this information, interpret AU limits, track preclusions and prerequisites, and ensure they meet all conditions for graduation. Even determining whether a course fulfils a specific requirement, let alone multiple overlapping ones. This process can involve guesswork, trial-and-error, or reliance on hearsay.

This challenge is especially pressing for Year 1 students, who must make key academic decisions early but are often overwhelmed by the transition into university life. They may only realise too late that:

- Certain second majors and minors require careful pre-selection and prerequisite tracking from Year 1, making them difficult or even impossible to pursue later.
- They have selected courses that do not satisfy the programme’s structured requirements, which may restrict future options such as going for SEP, applying for programmes like NOC, or exploring other academic opportunities they are more passionate about as they may need to make up for these missed requirements later, adding to their future workload and reducing flexibility.
- They misread a requirement (course level restriction or module category) and end up missing fulfillment, leading to delayed graduation.
- There is no live feedback system to validate that a study plan is on track.
- They missed double-counting opportunities, which could have reduced their total workload.

Requirement checking is central to solving this problem, at both the programme level (AU quotas, minimum AUs required, different paths) and course level (prerequisites, preclusions). Without automated tools that map student choices to these rules, planning becomes inefficient, error-prone, and discouraging.

NUSPlan was created to make this process seamless and transparent. By integrating requirement validation into every stage of the planning journey, students can explore options with confidence, receive immediate feedback on feasibility, and avoid preventable delays to graduation.

---

## **Aim** 
This project aims to streamline academic planning by building a validation-driven system that enables NUS students to construct feasible, multi-programme study plans with confidence and clarity.

The focus is on **automated requirement checking**, ensuring students fulfil both programme-level rules (e.g. AU caps, minimum requirement) and course-level constraints (e.g. prerequisites, preclusions), while maintaining flexibility for exploring second majors, and minors. We aim to develop a modular academic planning platform that:

- Curates structured requirement data for selected majors, second majors, and minors in SoC and FoS.
- Provides an interactive UI for selecting and managing up to 5 academic programmes concurrently.
- Automatically validates programme and course requirements in real time as users make selections.
- Tracks fulfillment progress using a tag-based indicator system across nested requirement trees.
- Enables plan saving and management through user authentication and cloud storage.
- Supports prerequisite and preclusion validation across multiple programmes, ensuring selected modules form a conflict-free and coherent academic plan.

This structured approach reduces the risk of invalid academic paths, supports early decision-making, and helps students balance their study load while preserving access to opportunities like SEP or NOC.

---

## **User Stories**
1. **(Core) As a student**, I want access to accurate requirement data for majors, minors, and second majors so I can plan reliably.
2. **(Core) As a faculty administrator**, I want to structure and update programme data centrally to support validation and planning tools.
3. **(Core) As a student**, I want to select programmes and view their combined module requirements clearly categorised by type.
4. **(Core) As a student**, I want the system to validate if my selected modules fulfil programme requirements and warn me of missing prerequisites or preclusions.
5. **(Core) As a student**, I want instant feedback on course validity as I make selections, including prerequisite and preclusion conflicts.
6. **(Core) As a student**, I want to track how many AUs I’ve fulfilled per requirement so I can monitor my progress.
7. **(Extension) As a student**, I want the system to help me apply double-counting between programmes without exceeding the double-counting cap.
8. **(Extension) As a student**, I want to save and revisit my academic plan across sessions.
9. **(Extension) As a department**, I want to update programme data securely via an admin interface.

---
## **Features and Implementation Status**
### **Core Features**
#### I. Academic Plan (AP) Curated Database
This is the foundation of the system. All programme data including requirement structures, AU limits, and course types, are manually curated and structured into a consistent schema. The data schema supports:
- Nested requirement trees with and, or, min, max logic.
- Separation of requirement groups (e.g. coreEssentials, coreElectives, commonCore, etc.).
- Tagging system (rawTagName, requirementKey) that links each course to its parent requirement group.

**Status:**
- Milestone 1: Created requirement data for 5 programmes (3 majors, 1 minors, 1 second major).
- Milestone 2: Added requirement data for Bioinformatics minors and commonCore data.
- Milestone 3: Expanded to 20 programmes and added multi-programme exclusion data. Introduced a dedicated local workflow for JSON-to-database migration, and defined consistent TypeScript types for JSON schema formation.

#### II. AP Validator

AP Validator is a backend module triggered when the server receives a programme selection request. It performs critical early validation and preparation to ensure downstream components operate safely and efficiently. The validator:
- Verifies that the selected combination of programmes is valid, rejecting any pairs that are mutually exclusive or precluded at the programme level
- Detects hard conflicts between preselected modules (e.g. if modules are precluded across different programmes) and prevents invalid plans
- Ensures all preselected modules have their required prerequisites fulfilled, auto-inserting missing prerequisite modules when necessary
- Constructs a **programme-combination-specific lookup map** to support the AP Populator — since this map cannot be directly retrieved from the database

**Status:**
- Milestone 2: Fully functional backend payload validator integrated.
- Milestone 3: Expanded validator functionality to support preselection logic, cross-programme preclusion checks, and custom lookup map generation for downstream use

#### III. AP Populator
AP Populator receives a set of selected programmes (max 5\) in the form of programmeIds from the frontend and generates a ProcessProgrammesResponse, including:
- Programmes and requirements information (main payload).
- Combination-specific lookup maps.
- Validation result for debugging.
In addition to resolving nested requirement trees into structured CourseBox (ExactBox, DropdownBox, AltPathBox), the populator:
- Resolves all simple prerequisite rules and inserts the necessary modules into the plan upfront. 
- Builds combination-specific max rule mappings for precise validation on the frontend. 
- Analyzes and annotates modules with double-counting eligibility based on the selected combination

**Status:**
- Milestone 1: Basic module grouping with dummy requirements.
- Milestone 2: Full backend logic implemented with requirement tags, caps, and category enforcement in payload.
- Milestone 3: Full database integration with added prerequisite resolution, double-counting analysis, and combination-specific max rule and lookup map generation for leaner payloads

#### IV. AP Realtime Validator
AP Realtime Validator runs on the frontend and provides live validation feedback as users interact with their academic plan. It evaluates each module selection or deselection in real time to enforce programme constraints and guide user decisions.
The validator performs the following checks during each interaction:
- **Triple-count violation detection**: Prevents any module from being counted toward more than two programmes.
- **Prerequisite resolution**: Warns users if a selected module has unmet prerequisites, and flags if manual intervention is required.
- **Max rule enforcement**: Checks if the module would exceed the AU cap for any requirement group and disables fulfilment contribution if so.
- **Double-counting tracking**: Monitors double-count usage across programmes and warns if limits are approached or exceeded.

**Status:**
- Milestone 2: Core validation structure in place.
- Milestone 3: Integrated multi-rule validation in a single workflow with contextual warnings and live fulfilment tracking, fully integrated with the database.

#### V. AP Fulfilment Tracker
The Fulfilment Tracker is the frontend visual layer that communicates to users how much progress they have made in satisfying programme requirements. It:
- **Initialises fulfilment** by loading AU values of preselected modules at plan setup.
- **Updates programme progress** live when a module is added or removed.
- **Calculates total progress per programme**, differentiating between majors (which sum across all selected programmes) and minors/second majors (tracked individually)
- **Returns detailed progress summaries** (required, fulfilled, and percentage complete) to support visual indicators.

It is also **fully integrated with the backend AU data** via dbService, ensuring consistency across components and accurate AU computations.

**Status:**
- Milestone 2: Core visualisation and dynamic update logic in place.
- Milestone 3: Refactored into a stateful service that integrates directly with backend AU queries and tracks live fulfillment per programme with versioned state updates for reactive UI sync.

---

### **Extension Features**

#### VI. AP Optimiser (Partial)
Detects modules that satisfy multiple programmes and enforces double-counting rules. Allows undo/redo actions.

**Status:** 
- Implemented core logic; UI to be added post-Orbital.

#### VII. NUSPlan Profile
NUSPlan uses **Supabase Auth** and the plans table to support user-specific plan saving. Registered users can log in to **securely store and retrieve their academic plans** across devices.

However, we deliberately designed the system to be **fully usable without requiring login**. This ensures accessibility for all users, including first-time visitors and those who just want to try the planner.
- **Anonymous Access**: All users can select programmes, plan modules, and interact with validation features without creating an account.
- **Authenticated Saving**: Logging in via Supabase Auth unlocks the ability to save plans to the cloud and resume them later.
- Plans are stored in the plans, plan\_modules, and plan\_programmes tables, linked to the authenticated user's ID.

**Status:**
- Milestone 3: First implementation of Supabase-authenticated saving, with anonymous usage supported by default.

--- 

## **User Interface and Page Flow**

The application’s interface is divided into three main pages. Below is an overview of each page, its purpose, and implementation status.

| Page | Description |
| ----- | ----- |
| **1\. Program Selection**  (*Choose Programmes*) | The user selects their primary major, and optionally one second major and up to three minors. The interface provides dropdowns to pick programs. Upon submission, the selection is sent to the backend and the course pool is fetched. |
| **2\. Course Selection & Requirement Fulfilment Tracker**  (*Plan Courses*) | The user is presented with the course pool grouped by requirement categories. They can choose courses to fulfill each requirement. As they select courses, the system validates requirements in real-time: progress update, completed requirements are indicated, and any rule violations are flagged immediately. This page is the core of the interactive plan building. |
| **3\. Authentication**  (*Save Plan*) | This page allows users to securely log in, save, and retrieve their academic plans using cloud storage. Once authenticated, users can preserve their selected programmes, module choices, and planner state across sessions. |

Throughout these interfaces, the design philosophy is to guide the student step-by-step: first decide on programs, then pick the necessary courses (with guidance). At any point, if a decision invalidates an earlier step (for example, picking a combination of programs that isn’t allowed, or a course choice that violates a rule), the system provides feedback so the user can correct it.

---

## **System Architecture and Design**

### **Overview**

**NUSPlan** is a client–server academic planning platform built to help NUS students structure and validate their academic journey across multiple programmes. The system is designed with modularity and scalability in mind, combining a custom-curated **backend requirement schema and validator**, a centralised **Supabase database**, and a reactive **frontend interface** that offers real-time feedback on course selections.

All validations are cleanly separated into:
- A one-time **backend validator** that verifies the integrity of programme combinations, prerequisite fulfilment, and preclusion conflicts using data queried directly from the database
- A **frontend realtime validator** that maintains live validation as users interact with their plan (e.g. AU tracking, max rule enforcement, double-counting)

The database serves as the authoritative source for programme structures, module metadata, preclusion/prerequisite mappings, and saved user plans, ensuring consistency across all layers of the system.

### **Data Curation & Schema**

Due to the lack of machine-readable APIs for NUS programme requirements, we manually curated requirement data from official faculty websites and pdfs. This curated data is structured using a unified, extensible schema built from scratch. Each programme is stored as a “blueprint” containing:

- **Metadata**: Programme name, type (major/secondMajor/minor), total required AUs, double-count cap, etc.

- **Requirement Tree**: Nested blocks grouped into categories:

  * coreEssentials: Fixed compulsory modules exclusive for selected programmes.

  * coreElectives: Elective modules grouped with logical constraints (min, max, and, or) for selected programmes.

  * commonCore: Faculty- or university-wide requirements.

  * coreOthers: Special programme requirements (e.g. internships, industry experience).

  * coreSpecials: Specialisation tracks (optional usage).

  * unrestrictedElectives: Free electives (computed dynamically).

Requirements are expressed as **nested logical trees** using ModuleRequirementGroup and ModuleRequirement, supporting AND/OR logic and min/max AU constraints. Each module is encoded using the GeneralModuleCode type, which supports:

- Exact matches (e.g. CS2100)

- Wildcard prefixes (e.g. LSM22xx)

- Variant codes (e.g. CS1010S/T/X)

- Special cases like NOC or UPIP modules with manual approval flags

This schema allows programme requirements to be consistently curated, validated, and eventually transformed into database-ready formats for backend and frontend consumption. It also enables fine-grained tracking, validation enforcement, and UI rendering based on rawTagName identifiers.

### **Database Architecture**

**NUSPlan** uses a modular, relational schema in **Supabase (PostgreSQL)** to manage academic programme structures, user plans, and real-time validation data. The schema is designed for:
- Nested requirement logic (AND/OR/min/max via programme\_requirement\_paths)
- Programme-module mapping via gmc\_mappings, supporting exact, wildcard, and variant codes
- Cross-programme double-counting and preclusion enforcement
- User-specific plan persistence and replay
- Real-time prerequisite and preclusion validation

To support authenticated plan saving, we use **Supabase Auth** to manage user identities. Each saved plan is linked to a unique user\_id (from Supabase Auth) in the plans table, with associated module selections stored in plan\_modules and plan\_programmes. While authenticated users can save and resume plans across devices, the system remains fully usable **without login**, allowing all users to freely explore programme combinations, plan modules, and receive validation feedback. This hybrid model balances accessibility with personalization.

#### **Main Tables Overview**

| Table | Purpose |
| ----- | ----- |
| programmes | Stores programme metadata and structural definitions |
| programme\_requirement\_paths | Nested recursive paths expressing AND/OR/min/max logic trees |
| gmc\_mappings | Maps modules to requirement paths by exact, wildcard, variant, or custom |
| modules | Stores full module metadata (from NUSMods and extended by backend logic) |
| prerequisite\_rules/preclusion\_rules | Parsed prerequisite/preclusion rule logic by module |
| plans, plan\_modules, plan\_programmes | User-specific saved plans and selected modules |
| user\_programme\_selections, user\_planner\_data | Real-time UI state persistence and planner sync |
| programme\_preclusions | Hard constraints between conflicting programme combinations |
| module\_path\_mappings | Cached mapping of a module to all requirement paths it may fulfill |

### **Application Architecture**
**Frontend:** React (Next.js) + TypeScript  
**Backend:** Node.js (Express) + TypeScript  
**Database & Auth:** Supabase

### **Backend Logic Flow**

1. **Programme Selection**

   * The user selects up to 5 programmes on the frontend (1 major, 1 second major, 3 minors).

   * These selections are sent to the backend via POST/populate.

2. **Requirement Blueprint Loading**

   * Backend loads each programme’s JSON blueprint from the local store (cloud database in Milestone 3).

   * Each blueprint is parsed into a unified schema with nested requirement trees.

3. **Populated Payload Construction (AP Populator)**

   * Merges requirement trees and flattens them into CourseBox structures:

     * ExactBox: fixed compulsory modules.

     * DropdownBox: pick-one options.

     * AltPathBox: logical groupings (or, and) for complex trees.

   * Applies max rules by stripping requirement tags from courses once the cap is fulfilled.

   * Attaches requirement tags and maps for use in validation.

4. **Backend Validator (AP Payload Validator)**

   * Validates and corrects the payload **before it reaches the frontend**:

     * Aborts plan if hard preclusion conflicts are detected between selected modules.

     * Filters out any precluded electives from the pool (soft conflicts).

     * Ensures all selected modules have prerequisites; missing ones are inserted into the plan.

   * Final payload is safe for interactive frontend rendering.

5. **Frontend Receives Payload**

   * The frontend uses the payload to:

     * Render modules by category and requirementKey.

     * Track selected modules.

     * Initiate real-time validation and double-count logic.

### **Frontend Real-Time Flow**

After the payload is received, all interactivity happens in real time on the frontend:

1. **Module Selection (AP Realtime Validator)**

   * On every selection, the frontend:

     * Validates min, max, prereq, and preclusion rules using the flattened maps.

     * Warns users if prerequisites are unmet (Milestone 2\) and auto-adds them (Milestone 3).

     * Dynamically filters precluded courses from all relevant boxes.

     * Recalculates valid courses once caps are hit and strips their tags if needed.

2. **Double-Counting (AP Optimiser)**

   * Tracks when a module satisfies multiple programmes.

   * Caps double-counting based on the programme doubleCountCap.

   * Prompts users to choose which two programmes to allocate the module toward if triple-counting is detected.

   * Enables undo/redo and automatic AltPath switching.

3. **Requirement Tracking (AP Fulfilment Indicator)**

   * As modules are selected, the UI:

     * Updates fulfilment indicators for each requirementKey.

     * Propagates fulfillment from child tags to parent tags.

     * Dynamically adjusts UE requirements based on remaining unallocated AUs.

---

## Testing
Unit tests (Jest) were written for key validator components (backend and realtime) covering prerequisite logic, AU limits, and double-counting detection.

---

## Current Limitations and Roadmap
- Time prioritisation led to incomplete UI polish.  
- ID–key mismatch across backend/frontend introduces complexity.  
- Limited programme coverage beyond FoS/SoC.  
- Manual data updates still required.  
- Frontend lacks full UX refinement.

Despite this, the system achieved scalable validation and backend integration across multiple programmes.

---

## Deployment
**Live Demo (Discontinued)**  
The AWS deployment used for Milestone 3 is no longer active.  
This repository remains as a reference for academic and portfolio purposes only.

---
