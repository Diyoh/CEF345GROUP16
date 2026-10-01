import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted above plain declarations; vi.hoisted lifts the mock with it.
const api = vi.hoisted(() => ({ getAiStatus: vi.fn(), aiSearch: vi.fn() }));
vi.mock('../api', () => ({ api }));

import { AiSearch } from '../components/AiSearch';
import { I18nProvider } from '../i18n';

const renderBox = (onApply = vi.fn()) => {
  render(<I18nProvider><AiSearch onApply={onApply} /></I18nProvider>);
  return onApply;
};

const enabled = { success: true, data: { enabled: true, provider: 'ollama', model: 'qwen2.5:3b' } };

beforeEach(() => {
  vi.clearAllMocks();
  try { localStorage.setItem('br-locale', 'en'); } catch { /* storage may be unavailable */ }
});

describe('AiSearch', () => {
  it('renders nothing when no model is available', async () => {
    api.getAiStatus.mockResolvedValue({ success: true, data: { enabled: false, provider: 'none', model: null } });
    const { container } = render(<I18nProvider><AiSearch onApply={vi.fn()} /></I18nProvider>);
    await waitFor(() => expect(api.getAiStatus).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the backend is unreachable', async () => {
    api.getAiStatus.mockRejectedValue(new Error('offline'));
    const { container } = render(<I18nProvider><AiSearch onApply={vi.fn()} /></I18nProvider>);
    await waitFor(() => expect(api.getAiStatus).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('applies the filters and shows what the assistant chose, naming the model', async () => {
    api.getAiStatus.mockResolvedValue(enabled);
    api.aiSearch.mockResolvedValue({
      success: true,
      data: {
        filters: { status: 'Stalled', region: 'NW', q: 'Bamenda road' },
        applied: [
          { key: 'status', value: 'Stalled' },
          { key: 'region', value: 'NW', label: 'North-West' },
          { key: 'q', value: 'Bamenda' },
          { key: 'q', value: 'road' },
        ],
      },
    });
    const onApply = renderBox();

    const input = await screen.findByRole('searchbox', { name: 'Ask in plain words' });
    expect(screen.getByText(/qwen2.5:3b/)).toBeInTheDocument();
    await userEvent.type(input, 'stalled roads in Bamenda');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(onApply).toHaveBeenCalledWith({ status: 'Stalled', region: 'NW', q: 'Bamenda road' }));
    expect(api.aiSearch).toHaveBeenCalledWith('stalled roads in Bamenda', 'en');
    expect(screen.getByText('Stalled')).toBeInTheDocument();
    expect(screen.getByText('North-West')).toBeInTheDocument();
    expect(screen.getByText('matching “Bamenda”')).toBeInTheDocument();
    expect(screen.getByText('matching “road”')).toBeInTheDocument();
  });

  it('a failed search leaves the filters alone and says so', async () => {
    api.getAiStatus.mockResolvedValue(enabled);
    api.aiSearch.mockResolvedValue({ success: false, error: 'The AI assistant is unavailable right now.' });
    const onApply = renderBox();

    await userEvent.type(await screen.findByRole('searchbox'), 'stalled roads');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText(/could not answer/)).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });
});
