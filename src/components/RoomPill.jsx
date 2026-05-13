import React from "react";
import EntityPill from "components/EntityPill";

export default function RoomPill({
  roomId,
  label,
  roomName = null,
  roomCode = null,
  className = "",
  fallback = "-",
  modalData = null,
}) {
  const displayLabel = label || roomCode || roomName || fallback;

  if (!roomId) {
    return <span className={className}>{displayLabel}</span>;
  }

  return (
    <EntityPill
      type="room"
      id={roomId}
      label={displayLabel}
      className={className}
      modalData={{
        roomName,
        roomCode,
        ...(modalData || {}),
      }}
    />
  );
}