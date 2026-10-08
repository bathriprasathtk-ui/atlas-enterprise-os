"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";

import GradientButton from "@/components/ui/GradientButton";

const navItems = [
  { label: "Platform", href: "#platform" },
  { label: "AI Intelligence", href: "#ai" },
  { label: "Workflows", href: "#workflows" },
  { label: "Enterprise", href: "#enterprise" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-7xl px-6 pt-5 lg:px-8">
        <nav
          className="
            relative
            flex
            h-16
            items-center
            justify-between
            rounded-2xl
            border
            border-white/[0.08]
            bg-[#070b17]/70
            px-4
            shadow-[0_8px_40px_rgba(0,0,0,0.25)]
            backdrop-blur-2xl
            sm:px-5
          "
        >
          {/* Top reflection */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              inset-x-6
              top-0
              h-px
              bg-gradient-to-r
              from-transparent
              via-white/20
              to-transparent
            "
          />

          {/* Logo */}
          <Link
            href="/"
            className="
              group
              relative
              flex
              items-center
              gap-3
              outline-none
              focus-visible:ring-2
              focus-visible:ring-cyan-400/50
              focus-visible:ring-offset-4
              focus-visible:ring-offset-[#070b17]
            "
          >
            <div
              className="
                relative
                flex
                h-10
                w-10
                items-center
                justify-center
                overflow-hidden
                rounded-xl
                border
                border-cyan-400/20
                bg-gradient-to-br
                from-cyan-400/15
                via-blue-500/10
                to-violet-500/15
                shadow-[0_0_25px_rgba(34,211,238,0.12)]
                transition-all
                duration-300
                group-hover:border-cyan-400/40
                group-hover:shadow-[0_0_35px_rgba(34,211,238,0.2)]
              "
            >
              <div
                aria-hidden="true"
                className="
                  absolute
                  inset-0
                  bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_35%)]
                "
              />

              <span
                className="
                  relative
                  text-lg
                  font-black
                  tracking-tight
                  text-white
                "
              >
                A
              </span>
            </div>

            <div className="hidden sm:block">
              <div className="text-[15px] font-semibold tracking-tight text-white">
                Atlas
              </div>

              <div className="text-[9px] font-medium uppercase tracking-[0.2em] text-slate-500">
                Enterprise OS
              </div>
            </div>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="
                  rounded-xl
                  px-4
                  py-2.5
                  text-sm
                  font-medium
                  text-slate-400
                  transition-all
                  duration-200
                  hover:bg-white/[0.05]
                  hover:text-white
                "
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href="/login"
              className="
                rounded-xl
                px-4
                py-2.5
                text-sm
                font-semibold
                text-slate-300
                transition-colors
                hover:text-white
              "
            >
              Sign in
            </Link>

            <GradientButton
              type="button"
              className="rounded-xl px-4 py-2.5 text-sm"
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              Get Started
              <ArrowRight
                size={15}
                className="ml-2 transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </GradientButton>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            aria-label={
              open ? "Close navigation" : "Open navigation"
            }
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              border
              border-white/[0.08]
              bg-white/[0.04]
              text-slate-300
              transition-all
              hover:bg-white/[0.08]
              hover:text-white
              sm:hidden
            "
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Mobile navigation */}
          {open && (
            <div
              className="
                absolute
                left-0
                right-0
                top-[calc(100%+0.75rem)]
                rounded-2xl
                border
                border-white/[0.08]
                bg-[#070b17]/95
                p-3
                shadow-[0_20px_60px_rgba(0,0,0,0.4)]
                backdrop-blur-2xl
                sm:hidden
              "
            >
              <div className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="
                      block
                      rounded-xl
                      px-4
                      py-3
                      text-sm
                      font-medium
                      text-slate-400
                      transition-colors
                      hover:bg-white/[0.05]
                      hover:text-white
                    "
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="my-3 h-px bg-white/[0.08]" />

              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="
                  block
                  rounded-xl
                  px-4
                  py-3
                  text-sm
                  font-semibold
                  text-slate-300
                  hover:bg-white/[0.05]
                  hover:text-white
                "
              >
                Sign in
              </Link>

              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="
                  mt-1
                  flex
                  items-center
                  justify-center
                  rounded-xl
                  bg-gradient-to-r
                  from-blue-600
                  via-cyan-500
                  to-violet-500
                  px-4
                  py-3
                  text-sm
                  font-semibold
                  text-white
                "
              >
                Get Started
                <ArrowRight size={15} className="ml-2" />
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}