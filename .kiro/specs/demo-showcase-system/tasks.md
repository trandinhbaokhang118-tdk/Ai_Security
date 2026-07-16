# Implementation Plan: Demo/Showcase System

**Spec ID:** 28d10bcb-e2df-4888-8e96-0ecbd18102b7  
**Design:** design.md  
**Requirements:** requirements.md

---

## Overview

This implementation plan breaks down the Demo/Showcase System into 40 discrete tasks organized into 4 phases over 4 weeks. Each task includes estimates, dependencies, and clear acceptance criteria.

---

## Tasks

- [ ] 1. Create Backend Demo Module Structure
  - **Estimate:** 1 hour
  - **Priority:** High
  - **Dependencies:** None
  - **Description:** Create the `backend/demo/` module with all necessary files and basic structure
  - **Files:** backend/demo/__init__.py, backend/demo/routes.py, backend/demo/models.py, backend/demo/metrics.py, backend/demo/simulator.py, backend/demo/sandbox.py, backend/demo/websocket.py

- [ ] 2. Implement Data Models
  - **Estimate:** 2 hours
  - **Priority:** High
  - **Dependencies:** 1
  - **Description:** Implement all Pydantic data models for request/response schemas including URLAnalysisRequest, URLAnalysisResponse, ChatMessageRequest, ChatMessageResponse, SimulateAttackRequest, SimulateAttackResponse, MetricsResponse, Evidence, SandboxReport, TraditionalDetection, and AIDetection
  - **Files:** backend/demo/models.py

- [ ] 3. Implement Metrics Aggregator
  - **Estimate:** 3 hours
  - **Priority:** High
  - **Dependencies:** 2
  - **Description:** Implement MetricsAggregator class with AttackMetrics and SessionMetrics dataclasses, record_attack() and get_metrics() methods, calculate block_rate, success_rate, and improvement_percentage
  - **Files:** backend/demo/metrics.py
  - **Tests:** tests/backend/demo/test_metrics.py

- [ ] 4. Implement Attack Simulator
  - **Estimate:** 4 hours
  - **Priority:** High
  - **Dependencies:** 2
  - **Description:** Implement AttackSimulator class with URL_PATTERNS and PROMPT_PATTERNS dicts (basic, advanced, sophisticated levels), generate_url_attacks() and generate_prompt_attacks() methods, include typosquatting, homoglyphs, instruction override patterns
  - **Files:** backend/demo/simulator.py
  - **Tests:** tests/backend/demo/test_simulator.py

- [ ] 5. Implement URL Analysis Endpoint
  - **Estimate:** 4 hours
  - **Priority:** High
  - **Dependencies:** 2, 3, 4
  - **Description:** Implement POST /v1/demo/url/analyze endpoint with URL validation, call InferenceEngine.predict_url(), map risk_score to threat_level, build traditional_detection and ai_detection, record metrics, return URLAnalysisResponse, target <3s response time
  - **Files:** backend/demo/routes.py
  - **Tests:** tests/backend/demo/test_routes.py::test_analyze_url

- [ ] 6. Implement Chat Message Endpoint
  - **Estimate:** 3 hours
  - **Priority:** High
  - **Dependencies:** 2, 3
  - **Description:** Implement POST /v1/demo/chat/message endpoint, check protection_enabled flag, call InferenceEngine.predict_prompt() when enabled, block if risk_score >= 0.5, generate chatbot response, record metrics, target <100ms response time
  - **Files:** backend/demo/routes.py
  - **Tests:** tests/backend/demo/test_routes.py::test_chat_message

- [ ] 7. Implement Attack Simulation Endpoint
  - **Estimate:** 4 hours
  - **Priority:** High
  - **Dependencies:** 2, 3, 4, 5, 6
  - **Description:** Implement POST /v1/demo/simulate/attack endpoint, accept scenario/attack_type/count/protection_enabled params, generate attacks using AttackSimulator, process asynchronously in background, broadcast via WebSocket, return 202 Accepted with simulation_id, target 10+ attacks/second
  - **Files:** backend/demo/routes.py
  - **Tests:** tests/backend/demo/test_routes.py::test_simulate_attack

- [ ] 8. Implement Metrics Endpoint
  - **Estimate:** 2 hours
  - **Priority:** Medium
  - **Dependencies:** 3
  - **Description:** Implement GET /v1/demo/metrics endpoint with session_id and protection_state query params, return MetricsResponse with protection_on/off data and improvement_percentage, return 404 if session not found, target <100ms response time
  - **Files:** backend/demo/routes.py
  - **Tests:** tests/backend/demo/test_routes.py::test_get_metrics

- [ ] 9. Implement WebSocket Connection
  - **Estimate:** 3 hours
  - **Priority:** High
  - **Dependencies:** 2
  - **Description:** Implement WebSocket endpoint /v1/demo/ws/{session_id}, create ConnectionManager class with connect(), disconnect(), broadcast_attack_event(), and broadcast_metrics_update() methods, handle WebSocketDisconnect, support multiple clients per session, target <50ms latency
  - **Files:** backend/demo/websocket.py, backend/demo/routes.py
  - **Tests:** tests/backend/demo/test_websocket.py

- [ ] 10. Integrate Demo Router into Main App
  - **Estimate:** 1 hour
  - **Priority:** High
  - **Dependencies:** 5, 6, 7, 8, 9
  - **Description:** Import demo router in backend/main.py, add app.include_router() with prefix /v1/demo and tags, verify endpoints accessible, update API docs
  - **Files:** backend/main.py

- [ ] 11. Create Frontend Demo Page Structure
  - **Estimate:** 2 hours
  - **Priority:** High
  - **Dependencies:** None
  - **Description:** Create frontend/web/app/demo/ directory, page.tsx with basic layout, components/ and hooks/ directories, types.ts, add demo link to navigation
  - **Files:** frontend/web/app/demo/page.tsx, frontend/web/app/demo/types.ts, frontend/web/app/demo/components/.gitkeep, frontend/web/app/demo/hooks/.gitkeep, frontend/web/app/layout.tsx

- [ ] 12. Define TypeScript Types
  - **Estimate:** 1 hour
  - **Priority:** High
  - **Dependencies:** 11
  - **Description:** Define TypeScript interfaces matching all backend models: URLAnalysisRequest, URLAnalysisResponse, ChatMessageRequest, ChatMessageResponse, SimulateAttackRequest, SimulateAttackResponse, MetricsResponse, Evidence, SandboxReport, WebSocketMessage
  - **Files:** frontend/web/app/demo/types.ts

- [ ] 13. Implement WebSocket Hook
  - **Estimate:** 3 hours
  - **Priority:** High
  - **Dependencies:** 12
  - **Description:** Create useWebSocket hook accepting sessionId and options, establish connection on mount, handle events (onopen, onmessage, onerror, onclose), parse JSON messages, return isConnected and sendMessage, clean up on unmount, optional auto-reconnect
  - **Files:** frontend/web/app/demo/hooks/useWebSocket.ts

- [ ] 14. Implement Metrics Hook
  - **Estimate:** 2 hours
  - **Priority:** High
  - **Dependencies:** 12, 13
  - **Description:** Create useMetrics hook accepting sessionId, fetch initial metrics from GET /v1/demo/metrics, subscribe to WebSocket metrics_update events, update local state on messages, return metrics and isLoading, handle errors, refresh on sessionId change
  - **Files:** frontend/web/app/demo/hooks/useMetrics.ts

- [ ] 15. Implement Session Hook
  - **Estimate:** 1 hour
  - **Priority:** Medium
  - **Dependencies:** 12
  - **Description:** Create useDemoSession hook generating sessionId on mount, store in component state, provide resetSession() function, optional sessionStorage persistence, return sessionId and resetSession
  - **Files:** frontend/web/app/demo/hooks/useDemoSession.ts

- [ ] 16. Implement Protection Toggle Component
  - **Estimate:** 2 hours
  - **Priority:** High
  - **Dependencies:** 12
  - **Description:** Create ProtectionToggle button showing "PROTECTION ON" (green/Shield) or "PROTECTION OFF" (red/ShieldOff), onClick toggles within 100ms, visual feedback with animations, disabled during transition, accessible with keyboard/ARIA
  - **Files:** frontend/web/app/demo/components/ProtectionToggle.tsx

- [ ] 17. Implement Metrics Dashboard Component
  - **Estimate:** 4 hours
  - **Priority:** High
  - **Dependencies:** 12, 14
  - **Description:** Create MetricsDashboard with 4-card grid layout (status, success rate, blocked count, improvement), status shows PROTECTED/VULNERABLE with colors, color-coded success rate (red>50%, yellow 20-50%, green<20%), real-time WebSocket updates, loading state, responsive
  - **Files:** frontend/web/app/demo/components/MetricsDashboard.tsx

- [ ] 18. Implement URL Analysis Tab
  - **Estimate:** 5 hours
  - **Priority:** High
  - **Dependencies:** 12, 13
  - **Description:** Create URLAnalysisTab with URL input validation, "Analyze URL" button, "Enable Deep Analysis" checkbox, POST to /v1/demo/url/analyze, display threat report with risk score/level/evidence, show traditional vs AI comparison, sandbox report if available, color-coded threat levels, loading/error states
  - **Files:** frontend/web/app/demo/components/URLAnalysisTab.tsx, frontend/web/app/demo/components/ThreatReport.tsx

- [ ] 19. Implement Chatbot Protection Tab
  - **Estimate:** 5 hours
  - **Priority:** High
  - **Dependencies:** 12, 13
  - **Description:** Create ChatbotProtectionTab with chat interface, message history, input field and send button, POST to /v1/demo/chat/message, display user/bot messages, show "BLOCKED ATTACK" when detected with protection on, color-coded messages (blocked=red, safe=green), attack examples dropdown, clear chat button, auto-scroll
  - **Files:** frontend/web/app/demo/components/ChatbotProtectionTab.tsx

- [ ] 20. Implement Main Demo Page
  - **Estimate:** 3 hours
  - **Priority:** High
  - **Dependencies:** 15, 16, 17, 18, 19
  - **Description:** Assemble components into main page with header (title, toggle), metrics dashboard always visible, tabbed interface (URL/Chatbot), reset button, session management via useDemoSession, metrics via useMetrics, shared protection state, responsive layout, dark theme with gradient background
  - **Files:** frontend/web/app/demo/page.tsx

- [ ] 21. Create Sandbox Analysis Script
  - **Estimate:** 4 hours
  - **Priority:** High
  - **Dependencies:** None
  - **Description:** Create scripts/sandbox/analyze.py accepting URL as CLI arg, use Selenium with headless Chrome, capture redirects/scripts/network calls/cookies, detect suspicious behaviors (multiple redirects, excessive scripts), output JSON to stdout, handle errors, 25s timeout
  - **Files:** scripts/sandbox/analyze.py
  - **Tests:** tests/sandbox/test_analyze.py

- [ ] 22. Create Sandbox Dockerfile
  - **Estimate:** 2 hours
  - **Priority:** High
  - **Dependencies:** 21
  - **Description:** Create Dockerfile.sandbox with python:3.11-slim base, install Chrome stable and Selenium, copy analyze.py to /sandbox/, set CMD to run python analyze.py, optimize for <500MB image size
  - **Files:** Dockerfile.sandbox

- [ ] 23. Implement Sandbox Runner
  - **Estimate:** 5 hours
  - **Priority:** High
  - **Dependencies:** 21, 22
  - **Description:** Implement SandboxRunner class with docker_client setup, analyze_url() method spawning container with resource limits (512MB RAM, 50% CPU), security options (no-new-privileges, read-only), bridge network, 30s timeout, parse JSON output, build SandboxReport, always remove container, handle errors
  - **Files:** backend/demo/sandbox.py
  - **Tests:** tests/backend/demo/test_sandbox.py

- [ ] 24. Update URL Analysis Endpoint with Sandbox
  - **Estimate:** 2 hours
  - **Priority:** High
  - **Dependencies:** 5, 23
  - **Description:** Integrate sandbox analysis into URL endpoint when deep_analysis is True, call SandboxRunner.analyze_url(), merge sandbox report into response, handle errors gracefully with partial results, 30s timeout, target <35s total response time
  - **Files:** backend/demo/routes.py

- [ ] 25. Update docker-compose.yml
  - **Estimate:** 1 hour
  - **Priority:** Medium
  - **Dependencies:** 22
  - **Description:** Add sandbox service to docker-compose.yml building from Dockerfile.sandbox, set resource limits (mem_limit: 512m, cpus: 0.5), security options (no-new-privileges, cap_drop: ALL), mount docker socket, armor-net network, read-only filesystem with tmpfs /tmp
  - **Files:** docker-compose.yml

- [ ] 26. Build and Test Sandbox Container
  - **Estimate:** 2 hours
  - **Priority:** High
  - **Dependencies:** 21, 22, 25
  - **Description:** Build sandbox container with docker build, test with benign URL (example.com), redirect URL, JavaScript-heavy site, verify JSON output format, timeout handling, resource limits enforced, no errors in logs
  - **Commands:** docker build -f Dockerfile.sandbox -t armor-sandbox:latest ., docker run --rm armor-sandbox:latest python /sandbox/analyze.py https://example.com

- [ ] 27. Update URL Analysis Tab with Sandbox Reports
  - **Estimate:** 3 hours
  - **Priority:** High
  - **Dependencies:** 18, 24
  - **Description:** Display sandbox reports in URL tab when present, show behaviors list with icons, redirects, top 10 scripts, top 20 network calls, analysis time, collapsible sections, error message if failed, loading indicator during analysis
  - **Files:** frontend/web/app/demo/components/URLAnalysisTab.tsx, frontend/web/app/demo/components/ThreatReport.tsx

- [ ] 28. Implement Attack Simulator Component
  - **Estimate:** 4 hours
  - **Priority:** Medium
  - **Dependencies:** 7
  - **Description:** Create AttackSimulator UI with dropdowns for scenario (basic/advanced/mixed) and attack_type (url/prompt/mixed), slider for count (10-100), "Simulate Attack" button, POST to /v1/demo/simulate/attack, show progress bar, display simulation_id/started_at, listen to WebSocket for updates, completion message, disable during simulation
  - **Files:** frontend/web/app/demo/components/AttackSimulator.tsx, frontend/web/app/demo/components/URLAnalysisTab.tsx, frontend/web/app/demo/components/ChatbotProtectionTab.tsx

- [ ] 29. Implement Comparison View Component
  - **Estimate:** 3 hours
  - **Priority:** Medium
  - **Dependencies:** 14
  - **Description:** Create ComparisonView with two-column layout "WITHOUT PROTECTION" vs "WITH PROTECTION", display attack/blocked/success counts for each, show success/block rates, improvement percentage with arrow icon, color coding (red=vulnerable, green=protected), responsive (stack on mobile), only show when both states have data
  - **Files:** frontend/web/app/demo/components/ComparisonView.tsx, frontend/web/app/demo/page.tsx

- [ ] 30. Visual Refinements and Animations
  - **Estimate:** 4 hours
  - **Priority:** Low
  - **Dependencies:** 20, 28, 29
  - **Description:** Add smooth transitions on protection toggle (100ms), animated counters for metrics (count up), fade-in for new attacks, pulse effect on blocked attacks, gradient backgrounds/borders, hover effects, loading spinners with branding, toast notifications, consistent spacing/alignment, professional color palette
  - **Files:** All component files in frontend/web/app/demo/components/

- [ ] 31. Write Backend Unit Tests
  - **Estimate:** 6 hours
  - **Priority:** High
  - **Dependencies:** 3, 4, 5, 6, 7, 8, 9, 23
  - **Description:** Write comprehensive unit tests with 90%+ coverage for metrics, simulator, 80%+ for routes, websocket, sandbox (mock Docker), use pytest fixtures, mock InferenceEngine where needed
  - **Files:** tests/backend/demo/test_metrics.py, tests/backend/demo/test_simulator.py, tests/backend/demo/test_routes.py, tests/backend/demo/test_websocket.py, tests/backend/demo/test_sandbox.py

- [ ] 32. Write Frontend Unit Tests
  - **Estimate:** 4 hours
  - **Priority:** Medium
  - **Dependencies:** 13, 14, 15, 16, 17
  - **Description:** Write unit tests for useWebSocket (mock WebSocket), useMetrics (mock API), useDemoSession, ProtectionToggle, MetricsDashboard with mock data, use React Testing Library, target 70%+ coverage
  - **Files:** frontend/web/app/demo/__tests__/hooks/useWebSocket.test.ts, frontend/web/app/demo/__tests__/hooks/useMetrics.test.ts, frontend/web/app/demo/__tests__/components/ProtectionToggle.test.tsx, frontend/web/app/demo/__tests__/components/MetricsDashboard.test.tsx

- [ ] 33. Write Integration Tests
  - **Estimate:** 4 hours
  - **Priority:** High
  - **Dependencies:** 10, 20, 24
  - **Description:** Write integration tests for URL analysis flow (API + metrics + WebSocket), chat message flow, attack simulation flow, protection toggle affecting results, metrics calculation accuracy, use TestClient for FastAPI, test database/in-memory state
  - **Files:** tests/integration/test_demo_flows.py

- [ ] 34. Performance Optimization
  - **Estimate:** 3 hours
  - **Priority:** Medium
  - **Dependencies:** 10, 20, 24
  - **Description:** Optimize to meet targets: URL analysis (no sandbox) <500ms, with sandbox <5s, chat <100ms, toggle <50ms, metrics <100ms, WebSocket <50ms, 10+ attacks/second, profile with py-spy/cProfile, add caching where appropriate, optimize queries
  - **Files:** Various backend files based on profiling

- [ ] 35. Security Hardening
  - **Estimate:** 3 hours
  - **Priority:** High
  - **Dependencies:** 23
  - **Description:** Validate all URL inputs (no localhost/private IPs/file://), ensure sandbox fully isolated, enforce resource limits, read-only filesystem, drop unnecessary capabilities, add rate limiting on endpoints, configure CORS, no secrets in logs/responses, test with malicious inputs, security review
  - **Files:** backend/demo/routes.py, backend/demo/sandbox.py, docker-compose.yml

- [ ] 36. Documentation
  - **Estimate:** 3 hours
  - **Priority:** Medium
  - **Dependencies:** 35
  - **Description:** Write README for demo system, API documentation in OpenAPI/Swagger, user guide with screenshots, deployment instructions, troubleshooting guide, architecture diagrams, code comments for complex logic
  - **Files:** docs/DEMO_README.md, docs/DEMO_USER_GUIDE.md, docs/DEMO_API.md, README.md

- [ ] 37. End-to-End Testing and Demo Video
  - **Estimate:** 4 hours
  - **Priority:** High
  - **Dependencies:** 36
  - **Description:** Perform full E2E testing (URL + chatbot scenarios), verify protection toggle works, metrics update real-time, sandbox analysis works, attack simulation works, before/after comparison shows improvement, no console/log errors, record 5-minute demo video with annotations, upload to YouTube/internal
  - **Deliverables:** Demo video file, test results document

- [ ] 38. Phase 1 Review and Handoff
  - **Estimate:** 2 hours
  - **Priority:** High
  - **Dependencies:** 10
  - **Description:** Review backend implementation completeness, verify all Phase 1 acceptance criteria met, document any known issues/limitations, prepare handoff notes for frontend team
  - **Deliverables:** Phase 1 completion report

- [ ] 39. Phase 2 Review and Handoff
  - **Estimate:** 2 hours
  - **Priority:** High
  - **Dependencies:** 20
  - **Description:** Review frontend implementation completeness, verify all Phase 2 acceptance criteria met, cross-browser testing (Chrome, Firefox, Safari), mobile responsive testing, document any known issues
  - **Deliverables:** Phase 2 completion report

- [ ] 40. Final Deployment and Launch
  - **Estimate:** 3 hours
  - **Priority:** High
  - **Dependencies:** 37
  - **Description:** Deploy to staging environment, run smoke tests, deploy to production, configure monitoring/alerts, verify all features work in production, announce launch to stakeholders, prepare launch demo presentation
  - **Deliverables:** Production deployment checklist, launch announcement

---

## Notes

### Phase Organization
- **Phase 1 (Week 1):** Tasks 1-10 - Backend Foundation
- **Phase 2 (Week 2):** Tasks 11-20 - Frontend Core
- **Phase 3 (Week 3):** Tasks 21-27 - Sandbox Integration
- **Phase 4 (Week 4):** Tasks 28-40 - Polish & Testing

### Critical Path
Tasks 1→2→3→5→10→11→12→13→14→16→17→18→19→20→21→22→23→24→27→37→40 form the critical path for delivery.

### Testing Strategy
- Unit tests: Tasks 31, 32 (target 80%+ coverage)
- Integration tests: Task 33
- E2E tests: Task 37
- Security testing: Task 35

---

## Task Dependency Graph

```json
{
  "waves": [
    {
      "name": "Phase 1: Backend Foundation",
      "tasks": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    },
    {
      "name": "Phase 2: Frontend Core",
      "tasks": [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    },
    {
      "name": "Phase 3: Sandbox Integration",
      "tasks": [21, 22, 23, 24, 25, 26, 27]
    },
    {
      "name": "Phase 4: Polish & Testing",
      "tasks": [28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40]
    }
  ]
}
```

### Dependency Details

```
Phase 1 (Backend):
1 → 2 → 3 → 5 → 10
    2 → 4 → 5
    2 → 6 → 7
    2 → 8
    2 → 9 → 10

Phase 2 (Frontend):
11 → 12 → 13 → 18 → 20
     12 → 14 → 17 → 20
     12 → 15 → 20
     12 → 16 → 20
     13 → 19 → 20

Phase 3 (Sandbox):
21 → 22 → 23 → 24 → 27
     22 → 25 → 26

Phase 4 (Polish):
7 → 28
14 → 29
20 → 30
[1-9,23] → 31
[13-17] → 32
[10,20,24] → 33 → 34 → 35 → 36 → 37 → 40
```
