
# multi-auth

An agnostic node.js module for multiple authentication related tasks.

* Simple password authentication
* Two-step authentication (password + email)
* Email-only authentication
* Email confirmation
* Password resets by email



# Installation

```bash
$ npm install multi-auth
```



# Usage

## Setup

Setting up the auth controller consists of defining functions to tell the module how to perform certain tasks (like sending an email or looking up a user from the database).

```javascript
// Load in the auth module
var Auth = require('multi-auth');

// Create the auth controller
var auth = new Auth();

//
// Tell multi-auth how to send emails
//
auth.define('sendEmail', function(user, template, data, promise) {
	var mail = mailer.sendEmail({
		to: user.email,
		template: template,
		data: data
	});

	mail.on('sent', function() {
		promise.resolve();
	});
});

//
// Tell multi-auth how to fetch users from the database using a user ID
//
auth.define('fetchUserById', function(userId, promise) {
	User.findById(userId, function(err, user) {
		if (err) {
			return promise.reject(err);
		}
		
		promise.resolve({
			id: user._id,
			authMethod: user.authMethod,
			email: user.email,  // if needed (twostep-email and email)
			password: user.password,  // if needed (password, twostep-sms, and twostep-email)
			phone: user.phone  // if needed (twostep-sms)
		});
	});
});

//
// Tell multi-auth how to fetch users from the database using a username/email
//
auth.define('fetchUserByName', function(userName, promise) {
	var query = { };
	
	if (userName.indexOf('@') >= 0) {
		query.email = userName;
	} else {
		query.username = userName;
	}

	User.findOne(query, function(err, user) {
		if (err) {
			return promise.reject(err);
		}

		promise.resolve({
			id: user._id,
			authMethod: user.authMethod,
			email: user.email,  // if needed (twostep-email and email)
			password: user.password,  // if needed (password, twostep-sms, and twostep-email)
			phone: user.phone  // if needed (twostep-sms)
		});
	});
});

//
// Tell multi-auth how to test passwords
//
auth.define('checkPassword', function(user, password, promise) {
	promise.resolve(hashPassword(password) === user.password);
});

//
// Tell multi-auth how to mark emails as confirmed
//
auth.define('confirmEmail', function(userId, promise) {
	User.findById(userId, function(err, user) {
		if (err) {
			return promise.reject(err);
		}

		user.emailConfirmed = true;
		user.save(function() {
			promise.resolve();
		});
	});
});

//
// Tell multi-auth how to update passwords
//
auth.define('updatePassword', function(userId, promise) {
	User.findById(userId, function(err, user) {
		if (err) {
			return promise.reject(err);
		}

		user.emailConfirmed = true;
		user.save(function() {
			promise.resolve();
		});
	});
});
```

## Express Middleware

If you use express, you can use the middleware to handle all router setup. Just use it right before using the router.

```javascript
var app = express();

// other middlewares ....

app.use(auth.express({
	route: '/auth',
	afterAuth: function(user, req, res) {
		res.send(200, {
			message: 'Authentication successful',
			token: generateTokenForUser(user)
		});
	}
}));
app.use(app.router);

// any error handlers ....

app.listen(somePort, function() {
	console.log('express app running ...');
});
```

## Defining Routes

If you're not using express, you will have to define your routes yourself. Don't worry, though, the exposed methods are very straight-forward and easy to use.


