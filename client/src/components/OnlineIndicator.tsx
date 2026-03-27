export default function OnlineIndicator({ status }: { status: "online" | "offline" }) {
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
