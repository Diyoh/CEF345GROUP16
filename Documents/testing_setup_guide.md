# Unit Testing & Automation: Step-by-Step Guide

## Goal Description

This document describes exactly **how** to implement unit testing and automation for this project. It is designed as a guide so you can learn and implement it yourself.

## 1. Frontend Testing Setup (Vitest + React Testing Library)

**Why?** Vitest is a next-generation test runner native to Vite. It's faster and requires less config than Jest for Vite projects. React Testing Library is the standard for testing React components.

### Step 1.1: Install Dependencies

Open your terminal in the `Frontend` directory and run:

```bash
cd Frontend
# We use happy-dom to avoid ESM compatibility issues
npm install -D vitest happy-dom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### Step 1.2: Configure `vite.config.js`

Modify `Frontend/vite.config.js` to tell Vite how to handle tests.
**Add** the `test` object to the config:

```javascript
// Frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // Allows using describe, it, expect without importing
    environment: "happy-dom", // Simulates a browser environment (fast & ESM compatible)
    setupFiles: "./src/test/setup.js", // Global setup file
  },
});
```

### Step 1.3: Create Setup File

Create a new file `Frontend/src/test/setup.js`. This runs before your tests.

```javascript
// Frontend/src/test/setup.js
import "@testing-library/jest-dom"; // Adds custom matchers like .toBeInTheDocument()
```

### Step 1.4: Add Test Script

Open `Frontend/package.json` and add this to `scripts`:

```json
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui",
  "coverage": "vitest run --coverage"
}
```

### Step 1.5: Running Tests on Windows (PowerShell)

If you encounter "running scripts is disabled" errors when using `npm test`, use this command instead:

```powershell
.\node_modules\.bin\vitest.cmd
```

### Step 1.6: Write a Unit Test

Create `Frontend/src/components/StatusBadge.test.jsx`:

```jsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge } from "./StatusBadge";
import { ProjectStatus } from "../types";

describe("StatusBadge Component", () => {
  it("renders correct text and style for PLANNED status", () => {
    render(<StatusBadge status={ProjectStatus.PLANNED} />);
    const badge = screen.getByText(ProjectStatus.PLANNED);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-blue-100");
  });
});
```

---

## 2. Backend Testing Setup (Jest)

**Why?** Jest is the most popular testing framework for Node.js. Supertest allows us to test HTTP endpoints without running the server.

### Step 2.1: Install Dependencies

Open your terminal in the `Backend` directory and run:

```bash
cd Backend
npm install -D jest supertest
```

### Step 2.2: Configure Jest

Since your project uses `"type": "module"`, we need to ensure Jest handles ES Modules. The easiest way is to add this to your `Backend/package.json`:

```json
// In Backend/package.json, add/update these fields:
"scripts": {
  "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js"
},
"jest": {
  "transform": {},
  "testEnvironment": "node"
}
```

### Step 2.3: Write a Sample Test

Create `Backend/tests/sample.test.js`:

```javascript
// Backend/tests/sample.test.js
describe("Backend Setup", () => {
  test("should pass", () => {
    expect(true).toBe(true);
  });
});
```

To run it: `npm test` inside `Backend/`.

---

## 3. Automation Setup (GitHub Actions)

**Why?** GitHub Actions runs your tests automatically whenever you push code, preventing you from breaking the app.

### Step 3.1: Create Workflow File

Create the directory `.github/workflows` in your root folder (one level above Frontend/Backend), then create `test.yml` inside it.

**File Path**: `.github/workflows/test.yml`

```yaml
name: Run Tests

on:
  push:
    branches: ["main", "master"]
  pull_request:
    branches: ["main", "master"]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x]

    steps:
      - uses: actions/checkout@v3

      # Setup Node.js
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}

      # Frontend Tests
      - name: Install Frontend Dependencies
        working-directory: ./Frontend
        run: npm ci

      - name: Run Frontend Tests
        working-directory: ./Frontend
        run: npm test -- --run # "--run" tells Vitest to run once and exit, not watch

      # Backend Tests
      - name: Install Backend Dependencies
        working-directory: ./Backend
        run: npm ci

      - name: Run Backend Tests
        working-directory: ./Backend
        run: npm test
```
