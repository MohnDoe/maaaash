module.exports = {
  server: {
    host: process.env.HOST,
    port: process.env.PORT || 8080,
    sessionSecret: process.env.SESSION_SECRET || "session_secret",
    processName: process.env.DYNO || process.env.NODE_ENV + '-' + (Math.random() * 10000).toString(32),
    jwt_secret: process.env.JWT_SECRET || 'secret',
    apiBase: '/api',
    corsEnabled: false,
  },
  database: {
    dialect: "postgres",
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/db_maaaash',
    redis_url: process.env.REDIS_URL
  },
  hashids: {
    hash_secret: {
      vote: "rnrfY9qvkNxwH9PB5tUKhtMwXAKu2c275WQgdpPrjHahGu3ZhvHhdfngKVtNQEUm",
      channel: "njRBKUk7UVjXuas7fzg5GMBHjAby6tdy9KY7hfNH6GxVkWvUemjaRFGtDWKgHPwa",
    },
    size: {
      vote: 32,
      channel: 16
    }
  },
  auth: {
    youtube: {
      clientID: process.env.SOCIAL_YOUTUBE_CLIENT_ID || '513018075592-hksrut7mpie6jm7i7tr19dcj01jpfcl8.apps.googleusercontent.com',
      clientSecret: process.env.SOCIAL_YOUTUBE_CLIENT_SECRET || 'vF2qp3uFDVBjUPcZz987u3Kr',
      callbackURL: '/auth/youtube/callback',
      api_key: process.env.SOCIAL_YOUTUBE_API_KEY || 'AIzaSyC8PJgRqSyQ_tOulabtBLAUR3PyKdMUwmU',
      options: {
        //https://developers.google.com/identity/protocols/googlescopes
        scope: [
          'https://www.googleapis.com/auth/youtube.readonly',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ],
        authorizationParams: {
          access_type: 'online',
          approval_prompt: 'auto'
        }
      }
    },
    userCacheTime: 20000, //Milliseconds
    passwordSalt: process.env.PASSWORD_SALT || 'salt',
    jwtSecret: process.env.JWT_SECRET || 'secret',
    status: {
      banned: 0,
      notlogged: 1,
      user: 2,
      admin: 10000
    },
    successCallbackURL: '/auth/success',
    failureCallbackURL: '/auth/failure'
  },
  mixpanel: {
    token: process.env.MIXPANEL_TOKEN || 'c65413508db611d1e64eb52fbc4bd6fd',
    api_secret: process.env.MIXPANEL_API_SECRET || 'dad3dea1a1483dc5b1f79e785c385b69'
  },
  raygun: {
    api_key: process.env.RAYGUN_APIKEY || 'FQFNo+jT76ewhjyUf6ztpg=='
  }
}