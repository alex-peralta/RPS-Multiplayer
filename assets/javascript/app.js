/*
//
//  Global Variables
//
*/

// Store the objects for each of the two players
var playerOne = null;
var playerTwo = null;

// Store the player names
var playerOneName = "";
var playerTwoName = "";

// Store the name of the player in the user's browser
var yourPlayerName = "";

// Store the player choices
var playerOneChoice = "";
var playerTwoChoice = "";

// Who's turn is it
var turn = 1;

/*
//
//  Firebase Database Section
//
*/

// Initialize Firebase
var config = {
    apiKey: "AIzaSyD9WymOVuagsqC9mdAK374bbVGTzL58AJM",
    authDomain: "rps-multigame.firebaseapp.com",
    databaseURL: "https://rps-multigame.firebaseio.com",
    projectId: "rps-multigame",
    storageBucket: "",
    messagingSenderId: "892111351902"
};
firebase.initializeApp(config);

// Get a reference to the database service
var database = firebase.database();

// Attach a listener to the database /players/ node to listen for any changes
database.ref("/players/").on("value", function(snapshot) {
	// Check for existence of player 1 in the database
	if (snapshot.child("playerOne").exists()) {
		console.log("Player 1 exists");

		// Record playerOne data
		playerOne = snapshot.val().playerOne;
		playerOneName = playerOne.name;

		// Update playerOne display
		$("#playerOneName").text(playerOneName);
		$("#player1Stats").html("Win: " + playerOne.win + ", Loss: " + playerOne.loss + ", Tie: " + playerOne.tie);
	} else {
		console.log("Player 1 does NOT exist");

		playerOne = null;
		playerOneName = "";

		// Update playerOne display
		$("#playerOneName").text("Waiting for Player 1...");
		$("#playerPanel1").removeClass("playerPanelTurn");
		$("#playerPanel2").removeClass("playerPanelTurn");
		database.ref("/outcome/").remove();
		$("#roundOutcome").html("Rock-Paper-Scissors");
		$("#waitingNotice").html("");
		$("#player1Stats").html("Win: 0, Loss: 0, Tie: 0");
	}

	// Check for existence of player 2 in the database
	if (snapshot.child("playerTwo").exists()) {
		console.log("Player 2 exists");

		// Record playerTwo data
		playerTwo = snapshot.val().playerTwo;
		playerTwoName = playerTwo.name;

		// Update playerTwo display
		$("#playerTwoName").text(playerTwoName);
		$("#player2Stats").html("Win: " + playerTwo.win + ", Loss: " + playerTwo.loss + ", Tie: " + playerTwo.tie);
	} else {
		console.log("Player 2 does NOT exist");

		playerTwo = null;
		playerTwoName = "";

		// Update playerTwo display
		$("#playerTwoName").text("Waiting for Player 2...");
		$("#playerPanel1").removeClass("playerPanelTurn");
		$("#playerPanel2").removeClass("playerPanelTurn");
		database.ref("/outcome/").remove();
		$("#roundOutcome").html("Rock-Paper-Scissors");
		$("#waitingNotice").html("");
		$("#player2Stats").html("Win: 0, Loss: 0, Tie: 0");
	}

	// If both players are now present, it's playerOne's turn
	if (playerOne && playerTwo) {
		// Update the display with a green border around player 1
		$("#playerPanel1").addClass("playerPanelTurn");

		// Update the center display
		$("#waitingNotice").html("Waiting on " + playerOneName + " to choose...");
	}

	// If both players leave the game, empty the chat session
	if (!playerOne && !playerTwo) {
		database.ref("/chat/").remove();
		database.ref("/turn/").remove();
		database.ref("/outcome/").remove();

		$("#chatDisplay").empty();
		$("#playerPanel1").removeClass("playerPanelTurn");
		$("#playerPanel2").removeClass("playerPanelTurn");
		$("#roundOutcome").html("Rock-Paper-Scissors");
		$("#waitingNotice").html("");
	}
});

// Attach a listener that detects user disconnection events
database.ref("/players/").on("child_removed", function(snapshot) {
	var msg = snapshot.val().name + " has disconnected!";

	// Get a key for the disconnection chat entry
	var chatKey = database.ref().child("/chat/").push().key;

	// Save the disconnection chat entry
	database.ref("/chat/" + chatKey).set(msg);
});

// Attach a listener to the database /chat/ node to listen for any new chat messages
database.ref("/chat/").on("child_added", function(snapshot) {
	var chatMsg = snapshot.val();
	var chatEntry = $("<div>").html(chatMsg);

	// Change the color of the chat message depending on user or connect/disconnect event
	if (chatMsg.includes("disconnected")) {
		chatEntry.addClass("chatColorDisconnected");
	} else if (chatMsg.includes("joined")) {
		chatEntry.addClass("chatColorJoined");
	} else if (chatMsg.startsWith(yourPlayerName)) {
		chatEntry.addClass("chatColor1");
	} else {
		chatEntry.addClass("chatColor2");
	}

	$("#chatDisplay").append(chatEntry);
	$("#chatDisplay").scrollTop($("#chatDisplay")[0].scrollHeight);
});

// Attach a listener to the database /turn/ node to listen for any changes
database.ref("/turn/").on("value", function(snapshot) {
	// Check if it's playerOne's turn
	if (snapshot.val() === 1) {
		console.log("TURN 1");
		turn = 1;

		// Update the display if both players are in the game
		if (playerOne && playerTwo) {
			$("#playerPanel1").addClass("playerPanelTurn");
			$("#playerPanel2").removeClass("playerPanelTurn");
			$("#waitingNotice").html("Waiting on " + playerOneName + " to choose...");
		}
	} else if (snapshot.val() === 2) {
		console.log("TURN 2");
		turn = 2;

		// Update the display if both players are in the game
		if (playerOne && playerTwo) {
			$("#playerPanel1").removeClass("playerPanelTurn");
			$("#playerPanel2").addClass("playerPanelTurn");
			$("#waitingNotice").html("Waiting on " + playerTwoName + " to choose...");
		}
	}
});

// Attach a listener to the database /outcome/ node to be notified of the game outcome
database.ref("/outcome/").on("value", function(snapshot) {
	$("#roundOutcome").html(snapshot.val());
});

/*
//
//  Button Events Section
//
*/

// Attach an event handler to the "Submit" button to add a new user to the database
$("#add-name").on("click", function(event) {
	event.preventDefault();

	// First, make sure that the name field is non-empty and we are still waiting for a player
	if ( ($("#name-input").val().trim() !== "") && !(playerOne && playerTwo) ) {
		// Adding playerOne
		if (playerOne === null) {
			console.log("Adding Player 1");

			yourPlayerName = $("#name-input").val().trim();
			playerOne = {
				name: yourPlayerName,
				win: 0,
				loss: 0,
				tie: 0,
				choice: ""
			};

			// Add playerOne to the database
			database.ref().child("/players/playerOne").set(playerOne);


			// Set the turn value to 1, as playerOne goes first
			database.ref().child("/turn").set(1);

			// If this user disconnects by closing or refreshing the browser, remove the user from the database
			database.ref("/players/playerOne").onDisconnect().remove();
		} else if( (playerOne !== null) && (playerTwo === null) ) {
			// Adding playerTwo
			console.log("Adding Player 2");

			yourPlayerName = $("#name-input").val().trim();
			playerTwo = {
				name: yourPlayerName,
				win: 0,
				loss: 0,
				tie: 0,
				choice: ""
			};

			// Add playerTwo to the database
			database.ref().child("/players/playerTwo").set(playerTwo);

			// If this user disconnects by closing or refreshing the browser, remove the user from the database
			database.ref("/players/playerTwo").onDisconnect().remove();
		}

		// Add a user joining message to the chat
		var msg = yourPlayerName + " has joined!";
		console.log(msg);

		// Get a key for the join chat entry
		var chatKey = database.ref().child("/chat/").push().key;

		// Save the join chat entry
		database.ref("/chat/" + chatKey).set(msg);

		// Reset the name input box
		$("#name-input").val("");	
	}
});

// Attach an event handler to the chat "Send" button to append the new message to the conversation
$("#chat-send").on("click", function(event) {
	event.preventDefault();

	// First, make sure that the player exists and the message box is non-empty
	if ( (yourPlayerName !== "") && ($("#chat-input").val().trim() !== "") ) {
		// Grab the message from the input box and subsequently reset the input box
		var msg = yourPlayerName + ": " + $("#chat-input").val().trim();
		$("#chat-input").val("");

		// Get a key for the new chat entry
		var chatKey = database.ref().child("/chat/").push().key;

		// Save the new chat entry
		database.ref("/chat/" + chatKey).set(msg);
	}
});

// Monitor Player1's selection
$("#playerPanel1").on("click", ".panelOption", function(event) {
	event.preventDefault();

	// Make selections only when both players are in the game
	if (playerOne && playerTwo && (yourPlayerName === playerOne.name) && (turn === 1) ) {
		// Record playerOne's choice
		var choice = $(this).text().trim();

		// Record the player choice into the database
		playerOneChoice = choice;
		database.ref().child("/players/playerOne/choice").set(choice);

		// Set the turn value to 2, as it is now playerTwo's turn
		turn = 2;
		database.ref().child("/turn").set(2);
	}
});

// Monitor Player2's selection
$("#playerPanel2").on("click", ".panelOption", function(event) {
	event.preventDefault();

	// Make selections only when both players are in the game
	if (playerOne && playerTwo && (yourPlayerName === playerTwo.name) && (turn === 2) ) {
		// Record playerTwo's choice
		var choice = $(this).text().trim();

		// Record the player choice into the database
		playerTwoChoice = choice;
		database.ref().child("/players/playerTwo/choice").set(choice);

		// Compare playerOne and player 2 choices and record the outcome
		rpsCompare();
	}
});

// rpsCompare is the main rock/paper/scissors logic to see which player wins
function rpsCompare() {
	if (playerOne.choice === "Rock") {
		if (playerTwo.choice === "Rock") {
			// Tie
			console.log("tie");

			database.ref().child("/outcome/").set("Tie game!");
			database.ref().child("/players/playerOne/tie").set(playerOne.tie + 1);
			database.ref().child("/players/playerTwo/tie").set(playerTwo.tie + 1);
		} else if (playerTwo.choice === "Paper") {
			// Player2 wins
			console.log("paper wins");

			database.ref().child("/outcome/").set("Paper wins!");
			database.ref().child("/players/playerOne/loss").set(playerOne.loss + 1);
			database.ref().child("/players/playerTwo/win").set(playerTwo.win + 1);
		} else { // scissors
			// Player1 wins
			console.log("rock wins");

			database.ref().child("/outcome/").set("Rock wins!");
			database.ref().child("/players/playerOne/win").set(playerOne.win + 1);
			database.ref().child("/players/playerTwo/loss").set(playerTwo.loss + 1);
		}

	} else if (playerOne.choice === "Paper") {
		if (playerTwo.choice === "Rock") {
			// Player1 wins
			console.log("paper wins");

			database.ref().child("/outcome/").set("Paper wins!");
			database.ref().child("/players/playerOne/win").set(playerOne.win + 1);
			database.ref().child("/players/playerTwo/loss").set(playerTwo.loss + 1);
		} else if (playerTwo.choice === "Paper") {
			// Tie
			console.log("tie");

			database.ref().child("/outcome/").set("Tie game!");
			database.ref().child("/players/playerOne/tie").set(playerOne.tie + 1);
			database.ref().child("/players/playerTwo/tie").set(playerTwo.tie + 1);
		} else { // Scissors
			// Player2 wins
			console.log("scissors win");

			database.ref().child("/outcome/").set("Scissors win!");
			database.ref().child("/players/playerOne/loss").set(playerOne.loss + 1);
			database.ref().child("/players/playerTwo/win").set(playerTwo.win + 1);
		}

	} else if (playerOne.choice === "Scissors") {
		if (playerTwo.choice === "Rock") {
			// Player2 wins
			console.log("rock wins");

			database.ref().child("/outcome/").set("Rock wins!");
			database.ref().child("/players/playerOne/loss").set(playerOne.loss + 1);
			database.ref().child("/players/playerTwo/win").set(playerTwo.win + 1);
		} else if (playerTwo.choice === "Paper") {
			// Player1 wins
			console.log("scissors win");

			database.ref().child("/outcome/").set("Scissors win!");
			database.ref().child("/players/playerOne/win").set(playerOne.win + 1);
			database.ref().child("/players/playerTwo/loss").set(playerTwo.loss + 1);
		} else {
			// Tie
			console.log("tie");

			database.ref().child("/outcome/").set("Tie game!");
			database.ref().child("/players/playerOne/tie").set(playerOne.tie + 1);
			database.ref().child("/players/playerTwo/tie").set(playerTwo.tie + 1);
		}

	}

	// Set the turn value to 1, as it is now playerOne's turn
	turn = 1;
	database.ref().child("/turn").set(1);
}
