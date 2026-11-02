# Spec Delta

## ADDED Requirements

### Requirement: Register page
The `/register` page SHALL validate email, name and password with `RegisterRequestSchema`, call `POST /api/v1/auth/register`, then sign the user in and open the project list.

#### Scenario: Successful registration
- **WHEN** a visitor submits a valid email, name and password
- **THEN** the register and login calls succeed and the project list is shown

#### Scenario: Invalid input is rejected before submit
- **WHEN** the visitor submits an invalid email, a password shorter than 8 characters or an empty name
- **THEN** field errors are shown and no request is sent

#### Scenario: Duplicate email
- **WHEN** the API answers 409 for an existing email
- **THEN** the page shows "An account with this email already exists" and keeps the entered values

### Requirement: Login page
The `/login` page SHALL validate with `LoginRequestSchema`, call `POST /api/v1/auth/login`, keep the access token in memory and open the project list, or the page the user originally requested.

#### Scenario: Successful login
- **WHEN** a user submits correct credentials
- **THEN** the token is stored in memory and the project list is shown

#### Scenario: Wrong credentials
- **WHEN** the API answers 401
- **THEN** the page shows "Invalid email or password", clears the password field and the user stays on the login page

#### Scenario: Empty form is rejected before submit
- **WHEN** the user submits an empty email or password
- **THEN** field errors are shown and no request is sent

### Requirement: Logout
A signed-in user SHALL be able to log out from the layout. Logout SHALL call `POST /api/v1/auth/logout`, clear the in-memory token and cached data, and show the login page.

#### Scenario: Logout clears the session
- **WHEN** the user chooses "Log out"
- **THEN** the logout call is made, the login page is shown and opening `/projects` redirects to login again

#### Scenario: Logout call fails
- **WHEN** the logout call fails with a network error
- **THEN** the local session is still cleared and the login page is shown
