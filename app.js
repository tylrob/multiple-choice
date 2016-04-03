var express = require('express');
var app = express();
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var assert = require('assert');
var bodyParser = require('body-parser');


app.use(express.static('public'));
app.use(bodyParser.json());

app.listen(process.env.PORT || 3000, function () {
	console.log('Listening on port 3000.');
});

/*
MongoClient.connect('mongodb://127.0.0.1:27017/multiple-choice', function(err, db) {
	assert.equal(null, err);
    console.log("Successfully connected to MongoDB.");
    this.db = db;
}); */

app.get('/', function (req, res) {
	res.send("I'm alive");
});

/*
Supported routes
GET /quizzes to get a list of available quizzes and their IDs
TODO: POST /quizzes to add a new quiz
POST /attempts to create a new quiz Attempt and return its _id in the DB so it can be retrieved later.
PUT /attempts/id to update an existing attempt with the latest state of the Attempt
GET /quiz-attempts/id to get a known existing Attempt by its _id
*/

app.get('/quizzes', function (req, res) {
	console.log("Got a GET request to /quizzes");
	var query = {};
	var projection = {
		"_id": 0,
		"quizName": 1,
		"quizId": 1
	};
	db.collection('quizzes').find(query, projection).toArray(function(err, result) {
		var returnObj = {"quizzes": result}
		console.log("Going to return the following object:");
		console.log(returnObj);
		res.send(returnObj);
	});
});

app.post('/quiz-attempts', function (req, res) {
	console.log("Got a POST request to /quiz-attempt.");	
	console.log("Quiz requested was " + req.body.requestedQuizId);
	
	var requestedQuizId = parseInt(req.body.requestedQuizId);
	var query = {"quizId":requestedQuizId};
	db.collection('quizzes').findOne(query, {"_id":0}, function(err, result) {
		console.log(result);

	    var insertDoc = result;
	    db.collection('quizAttempts').insertOne(insertDoc, function (err, result) {
	    	var jsonResult = result.ops[0];
	    	console.log(jsonResult);
			
			res.send(jsonResult);    	
	    });
	});
});

app.put('/quiz-attempts/:id', function (req, res) {
	console.log("Got a PUT request to /quiz-attempts/" + req.params.id + ".");
	var id = new ObjectId(req.params.id);
	var filter = {"_id":id};
	var replacement = req.body;
	delete replacement._id;
	var options = {"returnOriginal": false};
	db.collection('quizAttempts').findOneAndReplace(filter, replacement, options, function(err, result) {
		console.log(err);
		console.log(JSON.stringify(result.value));
		res.send(result.value);
	});
});

app.get('/quiz-attempts/:id', function (req, res) {
	console.log("Got a GET request to /quiz-attempts/" + req.params.id + ".");
	var id = new ObjectId(req.params.id);
	var query = {"_id":id};
	db.collection('quizAttempts').findOne(query, function (err, result) {
		console.log(result);
		res.send(result);
	});
});

