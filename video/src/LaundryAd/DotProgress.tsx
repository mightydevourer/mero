import React from "react";
import { theme } from "./content";

export const DotProgress: React.FC<{ total: number; active: number }> = ({
  total,
  active,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 64,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        gap: 14,
      }}
    >
      {new Array(total).fill(0).map((_, i) => (
        <div
          key={i}
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: i === active ? theme.gold : "rgba(255,255,255,0.85)",
            boxShadow: i === active ? `0 0 14px ${theme.gold}` : "none",
          }}
        />
      ))}
    </div>
  );
};
