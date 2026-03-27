import useNewGameForm from "../hooks/useNewGameForm.ts";
import { gameNames } from "../util/consts.ts";

export default function NewGame() {
  const { gameKey, vsBot, handleInputChange, handleVsBotChange, err, handleSubmit } =
    useNewGameForm();

  return (
    <form className="content spacedSection" onSubmit={handleSubmit}>
      <h2>Create new game</h2>
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

      {/* Connect 4 bot */}
      {gameKey === "connect4" && (
        <div>
          <label>
            <input type="checkbox" checked={vsBot} onChange={handleVsBotChange} /> Play against a
            bot (CPU)
          </label>
        </div>
      )}

      {err && <p className="error-message">{err}</p>}
      <div>
        <button className="primary narrow">Create New Game</button>
      </div>
    </form>
  );
}
