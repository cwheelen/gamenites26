import type { SafeUserInfo } from "@gamenite/shared";
import { useEffect, useState } from "react";
import useTimeSince from "../hooks/useTimeSince";
import { getUserById } from "../services/userService";
import useSocketsForPresence from "../hooks/useSocketsForPresence";
import OnlineIndicator from "../components/OnlineIndicator";

interface ViewProfileProps {
  username: string;
}
export default function ViewProfile({ username }: ViewProfileProps) {
  const [componentState, setComponentState] = useState<
    { type: "waiting" } | { type: "error"; msg: string } | { type: "profile"; user: SafeUserInfo }
  >({ type: "waiting" });
  const timeSince = useTimeSince();
  const { status: presenceStatus } = useSocketsForPresence(username);

  useEffect(() => {
    let cancel = false;

    getUserById(username)
      .then((response) => {
        if (cancel) return;
        if ("error" in response) {
          setComponentState({ type: "error", msg: response.error });
        } else {
          setComponentState({
            type: "profile",
            user: response,
          });
        }
      })
      .catch((err) => {
        if (cancel) return;
        setComponentState({ type: "error", msg: `${err}` });
      });

    return () => {
      cancel = true;
    };
  }, [username]);

  switch (componentState.type) {
    case "error":
      return <div style={{ color: "#f00" }}>{componentState.msg}</div>;
    case "waiting":
      return <div>Loading...</div>;
    case "profile":
      return (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h2>Profile for {componentState.user.display} </h2>
            <OnlineIndicator status={presenceStatus} />
          </div>

          <div>
            <ul>
              <li>Username: {componentState.user.username}</li>
              <li>Account created {timeSince(componentState.user.createdAt)}</li>
              {presenceStatus === "online" ? (
                <li>Last online: Currently online</li>
              ) : (
                <li>
                  Last online:{" "}
                  {componentState.user.lastOnline
                    ? timeSince(componentState.user.lastOnline)
                    : "N/A"}
                </li>
              )}
            </ul>
          </div>
        </>
      );
  }
}
