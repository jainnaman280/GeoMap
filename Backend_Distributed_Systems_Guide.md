# Backend & Distributed Systems in Axiom — Comprehensive Guide

> Grounded in real Axiom codebase examples. Each section covers: summary, why it's used, Axiom usage, real-world examples, interview questions, and resume keywords.

---

## Table of Contents

1. [Rate Limiting](#1-rate-limiting)
2. [WebSockets & Real-Time Communication](#2-websockets--real-time-communication)
3. [Microservices Architecture](#3-microservices-architecture)
4. [MCP (Model Context Protocol)](#4-mcp-model-context-protocol)
5. [Message Queues & Event-Driven Architecture](#5-message-queues--event-driven-architecture)
6. [Caching](#6-caching)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [API Gateway](#8-api-gateway)
9. [Service Discovery](#9-service-discovery)
10. [Load Balancing](#10-load-balancing)
11. [Distributed Transactions & Sagas](#11-distributed-transactions--sagas)
12. [Idempotency](#12-idempotency)
13. [Circuit Breaker Pattern](#13-circuit-breaker-pattern)
14. [Retry & Dead Letter Queues (DLQ)](#14-retry--dead-letter-queues-dlq)
15. [Observability (Logging, Metrics, Tracing)](#15-observability-logging-metrics-tracing)
16. [Distributed Locking](#16-distributed-locking)
17. [Database Design & Scaling](#17-database-design--scaling)
18. [Concurrency Control & Locking Strategies](#18-concurrency-control--locking-strategies)
19. [Event Sourcing & CQRS](#19-event-sourcing--cqrs)
20. [Security Best Practices](#20-security-best-practices)
21. [Cloud-Native Architecture](#21-cloud-native-architecture)
22. [CI/CD & Deployment Strategies](#22-cicd--deployment-strategies)
23. [Quick Reference: Axiom at a Glance](#quick-reference-axiom-at-a-glance)

---

## 1. Rate Limiting

### Summary
Rate limiting controls how many requests a client can make to a service within a time window, protecting services from abuse, overload, and cost blowout.

### Algorithms

| Algorithm | How it works | Trade-off |
|---|---|---|
| **Fixed Window** | Count requests in a fixed time slot (e.g., 100/min). | Simple; burst at boundary allowed. |
| **Sliding Window** | Rolling time window; smoother enforcement. | Higher memory usage. |
| **Token Bucket** | Tokens replenish at a fixed rate; each request consumes one. | Allows short bursts. |
| **Leaky Bucket** | Queue drains at a fixed rate regardless of burst. | Strict, no bursting. |

### Why It's Used
- Prevent a single noisy client from starving others.
- Protect the backend from cost blowout on expensive operations.
- Enforce SLA tiers (free vs. paid API quotas).

### In Axiom
- `V2/Database/Axiom.cs` has a `DbSet<PublicApiThrottlingLog>` — Axiom logs every throttled public API call to a DB table for audit and analysis.
- The Public API enforces per-client throttle limits so external callers (CI scripts, portal users) can't hammer the backend.

### Real-World Examples
- GitHub API: 5,000 requests/hour per token.
- Stripe: rate-limits payment creation to prevent duplicate charges.
- Cloudflare: edge-level rate limiting before requests even hit origin servers.

### Interview Questions
1. **Explain the token bucket vs. sliding window trade-offs.**
   Token bucket allows short bursts (good for bursty traffic); sliding window is smoother but needs distributed coordination.

2. **How do you implement distributed rate limiting across multiple pods?**
   Use Redis `INCR` + `EXPIRE` or a Lua script for atomic check-and-increment.

3. **What happens when a rate limit is hit — HTTP 429 or 503?**
   `429 Too Many Requests` with `Retry-After` header is the standard.

### Resume Keywords
`Rate Limiting` · `Token Bucket` · `Sliding Window` · `Throttling` · `API Quotas` · `Redis INCR` · `429 handling`

---

## 2. WebSockets & Real-Time Communication

### Summary
WebSockets establish a persistent, full-duplex TCP connection between client and server, enabling push notifications without polling.

### Protocols

| Protocol | Description |
|---|---|
| **WebSocket (RFC 6455)** | Raw bidirectional channel. |
| **SignalR** | Microsoft abstraction that falls back through WebSocket → SSE → Long Polling. |
| **SSE (Server-Sent Events)** | One-way server push over HTTP. |

### Why It's Used
- Eliminate expensive polling loops (100 clients polling every second = 100 req/s wasted).
- Enable real-time dashboards, live job status, collaborative UI.
- Reduce latency from seconds (polling interval) to milliseconds (push).

### In Axiom
- `Api/SignalRHubs/ReportMessageHub.cs` — `ReportMessageHub : Hub, IReportMessageHub` with `[HubName("ReportProgress")]`.
- When a long-running report runs on the backend, the hub calls `SendProgress()`, and the Angular frontend receives `OnProgress()` updates live — no polling needed.
- The main Angular app (`Axiom/`) uses the SignalR client library to subscribe to job state changes and build progress in real time.

### Real-World Examples
- Slack message delivery.
- Stock ticker feeds.
- Online game state synchronization.
- Collaborative editing (Google Docs).

### Interview Questions
1. **When would you use SSE vs WebSockets?**
   SSE for one-way server push (notifications, feeds); WebSocket when the client must also send messages (chat, gaming).

2. **How do you scale SignalR across multiple servers?**
   Use Redis backplane so all pods share a pub/sub channel.

3. **How do you handle reconnections?**
   Implement exponential-backoff reconnect logic on the client; server must handle duplicate subscriptions gracefully.

### Resume Keywords
`SignalR` · `WebSockets` · `Server-Sent Events` · `Real-Time Notifications` · `Hub` · `Redis Backplane` · `Long Polling`

---

## 3. Microservices Architecture

### Summary
Decompose a monolith into small, independently deployable services each owning its own data and business domain.

### Key Principles
- Single Responsibility per service.
- Independent deployment and scaling.
- Communicate via HTTP/gRPC or async messaging.
- Each service owns its own database (no shared schema).

### Why It's Used
- Teams can deploy independently without coordinating a "big bang" release.
- Services scale independently (build workers scale separately from the API).
- Failure in one service doesn't cascade to the whole system.

### In Axiom
Axiom is split into multiple independent services, each with its own `.sln`:

| Service | .sln / Project | Responsibility |
|---|---|---|
| Core API | `Axiom.Api.sln` | Main REST API |
| Cloud Workers | `Axiom.Cloud.sln` | Archiving, task orchestration |
| Utils Services | `Axiom.Utils.sln` | Background jobs, event consumers |
| Ticket Service | `Axiom.Tickets.sln` | Jira integration, ticket lifecycle |
| MCP Server | `AxiomMCPServer/` | AI/MCP gateway |
| Build Service | `BuildServiceApi/` | Build artifact management |

Each service runs on dedicated nodes (`axiomsvcsd*`, `axiombuildslv*`).

### Real-World Examples
- Netflix: 700+ microservices; each owns a slice of the streaming pipeline.
- Amazon: "two-pizza team" rule — if a team needs more than 2 pizzas to feed, the service is too big.
- Uber: trip, payment, driver, notification are separate services.

### Interview Questions
1. **How do you handle data consistency when services have separate databases?**
   Saga pattern, eventual consistency, outbox pattern.

2. **What is the difference between orchestration and choreography?**
   Orchestration: central coordinator calls services. Choreography: services react to events independently.

3. **How do you handle cross-service transactions?**
   Two-phase commit (avoided in practice) or Saga with compensating transactions.

### Resume Keywords
`Microservices` · `Domain-Driven Design` · `Service Decomposition` · `Independent Deployment` · `API Contracts` · `Bounded Context`

---

## 4. MCP (Model Context Protocol)

### Summary
MCP is an open protocol (by Anthropic) that standardizes how AI models discover and invoke external tools and data sources — essentially an "API layer for LLMs."

### Architecture
```
AI Client (LLM) ←→ MCP Client ←→ MCP Server ←→ External Services
```
The MCP server exposes:
- **Tools** — callable functions (e.g., `GetJobStatus`)
- **Resources** — readable data (e.g., job logs)
- **Prompts** — reusable prompt templates

### Why It's Used
- Standardizes AI tool integration so the same client works with any MCP server.
- Separates AI orchestration from service implementation.
- Enables LLMs to interact with internal systems without custom glue code per integration.

### In Axiom
- `AxiomMCPServer/Program.cs` — .NET MCP server wrapping the Axiom REST API:
  ```csharp
  .AddMcpServer()
   .WithHttpTransport()
   .WithTools<JobTool>()
   .WithTools<HostTool>()
   .WithTools<TaxonomyTool>()
   .WithTools<IssueTool>()
  ```
- `MCP/src/backend/axiom_mcp_server.py` — Python MCP server using `FastMCP` framework connecting to AWS Bedrock.
- An AI assistant can call `JobTool.GetJobStatus(jobId)` through MCP without knowing Axiom's REST API shape.

### Real-World Examples
- Claude Desktop connecting to your filesystem, GitHub, Jira.
- VS Code Copilot using MCP to query your local databases.
- An AI agent that can file Jira tickets by calling an MCP tool.

### Interview Questions
1. **What problem does MCP solve vs. plain function calling?**
   MCP standardizes discovery and transport — the same client works with any MCP server without custom integration code.

2. **How is MCP different from a REST API?**
   MCP uses a typed protocol with schema discovery; REST is more ad-hoc. MCP also supports streaming and bidirectional communication.

3. **How do you secure an MCP server?**
   OAuth2 for the client, scoped tool permissions, input validation on every tool parameter.

### Resume Keywords
`MCP` · `Model Context Protocol` · `AI Tool Integration` · `FastMCP` · `LLM Agents` · `Tool Calling` · `Anthropic`

---

## 5. Message Queues & Event-Driven Architecture

### Summary
Services communicate by publishing events to a broker; consumers subscribe and process asynchronously — decoupling producers from consumers in time and space.

### Key Technologies

| Broker | Model | Best For |
|---|---|---|
| **RabbitMQ** | Push-based, AMQP, routing keys | Low-latency task queues |
| **Apache Kafka** | Pull-based, log-based, partitions | High-throughput event streaming |
| **Azure Service Bus** | Enterprise messaging, topics/queues | Azure-native workflows |
| **AWS SQS** | Fully managed queue, DLQ built-in | AWS-native simple queues |

### Why It's Used
- Decouples services — the job service doesn't need to know about the notification service.
- Enables async processing — the API returns immediately; heavy work happens in the background.
- Natural buffer for traffic spikes — consumers process at their own pace.

### In Axiom
- **Publisher**: `V2/Shared/Axiom.Messaging.RabbitMq/Services/RabbitMqPublisher.cs` — `PublishAsync<T>()` serializes messages and pushes to exchanges.
- **Consumer**: `V2/Utils/AxiomEventNotificationService/AxiomEventConsumer.cs` — `AsyncDefaultBasicConsumer` subscribed to `queue.axiomevents`; dispatches to handlers:
  - `ResourceStateChangeHandler`
  - `JobStateChangeHandler`
- **Cloud Worker**: `Cloud/TicketService/TicketRMQService/Workers/JiraDCWorker.cs` — `BackgroundService` consuming from RabbitMQ, creating/updating Jira tickets.
- **AWS SQS**: `V2/Cloud/TaskOrchestrator/Models/SqsQueueConfig.cs` — task orchestration using AWS SQS.

### Real-World Examples
- Uber: a completed ride triggers billing, driver rating, and email — all from one event.
- E-commerce: `OrderPlaced` event fans out to inventory, payment, shipping, analytics.
- IoT: millions of device telemetry events streamed through Kafka, processed by multiple consumers.

### Interview Questions
1. **What is the difference between a queue and a topic?**
   Queue: one consumer gets each message (competing consumers). Topic: all subscribers get every message (pub/sub).

2. **How do you guarantee exactly-once processing?**
   Idempotent consumers + deduplication keys; Kafka transactions; outbox pattern.

3. **What is a Dead Letter Queue?**
   A queue where unprocessable messages land after N retry failures, allowing human inspection without blocking the main queue.

### Resume Keywords
`RabbitMQ` · `Kafka` · `Azure Service Bus` · `SQS` · `Event-Driven Architecture` · `Pub/Sub` · `Message Broker` · `Consumer Groups` · `Dead Letter Queue`

---

## 6. Caching

### Summary
Caching stores frequently read data in fast storage (memory or Redis) to reduce database load and latency.

### Strategies

| Strategy | How | When |
|---|---|---|
| **Cache-Aside** | App reads cache; on miss, reads DB and populates cache | General purpose |
| **Write-Through** | Write to cache and DB simultaneously | Consistency-first |
| **Write-Behind** | Write to cache first, async flush to DB | Write-heavy workloads |
| **Read-Through** | Cache sits in front of DB, transparently loads on miss | Transparent to app |

### Cache Invalidation Approaches
- TTL (time-to-live) expiry.
- Event-driven invalidation (message triggers cache bust).
- Versioned cache keys.

### Why It's Used
- Reduce database round trips from milliseconds to microseconds.
- Absorb read traffic spikes without scaling the database.
- Serve hot data (popular job status, host metadata) from memory.

### In Axiom
- `DataAccess/Helpers/RedisClient/RedisClient.cs` — `StackExchange.Redis` with `Lazy<ConnectionMultiplexer>` (lazy singleton pattern for connection pooling).
- `DataAccess/Helpers/CacheHelper/RedisCacheService.cs` — service wrapper for get/set/delete cache operations.
- Used to cache expensive queries (job status, host metadata) so the UI doesn't hammer the database on every page load.

### Real-World Examples
- Twitter: Redis caches timelines; reading 100 tweets hits cache, not 100 DB queries.
- CDN edge caching: Cloudflare caches static assets globally.
- Database query result caching: expensive aggregation queries cached for 60 seconds.

### Interview Questions
1. **What is a cache stampede? How do you prevent it?**
   All requests simultaneously miss and hit the DB at TTL expiry. Prevent with probabilistic early expiration, mutex locks, or cache warming.

2. **What is cache aside vs. read-through?**
   Cache-aside: app manages cache explicitly. Read-through: cache handles loading transparently.

3. **When should you NOT cache?**
   Financial transactions requiring real-time accuracy; user-specific, low-frequency data; rapidly changing data where staleness is unacceptable.

### Resume Keywords
`Redis` · `StackExchange.Redis` · `Cache-Aside` · `TTL` · `Distributed Cache` · `Cache Stampede` · `Write-Through` · `IMemoryCache`

---

## 7. Authentication & Authorization

### Summary
**Authentication (AuthN)** verifies identity ("who are you?"). **Authorization (AuthZ)** verifies permissions ("what can you do?").

### Key Protocols

| Protocol | Purpose |
|---|---|
| **JWT** | Stateless, self-contained token carrying claims |
| **OAuth 2.0** | Delegation framework — grant third parties limited access |
| **OpenID Connect (OIDC)** | Identity layer on top of OAuth 2.0; issues ID tokens |
| **MSAL** | Microsoft Authentication Library for Azure AD/Entra |
| **RBAC** | Role-Based Access Control — permissions tied to roles |
| **ABAC** | Attribute-Based Access Control — policies on attributes |

### JWT Anatomy
```
Header.Payload.Signature
eyJhbGciOiJIUzI1NiJ9 . eyJzdWIiOiJ1c2VyMSIsInJvbGUiOiJhZG1pbiJ9 . <HMAC-SHA256>
```

### Why It's Used
- JWT: stateless auth — no session store needed; server validates signature.
- OAuth2: delegates access without sharing credentials.
- RBAC: scalable permission management — change a role, all users update.

### In Axiom
- `V2/Api/Program.cs` — registers `Microsoft.AspNetCore.Authentication.JwtBearer` for JWT validation on all API endpoints.
- Angular `Axiom/` — uses **Azure MSAL** for browser-side OAuth2/OIDC with Azure AD/Entra ID.
- `V2/DataAccess/Helpers/LimeClient/Oauth.cs` — OAuth2 client credentials flow for machine-to-machine calls.
- `AxiomMCPServer/Services/AxiomPublicAPIService.cs` — authenticates MCP → Public API calls using client credentials.
- `Cloud/TicketService/CommonServices/Jira/Authenticators.cs` — Jira-specific auth.

### Real-World Examples
- Login with Google = OIDC flow; Google issues an ID token + access token.
- GitHub Actions secrets = client credentials OAuth flow.
- Banking app: RBAC ensures tellers can view accounts but not approve loans.

### Interview Questions
1. **What is the difference between OAuth 2.0 and OIDC?**
   OAuth 2.0 is an authorization framework; OIDC adds authentication (ID tokens) on top.

2. **Where should you store a JWT on the client?**
   HttpOnly cookie (preferred — no XSS access); never in localStorage (vulnerable to XSS).

3. **How do you revoke a JWT before expiry?**
   Maintain a token blocklist in Redis; use short-lived access tokens + refresh token rotation.

### Resume Keywords
`JWT` · `OAuth 2.0` · `OpenID Connect` · `MSAL` · `RBAC` · `Azure AD` · `Bearer Token` · `Client Credentials` · `Refresh Token Rotation`

---

## 8. API Gateway

### Summary
An API Gateway is the single entry point for all client requests; it handles routing, auth, rate limiting, SSL termination, and request transformation before forwarding to backend services.

### Responsibilities
- **Routing** — `/api/jobs/*` → Jobs Service, `/api/builds/*` → Build Service.
- **Authentication** — validate JWT before forwarding.
- **Rate Limiting** — per-client quotas.
- **SSL Termination** — HTTPS → HTTP inside the cluster.
- **Request/Response Transformation** — header injection, payload mapping.
- **Observability** — centralized access logs and traces.

### Why It's Used
- Single entry point simplifies client code — one hostname, not 20 service URLs.
- Centralizes cross-cutting concerns (auth, rate limiting) instead of duplicating them in every service.
- Enables the BFF (Backend for Frontend) pattern.

### In Axiom
- **Nginx** acts as the API Gateway / reverse proxy (`DevOps/nginx/axiom-nginx-prod-shg-ansible-playbook.yml`).
- Kubernetes **Ingress** resources (`AxiomMCPServer/DevOps/Environment/prod/kubernates/ingress.yaml`) define routing rules at the cluster edge.
- The Public API exposes a unified surface over multiple internal services.

### Real-World Examples
- AWS API Gateway: routes Lambda functions, handles throttling, auth, caching.
- Kong: open-source gateway with plugin ecosystem.
- Netflix Zuul: handles 100,000+ RPS routing to 700+ services.

### Interview Questions
1. **What is the difference between an API Gateway and a load balancer?**
   Load balancer distributes traffic by server; API Gateway understands HTTP semantics — it routes by path, validates auth, transforms requests.

2. **How does an API Gateway enable the BFF pattern?**
   Each frontend gets its own gateway optimized for its data needs (mobile vs. web).

3. **What are the risks of a single API Gateway?**
   Single point of failure; must be highly available and scalable; can become a bottleneck.

### Resume Keywords
`API Gateway` · `Nginx` · `Kong` · `AWS API Gateway` · `Reverse Proxy` · `SSL Termination` · `BFF Pattern` · `Routing` · `Ingress`

---

## 9. Service Discovery

### Summary
In dynamic environments where service instances scale up/down and IPs change, service discovery lets services find each other by name rather than hardcoded addresses.

### Models
- **Client-Side Discovery** — client queries a registry (Eureka, Consul) and load-balances itself.
- **Server-Side Discovery** — load balancer queries the registry (Kubernetes Service, AWS ALB).

### Why It's Used
- In Kubernetes, pod IPs change on every restart — hardcoded IPs would break immediately.
- Enables zero-downtime scaling — new pods register themselves; old pods deregister gracefully.
- Abstracts infrastructure topology from application code.

### In Axiom
- **Kubernetes Services** (`AxiomMCPServer/DevOps/Environment/prod/kubernates/service.yaml`) — Kubernetes provides built-in DNS-based service discovery. `http://axiom-mcp-server` resolves to the correct pod IPs automatically.
- **Helm Charts** (`Cloud/Infra/Kubernetes/helm/`) — parameterize service names and ports across environments.
- Configuration-based discovery for legacy .NET services (connection strings in `app.config` / environment variables).

### Real-World Examples
- Consul: service registry used by HashiCorp Nomad.
- Kubernetes CoreDNS: `service-name.namespace.svc.cluster.local` resolves to pod IPs.
- AWS Cloud Map: DNS-based service discovery for ECS services.

### Interview Questions
1. **What is the difference between client-side and server-side discovery?**
   Client-side: more control, more complexity. Server-side: simpler client, gateway handles it.

2. **How does Kubernetes handle service discovery?**
   `kube-proxy` maintains iptables rules; CoreDNS resolves service names to ClusterIP addresses.

3. **What happens when a service instance goes down?**
   Health checks remove it from the registry; existing connections drain; clients retry against healthy instances.

### Resume Keywords
`Service Discovery` · `Kubernetes Services` · `Consul` · `Eureka` · `CoreDNS` · `Client-Side Discovery` · `Health Checks` · `Service Registry`

---

## 10. Load Balancing

### Summary
Load balancing distributes incoming traffic across multiple instances to maximize throughput, minimize latency, and avoid single-instance overload.

### Algorithms

| Algorithm | Description | Best For |
|---|---|---|
| **Round Robin** | Requests distributed sequentially | Equal-capacity instances |
| **Least Connections** | Route to instance with fewest active connections | Variable request durations |
| **IP Hash** | Same client always hits same server | Session affinity |
| **Weighted Round Robin** | More traffic to higher-capacity instances | Heterogeneous fleet |

### Why It's Used
- Eliminate single points of failure — if one instance crashes, others absorb traffic.
- Scale horizontally — add instances instead of buying bigger hardware.
- Enable zero-downtime rolling deploys.

### In Axiom
- **Nginx** load balancer (`DevOps/nginx/axiom-nginx-prod-shg-ansible-playbook.yml`) — multi-region deployments (prod-shg, test-sd, test-hyd) with Nginx upstream blocks.
- **Kubernetes HPA** (`AxiomMCPServer/DevOps/Environment/prod/kubernates/hpa.yaml`) — Horizontal Pod Autoscaler scales pods based on CPU/memory, and the Kubernetes Service load-balances across them.

### Real-World Examples
- AWS ALB: Layer 7, path-based routing + health checks.
- Cloudflare Anycast: routes users to the nearest data center.
- Kubernetes: kube-proxy distributes traffic across pod replicas.

### Interview Questions
1. **What is Layer 4 vs. Layer 7 load balancing?**
   L4: routes by IP/TCP without looking at content (faster). L7: routes by HTTP headers/paths (more intelligent, adds latency).

2. **How do you handle sticky sessions?**
   IP hashing, cookie-based affinity (ALB sticky sessions), or move session state to Redis (preferred — stateless instances).

3. **What is the difference between horizontal and vertical scaling?**
   Horizontal: add more instances. Vertical: add more CPU/RAM to existing instance. Horizontal preferred for distributed systems.

### Resume Keywords
`Load Balancing` · `Nginx` · `Round Robin` · `Least Connections` · `HPA` · `Auto-Scaling` · `Session Affinity` · `AWS ALB`

---

## 11. Distributed Transactions & Sagas

### Summary
When a business operation spans multiple services (and databases), maintaining consistency without a distributed lock requires the **Saga pattern**: a sequence of local transactions where each step publishes an event, and failures trigger **compensating transactions**.

### Saga Types

| Type | How | Trade-off |
|---|---|---|
| **Choreography** | Services react to events; no central coordinator | Loose coupling, harder to debug |
| **Orchestration** | Central saga orchestrator calls each service step | Easier to reason about, single point of control |

### Why It's Used
- Two-Phase Commit (2PC) across microservices is impractical — it requires all participants available simultaneously and creates distributed locking.
- Sagas provide eventual consistency without distributed locking.
- Compensating transactions provide explicit rollback paths.

### In Axiom
- `V2/Utils/AXIOMBackendUpdateAPIs/Data/Models/SagaTeam.cs` — `SagaTeam` model tracks saga state.
- `V2/Cloud/TaskOrchestrator/` — central task orchestrator service coordinates multi-step distributed operations (build orchestration, test execution pipelines).
- RabbitMQ event streams enable choreography-style coordination between the Jobs service, Build service, and Notification service.

### Real-World Examples
- E-commerce order: `ReserveInventory → ChargePayment → ScheduleShipping`. If `ChargePayment` fails, compensate with `ReleaseInventory`.
- Uber: trip saga — `MatchDriver → CollectPayment → SendReceipt`.

### Interview Questions
1. **Why can't you use 2PC (two-phase commit) in microservices?**
   2PC requires all participants to be available simultaneously, creates distributed locking, and is catastrophic if the coordinator crashes mid-transaction.

2. **What is a compensating transaction?**
   The undo action for a step — e.g., refund a charge, release a reservation.

3. **How do you handle failures in a saga?**
   The orchestrator detects failure, runs compensation in reverse order, and moves the saga to a failed state.

### Resume Keywords
`Saga Pattern` · `Distributed Transactions` · `Compensating Transactions` · `Orchestration` · `Choreography` · `Eventual Consistency` · `Outbox Pattern`

---

## 12. Idempotency

### Summary
An operation is **idempotent** if calling it multiple times has the same effect as calling it once. Critical for safely retrying failed operations in distributed systems where "did it go through?" is unknowable.

### Implementation Approaches
1. **Idempotency Key** — client sends a unique `Idempotency-Key` header; server stores result keyed on it; duplicate request returns cached response.
2. **Natural idempotency** — `PUT` and `DELETE` are naturally idempotent; `POST` is not.
3. **Database upsert** — `INSERT ... ON CONFLICT DO NOTHING` with a unique constraint.

### Why It's Used
- Network failures mean the client doesn't know if the request succeeded.
- Retrying non-idempotent operations causes duplicates (double charges, duplicate records).
- At-least-once message delivery (RabbitMQ, SQS) requires consumers to handle duplicates.

### In Axiom
- RabbitMQ consumers (`AxiomEventConsumer`) must process events idempotently — if the same `JobStateChanged` event is delivered twice (at-least-once delivery guarantee), the handler must not create duplicate notifications.
- API endpoints that create builds/jobs should check for existing records before inserting.

### Real-World Examples
- Stripe: every payment API call takes an `Idempotency-Key` — retrying a failed charge never double-bills.
- Kafka consumers: at-least-once delivery means consumers must deduplicate by message key.
- Database migrations: `CREATE TABLE IF NOT EXISTS` is idempotent.

### Interview Questions
1. **Why is idempotency important for payment systems?**
   Network failures mean the client doesn't know if the charge succeeded. Without idempotency, retrying charges the customer twice.

2. **How do you implement idempotency keys in a distributed system?**
   Store `(idempotency_key, response)` in Redis with TTL; on duplicate request, return cached response.

3. **Are HTTP GET requests always idempotent?**
   Yes in theory, but not if the GET has side effects (logging, analytics mutations count less, but writes in GET handlers break this).

### Resume Keywords
`Idempotency` · `Idempotency Keys` · `At-Least-Once Delivery` · `Deduplication` · `Safe Retries` · `Upsert` · `Exactly-Once Semantics`

---

## 13. Circuit Breaker Pattern

### Summary
When a downstream service starts failing, a circuit breaker "opens" and immediately returns errors (or a fallback) to callers instead of waiting for timeouts — preventing cascading failures across the system.

### States
```
Closed (normal) ──[failure threshold exceeded]──► Open (fail-fast)
                                                        │
                                              [cooldown period]
                                                        │
                                               Half-Open (probe)
                                               /               \
                                         [success]           [fail]
                                            │                   │
                                         Closed              Open
```

### Why It's Used
- Without a circuit breaker, threads pile up waiting for a slow dependency — eventually exhausting the thread pool and crashing the caller too.
- Fail-fast gives the dependency time to recover without being bombarded.
- Enables graceful degradation (return fallback data while dependency recovers).

### In Axiom
- `V2/Utils/AxiomCLI/ExternalClients/HttpClientExtensions.cs` — **Polly** library used for retry policies and circuit breakers on outbound HTTP calls.
- When the Jira service is slow or down, the circuit opens so the Ticket Worker doesn't pile up thousands of waiting threads — it fails fast and queues for retry.

### Real-World Examples
- Netflix Hystrix (now Resilience4j): circuit breakers around every microservice call.
- Payment processor down: circuit opens, users see "Payment unavailable" immediately rather than a 30-second timeout.
- Database overload: circuit breaker prevents new requests from reaching a struggling DB.

### Interview Questions
1. **How is a circuit breaker different from a retry?**
   Retry sends the request again after failure; circuit breaker stops sending requests entirely after a threshold to give the dependency time to recover.

2. **What are the three circuit breaker states?**
   Closed (normal), Open (fail-fast), Half-Open (testing recovery).

3. **How do you define the failure threshold?**
   Common: 50% failure rate over 10 requests in a 10-second window.

### Resume Keywords
`Circuit Breaker` · `Polly` · `Resilience4j` · `Hystrix` · `Fail-Fast` · `Fallback` · `Cascading Failure Prevention` · `Half-Open State`

---

## 14. Retry & Dead Letter Queues (DLQ)

### Summary
**Retry policies** automatically re-attempt failed operations with configurable delays. **DLQs** receive messages that have exhausted retry attempts, preventing them from blocking the main queue.

### Retry Strategies

| Strategy | Description |
|---|---|
| **Immediate retry** | Retry once instantly (transient network glitch). |
| **Fixed delay** | Wait N seconds between attempts. |
| **Exponential backoff** | Wait 1s, 2s, 4s, 8s... (most common). |
| **Jitter** | Add randomness to backoff to avoid thundering herd. |

### Why It's Used
- Transient failures (network blip, DB timeout) are self-healing with a brief wait.
- DLQ prevents one bad message from blocking an entire queue indefinitely.
- Separation of concerns: operations team can inspect and replay DLQ messages without code changes.

### In Axiom
- **RabbitMQ DLQ**: `V2/CommonTypes/Config/RMQQueueConfig.cs` — queue configuration includes `x-dead-letter-exchange` and `x-dead-letter-routing-key` settings so failed messages flow to a dedicated DLQ.
- **AWS SQS DLQ**: `V2/Cloud/TaskOrchestrator/Models/SqsQueueConfig.cs` — SQS queues configured with a `RedrivePolicy` pointing to a DLQ after `maxReceiveCount` failures.
- **Polly** in `HttpClientExtensions.cs` — `WaitAndRetryAsync` with exponential backoff for HTTP calls.

### Real-World Examples
- Email delivery: retry 3 times over 24 hours; on final failure, move to DLQ for manual investigation.
- Order processing: if payment service returns 503, retry 5 times with backoff; failed orders land in DLQ for support team.
- AWS Lambda: on invocation failure, routes event to SQS DLQ.

### Interview Questions
1. **Why is exponential backoff + jitter better than fixed delay?**
   Without jitter, all retry clients synchronize and hit the recovering service in waves (thundering herd). Jitter spreads the load.

2. **What do you do with messages in a DLQ?**
   Alert on-call, inspect the message, fix the bug, replay from DLQ back to main queue.

3. **How many times should you retry?**
   Depends on the operation. Fast idempotent operations: 3-5 times. Slow payment operations: fewer retries with longer backoff.

### Resume Keywords
`Dead Letter Queue` · `DLQ` · `Exponential Backoff` · `Jitter` · `Polly` · `Retry Policy` · `RabbitMQ DLQ` · `SQS Redrive Policy` · `Thundering Herd`

---

## 15. Observability (Logging, Metrics, Tracing)

### Summary
The **three pillars of observability** let you understand what your system is doing in production:
- **Logs** — discrete events with context (errors, state changes).
- **Metrics** — numeric measurements over time (latency, error rate, throughput).
- **Traces** — end-to-end request paths across service boundaries.

### Key Standards

| Standard | Purpose |
|---|---|
| **OpenTelemetry (OTel)** | Vendor-neutral SDK for all three pillars |
| **OTLP** | Wire protocol for exporting telemetry |
| **W3C TraceContext** | Standard for propagating trace IDs across HTTP headers |
| **Structured Logging** | JSON logs with machine-parseable fields |

### Why It's Used
- Logs alone can't tell you which service caused a 2-second slowdown — traces can.
- Metrics drive alerts ("p99 > 500ms → page on-call").
- Structured logs enable fast searching ("all errors from job_id=X in the last hour").

### In Axiom
- `V2/Shared/Axiom.Telemetry/AxiomTelemetryServiceCollectionExtensions.cs` — `AddAxiomTelemetry()` registers **OpenTelemetry** for traces, metrics, and logs with an **OTLP exporter** (the standard wire format for telemetry data).
- `V2/Api/Program.cs` — **Serilog** configured with console + file sinks, integrated with OpenTelemetry.
- `V2/Cloud/Archiver/RetentionWorker/Metrics/CrashMetrics.cs` — custom `Meter` instruments for business metrics (crash retention rates).
- `AXIOM-111335` (recent commit) — stripped `{OriginalFormat}` from exported OTLP logs (shows active telemetry pipeline tuning).

### Real-World Examples
- Datadog APM: distributed traces show which DB query caused a 2-second API slowdown.
- Prometheus + Grafana: `http_request_duration_seconds` histogram alerts when p99 exceeds SLA.
- ELK Stack: structured logs aggregated for security audit and debugging.

### Interview Questions
1. **What is the difference between logging and tracing?**
   Logs are point-in-time events on one service; traces follow a request across multiple services with timing for each hop.

2. **What is a span in distributed tracing?**
   A single timed operation within a trace (e.g., one DB query, one HTTP call). Spans nest to form a trace tree.

3. **How do you correlate logs across microservices?**
   Propagate a `TraceId` via HTTP headers (W3C `traceparent`); include it in every log statement.

### Resume Keywords
`OpenTelemetry` · `Distributed Tracing` · `Serilog` · `Structured Logging` · `OTLP` · `Prometheus` · `Grafana` · `Datadog` · `Span` · `TraceId` · `Metrics` · `Observability`

---

## 16. Distributed Locking

### Summary
When multiple service instances must coordinate exclusive access to a shared resource (cron job, file, DB record), a distributed lock ensures only one instance proceeds at a time.

### Implementations

| Mechanism | How |
|---|---|
| **Redis SETNX + TTL** | Atomic "set if not exists" with expiry |
| **Redlock** | Multi-node Redis algorithm for safety |
| **DB row lock** | `SELECT ... FOR UPDATE` |
| **ZooKeeper** | Ephemeral nodes as locks |

### Why It's Used
- In-process `lock()` statements don't work across multiple pods.
- Prevents duplicate cron execution, double-booking, duplicate writes.
- TTL-based locks auto-release if the holder crashes, preventing permanent deadlock.

### In Axiom
- Redis infrastructure (`DataAccess/Helpers/RedisClient/RedisClient.cs`) — Redis is in place, the natural choice for distributed locks.
- Background workers running on multiple nodes need distributed locks to prevent duplicate job execution (e.g., two workers racing to process the same build event).
- Database optimistic concurrency via `AxiomExecutionStrategy.cs` for handling concurrent EF updates.

### Real-World Examples
- Distributed cron: only one pod should run the daily report generator.
- Inventory reservation: prevent two users from buying the last item simultaneously.
- Leader election: elect one pod as "primary" to handle specific tasks.

### Interview Questions
1. **What is Redlock and why is it controversial?**
   Redlock is a multi-node Redis locking algorithm. Controversy: Martin Kleppmann argued it's unsafe under clock drift and GC pauses; Antirez (Redis author) disagreed.

2. **What happens if the lock holder crashes while holding the lock?**
   TTL-based locks auto-expire, releasing the lock after a timeout. Fencing tokens prevent stale lock holders from causing damage after recovery.

3. **What is a fencing token?**
   An incrementing number included with every lock acquisition. The protected resource rejects operations from holders with outdated tokens.

### Resume Keywords
`Distributed Locking` · `Redis SETNX` · `Redlock` · `Fencing Token` · `Optimistic Locking` · `SELECT FOR UPDATE` · `Leader Election` · `TTL-Based Lock`

---

## 17. Database Design & Scaling

### Summary
Designing a database that handles growth requires choosing the right data model, indexing strategy, and scaling approach.

### Scaling Techniques

| Technique | Description |
|---|---|
| **Read Replicas** | Offload reads to replicas; writes go to primary |
| **Sharding** | Partition data horizontally across multiple nodes by shard key |
| **Caching** | Reduce DB load with Redis (see §6) |
| **Partitioning** | Split a large table into partitions (by date, range) |
| **Connection Pooling** | Reuse DB connections (PgBouncer, HikariCP) |
| **Index Optimization** | Composite indexes, covering indexes, partial indexes |

### Why It's Used
- A single DB node has hard limits on concurrent connections and I/O throughput.
- Read replicas eliminate read contention on the primary.
- Sharding enables horizontal scaling beyond what one node can handle.
- Proper indexing reduces query time from seconds to milliseconds.

### In Axiom
- `V2/Database/Axiom.cs` — EF Core `DbContext` with **100+ `DbSet<T>`** entity sets across SQL Server.
- `V2/Database/Migrations/` — 1,500+ migration files (`20261110065024_AddBuildCleanupStatus.cs`) tracking every schema change.
- **Dual-stack databases**: `Database/` (EF6, .NET Framework) and `DatabaseStandard/` (EF Core, .NET 9) — manually synchronized for coexistence.
- Also uses **MongoDB**, **DocumentDB**, and **Elasticsearch** for unstructured/search workloads, demonstrating polyglot persistence.

### Real-World Examples
- Sharding at scale: Cassandra shards by partition key; each partition is owned by a subset of nodes.
- Read replicas: PostgreSQL streaming replication; analytics queries hit replica, not primary.
- Elasticsearch: Axiom indexes job/build data for fast full-text search.

### Interview Questions
1. **What is the N+1 query problem?**
   Fetching N entities then issuing one DB query per entity = N+1 queries. Fix with eager loading (`Include()` in EF Core) or batch queries.

2. **When would you choose MongoDB over SQL Server?**
   MongoDB: flexible schema, document-centric data, horizontal scaling. SQL: strong consistency, complex joins, ACID transactions.

3. **How do you migrate a production database without downtime?**
   Expand-contract pattern: add new column nullable → backfill → add constraint → remove old column. Blue-green deployment for schema-breaking changes.

### Resume Keywords
`Entity Framework Core` · `Database Migrations` · `Read Replicas` · `Sharding` · `Indexing` · `Polyglot Persistence` · `MongoDB` · `Elasticsearch` · `Connection Pooling` · `N+1 Problem`

---

## 18. Concurrency Control & Locking Strategies

### Summary
When multiple threads or services access shared data simultaneously, concurrency control prevents lost updates, dirty reads, and phantom reads.

### Strategies

| Strategy | Mechanism | Trade-off |
|---|---|---|
| **Pessimistic Locking** | `SELECT FOR UPDATE`, row-level lock | Safe, low throughput |
| **Optimistic Locking** | Version/timestamp check on update | High throughput, retry on conflict |
| **MVCC** | Database keeps multiple row versions | Reads never block writes |
| **Serializable Isolation** | Full serializability | Safest, highest contention |

### Why It's Used
- Without concurrency control, two users updating the same record simultaneously cause a lost update (last writer wins, first writer's changes are discarded).
- Optimistic locking maximizes throughput when conflicts are rare.
- Pessimistic locking is safer when conflicts are frequent and retries are expensive.

### In Axiom
- `V2/Database/AxiomExecutionStrategy.cs` — custom EF Core execution strategy for handling transient concurrency failures and retrying DB operations automatically.
- Entity models with `RowVersion`/`ConcurrencyToken` attributes use optimistic concurrency: if two users update a job configuration simultaneously, the second writer sees a `DbUpdateConcurrencyException`.
- Background workers use queue-based locking (only one worker dequeues a given item) as an implicit concurrency control mechanism.

### Real-World Examples
- Online banking: pessimistic lock on account balance during transfer.
- E-commerce: optimistic concurrency on inventory count — retry if another thread decremented first.
- Git: optimistic concurrency — you fetch, modify, then push; if remote changed, you must merge.

### Interview Questions
1. **What is a deadlock? How do you prevent it?**
   Two transactions each hold a lock the other needs. Prevent by: always acquiring locks in the same order, using timeouts, using optimistic concurrency.

2. **What isolation levels exist in SQL?**
   Read Uncommitted → Read Committed → Repeatable Read → Serializable. Each adds more guarantees but reduces concurrency.

3. **When would you prefer optimistic over pessimistic locking?**
   Optimistic when conflicts are rare (low contention). Pessimistic when conflicts are common and retry costs are high.

### Resume Keywords
`Optimistic Locking` · `Pessimistic Locking` · `MVCC` · `RowVersion` · `DbUpdateConcurrencyException` · `Deadlock Prevention` · `Transaction Isolation` · `EF Core Concurrency`

---

## 19. Event Sourcing & CQRS

### Summary
- **Event Sourcing**: instead of storing current state, store an immutable log of every event that led to the current state. State is derived by replaying events.
- **CQRS (Command Query Responsibility Segregation)**: separate read models from write models. Writes go through commands; reads from optimized projections.

### Benefits
- Complete audit log out of the box.
- Temporal queries ("what was the state at 3pm Tuesday?").
- Replay events to build new read models retroactively.
- Scales reads and writes independently.

### Why It's Used
- Traditional "update in place" loses the history of how you got to the current state.
- CQRS lets you optimize read models (denormalized, cached) independently of write models (normalized, consistent).
- Event log is the single source of truth — projections can be rebuilt from scratch if corrupted.

### In Axiom
- **Event-driven architecture** via RabbitMQ is a step toward event sourcing — every `JobStateChanged`, `BuildCompleted`, `ResourceAllocated` event is an immutable fact.
- Multiple consumers (notification service, audit service, analytics) process the same events independently — a CQRS read-model pattern.
- Elasticsearch is an event-sourcing-adjacent read model: build/job events are indexed for fast query without loading from SQL.
- `V2/Utils/AXIOMBackendUpdateAPIs/` — backend update APIs aligned with command-side of CQRS.

### Real-World Examples
- Banking: account balance = sum of all debit/credit events (classic event sourcing).
- Event Store DB: purpose-built event sourcing database.
- Kafka as event store: retain all events indefinitely for replay.

### Interview Questions
1. **What is an event store?**
   An append-only log of domain events. Each entry is immutable. State is computed by replaying the log.

2. **What is a projection in event sourcing?**
   A derived read model built by consuming events (e.g., an `AccountBalance` table updated by processing `MoneyDeposited`/`MoneyWithdrawn` events).

3. **What is eventual consistency in CQRS?**
   After a command succeeds, the read model may lag slightly behind. Acceptable for most UIs; unacceptable for consistency-critical flows.

### Resume Keywords
`Event Sourcing` · `CQRS` · `Append-Only Log` · `Projections` · `Read Model` · `Write Model` · `Domain Events` · `Eventual Consistency` · `Audit Trail`

---

## 20. Security Best Practices

### Summary
Security must be layered: each layer assumes the previous can be breached.

### Key Areas

| Area | Practices |
|---|---|
| **Input Validation** | Sanitize all external input; parameterized queries for SQL |
| **Secrets Management** | Never commit secrets; use Vault, AWS Secrets Manager, .NET User Secrets |
| **CORS** | Whitelist allowed origins; don't use `*` in production |
| **TLS** | HTTPS everywhere; disable TLS 1.0/1.1; certificate rotation |
| **Dependency Scanning** | OWASP Dependency Check; Dependabot |
| **OWASP Top 10** | Injection, Broken Auth, XSS, IDOR, Security Misconfiguration |

### OWASP Top 10 (2021)
1. Broken Access Control
2. Cryptographic Failures
3. Injection (SQL, Command)
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable and Outdated Components
7. Identification and Authentication Failures
8. Software and Data Integrity Failures
9. Security Logging and Monitoring Failures
10. Server-Side Request Forgery (SSRF)

### In Axiom
- **CORS**: `V2/Api/Program.cs` — `AddCors()` with explicit origin whitelists.
- **Secrets Management**: `Cloud/TicketService/TicketRMQService/Program.cs` — `.AddUserSecrets<Program>(optional: true)` for local dev; production uses environment variables and K8s secrets.
- **JWT Validation**: all API endpoints protected by bearer token middleware.
- **OAuth2 Client Credentials**: machine-to-machine auth for service-to-service calls.
- **K8s Secrets**: sensitive config (DB credentials, API keys) injected as K8s secrets into pod environment variables.

### Real-World Examples
- Log4Shell: a deserialization vulnerability in a dependency — dependency scanning catches this early.
- SSRF via URL parameters: validate and restrict outbound HTTP targets.
- Credential stuffing: rate limit login endpoints; notify on unusual login patterns.

### Interview Questions
1. **What is SQL injection and how do you prevent it?**
   Attacker injects SQL via user input. Prevent with parameterized queries/prepared statements — never string-concatenate user input into SQL.

2. **What is the principle of least privilege?**
   Grant only the permissions needed for a task. Service accounts should have read-only access unless write is required.

3. **What is a supply chain attack?**
   Compromising a package/dependency used by many projects (e.g., SolarWinds, XZ Utils). Mitigate with dependency pinning, SBOM, and signing.

### Resume Keywords
`OWASP Top 10` · `JWT` · `CORS` · `Secrets Management` · `K8s Secrets` · `Input Validation` · `Parameterized Queries` · `Least Privilege` · `TLS` · `Dependency Scanning`

---

## 21. Cloud-Native Architecture

### Summary
Cloud-native means designing applications to fully exploit elastic, managed cloud infrastructure: containers, orchestration, managed services, and automation.

### 12-Factor App Principles (most relevant)

| Factor | Description |
|---|---|
| **Config via environment** | No hardcoded config; use env vars. |
| **Stateless processes** | No in-process session state; use Redis/DB. |
| **Disposability** | Fast startup/shutdown; handle SIGTERM gracefully. |
| **Dev/prod parity** | Same container image across all environments. |
| **Logs as streams** | Write to stdout; infrastructure aggregates. |

### Why It's Used
- Containers package the app with its dependencies — eliminates "works on my machine."
- Kubernetes provides self-healing, auto-scaling, and rolling updates out of the box.
- Managed services (RDS, Elasticache, SQS) eliminate operational overhead.
- GitOps + IaC ensures reproducible environments.

### In Axiom
- **Docker**: 100+ `Dockerfile`s across services; `AxiomMCPServer/Dockerfile`, worker Dockerfiles.
- **Kubernetes**: deployments, services, ingress, HPA in `AxiomMCPServer/DevOps/Environment/prod/kubernates/`.
- **Helm Charts**: `Cloud/Infra/Kubernetes/helm/` for parameterized multi-environment deployment.
- **Kustomize**: `Cloud/Infra/Kubernetes/kustomization/` for base + overlay pattern.
- **AWS ECR**: Docker images pushed to ECR on merge via GitHub Actions.
- **AWS Lambda**: `Cloud/AwsLambda/` for serverless functions.
- **HPA**: auto-scales pods based on CPU/memory, enabling elastic scaling.

### Real-World Examples
- Netflix: all 700+ microservices containerized on AWS; autoscaled based on streaming demand.
- 12-Factor apps: Heroku pioneered the pattern; Kubernetes + Helm is the modern implementation.

### Interview Questions
1. **What is the difference between a container and a VM?**
   Containers share the host OS kernel (lightweight, fast startup); VMs include a full guest OS (more isolation, more overhead).

2. **What is a Kubernetes Deployment vs. a Pod?**
   Deployment manages desired state (replica count, rolling updates); Pod is the actual running instance.

3. **What is the difference between Helm and Kustomize?**
   Helm: templating engine with package management (charts). Kustomize: patch-based overlays without templates. Often used together.

### Resume Keywords
`Kubernetes` · `Docker` · `Helm` · `Kustomize` · `HPA` · `AWS ECR` · `AWS Lambda` · `12-Factor App` · `Container Orchestration` · `Cloud-Native` · `IaC`

---

## 22. CI/CD & Deployment Strategies

### Summary
CI/CD automates building, testing, and deploying code, reducing manual steps and enabling frequent, reliable releases.

### Deployment Strategies

| Strategy | How | Trade-off |
|---|---|---|
| **Rolling Update** | Gradually replace old pods with new | Zero downtime; mixed versions briefly |
| **Blue-Green** | Switch traffic from old (blue) to new (green) all at once | Instant rollback; 2× infra cost |
| **Canary** | Route X% of traffic to new version first | Fine-grained rollout; needs feature flags |
| **Feature Flags** | Deploy code disabled; enable per-user | Decouple deploy from release |

### CI Pipeline Stages
```
Code Push → Compile → Lint → Unit Tests → Security Scan → Build Artifact
                                                                   ↓
                                    Deploy to Dev → Integration Tests → Deploy to Staging
                                                                               ↓
                                                             Smoke Test → Deploy to Production
                                                                               ↓
                                                                    Monitor → Rollback if needed
```

### In Axiom
- **GitHub Actions workflows**:
  - `.github/workflows/v2-pr-build.yml` — validates every PR (compile, lint, test).
  - `.github/workflows/v2-dev-build-and-deploy.yml` — auto-deploys dev branch to dev environment.
  - `.github/workflows/v2-prod-build-and-deploy.yml` — production pipeline (builds image → pushes to ECR → Kubernetes rolling update).
  - `.github/workflows/validate-user-guide.yml` — lints and builds UserGuide on every PR.
- **Legacy Jenkins** (`jenkinsaps-sd.qualcomm.com`) — compiles .NET PRs (legacy `Axiom.sln`).
- **ECR + K8s**: images pushed to AWS ECR, Kubernetes rolling update pulls new image.

### Real-World Examples
- GitHub itself: deploys to production 50+ times per day via canary releases.
- Netflix Spinnaker: orchestrates canary deployments across 100,000+ instances.
- Axiom: PR → Jenkins compile → GitHub Actions → ECR push → K8s rolling update.

### Interview Questions
1. **What is the difference between continuous delivery and continuous deployment?**
   Continuous Delivery: code is always deployable; deployment is a manual gate. Continuous Deployment: every passing build is auto-deployed to production.

2. **How do you roll back a bad deployment?**
   Kubernetes: `kubectl rollout undo deployment/name` reverts to previous ReplicaSet. Blue-green: flip DNS/load balancer back to blue instantly.

3. **What belongs in a CI pipeline vs. a CD pipeline?**
   CI: compile, lint, unit tests, security scan, build artifact. CD: integration tests, deploy to staging, smoke test, deploy to prod, monitor.

### Resume Keywords
`GitHub Actions` · `Jenkins` · `CI/CD` · `Rolling Update` · `Blue-Green Deployment` · `Canary Release` · `Kubernetes Rollout` · `AWS ECR` · `Helm` · `Feature Flags` · `Automated Testing`

---

## Quick Reference: Axiom at a Glance

| Topic | Axiom Technology | Key File / Component |
|---|---|---|
| Rate Limiting | Custom throttling log | `PublicApiThrottlingLog` DbSet |
| WebSockets | ASP.NET Core SignalR | `ReportMessageHub.cs` |
| Microservices | Multiple .sln files | `Axiom.Api.sln`, `Axiom.Utils.sln`, etc. |
| MCP | .NET + Python MCP servers | `AxiomMCPServer/`, `axiom_mcp_server.py` |
| Message Queues | RabbitMQ + SQS | `RabbitMqPublisher.cs`, `SqsQueueConfig.cs` |
| Caching | Redis (StackExchange.Redis) | `RedisClient.cs`, `RedisCacheService.cs` |
| Auth | JWT + MSAL + OAuth2 | `Program.cs`, `Oauth.cs` |
| API Gateway | Nginx + K8s Ingress | Nginx Ansible playbooks, `ingress.yaml` |
| Service Discovery | Kubernetes Services | `service.yaml` |
| Load Balancing | Nginx + K8s HPA | `hpa.yaml` |
| Distributed Txns | Saga + Task Orchestrator | `SagaTeam.cs`, `TaskOrchestrator/` |
| Idempotency | Idempotent RMQ consumers | `AxiomEventConsumer.cs` |
| Circuit Breaker | Polly | `HttpClientExtensions.cs` |
| Retry + DLQ | RabbitMQ DLQ + SQS Redrive | `RMQQueueConfig.cs` |
| Observability | OpenTelemetry + Serilog | `AxiomTelemetryServiceCollectionExtensions.cs` |
| Distributed Lock | Redis (infrastructure in place) | `RedisClient.cs` |
| DB Design | EF Core + 100+ DbSets | `Axiom.cs`, `Migrations/` |
| Concurrency | EF Execution Strategy | `AxiomExecutionStrategy.cs` |
| Event Sourcing | Event-driven via RabbitMQ | `AxiomEventConsumer.cs` |
| Security | CORS + JWT + K8s Secrets | `Program.cs`, K8s manifests |
| Cloud-Native | Docker + K8s + AWS | `Dockerfile`, `deployment.yaml`, ECR |
| CI/CD | GitHub Actions + Jenkins | `.github/workflows/`, Jenkins files |


