import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

/**
 * Smoke test: renders the full route tree at the public home route and
 * asserts the app mounts without throwing. This is intentionally shallow —
 * its job is to catch "the app doesn't render at all" regressions (a
 * missing provider, a broken top-level import, a routing config error),
 * not to exercise individual page behavior (covered by page-level tests).
 *
 * No token is set in localStorage, so AuthProvider resolves to an
 * unauthenticated state without making a network call, and SocketProvider
 * never attempts a socket connection (see context/SocketContext.tsx —
 * it only connects when a user is present).
 */
describe('App', () => {
  it('renders the home page at the root route without crashing', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <SocketProvider>
            <App />
          </SocketProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'SkillBridge', level: 1 })).toBeInTheDocument();
  });

  it('redirects an unauthenticated user away from a protected route to /login', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <SocketProvider>
            <App />
          </SocketProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
  });
});
