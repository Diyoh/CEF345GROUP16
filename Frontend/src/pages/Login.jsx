import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAppStore } from '../useAppStore';
import { UserRole } from '../types';
import { Button, Card, Input, Field } from '../components/ui';
import { useT } from '../i18n';

/**
 * Staff sign in. Spec: docs/design/03-components.md section 2.
 *
 * Behaviour is unchanged: same login/register calls, same demo-password fallback, same
 * role redirects. What changed is that every input now has a visible label, errors are
 * wired with aria-invalid and aria-describedby, the error region is announced, and the
 * password toggle no longer removes its own focus ring.
 */
export const Login = () => {
  const t = useT();
  const { login, register, user, loading, error } = useAppStore();
  const [isRegistering, setIsRegistering] = useState(false);

  const [loginEmail, setLoginEmail] = useState('admin@buildright.cm');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCode, setRegCode] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [issuedPcn, setIssuedPcn] = useState(null);

  // A freshly issued PCN blocks the redirect: it exists in this render and
  // never again, so the account holder confirms saving it before moving on.
  if (user && !issuedPcn) {
    if (user.role === UserRole.ADMIN) return <Navigate to="/admin" />;
    if (user.role === UserRole.ENTITY_ADMIN) return <Navigate to="/desk" />;
    if (user.role === UserRole.CONTRACTOR) return <Navigate to="/contractor" />;
    if (user.role === UserRole.DEVELOPER_ADMIN) return <Navigate to="/dev-admin" />;
    return <Navigate to="/" />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    // Demo fallback, unchanged: known demo accounts sign in without typing the password.
    let password = loginPassword;
    if (!password) {
      const demoAccounts = ['admin@buildright.cm', 'contact@btpcameroun.cm', 'dev@buildright.cm'];
      if (demoAccounts.includes(loginEmail)) password = 'password';
      else {
        setLoginError(t('auth.enterPassword'));
        return;
      }
    }

    await login(loginEmail, password);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError('');

    if (regPassword !== regConfirmPassword) {
      setRegError(t('auth.passwordMismatch'));
      return;
    }
    // Must match MIN_PASSWORD_LENGTH in Backend/controllers/authController.js. The server
    // is the real gate; this only spares the user a round trip.
    if (regPassword.length < 8) {
      setRegError(t('auth.passwordTooShort'));
      return;
    }

    const result = await register(regName, regEmail, regCode, regPassword);
    if (!result.success) setRegError(t('auth.registrationFailed'));
    else if (result.pcn) setIssuedPcn(result.pcn);
  };

  if (issuedPcn) {
    return (
      <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-12 md:py-20">
        <Card padding="lg">
          <h1 className="text-h2 text-fg">{t('auth.pcnTitle')}</h1>
          <p className="mt-2 text-body text-fg-secondary">{t('auth.pcnLead')}</p>
          <p className="mt-5 select-all rounded-sm bg-sunken px-4 py-3 text-center font-mono text-h2 tracking-[0.08em] text-fg">
            {issuedPcn}
          </p>
          <p className="mt-4 text-caption text-danger">{t('auth.pcnWarning')}</p>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            className="mt-6"
            onClick={() => setIssuedPcn(null)}
          >
            {t('auth.pcnAck')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-12 md:py-20">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent-fill text-accent-fg">
          <i className="fas fa-helmet-safety text-h3" aria-hidden="true" />
        </span>
        <h1 className="text-h1 text-fg">{t(isRegistering ? 'auth.createAccount' : 'auth.staffSignIn')}</h1>
        <p className="mt-2 text-body text-fg-secondary">
          {isRegistering
            ? t('auth.createAccountLead')
            : t('auth.staffSignInLead')}
        </p>
      </div>

      <Card padding="lg">
        {(error || loginError) && !isRegistering && (
          <div
            role="alert"
            className="mb-5 rounded-sm border border-over-line bg-over-bg px-3 py-2.5 text-caption text-over-fg"
          >
            {loginError || error}
          </div>
        )}

        {isRegistering ? (
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <Input
              label={t('auth.fullName')}
              required
              autoComplete="name"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
            />
            <Input
              label={t('auth.email')}
              type="email"
              required
              autoComplete="email"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
            />
            <Input
              label={t('auth.password')}
              type="password"
              required
              autoComplete="new-password"
              hint={t('auth.passwordHint')}
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
            />
            <Input
              label={t('auth.confirmPassword')}
              type="password"
              required
              autoComplete="new-password"
              error={regConfirmPassword && regPassword !== regConfirmPassword ? t('auth.passwordMismatch') : ''}
              value={regConfirmPassword}
              onChange={(e) => setRegConfirmPassword(e.target.value)}
            />
            <Input
              label={t('auth.accessCode')}
              required
              hint={t('auth.accessCodeHint')}
              className="font-mono tracking-wider"
              value={regCode}
              onChange={(e) => setRegCode(e.target.value.toUpperCase())}
            />

            {regError && (
              <p role="alert" className="text-caption text-danger">
                {regError}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} className="mt-2">
              {t('auth.createAccount')}
            </Button>
            <Button type="button" variant="link" size="sm" onClick={() => setIsRegistering(false)}>
              {t('auth.backToSignIn')}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Input
              label={t('auth.email')}
              type="email"
              autoComplete="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
            />

            <Field label={t('auth.password')} htmlFor="login-password">
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-canvas px-3 pr-10 text-body text-fg dark:bg-sunken"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-xs text-fg-tertiary hover:text-fg"
                >
                  <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'} aria-hidden="true" />
                </button>
              </div>
            </Field>

            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} className="mt-2">
              {t('auth.signIn')}
            </Button>
            <Button type="button" variant="link" size="sm" onClick={() => setIsRegistering(true)}>
              {t('auth.haveCode')}
            </Button>
          </form>
        )}
      </Card>

      <details className="mt-6 rounded-lg border border-line bg-surface p-4">
        <summary className="cursor-pointer text-caption font-medium text-fg-secondary">
          {t('auth.demoAccounts')}
        </summary>
        <ul className="mt-3 flex flex-col gap-1 text-caption text-fg-tertiary">
          <li>Administrator: admin@buildright.cm</li>
          <li>Contractor: contact@btpcameroun.cm</li>
          <li>Developer: dev@buildright.cm</li>
          <li className="mt-1">Password for all three: password</li>
        </ul>
      </details>

      <p className="mt-8 text-center text-caption text-fg-tertiary">
        {t('auth.lookingForInfo')}{' '}
        <Link to="/projects" className="text-accent hover:underline">
          {t('auth.browseWithoutAccount')}
        </Link>
      </p>
    </div>
  );
};
