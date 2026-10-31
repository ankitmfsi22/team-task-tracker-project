# user-auth Specification

## Purpose

Defines user registration, login, refresh-token rotation, logout and access-token protection for the REST API, with the shared request and response contracts and the OpenAPI 3.1 document for the auth routes.

## Requirements

### Requirement: User registration
`POST /api/v1/auth/register` SHALL create a user from a valid email, name and password and return 201 with the user (id, email, name) and no password data.

#### Scenario: Successful registration
- **WHEN** a client posts a valid email, name and password to register
- **THEN** the response is 201 with the user's id, email and name, and no password or hash field

#### Scenario: Invalid input is rejected
- **WHEN** a client posts an invalid email, a password shorter than 8 characters, or a missing name
- **THEN** the response is 400 with `{ "error": { "code": "VALIDATION_ERROR", "message", "details" } }` and no user is created

#### Scenario: Duplicate email is rejected
- **WHEN** a client registers an email that already exists, in any letter case
- **THEN** the response is 409 with an error body and the existing user is unchanged

### Requirement: Passwords are stored hashed only
The system SHALL store passwords only as argon2id hashes, and SHALL NOT return or log a password or hash.

#### Scenario: Stored value is an argon2id hash
- **WHEN** a user registers and the database row is inspected
- **THEN** the stored value starts with `$argon2id$` and does not contain the password

#### Scenario: Secrets never appear in output
- **WHEN** register, login and error responses and the log output of a failed login are inspected
- **THEN** none contains the password, a password hash or a refresh token value

### Requirement: Login issues tokens
`POST /api/v1/auth/login` SHALL return 200 with a 15-minute access token in the body and set a 7-day refresh token in an httpOnly, Secure, SameSite cookie.

#### Scenario: Successful login
- **WHEN** a registered user posts the correct email and password
- **THEN** the response is 200 with `accessToken` in the body, a `Set-Cookie` header carries the refresh token marked HttpOnly, Secure and SameSite, and the body does not contain the refresh token

#### Scenario: Wrong credentials give one generic error
- **WHEN** a client logs in with an unknown email, or with a known email and a wrong password
- **THEN** both responses are 401 with the same code and message, which does not say which field was wrong

#### Scenario: Invalid login input
- **WHEN** a client posts a login body with a missing password or malformed email
- **THEN** the response is 400 with `VALIDATION_ERROR`

### Requirement: Refresh rotates the token
`POST /api/v1/auth/refresh` SHALL accept a valid refresh cookie, return a new access token, set a new refresh cookie and revoke the presented token.

#### Scenario: Successful rotation
- **WHEN** a client posts a valid, unexpired, unrevoked refresh cookie
- **THEN** the response is 200 with a new `accessToken`, the new refresh cookie differs from the old one, and the old token is marked revoked

#### Scenario: Reused revoked token is rejected
- **WHEN** a client presents a refresh token that was already rotated or revoked by logout
- **THEN** the response is 401 and no new token is issued

#### Scenario: Invalid, expired or missing token is rejected
- **WHEN** a client posts no cookie, a malformed or wrongly signed token, or an expired token
- **THEN** the response is 401 with an error body

### Requirement: Refresh tokens are stored hashed
The system SHALL store only a hash of each refresh token, with its expiry and revocation time, and SHALL NOT store the token itself.

#### Scenario: Only a hash is stored
- **WHEN** a user logs in and the refresh token row is inspected
- **THEN** the row holds a hash that differs from the cookie value, an expiry about 7 days ahead and a null revocation time

### Requirement: Logout revokes the refresh token
`POST /api/v1/auth/logout` SHALL revoke the presented refresh token, clear the cookie and return 204, and SHALL return 204 when no valid token is presented.

#### Scenario: Logout revokes the token
- **WHEN** a logged-in client posts logout with its refresh cookie and then tries to refresh with the same token
- **THEN** logout returns 204 and clears the cookie, and the refresh attempt returns 401

#### Scenario: Logout without a valid token
- **WHEN** a client posts logout with no cookie or an invalid token
- **THEN** the response is 204 and no token is revoked

### Requirement: Protected endpoints require a valid access token
`GET /api/v1/auth/me` and every future protected endpoint SHALL return 401 when the access token is missing, invalid or expired, and SHALL return the caller's user when it is valid.

#### Scenario: Valid access token
- **WHEN** a client calls `me` with a valid `Authorization: Bearer` access token
- **THEN** the response is 200 with the caller's id, email and name

#### Scenario: Missing, invalid or expired access token
- **WHEN** a client calls `me` with no token, a malformed token, a token signed with the wrong secret, or an expired token
- **THEN** the response is 401 with `{ "error": { "code", "message" } }`

#### Scenario: Refresh token is not an access token
- **WHEN** a client presents a refresh token as a Bearer access token
- **THEN** the response is 401

### Requirement: Separate signing secrets from the environment
The system SHALL sign access and refresh tokens with two different secrets read from environment variables, and SHALL fail to start when either is missing.

#### Scenario: Missing secret
- **WHEN** the app is started without a JWT secret variable
- **THEN** startup fails with an error naming the missing variable and no default secret is used

### Requirement: Shared contracts and OpenAPI document
The request, response and error schemas for the auth routes SHALL live in `packages/shared`, and an OpenAPI 3.1 document for these routes SHALL be generated from them and served at `GET /api/v1/openapi.json`.

#### Scenario: Document matches the schemas
- **WHEN** the OpenAPI document is generated
- **THEN** its `openapi` field starts with `3.1`, it lists the five auth paths under `/api/v1`, and each request body schema equals the JSON Schema produced from the shared Zod schema

#### Scenario: Document is served
- **WHEN** a client requests `GET /api/v1/openapi.json`
- **THEN** the response is 200 with the same document

### Requirement: Unknown routes use the error shape
The API SHALL answer unknown paths and unexpected failures with the standard error shape and no stack trace.

#### Scenario: Unknown route
- **WHEN** a client requests a path that does not exist
- **THEN** the response is 404 with `{ "error": { "code": "NOT_FOUND", "message" } }`

#### Scenario: Unexpected failure
- **WHEN** a service throws an unexpected error
- **THEN** the response is 500 with code `INTERNAL_ERROR`, a generic message and no stack trace or internal detail
