/**
 * Site-level configuration for backend APIs and code behaviour. Edit these values in code;
 * they are not authorable. Page paths and display options are authored instead: redirect and
 * search options (including the AEM content path, published-only and credentials switches)
 * on their blocks, the login page path as `login-page` page metadata.
 */
const config = {
  login: {
    /* endpoint that receives a JSON POST with { email, password } and returns a JWT */
    apiUrl: 'http://localhost:5000/api/auth/login',
    /* name of the property in the JSON response that holds the JWT */
    tokenField: 'token',
  },
  search: {
    /* JSON index of published pages, generated from helix-query.yaml */
    indexUrl: '/query-index.json',
    /* AEM instance whose pages are also searched (empty disables it); use the author URL
       to include unpublished pages */
    aemUrl: 'https://author-p8803-e1283844.adobeaemcloud.com/',
    /* QueryBuilder endpoint on the AEM instance */
    aemQueryPath: '/bin/querybuilder.json',
  },
  session: {
    /* name of the cookie in which the JWT is kept */
    cookieName: 'auth-token',
  },
};

export default config;
