const palette = [
  "bg-marea",
  "bg-madera",
  "bg-palma",
  "bg-coral",
  "bg-abismo",
  "bg-laguna",
] as const;

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  ring?: boolean;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function Avatar({ name, size = "md", ring = false }: AvatarProps) {
  const color = palette[name.charCodeAt(0) % palette.length];
  const sizes = {
    sm: "h-6 w-6 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-12 w-12 text-sm",
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-crema ${color} ${sizes[size]} ${ring ? "ring-2 ring-crema" : ""}`}
      title={name}
      aria-label={name}
    >
      {getInitials(name)}
    </span>
  );
}
