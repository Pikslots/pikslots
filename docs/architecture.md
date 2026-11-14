# Architecture Overview

## High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend (packages/ui)"
        SvelteKit["SvelteKit App"]
        TQ["TanStack Query"]
        Axios["Axios HTTP Client"]
        Stores["Svelte 5 Rune Stores<br/>(auth, theme, business, settings)"]
        SC["shadcn-svelte / Bits UI<br/>Component Library"]
    end

    subgraph "Backend (packages/api)"
        NestJS["NestJS Application"]
        
        subgraph "Feature Modules"
            UserModule["User Module"]
            BusinessModule["Business Module"]
            ServiceModule["Service Module"]
        end
        
        subgraph "Shared Infrastructure"
            Security["Security Module<br/>(JWT, Guards, Roles)"]
            DB["Database Module<br/>(Kysely + PostgreSQL)"]
            Queue["Queue Module<br/>(BullMQ + Redis)"]
            Email["Email Module<br/>(Nodemailer)"]
            Cache["Cache Module<br/>(Redis + Keyv)"]
            Config["Config Module<br/>(Env Validation)"]
        end
    end

    subgraph "Domain (packages/domain)"
        Entities["Entities<br/>(User, Business, Service)"]
        VOs["Value Objects<br/>(Brand, Location, Booking, Hours, etc.)"]
        UseCaseInterfaces["Use Case Interfaces"]
        RepoInterfaces["Repository Interfaces"]
        Result["Result&lt;T, E&gt; Pattern"]
        DomainErrors["Domain Errors"]
    end

    subgraph "Shared (packages/shared)"
        Types["TypeScript Types"]
        Endpoints["API Endpoint Constants"]
        BaseTypes["Base Response Types"]
    end

    subgraph "External Services"
        PG[("PostgreSQL")]
        Redis[("Redis")]
        SMTP[("SMTP / Mailpit")]
        S3[("RustFS / S3 Storage")]
    end

    SvelteKit --> Axios
    Axios --> NestJS
    TQ --> Axios
    Stores --> SvelteKit
    SC --> SvelteKit

    NestJS --> UserModule
    NestJS --> BusinessModule
    NestJS --> ServiceModule
    NestJS --> Security
    NestJS --> DB
    NestJS --> Queue
    NestJS --> Email
    NestJS --> Cache
    NestJS --> Config

    UserModule --> Entities
    BusinessModule --> Entities
    ServiceModule --> Entities
    Entities --> VOs
    Entities --> Result
    Entities --> DomainErrors

    UserModule --> UseCaseInterfaces
    BusinessModule --> UseCaseInterfaces
    ServiceModule --> UseCaseInterfaces

    UserModule --> RepoInterfaces
    BusinessModule --> RepoInterfaces
    ServiceModule --> RepoInterfaces

    DB --> PG
    Queue --> Redis
    Cache --> Redis
    Email --> SMTP
    Config --> S3

    UserModule --- Types
    BusinessModule --- Types
    Types --- Endpoints
    Types --- BaseTypes
```

## Clean Architecture Layers

```mermaid
graph LR
    subgraph "Layer 1: Domain"
        direction TB
        DE[Domain Entities]
        VO[Value Objects]
        UC[Use Case Interfaces]
        RI[Repository Interfaces]
        RE[Result&lt;T, E&gt; / Errors]
    end

    subgraph "Layer 2: Application (API)"
        direction TB
        C[Controllers]
        UCI[Use Case Implementations]
        DTO[DTOs / Validation]
        RI_IMPL[Repository Implementations]
        MAP[Mappers]
        FACT[Factories]
    end

    subgraph "Layer 3: Infrastructure"
        direction TB
        DB[(PostgreSQL)]
        R[(Redis)]
        MQ[(BullMQ)]
        SM[(SMTP)]
    end

    subgraph "Layer 4: Presentation (UI)"
        direction TB
        P[Pages / Routes]
        M[Mutations / Queries]
        ST[Stores]
        COMP[Components]
    end

    C --> UCI
    UCI --> UC
    UC --> DE
    C --> DTO
    UCI --> RI
    RI_IMPL --> RI
    RI_IMPL --> DB
    RI_IMPL --> MAP
    UCI --> FACT
    UCI --> RE
    UCI --> DE

    P --> M
    M --> C
    P --> COMP
    ST --> P
```

## Request Flow

```mermaid
sequenceDiagram
    participant U as Browser (SvelteKit)
    participant A as Axios Client
    participant MW as JWT Middleware
    participant G as RolesGuard
    participant CTRL as Controller
    participant UC as Use Case
    participant ENT as Domain Entity
    participant REPO as Repository
    participant DB as PostgreSQL
    participant R as Redis

    U->>A: User Action (e.g., Save Settings)
    A->>A: Attach JWT from Auth Store
    A->>MW: HTTP Request
    MW->>MW: Verify JWT
    MW->>MW: Populate SecurityContext
    
    MW->>G: Route to Guard
    G->>G: Check @Roles() decorator
    
    G->>CTRL: Forward to Handler
    CTRL->>CTRL: Validate DTO
    
    CTRL->>UC: Execute Use Case
    UC->>REPO: findById()
    REPO->>DB: SQL Query
    DB-->>REPO: Row
    REPO->>REPO: Map DB → Entity
    REPO-->>UC: Result&lt;Entity&gt;
    
    UC->>ENT: entity.updateFeature(data)
    ENT-->>UC: new Entity (immutable)
    
    UC->>REPO: repository.update(entity)
    REPO->>REPO: Map Entity → DB
    REPO->>DB: SQL UPDATE
    DB-->>REPO: Success
    REPO-->>UC: Result&lt;Entity&gt;
    
    UC-->>CTRL: Result&lt;Entity&gt;
    CTRL->>CTRL: Map Entity → Response
    CTRL->>R: Invalidate Cache
    CTRL-->>U: HTTP 200 + Response JSON
    U->>U: Update TanStack Query Cache
    U->>U: Update Business Store
    U->>U: Show Toast Notification
```

## Package Dependency Graph

```mermaid
graph LR
    UI["packages/ui<br/>(SvelteKit)"] --> SHARED["packages/shared<br/>(Types + Zod)"]
    API["packages/api<br/>(NestJS)"] --> SHARED
    API --> DOMAIN["packages/domain<br/>(Entities + Use Cases)"]
    DOMAIN --> SHARED
    UI --> API
```

## Module Architecture (NestJS)

```mermaid
graph TB
    subgraph "NestJS App Module"
        direction TB
        CORE["PikslotsAppModule"]
        
        subgraph "Feature Modules"
            UM["UserModule"]
            BM["BusinessModule"]
            SM["ServiceModule"]
        end
        
        subgraph "Shared Modules"
            SMOD["PikslotsSecurityModule<br/>(JWT, Guards, SecurityContext)"]
            DMOD["PikslotsDatabaseModule<br/>(Kysely + Migrations)"]
            QMOD["PikslotsQueueModule<br/>(BullMQ)"]
            EMOD["PikslotEmailModule<br/>(Nodemailer)"]
            CMOD["PikslotCacheModule<br/>(Redis + Keyv + OTP)"]
            CONFIG["PikslotsConfigModule<br/>(Env Validation)"]
        end
    end

    CORE --> UM
    CORE --> BM
    CORE --> SM
    CORE --> SMOD
    CORE --> DMOD
    CORE --> QMOD
    CORE --> EMOD
    CORE --> CMOD
    CORE --> CONFIG

    UM --> SMOD
    UM --> DMOD
    BM --> SMOD
    BM --> DMOD
    SM --> SMOD
    SM --> DMOD
```

## User Role Hierarchy

```mermaid
graph BT
    PO["Platform Owner<br/>- Full system access<br/>- Register businesses<br/>- Invite any role<br/>- View all users"]
    BO["Business Owner<br/>- Manage business settings<br/>- Invite Admin & below<br/>- Manage team"]
    AD["Admin<br/>- Manage daily operations<br/>- Invite Enhanced & below<br/>- Update working hours"]
    EN["Enhanced<br/>- Book appointments<br/>- View own schedule<br/>- Basic operations"]
    ST["Standard<br/>- View bookings<br/>- Limited operations"]
    NA["No Access<br/>- No system access"]

    PO --> BO
    BO --> AD
    AD --> EN
    EN --> ST
    ST --> NA
```

## Key Architecture Patterns

### 1. Clean Architecture
The **domain layer** (`packages/domain`) has zero framework dependencies. It contains entities, value objects, use case interfaces, and repository interfaces. The **API layer** (`packages/api`) implements these interfaces using NestJS and Kysely.

### 2. Repository Pattern
Data access is abstracted behind TypeScript interfaces:
- `IUserRepository` — user CRUD operations
- `IBusinessRepository` — business CRUD operations  
- `IServiceRepository` — service CRUD operations

Implementations use Kysely for type-safe SQL queries.

### 3. Result Pattern
Errors are returned as values via `Result<T, E>` discriminated union:
```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```
Domain errors are **never thrown** — they flow through `Result` types and are mapped to HTTP responses in controllers.

### 4. Immutable Entities
All entity update methods return **new instances** rather than mutating. Each update stamps `updatedAt: new Date()` and `updatedBy: value.updatedBy`:
```typescript
updateFeature(value: { ...; updatedBy: string }): Business {
    return new Business({ ...this.props, ...changes, updatedAt: new Date(), updatedBy: value.updatedBy });
}
```

### 5. DTO Pattern
Input validation happens at system boundaries using `class-validator` decorators on DTO classes. TypeScript types and Zod schemas in `packages/shared` keep API contracts synchronized between frontend and backend.

### 6. Factory Pattern
Use cases are composed via Factory classes per module, enabling clean dependency injection:
- `BusinessUseCaseFactory`
- `UserUseCaseFactory`

### 7. Global Auth Pipeline
1. `JwtVerificationMiddleware` (global) — extracts & verifies JWT, populates `SecurityContext`
2. `RolesGuard` — checks `@Roles()` decorator against JWT payload role

### 8. State Management (Frontend)
- **Client state**: Svelte 5 runes (`$state`, `$derived`, `$effect`) via custom stores
- **Server state**: TanStack Svelte Query (queries + mutations with automatic cache invalidation)

## Database Design

```mermaid
erDiagram
    users {
        uuid id PK
        varchar username UK
        varchar password
        uuid business_id FK
        varchar role "Platform Owner, Business Owner, Admin, Enhanced, Standard, No Access"
        varchar status "invited, active, inactive, suspended"
        varchar email UK
        varchar phone
        jsonb user_working_hours "Per-day schedule"
        jsonb notification_preferences
        jsonb appointment_reminders
        timestamp last_login_at
        boolean is_deleted
    }
    
    businesses {
        uuid id PK
        uuid owner_id FK
        varchar slug UK "URL-friendly tenant ID"
        varchar name
        varchar industry
        varchar status "pending_setup, active, inactive, suspended"
        jsonb brand_detail
        jsonb brand_appearance_details
        jsonb location_details
        jsonb booking_policies
        jsonb booking_setup
        jsonb booking_contact_fields
        jsonb booking_customization
        jsonb booking_label_overrides
        jsonb business_hours
        jsonb business_links
        jsonb contact_details
        jsonb team_notifications
        jsonb customer_notifications
        jsonb notification_customization
        varchar subscription_plan
        varchar subscription_status
        timestamp trial_ends_at
        boolean is_deleted
    }
    
    services {
        uuid id PK
        varchar title "Unique per business"
        text description
        text[] images "Max 5"
        integer duration_in_mins
        integer buffer_time_in_mins
        decimal cost
        boolean is_hidden_from_booking_page
        uuid business_id FK
        boolean is_deleted
    }
    
    users ||--o{ businesses : "owners"
    businesses ||--o{ users : "members"
    businesses ||--o{ services : "offers"
```

> **Note:** All tables include a full audit trail: `created_at`, `created_by`, `updated_at`, `updated_by`, `deleted_at`, `deleted_by`, `is_deleted`. Soft deletes are used throughout.

## Caching Strategy

```mermaid
flowchart LR
    A[API Request] --> B{Cache Hit?}
    B -->|Yes| C[Return Cached Data]
    B -->|No| D[Query Database]
    D --> E[Cache Result in Redis]
    E --> F[Return Data]
    C --> F
    G[Mutation/Update] --> H[Invalidate Related Cache Keys]
```

Redis is used for:
- **OTP storage** (invite acceptance codes with TTL)
- **Business data caching** (Cacheable + Keyv)
- **BullMQ job queue** (email sending, async events)
