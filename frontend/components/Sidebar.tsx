"use client";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import clsx from "clsx";

interface SidebarProps {
  role: string;
  fullName: string;
}

const studentLinks = [
  { href: "/student", label: "Browse jobs" },
  { href: "/student/referrals", label: "My referrals" },
  { href: "/student/profile", label: "My profile" },
  { href: "/student/roadmap", label: "Career roadmap" },
  { href: "/student/career-chat", label: "Career advisor" },
  { href: "/student/interview-prep", label: "Interview prep" },
];

const alumniLinks = [
  { href: "/alumni", label: "Requests" },
  { href: "/alumni/jobs", label: "Post jobs" },
  { href: "/alumni/profile", label: "My profile" },
];

const adminLinks = [{ href: "/dashboard", label: "Overview" }];

export default function Sidebar({ role, fullName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const links =
    role === "alumni"
      ? alumniLinks
      : role === "admin"
        ? adminLinks
        : studentLinks;

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-56 bg-gray-900 flex flex-col min-h-screen">
      {/* Brand + user */}
      <div className="px-4 pt-5 pb-4 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500" />
          <span className="text-xs font-semibold text-indigo-400 tracking-wide uppercase">
            RefPlatform
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{fullName}</p>
            <span className="inline-block mt-0.5 text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full capitalize">
              {role}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={clsx(
              "flex items-center px-3 py-2.5 rounded-xl text-sm transition-colors",
              pathname === link.href || pathname.startsWith(link.href + "/")
                ? "bg-indigo-600 text-white font-medium"
                : "text-gray-400 hover:bg-gray-800 hover:text-white",
            )}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-red-400 rounded-xl transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
