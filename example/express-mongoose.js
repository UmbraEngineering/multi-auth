
var app       = require('express')();
var Auth      = require('../lib');
var mongoose  = require('mongoose');

var auth = new Auth({
	sendEmail: function() {
		// 
	},
	fetchUserId: function() {
		// 
	},
	checkPassword: function() {
		// 
	}
});



// -------------------------------------------------------------
//  Email confirmation

app.post('/confirm-email-step-one/:userId', function(req, res) {
	auth.confirmEmailStepOne(req.params.userId)
		.then(function() {
			res.send(200, 'Confirmation email sent');
		});
});

app.get('/confirm-email-step-two/:token', function(req, res) {
	auth.confirmEmailStepTwo(req.params.token)
		.then(function() {
			res.send(200, 'Email confirmed');
		});
});
