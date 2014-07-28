var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var passport = require('passport');
var googleStrategy = require('passport-google').Strategy;
var mongojs = require('mongojs');
var db = mongojs('mydb', ['userauths']);
var userAuths = db.collection('userauths');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

passport.serializeUser(function(user, done) {
	done(null, user._id);
});

passport.deserializeUser(function(id, done) {
	userAuths.find({'_id': id}, function(err, user) {
		done(err, user);
	});
});

passport.use(new googleStrategy({
	returnURL: 'http://localhost:3000/auth/google/return',
	realm: 'http://localhost:3000/'
	},
	function(identifier, profile, done) {
		userAuths.find({'identifier': identifier}, function(err, user) {
			if(user.length <= 0) {
				userAuths.save({
					'identifier': identifier,
					'name': profile.displayName
				});
			}
			done(err, user[0]);
		});
	})
);

app.get('/auth/google', passport.authenticate('google'));
app.get('/auth/google/return', passport.authenticate('google',  {
	successRedirect: '/',
	failureRedirect: '/auth/google'
}));

app.get('/', function(req, res) {
	if(req.isAuthenticated()) {
		routes.index(req, res);
	} else {
		res.redirect('/auth/google');
	}
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
