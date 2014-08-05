
# multi-auth

A node.js module for multiple authentication related tasks.

* Simple password authentication
* Two-step authentication (password + email)
* Email-only authentication
* Email confirmation



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

// Define the process by which to send emails
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

// Define the fetch user by ID routine
auth.define('fetchUserById', function(userId, promise) {
	User.findById(userId, function(err, user) {
		if (err) {
			return promise.reject(err);
		}
		
		promise.resolve({
			id: user._id,
			name: user.name,
			email: user.email,
			authMethod: user.authMethod
		});
	});
});

// Define the fetch user by name routine
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
			name: user.name,
			email: user.email,
			authMethod: user.authMethod
		});
	});
});

// Define the check password routine
auth.define('checkPassword', function(userId, password, promise) {
	User.findById(userId, function(err, user) {
		if (err) {
			return promise.reject(err);
		}

		promise.resolve(hashPassword(password) === user.password);
	});
});

// Define the confirm email routine
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
```

## Defining Routes

Once you have defined all the basic actions for the module, you just have to set up the endpoints. For example, if you were using express, you could define your endpoints like this:

```javascript
var app = express();

app.post('/auth/email-confirmation/:userId', function(req, res) {
	auth.confirmEmailStepOne(req.params.userId)
		.then(function() {
			res.send(200, {
				message: 'Confirmation email sent'
			});
		});
});

app.put('/auth/email-confirmation/:token', function(req, res) {
	auth.confirmEmailStepOne(req.params.token)
		.then(function() {
			res.send(200, {
				message: 'Email confirmation successful'
			});
		});
});
```


