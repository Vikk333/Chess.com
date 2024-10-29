const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");  
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chessGame = new Chess();         

let players = {};
let currentPlayer = "w"; // Initialize with white as the first player

app.set("view engine", 'ejs');
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess Game" });
});

io.on("connection", (uniquesocket) => {
    console.log("Connected: " + uniquesocket.id);
   
    // Assign players
    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", "b");
    } else {
        uniquesocket.emit("spectatorRole");
    }

    // Handle player disconnect
    uniquesocket.on("disconnect", () => {
        console.log("Disconnected: " + uniquesocket.id);
        if (uniquesocket.id === players.white) {
            delete players.white;
        } else if (uniquesocket.id === players.black) {
            delete players.black;
        }
    });

    // Handle move
    uniquesocket.on("move", (move) => {
        try {
            // Ensure the correct player is making a move
            if ((chessGame.turn() === "w" && uniquesocket.id !== players.white) ||
                (chessGame.turn() === "b" && uniquesocket.id !== players.black)) {
                return; // Ignore the move if it's not the player's turn
            }
            
            const result = chessGame.move(move);
            if (result) {
                currentPlayer = chessGame.turn();
                io.emit("move", move);
                io.emit("boardState", chessGame.fen());
            } else {
                console.log("Invalid move:", move);
                uniquesocket.emit("invalidMove", move); // Corrected spelling
            }
        } catch (error) {
            console.error("Error processing move:", error);
            uniquesocket.emit("invalidMove", move); // Corrected spelling
        }
    });
});

server.listen(3000, () => {
    console.log("Listening on port: 3000");
});
