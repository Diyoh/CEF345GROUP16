/**
 * STORE MUTATION REGRESSION TESTS
 *
 * Optimistic updates must never outlive a rejected request. In a transparency product a
 * UI showing figures the server refused to store is the worst possible failure: the
 * contractor believes they reported, and the public record says otherwise.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach } from 'vitest';

import { AppProvider } from '../store';
import { useAppStore } from '../useAppStore';
import { api } from '../api';

vi.mock('../api', async () => {
  const actual = await vi.importActual('../api');
  return {
    ...actual,
    SOCKET_URL: 'http://localhost:5000',
    api: {
      getMe: vi.fn().mockResolvedValue({ success: false }),
      getProjects: vi.fn().mockResolvedValue({
        success: true,
        data: [{ id: 'p1', title: 'Ring Road', progress: 30, spent: 100, budget: 1000, status: 'Ongoing' }],
      }),
      getTeam: vi.fn().mockResolvedValue({ success: true, data: [] }),
      getAccessCodes: vi.fn().mockResolvedValue({ success: true, data: [] }),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
    },
  };
});

// socket.io-client is dynamically imported by the store; keep it inert.
vi.mock('socket.io-client', () => ({ io: () => ({ on: vi.fn(), disconnect: vi.fn() }) }));

/** Renders the project's progress plus buttons that drive the two mutations. */
const Probe = () => {
  const { projects, updateProject, deleteProject } = useAppStore();
  const p = projects.find((x) => x.id === 'p1');

  return (
    <div>
      <span data-testid="count">{projects.length}</span>
      <span data-testid="progress">{p ? p.progress : 'gone'}</span>
      <button onClick={() => updateProject({ ...p, progress: 99 })}>update</button>
      <button onClick={() => deleteProject('p1')}>delete</button>
    </div>
  );
};

const renderProbe = async () => {
  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );
  await waitFor(() => expect(screen.getByTestId('progress')).toHaveTextContent('30'));
};

beforeEach(() => vi.clearAllMocks());

describe('updateProject', () => {
  test('rolls back the optimistic value when the server rejects', async () => {
    api.updateProject.mockResolvedValue({
      success: false,
      error: 'You can only update projects assigned to you',
    });

    await renderProbe();
    await userEvent.click(screen.getByText('update'));

    await waitFor(() => expect(screen.getByTestId('progress')).toHaveTextContent('30'));
  });

  test('reconciles to the stored row on success', async () => {
    // The server clamps/normalises; the store must show what was stored, not what was sent.
    api.updateProject.mockResolvedValue({
      success: true,
      data: { id: 'p1', progress: 75 },
    });

    await renderProbe();
    await userEvent.click(screen.getByText('update'));

    await waitFor(() => expect(screen.getByTestId('progress')).toHaveTextContent('75'));
  });

  test('rolls back when the request throws', async () => {
    api.updateProject.mockRejectedValue(new Error('network down'));

    await renderProbe();
    await userEvent.click(screen.getByText('update'));

    await waitFor(() => expect(screen.getByTestId('progress')).toHaveTextContent('30'));
  });
});

describe('deleteProject', () => {
  test('restores the project when the server refuses', async () => {
    api.deleteProject.mockResolvedValue({ success: false, error: 'Not authorized' });

    await renderProbe();
    await userEvent.click(screen.getByText('delete'));

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
  });

  test('restores the project when the call throws', async () => {
    // This is the original defect: api.deleteProject did not exist, so the call threw a
    // TypeError, the project vanished from the UI and survived in the database.
    api.deleteProject.mockRejectedValue(new TypeError('api.deleteProject is not a function'));

    await renderProbe();
    await userEvent.click(screen.getByText('delete'));

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
  });

  test('keeps the project removed on success', async () => {
    api.deleteProject.mockResolvedValue({ success: true });

    await renderProbe();
    await userEvent.click(screen.getByText('delete'));

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
  });
});
