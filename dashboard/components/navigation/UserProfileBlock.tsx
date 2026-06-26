"use client";

/**
 * UserProfileBlock is pinned to the bottom of the AppSidebar.
 *
 * Spec: Section 7.1
 * - Avatar: 32px circle, Indigo fill, white initials in Inter 500 12px
 * - Name: Inter 500 13px, white
 * - Role: Inter 400 11px, 65% white
 */
export interface UserProfileBlockProps {
  name: string;
  role: string;
  collapsed?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function UserProfileBlock({
  name,
  role,
  collapsed = false,
}: UserProfileBlockProps) {
  return (
    <div
      data-testid="user-profile-block"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-3) var(--space-4)",
        borderTop: "1px solid rgba(255, 255, 255, 0.12)",
        cursor: "pointer",
      }}
    >
      <div
        data-testid="user-avatar"
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "var(--color-brand-indigo)",
          color: "var(--color-text-inverse)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 500,
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {getInitials(name)}
      </div>
      {!collapsed && (
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <div
            data-testid="user-name"
            style={{
              color: "var(--color-text-inverse)",
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name}
          </div>
          <div
            data-testid="user-role"
            style={{
              color: "var(--color-nav-text-muted)",
              fontSize: 11,
              fontWeight: 400,
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {role}
          </div>
        </div>
      )}
    </div>
  );
}
