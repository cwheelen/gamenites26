import useSocketsForPresence from "../hooks/useSocketsForPresence";

export default function OnlineIndicator({ username }: { username: string }) {
  const { status } = useSocketsForPresence(username);
  const color = status === "online" ? "green" : "red";
  return (
    <>
      <svg width="16" height="16">
        <circle cx="8" cy="8" r="8" stroke={color} strokeWidth="1" fill="none" />
        <circle cx="8" cy="8" r="6" fill={color} />
      </svg>
    </>
  );
}
