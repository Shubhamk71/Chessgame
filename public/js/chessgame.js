const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = ""; // Clear the current board before rendering

    board.forEach((row, rowIndex) => {
        row.forEach((square, squareIndex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add(
                "square",
                (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark"
            );
            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

            // Add pieces
            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add(
                    "piece",
                    square.color === "w" ? "white" : "black"
                );
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color;

                // Drag Start
                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: squareIndex };
                        pieceElement.classList.add("dragging"); // Add visual feedback
                        e.dataTransfer.setData("text/plain", "");
                    }
                });

                // Drag End
                pieceElement.addEventListener("dragend", (e) => {
                    draggedPiece = null;
                    sourceSquare = null;
                    pieceElement.classList.remove("dragging");
                });

                squareElement.appendChild(pieceElement);
            }

            // Allow dropping on squares
            squareElement.addEventListener("dragover", (e) => e.preventDefault());

            // Handle drop (piece move)
            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };
                    handleMove(sourceSquare, targetSquare);
                }
            });

            boardElement.appendChild(squareElement);
        });
    });

    // Flip board for black player
    if (playerRole === "b") {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }
};

// Handle the actual move
const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: "q", // Auto-promote to queen if a pawn reaches the 8th rank
    };

    const moveResult = chess.move(move);

    if (moveResult) {
        socket.emit("move", move); // Send the move to the server
    } else {
        console.log("Invalid move!");
    }
};

// Convert piece object to Unicode
const getPieceUnicode = (piece) => {
    const unicodePieces = {
        p: "♙", r: "♖", n: "♘", b: "♗", q: "♕", k: "♔", // White pieces
        P: "♟", R: "♜", N: "♞", B: "♝", Q: "♛", K: "♚"  // Black pieces
    };
    return unicodePieces[piece.type] || "";
};

// Listen for role assignment
socket.on("playerRole", function (role) {
    playerRole = role;
    renderBoard();
});

// Listen for spectator role
socket.on("spectatorRole", function () {
    playerRole = null;
    renderBoard();
});

// Listen for board state updates from server
socket.on("boardState", function (fen) {
    chess.load(fen);
    renderBoard();
});

// Listen for a move from the server
socket.on("move", function (move) {
    chess.move(move);
    renderBoard();
});

// Initial rendering of the board
renderBoard();
