import type { Connect4View, Connect4Move, Connect4Token } from "@gamenite/shared";
import type { GameProps } from "../util/types.ts";
import "./Connect4Game.css";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ROWS = 6;
const COLS = 7;

// eslint-disable-next-line @typescript-eslint/naming-convention
const TOKEN_COLORS: Record<Connect4Token, string> = {
  0: "red",
  1: "yellow",
};

export default function Connect4Game({
  view,
  players,
  userPlayerIndex,
  makeMove,
}: GameProps<Connect4View, Connect4Move>) {
  const { board, nextPlayer, winner } = view;
  const isMyTurn = userPlayerIndex === nextPlayer;
  const gameOver = winner !== null || board[0].every((cell) => cell !== null);

  /**
   * Returns a display name for the player at `index`.
   * Player 1 is the bot when the players array has only one entry (the human).
   */
  function playerLabel(index: number) {
    // ← new: detect bot
    if (index === 1 && players.length === 1) return "Bot 🤖";
    if (index === userPlayerIndex) return "you";
    return players[index]?.display ?? `Player ${index + 1}`;
  }

  function statusMessage() {
    if (winner !== null) {
      return winner === userPlayerIndex ? "You won! 🎉" : `${playerLabel(winner)} won!`;
    }
    if (gameOver) return "It's a draw!";
    if (userPlayerIndex < 0) return `Watching — ${playerLabel(nextPlayer)}'s turn`;
    return isMyTurn ? "Your turn — pick a column" : `Waiting for ${playerLabel(nextPlayer)}…`;
  }

  return (
    <div className="content spacedSection">
      <div>
        Connect 4: drop tokens into columns and be the first to get four in a row — horizontally,
        vertically, or diagonally.
      </div>

      {/* Bot: iterate over token indices instead of players array so the
           bot slot always renders even though it has no SafeUserInfo entry */}
      <div className="c4-legend">
        {([0, 1] as Connect4Token[]).map((i) => (
          <span key={i} className="c4-legend-item">
            <span className={`c4-chip c4-chip--${TOKEN_COLORS[i]}`} />
            {playerLabel(i)}
          </span>
        ))}
      </div>

      <hr />
      <div className="c4-status">{statusMessage()}</div>

      <div className="c4-board" role="grid">
        {/* Column-drop buttons */}
        {userPlayerIndex >= 0 && !gameOver && (
          <div className="c4-col-buttons" role="row">
            {Array.from({ length: COLS }, (_, col) => {
              const colFull = board[0][col] !== null;
              return (
                <button
                  key={col}
                  className="c4-col-btn"
                  disabled={!isMyTurn || colFull}
                  onClick={() => makeMove(col)}
                  aria-label={`Drop in column ${col + 1}`}
                >
                  ▼
                </button>
              );
            })}
          </div>
        )}

        {/* Grid cells */}
        {board.map((row, r) => (
          <div key={r} className="c4-row" role="row">
            {row.map((cell, c) => (
              <div
                key={c}
                className="c4-cell"
                role="gridcell"
                aria-label={cell === null ? "empty" : `player ${cell + 1}`}
              >
                {cell !== null && <span className={`c4-chip c4-chip--${TOKEN_COLORS[cell]}`} />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
