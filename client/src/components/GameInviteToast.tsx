import type { InviteInfo } from "@gamenite/shared";
import toast, { type Toast } from "react-hot-toast";

interface Props {
  t: Toast;
  inviteInfo: InviteInfo;
  onAccept: () => void;
  onDecline: () => void;
}

export default function GameInviteToast({ t, inviteInfo, onAccept, onDecline }: Props) {
  return (
    <div>
      <p>
        {inviteInfo.from.username} invited you to join game {inviteInfo.gameId}
      </p>
      <button
        onClick={() => {
          onAccept();
          toast.dismiss(t.id);
        }}
      >
        Join Game
      </button>
      <button
        onClick={() => {
          onDecline();
          toast.dismiss(t.id);
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
