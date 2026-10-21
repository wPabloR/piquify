/** Marca «Mesa» — playground como marco, fichas como amigos en la mesa. */
export function PiquifyLogo({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <rect
        x="18"
        y="18"
        width="64"
        height="64"
        rx="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <g fill="currentColor">
        <circle cx="38" cy="64" r="8" />
        <circle cx="66" cy="40" r="6" />
        <circle cx="46" cy="42" r="4" />
      </g>
    </svg>
  );
}

export function PiquifyLogoMark({ className }: { className?: string }) {
  return (
    <PiquifyLogo
      className={`h-9 w-9 shrink-0 text-abismo${className ? ` ${className}` : ""}`}
      title="Piquify"
    />
  );
}
