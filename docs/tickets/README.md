# Ticket mapping

Assignment IDs (DEV-10XX) are used in branches and commits; Linear keys are the tracker IDs.

"Blocked by" lists the relations set in Linear. API-contract dependencies (DEV-1008, DEV-1011, DEV-1012) are not Linear relations; they are kept in the ticket descriptions ("after approved API contract") so the tickets stay `[PARALLEL]`.

| Assignment ID | Linear key | Blocked by (Linear) | Title | URL |
| --- | --- | --- | --- | --- |
| DEV-1001 | DEV-5 | none | Project setup — monorepo, Docker Compose, Prisma, OpenSpec, project instructions and quality checks | https://linear.app/team-tasktracker/issue/DEV-5/dev-1001-project-setup-monorepo-docker-compose-prisma-openspec-project |
| DEV-1002 | DEV-6 | DEV-5 | Claude Code setup — skills, hooks, permissions and project instructions | https://linear.app/team-tasktracker/issue/DEV-6/dev-1002-claude-code-setup-skills-hooks-permissions-and-project |
| DEV-1003 | DEV-7 | DEV-6 | Autonomous agents — implementation, testing, independent review and coordination | https://linear.app/team-tasktracker/issue/DEV-7/dev-1003-autonomous-agents-implementation-testing-independent-review |
| DEV-1004 | DEV-8 | DEV-6 | MCP — Context7 and issue-tracker integration, permissions and failure handling | https://linear.app/team-tasktracker/issue/DEV-8/dev-1004-mcp-context7-and-issue-tracker-integration-permissions-and |
| DEV-1005 | DEV-9 | DEV-7, DEV-8 | OpenSpec workflow — ticket-to-change traceability, approval gates, verification and archival | https://linear.app/team-tasktracker/issue/DEV-9/dev-1005-openspec-workflow-ticket-to-change-traceability-approval |
| DEV-1006 | DEV-10 | DEV-9 | Authentication — registration, login, logout and token handling | https://linear.app/team-tasktracker/issue/DEV-10/dev-1006-authentication-registration-login-logout-and-token-handling |
| DEV-1007 | DEV-11 | DEV-10 | Projects — CRUD, membership and access control | https://linear.app/team-tasktracker/issue/DEV-11/dev-1007-projects-crud-membership-and-access-control-parallel-after |
| DEV-1008 | DEV-12 | DEV-10 | Tasks — CRUD, assignment, status, priority and deadlines | https://linear.app/team-tasktracker/issue/DEV-12/dev-1008-tasks-crud-assignment-status-priority-and-deadlines-parallel |
| DEV-1009 | DEV-13 | DEV-12 | Task filtering — pagination, sorting and filtering | https://linear.app/team-tasktracker/issue/DEV-13/dev-1009-task-filtering-pagination-sorting-and-filtering |
| DEV-1010 | DEV-14 | DEV-12 | Comments and activity history | https://linear.app/team-tasktracker/issue/DEV-14/dev-1010-comments-and-activity-history |
| DEV-1011 | DEV-15 | DEV-10 | Frontend — authentication and project pages | https://linear.app/team-tasktracker/issue/DEV-15/dev-1011-frontend-authentication-and-project-pages-parallel-after-api |
| DEV-1012 | DEV-16 | DEV-12 | Frontend — task list, filters and detail pages | https://linear.app/team-tasktracker/issue/DEV-16/dev-1012-frontend-task-list-filters-and-detail-pages-parallel-after |
| DEV-1013 | DEV-17 | DEV-14, DEV-16 | Frontend — comments, activity history and task editing | https://linear.app/team-tasktracker/issue/DEV-17/dev-1013-frontend-comments-activity-history-and-task-editing |
| DEV-1014 | DEV-18 | DEV-9 | Git worktrees — parallel development, integration and conflict resolution | https://linear.app/team-tasktracker/issue/DEV-18/dev-1014-git-worktrees-parallel-development-integration-and-conflict |
| DEV-1015 | DEV-19 | DEV-10 | Codebase graph setup — Code Review Graph and Graphify, generation, queries and token-efficiency evaluation | https://linear.app/team-tasktracker/issue/DEV-19/dev-1015-codebase-graph-setup-code-review-graph-and-graphify |
| DEV-1016 | DEV-20 | DEV-17 | Testing — unit, integration, authorization, regression and end-to-end tests | https://linear.app/team-tasktracker/issue/DEV-20/dev-1016-testing-unit-integration-authorization-regression-and-end-to |
| DEV-1017 | DEV-21 | DEV-20 | Independent review — specification compliance, security, graph-assisted impact analysis and test coverage | https://linear.app/team-tasktracker/issue/DEV-21/dev-1017-independent-review-specification-compliance-security-graph |
| DEV-1018 | DEV-22 | DEV-21 | Final integration — end-to-end user journey, issue-to-PR traceability and workflow demonstration | https://linear.app/team-tasktracker/issue/DEV-22/dev-1018-final-integration-end-to-end-user-journey-issue-to |
