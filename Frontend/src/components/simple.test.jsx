// Frontend/src/components/Simple.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
describe('Simple Test', () => {
    it('should pass', () => {
        expect(1 + 1).toBe(2);
    });
});

