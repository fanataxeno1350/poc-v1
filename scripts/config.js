/**
 * Site-level configuration. Edit these values in code; they are not authorable.
 */
const config = {
  login: {
    /* endpoint that receives a JSON POST with { email, password } */
    apiUrl: 'http://localhost:5000/api/auth/login',
    /* page to open after a successful login */
    redirectUrl: '/content/poc-v1/index.html',
  },
};

export default config;
