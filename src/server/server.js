var express = require('express'),
	Promise = require('bluebird'),
	_ = require('lodash'),
	morgan = require('morgan'),
	bodyParser = require('body-parser'),
	cookieParser = require('cookie-parser'),
	session = require('express-session'),
	passport = require('passport'),
	LocalStategy = require('passport-local').Stategy;

var Config = require('./config/config');

var Models = require('./models');

var Ops = require('./operators');

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

app.use(morgan('dev'));
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
app.use('/api/vote', isAuthenticated, require('./routes/api/vote'));
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