module.exports = {
  server: {
    host: process.env.HOST,
    port: process.env.PORT || 8080,
    sessionSecret: process.env.SESSION_SECRET || "1H5737V45U0as1027Pkzx98S1T0bB210b94950Q745Ho1T38kAA1jLe72R0d0k614N064687D16Oo6H5f4b706Jw8r56389M317AC463237RZ28d81691313Y01W635r",
    processName: process.env.DYNO || process.env.NODE_ENV + '-' + (Math.random() * 10000).toString(32),
    jwt_secret: process.env.JWT_SECRET || 'secret'
  },
  database: {
    username: "postgres",
    password: "postgres",
    database: "db_choose",
    host: "127.0.0.1",
    dialect: "postgres",
    url: process.env.DATABASE_URL
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
      clientID: process.env.SOCIAL_YOUTUBE_CLIENT_ID || '513018075592-fq4117bfdoq02g2e9fec5pho7hodvv3c.apps.googleusercontent.com',
      clientSecret: process.env.SOCIAL_YOUTUBE_CLIENT_SECRET || 'O6TJOsZhIA7HqRLxrKImwxt7',
      callbackURL: '/auth/youtube/callback',
      api_key: process.env.SOCIAL_YOUTUBE_API_KEY || 'AIzaSyC4QgLul0ofnEq5VZN66VXVyTgDS5IKTb8'
    }
  }
}