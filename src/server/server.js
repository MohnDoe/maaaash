var Promise = require('bluebird');
var _ = require('lodash');

// var debugWeb = require('debug')('app:web');
var debugDB = require('debug')('app:db');

var Config = require('./modules/config');

// var Models = require('./models');

// var Ops = require('./operators');

//Probably find another place for this
Promise.config({
	warnings: false
});

// Connect to the databases
var promises = [];

var DB = require('./modules/db');
promises.push(DB.init().then(function() {
	console.log('Connected to PostgreSQL');
	return new Promise(function(resolve, reject) {
		return resolve();
	})
}));

var Redis = require('./modules/redis');
promises.push(Redis.init().then(function() {
	console.log('Connected to Redis');
	return new Promise(function(resolve, reject) {
		return resolve();
	})
}));

Promise.all(promises).then(function() {
	debugDB('Connected to Databases');
	// Load and Sync models (return promises);
	var Models = require('./modules/models');
	return Models.init();
}).then(function() {
	console.log('Done');
	var Express = require('express');
	var app = module.exports = Express();
	var BodyParser = require('body-parser');
	var ExpressSession = require('express-session');
	var Compression = require('compression');
	var raygun = require('raygun');

	var raygunClient = new raygun.Client().init({
		apiKey: Config.raygun.api_key
	});


	//Configure the app
	app.use(Compression()); //https://github.com/expressjs/compression
	app.use(BodyParser.json()); // for parsing application/json
	app.use(BodyParser.urlencoded({
		extended: true
	})); // for parsing       application/x-www-form-urlencoded
	app.use(raygunClient.expressHandler); // raygun



	console.log("Storing sessiondata in REDIS");
	var RedisStore = require('connect-redis')(ExpressSession);
	app.use(ExpressSession({
		store: new RedisStore({
			client: require("./modules/redis").client
		}),
		secret: Config.server.sessionSecret,
		resave: false,
		saveUninitialized: false,
	}));


	//Start webserver
	var server = module.exports.server = app.listen(Config.server.port, function() {
		console.log("Server listening on port %s", Config.server.port);
	});

	try {
		//Authorization module
		require('./modules/auth/index').init();

		//Api endpoints
		require('./modules/api').init();

		//Normal routing
		require('./modules/routes');

		require('./modules/leaderboard');

	} catch (err) {
		console.log(err);
	}

}).catch(function(err) {

});


/*
var app = express();

var isAuthenticated = function(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}

	res.status(401).json({
		status: 'error',
		message: 'You need to be logged in to do that'
	});
}

// app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(cookieParser());
app.use(session({
	secret: Config.server.sessionSecret,
	resave: true,
	saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname + '/../../dist/public'));

// init routes
app.use('/auth', require('./routes/auth'));
app.use('/api/vote', isAuthenticated,
	jwt({
		secret: Config.server.jwt_secret
	}),
	require('./routes/api/vote'));

app.use('/api/user', require('./routes/api/user'));

app.use(function(req, res) {
	//todo: read file and inject meta shit + if dev, no maxage
	res.sendFile('index.html', {
		root: __dirname + '/../../dist/public'
	});
});



Models.sequelize.sync({
		force: true
	})
	.then(function() {
		app.listen(Config.server.port, function() {
			console.log('MAAAASH app listening on port %s', Config.server.port);
		});
	});
	*/