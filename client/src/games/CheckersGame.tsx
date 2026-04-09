import React, { useState } from "react";
import type { CheckersView, CheckersMove, CheckersPlayer } from "@gamenite/shared";
import type { GameProps } from "../util/types";
import "./BoardGame.css";
import "./CheckersGame.css";

function playerDisplay(index: number, players: { display: string }[], userPlayerIndex: number) {
  // bot
  if (index === 1 && players.length === 1) return "Bot 🤖";
  return index === userPlayerIndex ? "you" : players[index]?.display || `Player ${index + 1}`;
}

function renderPiece(piece: { player: CheckersPlayer; isKing: boolean } | null) {
  if (!piece) return null;
  const color = piece.player === 0 ? "red" : "black";
  const baseEmoji = piece.player === 0 ? "🔴" : "⚫";
  return (
    <span className={`checkers-piece ${color}`} title={piece.isKing ? `${color} king` : color}>
      <span className="piece-emoji">{baseEmoji}</span>
      {piece.isKing && (
        <span className="king-crown" title="King">
          ♕
        </span>
      )}
    </span>
  );
}

export default function CheckersGame({
  view,
  players,
  userPlayerIndex,
  makeMove,
}: GameProps<CheckersView, CheckersMove>) {
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);

  const isMyTurn = userPlayerIndex === view.nextPlayer;

  // Find all pieces that have at least one legal move
  const movablePositions = view.legalMoves.map((move) => ({
    row: move.fromRow,
    col: move.fromCol,
  }));
  const isMovable = (row: number, col: number) =>
    movablePositions.some((pos) => pos.row === row && pos.col === col);

  // Find all legal moves from the selected piece
  const legalFrom = selected
    ? view.legalMoves.filter(
        (move) => move.fromRow === selected.row && move.fromCol === selected.col,
      )
    : [];

  function handleCellClick(row: number, col: number) {
    if (!isMyTurn) return;
    const piece = view.board[row][col];
    if (piece && piece.player === userPlayerIndex && isMovable(row, col)) {
      setSelected({ row, col });
    } else if (selected) {
      // Try to find a legal move from selected to here (support multi-step moves)
      const move = legalFrom.find((m) => {
        const lastStep = m.steps[m.steps.length - 1];
        return lastStep.row === row && lastStep.col === col;
      });
      if (move) {
        makeMove(move);
        setSelected(null);
      }
    }
  }

  function isLegalDest(row: number, col: number) {
    if (!selected) return false;
    // Highlight the final destination of any legal move from the selected piece
    return legalFrom.some((move) => {
      const lastStep = move.steps[move.steps.length - 1];
      return lastStep.row === row && lastStep.col === col;
    });
  }

  function statusMessage() {
    if (view.winner !== null) {
      if (view.isDraw) return "It's a draw!";
      return view.winner === userPlayerIndex
        ? "You win!"
        : `${playerDisplay(view.winner, players, userPlayerIndex)} wins!`;
    }
    if (userPlayerIndex < 0)
      return `Watching — ${playerDisplay(view.nextPlayer, players, userPlayerIndex)}'s turn`;
    return isMyTurn
      ? "Your turn — select a piece"
      : `Waiting for ${playerDisplay(view.nextPlayer, players, userPlayerIndex)}…`;
  }

  return (
    <div className="content spacedSection">
      <h2>Checkers</h2>
      <div>
        <b>{statusMessage()}</b>
      </div>
      <div style={{ margin: "1rem 0" }}>
        <table className="board-table">
          <thead>
            <tr>
              <th className="board-label" />
              {Array.from({ length: 8 }, (_, col) => (
                <th className="board-label" key={col}>
                  {String.fromCharCode(65 + col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.board.map((rowArr, row) => (
              <tr key={row}>
                <th className="board-label">{row + 1}</th>
                {rowArr.map((cell, col) => {
                  const dark = (row + col) % 2 === 1;
                  const isSelected = selected && selected.row === row && selected.col === col;
                  const isLegal = isLegalDest(row, col);
                  const canMove =
                    isMyTurn && cell && cell.player === userPlayerIndex && isMovable(row, col);
                  return (
                    <td
                      key={col}
                      className={`cell${dark ? " cell-dark" : " cell-light"}${isSelected ? " cell-selected" : ""}${isLegal ? " cell-legal" : ""}${canMove ? " cell-movable" : ""}`}
                      style={{
                        cursor: dark && isMyTurn ? "pointer" : undefined,
                        background: isSelected
                          ? "#ffe082"
                          : isLegal
                            ? "#b2dfdb"
                            : canMove
                              ? "#ffd54f"
                              : undefined,
                        border: canMove ? "2px solid #ff9800" : undefined,
                      }}
                      onClick={() => dark && handleCellClick(row, col)}
                    >
                      {renderPiece(cell)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <b>How to play:</b>
        <ul>
          <li>Click your piece to select it, then click a highlighted square to move.</li>
          <li>
            Only legal moves are highlighted. Multi-jump moves are supported: click the final
            highlighted square to complete a jump chain.
          </li>
        </ul>
      </div>
    </div>
  );
}
