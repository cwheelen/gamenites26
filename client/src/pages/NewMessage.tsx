import useNewMessageForm from "../hooks/useNewMessageForm";
import "./NewMessage.css";

export default function NewMessage() {
  const {
    loadError,
    filter,
    handleInput,
    openError,
    handleSelect,
    handleCancel,
    filtered,
    friendUsername,
  } = useNewMessageForm();

  return (
    <div className="content">
      <div className="spacedSection">
        <h2>New Message</h2>
        {loadError && <p className="error-message">{loadError}</p>}
        {openError && <p className="error-message">{openError}</p>}
        {!loadError && (
          <>
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
                  return (
                    <div
                      key={req.requestId}
                      className="friendSelectItem"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelect(name)}
                      onKeyDown={(e) => e.key === "Enter" && handleSelect(name)}
                    >
                      {name}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
        <div className="actions">
          <button className="primary narrow" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
