import useNewGameForm from "../hooks/useNewGameForm.ts";
import { gameNames } from "../util/consts.ts";

export default function NewGame() {
  const {
    gameKey,
    gameMode,
    supportsBotMode,
    handleInputChange,
    handleModeChange,
    err,
    handleSubmit,
    isGuessBotGame,
    numBots,
    handleNumBotsChange,
  } = useNewGameForm();

  return (
    <form className="content spacedSection" onSubmit={handleSubmit}>
      <h2>Create new game</h2>

      {/* Game selection */}
      <div>
        <select value={gameKey} aria-label="Game selection" onChange={(e) => handleInputChange(e)}>
          <option value="">— Select a game —</option>
          {Object.entries(gameNames).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Mode selection — only shown for games that support a bot opponent */}
      {supportsBotMode && (
        <div>
          <p>Who do you want to play against?</p>
          <div className="modeSelection">
            <button
              type="button"
              className={`modeButton ${gameMode === "player" ? "active" : ""}`}
              onClick={() => handleModeChange("player")}
              aria-pressed={gameMode === "player"}
            >
              👤 vs Player
            </button>
            <button
              type="button"
              className={`modeButton ${gameMode === "bot" ? "active" : ""}`}
              onClick={() => handleModeChange("bot")}
              aria-pressed={gameMode === "bot"}
            >
              🤖 vs Bot
            </button>
          </div>
          {/* Show number of bots selector for Number Guesser bot games */}
          {isGuessBotGame && (
            <div style={{ marginTop: 12 }}>
              <label>
                Number of bots:
                <select value={numBots} onChange={handleNumBotsChange} style={{ marginLeft: 8 }}>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
      )}

      {err && <p className="error-message">{err}</p>}

      <div>
        <button className="primary narrow">
          {gameMode === "bot" ? "Play vs Bot" : "Create New Game"}
        </button>
      </div>
    </form>
  );
}
