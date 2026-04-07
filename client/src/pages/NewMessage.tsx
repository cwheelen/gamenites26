import useNewMessageForm from "../hooks/useNewMessageForm";
import "./NewMessage.css";

export default function NewMessage() {
  const {
    loadError,
    filter,
    handleInput,
    openError,
    handleSelect,
    handleRemove,
    handleSubmit,
    handleCancel,
    filtered,
    friendUsername,
    selected,
    groupName,
    setGroupName,
  } = useNewMessageForm();

  return (
    <div className="content">
      <div className="spacedSection">
        <h2>New Message</h2>
        {loadError && <p className="error-message">{loadError}</p>}
        {openError && <p className="error-message">{openError}</p>}
        {!loadError && (
          <>
            {selected.length > 0 && (
              <div className="selectedChips">
                {selected.map((username) => (
                  <span key={username} className="chip">
                    {username}
                    <button
                      className="chipRemove"
                      onClick={() => handleRemove(username)}
                      aria-label={`Remove ${username}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            {selected.length >= 2 && (
              <input
                className="searchInput"
                type="text"
                placeholder="Group name (optional)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            )}
            <input
              className="searchInput"
              type="text"
              placeholder="Search friends..."
              value={filter}
              onChange={handleInput}
            />
            {filtered === null ? (
              <p>Loading...</p>
            ) : filtered.length === 0 ? (
              <p>{filter ? "No matching friends." : "You have no friends to message."}</p>
            ) : (
              <div className="friendSelectList">
                {filtered.map((req) => {
                  const name = friendUsername(req);
                  const isSelected = selected.includes(name);
                  return (
                    <div
                      key={req.requestId}
                      className={`friendSelectItem${isSelected ? " friendSelectItem--selected" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelect(name)}
                      onKeyDown={(e) => e.key === "Enter" && handleSelect(name)}
                    >
                      {name}
                      {isSelected && <span className="checkmark"> ✓</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        <div className="actions">
          <button
            className="primary narrow"
            onClick={handleSubmit}
            disabled={selected.length === 0}
          >
            Start Chat
          </button>
          <button className="narrow" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
