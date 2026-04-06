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
    <div
      style={{
        backgroundColor: "#16a34a",
        color: "white",
        padding: "20px 24px",
        borderRadius: "8px",
        width: "320px",
        fontSize: "16px",
        margin: "0",
      }}
    >
      <p style={{ margin: "0 0 16px 0", fontWeight: "600" }}>
        {inviteInfo.from.username} invited you to join a game {inviteInfo.gameId}
      </p>
      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={() => {
            onAccept();
            toast.dismiss(t.id);
          }}
          style={{
            backgroundColor: "white",
            color: "#16a34a",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            fontWeight: "600",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Join Game
        </button>
        <button
          onClick={() => {
            onDecline();
            toast.dismiss(t.id);
          }}
          style={{
            backgroundColor: "transparent",
            color: "white",
            border: "2px solid white",
            borderRadius: "6px",
            padding: "8px 16px",
            fontWeight: "600",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
