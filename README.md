# multiple-choice

An application that allows users to take multiple-choice quizzes.

- Quizzes are pre-defined and stored in MongoDB.
- When a user begins a quiz, it creates a new Attempt document in MongoDB. You will see the `_id` assigned by MongoDB in the URL.
- Each time the user clicks Prev or Next, the Attempt will be synced to MongoDB.

## Installation 

Download the repository. To populate the two sample quizzes into your local MongoDB instance, run:

`mongoimport --db multiple-choice --collection quizzes --file quizzes-import.json`.

You will need MongoDB running on the default `port 27017`.

To start the server run `node app.js`, open a browser and navigate to `http://localhost:3000`. The quiz landing page will appear.
