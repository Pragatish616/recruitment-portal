import React from "react";
import Link from "next/link";

const FOOTER_LINKS = [
  { name: "Home", path: "/" },
  { name: "Departments", path: "/departments" },
];

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <p>Organization &middot; Recruitment Portal &middot; {year}</p>
        <nav className="flex items-center gap-5">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.path}
              href={link.path}
              className="transition-colors hover:text-foreground"
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
