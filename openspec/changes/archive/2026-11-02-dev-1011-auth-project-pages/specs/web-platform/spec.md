# Spec Delta

## ADDED Requirements

### Requirement: Typed API client with error shape
The frontend SHALL call the API only through a client that uses relative `/api/v1` paths, validates responses with the schemas from `packages/shared`, and turns error responses into an `ApiError` carrying status, code, message and details.

#### Scenario: Success response is validated
- **WHEN** the client receives a 200 body that matches the shared response schema
- **THEN** it returns the parsed value

#### Scenario: Error response is parsed
- **WHEN** the API answers 400 with `{ "error": { "code": "VALIDATION_ERROR", "message", "details" } }`
- **THEN** the client throws an `ApiError` with status 400, that code, message and details

#### Scenario: Malformed response is rejected
- **WHEN** a 200 body does not match the shared response schema
- **THEN** the client throws an error and returns no data

### Requirement: Access token in memory and refresh once on 401
The access token SHALL be held in memory only, never in localStorage, sessionStorage or a cookie written by the frontend. When a request returns 401 the client SHALL call `POST /api/v1/auth/refresh` once, retry the request once with the new token, and on refresh failure SHALL clear the session. Concurrent 401 responses SHALL share one refresh call.

#### Scenario: 401 triggers one refresh and a retry
- **WHEN** a protected request returns 401 and the refresh call succeeds
- **THEN** the original request is retried once with the new token and its result is returned

#### Scenario: Refresh failure ends the session
- **WHEN** a protected request returns 401 and the refresh call also fails
- **THEN** the token is cleared, the user is signed out and the original request is not retried again

#### Scenario: Retry that still fails does not loop
- **WHEN** the retried request returns 401 again
- **THEN** no further refresh is attempted and the error is thrown

#### Scenario: Token is never persisted
- **WHEN** a user logs in
- **THEN** the access token is not written to localStorage or sessionStorage

### Requirement: Session restore on load
On application load the frontend SHALL attempt to restore the session through `POST /api/v1/auth/refresh` and `GET /api/v1/auth/me`, showing a loading state until the result is known.

#### Scenario: Valid refresh cookie restores the session
- **WHEN** the app loads and the refresh call succeeds
- **THEN** the user is authenticated and the protected page is shown

#### Scenario: No valid cookie
- **WHEN** the app loads and the refresh call returns 401
- **THEN** the user is anonymous and no error is shown

### Requirement: Protected routes
Protected routes SHALL redirect unauthenticated users to `/login`, and `/login` and `/register` SHALL redirect authenticated users to `/projects`.

#### Scenario: Unauthenticated user is redirected
- **WHEN** an anonymous user opens `/projects`
- **THEN** the app shows the login page

#### Scenario: Loading state while the session is restored
- **WHEN** the session check is still running
- **THEN** a loading state is shown and no redirect happens yet

#### Scenario: Authenticated user skips login
- **WHEN** an authenticated user opens `/login`
- **THEN** the app shows the project list

### Requirement: Loading, empty and error states
Every data view SHALL show a loading state while fetching, an empty state when there is no data, and an error state for failures, with distinct messages for 403 and 404 and a retry action for network failures.

#### Scenario: Forbidden and not found are distinct
- **WHEN** a query fails with 403, then with 404
- **THEN** the view shows "You do not have permission" for 403 and "Not found" for 404

#### Scenario: Network failure can be retried
- **WHEN** a query fails with a network error
- **THEN** the view shows an error with a retry action that refetches

### Requirement: Same-origin proxy for development and preview
The Vite dev server and preview server SHALL proxy `/api` to the backend, so the page and the API share an origin.

#### Scenario: Proxy is configured for both servers
- **WHEN** the Vite configuration is loaded
- **THEN** `server.proxy` and `preview.proxy` both contain an `/api` entry targeting the backend URL

### Requirement: Lighthouse gate on the production build
`pnpm lighthouse` SHALL build the frontend, serve it with `vite preview`, audit the login and project list pages and print the Performance, Accessibility, Best Practices and SEO scores for each. It SHALL exit 0 only when every score is at least 95.

#### Scenario: Scores at or above threshold
- **WHEN** every category score of every audited page is 95 or higher
- **THEN** the command prints the scores and exits 0

#### Scenario: A score below threshold fails
- **WHEN** any category score is below 95
- **THEN** the command names the page and category and exits non-zero

#### Scenario: No browser available
- **WHEN** no Chrome, Edge or `CHROME_PATH` browser can be found
- **THEN** the command prints a message explaining how to set `CHROME_PATH` and exits non-zero
