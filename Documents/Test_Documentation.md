# Unit Test Documentation

This document explains the purpose and functionality of the four unit tests currently implemented in the BuildRight Platform.

## 1. Frontend Tests (Vitest)

### A. `src/components/simple.test.jsx`

- **Type**: Sanity / Configuration Test.
- **Purpose**: To verify that the testing environment (Vitest) is correctly installed and working.
- **What it does**:
  - It performs a basic mathematical operation (`1 + 1`).
  - It asserts that the result is `2`.
- **Why it's important**: If this test fails, it means there is a fundamental issue with the testing tools themselves, not your code.

### B. `src/components/StatusBadge.test.jsx`

- **Type**: Component Unit Test.
- **Purpose**: To ensure the `StatusBadge` UI component displays the correct colors and text for different project statuses.
- **What it does**:
  - It renders the `<StatusBadge />` component with a specific status (e.g., `PLANNED`).
  - It checks if the text "Planned" is visible on the screen.
  - It verifies that the badge has the correct CSS classes (e.g., `bg-blue-100` for Planned, `bg-green-100` for Completed).
- **Why it's important**: It prevents UI regression. If a developer accidentally changes the color mapping, this test will fail and alert them.

---

## 2. Backend Tests (Jest)

### C. `Backend/test/sample.test.js`

- **Type**: Sanity / Configuration Test.
- **Purpose**: To verify that the Jest testing framework is correctly configured for the Node.js backend.
- **What it does**:
  - It executes a simple true-is-true assertion (`expect(true).toBe(true)`).
- **Why it's important**: Similar to the frontend simple test, it confirms that Jest can run ES Modules and execute tests without crashing.

### D. `Backend/test/teamController.test.js`

- **Type**: Controller Unit Test (Logic).
- **Purpose**: To verify the logic of the `getTeam` API function without actually connecting to a real database.
- **What it does**:
  - **Mocking**: It "mocks" (simulates) the database connection (`db.js`). Instead of querying a real MySQL table, it intercepts the call and forces it to return fake data.
  - **Success Case**: It calls `getTeam`, ensures it asks the database for data, and checks if it sends that data back in the response.
  - **Error Case**: It simulates a database failure (e.g., connection lost) and verifies that the controller correctly sends a 500 Error response instead of crashing the server.
- **Why it's important**: It allows us to test business logic quickly and reliably without needing a running MySQL server.
