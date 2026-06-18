import Link from "next/link";
import { Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-400">
      <Link href="/" className="flex items-center gap-1 hover:text-slate-600 transition-colors">
        <Home className="w-3 h-3" />
        <span>Home</span>
      </Link>
      {items.map((item, idx) => (
        <span key={idx} className="flex items-center gap-1.5">
          <span>/</span>
          {item.href ? (
            <Link href={item.href} className="hover:text-slate-600 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-500 line-clamp-1">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
