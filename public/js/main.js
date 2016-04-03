//Adding a comment to test git.

//Models
var QuizList = Backbone.NestedModel.extend({
	urlRoot: 'http://localhost:3000/quizzes'
});

var Attempt = Backbone.NestedModel.extend({
	idAttribute: "_id",
	urlRoot: 'http://localhost:3000/quiz-attempts'
});

var Score = Backbone.Model.extend({
	defaults: {
		"questionCount": 0,
		"countCorrect": 0
	}
});

//Views
var NestedQuestionView = Backbone.View.extend({
	template: _.template($('#nested-question-view').html()),
	render: function(){
		var currentQuestion = this.model.get("currentQuestion");
		var partialModel = this.model.get("questions[" + currentQuestion + "]");
		var countOfQuestions = this.model.get("questions").length;
		partialModel["currentQuestion"] = currentQuestion;
		partialModel["countOfQuestions"] = countOfQuestions;
		$(this.el).html(this.template(partialModel));
		return this;
	},
	events: {
		'click #next': function(){this.changeState(1,"next")},
		'click #prev': function(){this.changeState(-1,"prev")},
		'click #home': function(){this.changeState(0,"home")}
	},
	changeState: function(change, navigation){
		var currentQuestion = parseInt(this.model.get("currentQuestion"));
		var targetQuestion = currentQuestion + change;
		var countOfQuestions = this.model.get("questions").length;

		if (targetQuestion >= countOfQuestions) {
			console.log("User clicked finish, save then navigate to score calculation.");
			this.save(currentQuestion, targetQuestion, "finish");
		} else if (targetQuestion < 0) {
			console.log("Cannot go to prev, we are at the beginning");
		} else {
			this.save(currentQuestion, targetQuestion, navigation);
		}
	},
	save: function(currentQuestion, targetQuestion, navigation){
		var userChoice = $("input:radio[name=" + this.model.get("questions[" + currentQuestion + "].questionId") + "]:checked").val();
		console.log("User's choice was " + userChoice);
		var setUserChoiceKey = "questions[" + currentQuestion + "].userChoice";
		var map = {};
		map[setUserChoiceKey] = userChoice;
		this.model.set(map);

		//Now set the currentQuestion to be the targetQuestion
		this.model.set({"currentQuestion": targetQuestion});

		console.log("Attempting to save...");
		var self = this;
		this.model.save(null,{
			success: function(){
				console.log("Save successful, executing callback.");
				self.changePage(navigation);				
			},
			error: function(){
				console.log("Error in save. Callback will not be executed.");
			}
		});
	},
	changePage: function(navigation){
		if (navigation == "home") {
			console.log("Home was clicked from a question screen.");
			app.navigate("quizWelcome",{trigger:true});
		} else if (navigation == "finish") {
			app.navigate("calculateScore/" + this.model.get("_id"),{trigger:true});			
		} else {
			console.log("User wants to navigate to " + navigation);
			app.navigate("quizAttempt/" + this.model.get("_id") + "/" + this.model.get("currentQuestion"),{trigger:true});
		}	
	}
});

var QuizWelcome = Backbone.View.extend({
	template: _.template($('#quiz-welcome').html()),
	render: function(){
		$(this.el).html(this.template(this.model.toJSON()));
		return this;
	}
});

var CalculateScoreView = Backbone.View.extend({
	template: _.template($('#calculate-score').html()),
	render: function(){
		$(this.el).html(this.template(this.model.toJSON()));
		return this;
	},
	events: {
		'click #home':'home'
	},
	home: function(){
		console.log("Home, clicked from the end page.");
		app.navigate("quizWelcome",{trigger:true});
	}
});

//Router
var Router = Backbone.Router.extend({
	initialize: function(){},

	routes: {
		''											: 'quizWelcome',
		'quizWelcome'								: 'quizWelcome',
		'quizAttempt/:attemptId/:questionId'		: 'quizAttempt',	
		'calculateScore/:attemptId'					: 'calculateScore'
	},
	myFunction: function(dingo){
		console.log(dingo);
	},

	quizWelcome: function(){
		console.log("quizWelcome was run");
		this.quizList = new QuizList();
		var self = this;
		this.quizList.fetch({
			success: function(){
				console.log("Fetch success");
				self.mainView = new QuizWelcome({model: self.quizList});
				$('#content').html(self.mainView.render().el);
			},
			error: function(){
				console.log("Fetch fail.");
			}
		});
	},

	//This shouldn't be in the router, because it doesn't change the URL.
	//It also doesn't check to see if there is an existing attempt, so it will overwrite the existing Attempt.
	//See http://stackoverflow.com/questions/7761287/backbone-js-how-to-redirect-from-one-view-to-another-view
	newAttempt: function(quizId){
		console.log("newAttempt route executed. User requested Quiz ID " + quizId + ".");
		this.attempt = new Attempt({"requestedQuizId": quizId});
		//also doesn't check to see if there is an existing attempt
		var self = this;
		this.attempt.set({"currentQuestion": 0});
		this.attempt.save(null,{
			success: function(){
				console.log("Save successful");
				console.log("The new attempt ID assigned by MongoDB is " + self.attempt.get("_id"));
				self.navigate("quizAttempt/" + self.attempt.get("_id") + "/" + self.attempt.get("currentQuestion"), {trigger:true});
			},
			error: function(){
				console.log("Error in save.");
			}
		});
	},
	quizAttempt: function(attemptId, questionId){
		console.log("Quiz attempt route executed.");
		if (this.attempt) {
			this.attempt.set({"currentQuestion":questionId});
			this.mainView = new NestedQuestionView({model:this.attempt});
			$('#content').html(this.mainView.render().el);		
		} else {
			console.log("There is no existing quiz Attempt in memory, so we need to create one.");
			this.attempt = new Attempt({"_id":attemptId});
			var self = this;
			var requestedAttemptId = attemptId;
			var requestedQuestionId = questionId;
			this.attempt.fetch({
				success: function(){
					console.log("Found the requested attempt.");
					self.quizAttempt(requestedAttemptId,requestedQuestionId); // found it, so call this function again.
				},
				error: function(){
					console.log("Couldn't find that attempt ID...");
				}
			});
		}
	},
	calculateScore: function(attemptId){
		console.log("calculateScore route executed.");
		if (this.attempt) {
			var questionCount = this.attempt.get("questions").length;
			var countCorrect = 0;
			for (var i = 0; i < questionCount; i++) {
				var userChoice = this.attempt.get("questions[" + i + "].userChoice");
				var correctAnswerIndex = this.attempt.get("questions[" + i + "].correctAnswer");
				var correctAnswer = this.attempt.get("questions[" + i + "].choices[" + correctAnswerIndex + "]");
 
				if (userChoice == correctAnswer) {
					countCorrect++
				}
 				console.log("userChoice: " + userChoice + ". correctAnswer: " + correctAnswer);
			}			
			this.score = new Score({
				"questionCount": questionCount,
				"countCorrect": countCorrect
			});
			console.log(this.score.toJSON());
			this.mainView = new CalculateScoreView({model: this.score});
			$('#content').html(this.mainView.render().el);
		} else {
			console.log("No attempt was loaded, so we need to get it from the server.");
			this.attempt = new Attempt({"_id":attemptId});
			var self = this;
			var requestedAttemptId = attemptId;
			this.attempt.fetch({
				success: function(){
					console.log("Found the requested attempt.");
					self.calculateScore(requestedAttemptId);
				},
				error: function(){
					console.log("Couldn't find that attempt ID...");
				}
			});
		}
	}
});

//Start App
var app = new Router();
Backbone.history.start();