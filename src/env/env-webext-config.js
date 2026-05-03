const auth0Env = {
  AUTH0_DOMAIN: 'alpheios.auth0.com',
  AUTH0_CLIENT_ID: 'LOCAL_DEV_NO_AUTH',
  TEST_ID: '',
  ENDPOINTS: {
    wordlist: 'https://userapis.alpheios.net/v1/words',
    settings: 'https://settings.alpheios.net/v1/settings'
  },
  AUDIENCE: 'alpheios.net:apis',
  LOGOUT_URL: 'https://alpheios.net/pages/logout'
}

export default auth0Env
