import config from '../../scripts/config.js';
import { getSession, safeRedirect, setToken } from '../../scripts/session.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createField({
  id, label, type, autocomplete,
}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'login-field';

  const labelEl = document.createElement('label');
  labelEl.htmlFor = id;
  labelEl.textContent = label;

  const input = document.createElement('input');
  Object.assign(input, {
    id, name: id, type, required: true,
  });
  input.autocomplete = autocomplete;

  const error = document.createElement('p');
  error.className = 'login-error';
  error.id = `${id}-error`;
  input.setAttribute('aria-describedby', error.id);

  wrapper.append(labelEl, input, error);
  return { wrapper, input, error };
}

function setError(field, message) {
  field.error.textContent = message;
  if (message) field.input.setAttribute('aria-invalid', 'true');
  else field.input.removeAttribute('aria-invalid');
}

function validate(email, password) {
  const emailValue = email.input.value.trim();
  const emailMessage = !emailValue ? 'Enter your email address.' : (!EMAIL_PATTERN.test(emailValue) && 'Enter a valid email address.');
  const passwordMessage = !password.input.value && 'Enter your password.';
  setError(email, emailMessage || '');
  setError(password, passwordMessage || '');
  if (emailMessage) email.input.focus();
  else if (passwordMessage) password.input.focus();
  return !emailMessage && !passwordMessage;
}

export default function decorate(block) {
  // authored rows: title, redirect page
  const [titleRow, redirectRow] = [...block.children];
  const title = titleRow?.textContent.trim() || 'Sign in';
  const authoredRedirect = redirectRow?.querySelector('a')?.getAttribute('href')
    || redirectRow?.textContent.trim();
  const { apiUrl } = config.login;
  const redirectUrl = safeRedirect(
    new URLSearchParams(window.location.search).get('redirect'),
    safeRedirect(authoredRedirect, '/'),
  );

  const form = document.createElement('form');
  form.noValidate = true;

  const heading = document.createElement('h2');
  heading.textContent = title;

  const email = createField({
    id: 'login-email', label: 'Email', type: 'email', autocomplete: 'username',
  });
  const password = createField({
    id: 'login-password', label: 'Password', type: 'password', autocomplete: 'current-password',
  });

  const status = document.createElement('p');
  status.className = 'login-status';
  status.setAttribute('role', 'alert');

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'button primary';
  submit.textContent = 'Sign in';

  form.append(heading, email.wrapper, password.wrapper, status, submit);
  block.replaceChildren(form);

  // already signed in: skip the form
  if (getSession()) window.location.replace(redirectUrl);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.textContent = '';
    if (!validate(email, password)) return;

    if (!apiUrl) {
      status.textContent = 'Login is not configured for this page.';
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Signing in…';
    try {
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.input.value.trim(), password: password.input.value }),
      });
      if (!resp.ok) {
        status.textContent = resp.status === 401 || resp.status === 403
          ? 'Incorrect email or password.'
          : 'Sign in failed. Please try again later.';
        return;
      }
      const data = await resp.json().catch(() => ({}));
      if (!setToken(data[config.login.tokenField])) {
        status.textContent = 'Sign in failed. Please try again later.';
        return;
      }
      window.location.assign(redirectUrl);
    } catch (err) {
      status.textContent = 'Unable to reach the login service. Please try again.';
    } finally {
      submit.disabled = false;
      submit.textContent = 'Sign in';
    }
  });
}
