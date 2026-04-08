import type { GuessMove, GuessView } from "@gamenite/shared";
import type { GameProps } from "../util/types.ts";
import { useState } from "react";

export default function GuessGame({
  view,
  players,
  userPlayerIndex,
  makeMove,
}: GameProps<GuessView, GuessMove>) {
  const [guess, setGuess] = useState(16);
  const playerHasGuessed = view.finished || view.guesses[userPlayerIndex] !== false;

  /** Checks if a best is the best guess */
  function isBestGuess(index: number) {
    if (!view.finished) return false;
    const guess = view.guesses[index];
    for (const otherGuess of view.guesses) {
      if (Math.abs(otherGuess - view.secret) < Math.abs(guess - view.secret)) {
        return false;
      }
    }
    return true;
  }

  /** Get the response text for a specific player's guess */
  function getGuessText(guess: boolean | number, index: number) {
    if (index === userPlayerIndex) {
      if (view.finished) return `You guessed ${guess}`;
      return view.myGuess ? `You guessed ${view.myGuess}` : "You haven't guessed yet";
    }
    let name = players[index]?.display;
    if (!name) {
      const botCount = view.guesses.length - players.length;
      if (botCount > 1) {
        // Label bots if there are multiple bots
        const botIndex = index - players.length;
        name = botIndex >= 0 ? `Bot #${botIndex + 1}` : "Bot";
      } else {
        // Only one bot: just label as 'Bot'
        name = "Bot";
      }
    }
    if (guess === false) {
      return `${name} hasn't guessed yet`;
    }
    if (guess === true) {
      return `${name} has guessed`;
    }
    return `${name} guessed ${guess}`;
  }

  return (
    <div className="content spacedSection">
      <div>In the guessing game, players guess a number between 1 and 100. The closest wins!</div>
      <ul>
        {view.guesses.map((guess, index) => (
          <li key={index}>
            {getGuessText(guess, index)}
            {isBestGuess(index) && " 👑"}
          </li>
        ))}
      </ul>
      <hr />
      {view.finished && `Game over! The secret was ${view.secret}`}
      {!view.finished &&
        userPlayerIndex >= 0 &&
        (playerHasGuessed ? (
          <>Waiting for other players...</>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              makeMove(guess);
            }}
          >
            <div>Guess a number between 1 and 100!</div>
            <input
              type="range"
              value={guess}
              min={1}
              max={100}
              step={1}
              onChange={(e) => setGuess(parseInt(e.target.value))}
            />
            <div>Ready to guess {guess}?</div>
            <button className="primary narrow">Submit Guess</button>
          </form>
        ))}
    </div>
  );
}
