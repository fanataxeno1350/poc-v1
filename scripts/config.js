/**
 * Site-level configuration. Edit these values in code; they are not authorable.
 */
const config = {
  login: {
    /* endpoint that receives a JSON POST with { email, password } and returns a JWT */
    apiUrl: 'http://localhost:5000/api/auth/login',
    /* name of the property in the JSON response that holds the JWT */
    tokenField: 'token',
    /* page to open after a successful login when no ?redirect= is given */
    redirectUrl: '/content/poc-v1/home-page.html',
    /* path of the page that contains the login block */
    loginPath: '/content/poc-v1/login-page.html',
  },
  search: {
    /* JSON index of published pages, generated from helix-query.yaml */
    indexUrl: '/query-index.json',
    /* minimum characters before results are shown */
    minLength: 2,
    /* maximum number of results to render */
    maxResults: 10,
  },
  session: {
    /* name of the cookie in which the JWT is kept */
    cookieName: 'auth-token',
  },
};

export default config;
