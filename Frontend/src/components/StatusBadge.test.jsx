import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './StatusBadge';
import { ProjectStatus } from '../types';

describe('StatusBadge Component', () => {
    it('renders correct text and style for PLANNED status', () => {
        render(<StatusBadge status={ProjectStatus.PLANNED} />);
        const badge = screen.getByText(ProjectStatus.PLANNED);
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('bg-blue-100');
        expect(badge).toHaveClass('text-blue-800');
    });

    it('renders correct text and style for ONGOING status', () => {
        render(<StatusBadge status={ProjectStatus.ONGOING} />);
        const badge = screen.getByText(ProjectStatus.ONGOING);
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('bg-yellow-100');
        expect(badge).toHaveClass('text-yellow-800');
    });

    it('renders correct text and style for COMPLETED status', () => {
        render(<StatusBadge status={ProjectStatus.COMPLETED} />);
        const badge = screen.getByText(ProjectStatus.COMPLETED);
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('bg-green-100');
        expect(badge).toHaveClass('text-green-800');
    });

    it('renders correct text and style for STALLED status', () => {
        render(<StatusBadge status={ProjectStatus.STALLED} />);
        const badge = screen.getByText(ProjectStatus.STALLED);
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('bg-red-100');
        expect(badge).toHaveClass('text-red-800');
    });
});
