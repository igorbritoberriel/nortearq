import Link from "next/link";
import { Compass } from "lucide-react";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo">
      <Compass size={22} aria-hidden="true" />
      <span>
        Norte<strong>Arq</strong>
      </span>
    </Link>
  );
}
