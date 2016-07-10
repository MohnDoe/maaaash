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


// init routes


app.use('/auth', require('./routes/auth'));
app.use('/api/vote', require('./routes/api/vote'));

app.get('/', function(req, res) {
	//Controllers.quoteController.getList(req, res);
})


Models.sequelize.sync({
	force: true
}).then(function() {
	app.listen(Config.server.port, function() {
		// Models.user.create({
		// 	username: "jondoe",
		// 	password: 'jondoe',
		// 	email: 'jondoe@gmail.com'
		// });
		console.log('MAAAASH app listening on port %s', Config.server.port);
	});
});