# QFlow System Diagrams

This document contains the structural and behavioral diagrams for the QFlow Quality Management System, rendered in Mermaid syntax.

## 1. System Architecture Diagram
This diagram illustrates the layered architecture of QFlow, separating the React frontend, Express backend, and third-party integrations (Supabase and Google Gemini).

```mermaid
graph TD
    Client["React + Vite Frontend\n(Pages, Hooks, Components)"]
    Backend["Node.js Express Backend\n(Routes, Controllers, Services)"]
    DB["Supabase\n(PostgreSQL Database)"]
    Auth["Supabase Auth\n(Identity Provider)"]
    AI["Google Gemini API\n(gemini-1.5-flash)"]
    
    Client -- "REST API (JSON, JWT)" --> Backend
    Client -- "Login / Session" --> Auth
    Backend -- "SQL Transactions" --> DB
    Backend -- "REST Request" --> AI
```

## 2. Use Case Diagram
This diagram outlines the primary actors in the system and their respective interactions with the QFlow modules.

```mermaid
usecaseDiagram
    actor Employee
    actor Manager
    actor Auditor
    actor SystemAdmin
    
    package QFlow {
        usecase "Submit Non-Conformance (NCR)" as UC1
        usecase "Investigate & Formulate CAPA" as UC2
        usecase "Review & Verify Action (VoE)" as UC3
        usecase "Conduct ISO Audit" as UC4
        usecase "Manage Document Control" as UC5
        usecase "View Compliance Dashboard" as UC6
    }
    
    Employee --> UC1
    Manager --> UC2
    Manager --> UC6
    Auditor --> UC3
    Auditor --> UC4
    Auditor --> UC6
    SystemAdmin --> UC5
    SystemAdmin --> UC6
```

## 3. Context Diagram
A high-level view showing the QFlow system boundary and its external interactions.

```mermaid
graph TD
    User((System Users\nEmployees, Managers))
    QFlow[QFlow System\nCore Application]
    Supa((Supabase\nDB & Auth Provider))
    Gemini((Google Gemini\nAI Service))
    
    User -- "Submits Reports, Conducts Audits" --> QFlow
    QFlow -- "Authenticates & Stores Data" --> Supa
    QFlow -- "Requests AI Suggestions" --> Gemini
    Gemini -- "Returns CAPA JSON" --> QFlow
    Supa -- "Real-time Metrics" --> QFlow
    QFlow -- "Displays Dashboard" --> User
```

## 4. Sequence Diagram (CAR & AI Flow)
This diagram maps out the step-by-step API flow when a user submits a report and the AI generates a suggestion.

```mermaid
sequenceDiagram
    participant User
    participant Frontend as React UI
    participant Backend as Express API
    participant AI as Gemini API
    participant DB as Supabase
    
    User->>Frontend: Submit NCR/QDDR Form
    Frontend->>Backend: POST /api/reports (with JWT)
    Backend->>Backend: Validate Payload & Role
    Backend->>DB: Query Case Repository for Matches (CBR)
    DB-->>Backend: Return low match (<0.2)
    Backend->>AI: Send Defect Details for Suggestion
    AI-->>Backend: Return JSON CAPA Suggestion
    Backend->>DB: Begin Transaction (Save Report + Suggestion)
    DB-->>Backend: Transaction Success
    Backend-->>Frontend: 201 Created (Data)
    Frontend-->>User: Show Success & Update Dashboard
    Backend->>DB: Trigger Notification to Assigned Manager
```

## 5. Entity Relationship Diagram (ERD)
Based on the current PostgreSQL schema, mapping the relationships between users, reports, corrective actions, and ISO modules.

```mermaid
erDiagram
    USERS ||--o{ NCR_REPORTS : "reports"
    USERS ||--o{ CORRECTIVE_ACTIONS : "assigned to"
    DEPARTMENTS ||--o{ USERS : "has"
    ROLES ||--o{ USERS : "assigned to"
    
    NCR_REPORTS ||--o{ CORRECTIVE_ACTIONS : "requires"
    NCR_REPORTS ||--o{ PREVENTIVE_ACTIONS : "requires"
    NCR_REPORTS ||--o{ QDDR_REPORTS : "associated with"
    NCR_REPORTS ||--o{ CAR_REPORTS : "associated with"
    NCR_REPORTS ||--o{ AI_PREDICTIONS : "receives"
    
    ISO_STANDARDS ||--o{ ISO_CLAUSE_GROUPS : "contains"
    ISO_CLAUSE_GROUPS ||--o{ ISO_CLAUSES : "contains"
    ISO_STANDARDS ||--o{ AUDIT_SCHEDULES : "schedules"
    
    AUDIT_SCHEDULES ||--o{ AUDIT_RUNS : "executes"
    AUDIT_RUNS ||--o{ AUDIT_RESULTS : "produces"
    ISO_CLAUSES ||--o{ AUDIT_RESULTS : "evaluated in"
    
    USERS ||--o{ AUDIT_SCHEDULES : "auditor"
    USERS ||--o{ SYSTEM_LOGS : "generates"
```

## 6. Data Flow Diagram (DFD Level 0)
Illustrates how data moves through the system's major processes.

```mermaid
graph LR
    U[User] -->|Defect Input| P1(Report Intake Process)
    P1 -->|Raw Defect Data| D1[(PostgreSQL DB)]
    P1 -->|Context Query| P2(AI Analysis Engine)
    P2 -->|External API Call| API[Google Gemini]
    API -->|Suggested CAPA| P2
    P2 -->|Structured JSON| D1
    D1 -->|Aggregated KPIs| P3(Dashboard Rendering)
    P3 -->|Real-time Metrics| U
```
