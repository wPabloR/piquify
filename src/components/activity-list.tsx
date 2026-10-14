import Link from "next/link";
import type { ActivityItem } from "@/domain/views";

export function ActivityList({
  items,
  empty,
}: {
  items: ActivityItem[];
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="mt-3 text-sm text-tinta-suave">{empty}</p>;
  }

  return (
    <ul className="mt-3 flex flex-col gap-3.5">
      {items.map((item) => {
        const content = (
          <>
            <span className="font-semibold text-abismo">{item.who}</span> {item.body}
            <span className="mt-0.5 block text-xs text-tinta-suave">{item.when}</span>
          </>
        );
        return (
          <li key={item.id} className="text-sm leading-snug text-tinta">
            {item.href ? (
              <Link href={item.href} className="block rounded-lg hover:bg-crema/80">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
