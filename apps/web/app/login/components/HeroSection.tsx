export default function HeroSection() {
  return (
    <section className="max-w-xl">
      {/* Brand */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <span className="text-lg font-bold text-white">A</span>
        </div>

        <div>
          <p className="text-sm font-semibold tracking-tight text-white">
            Atlas
          </p>

          <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-slate-500">
            Enterprise OS
          </p>
        </div>
      </div>

      {/* Heading */}
      <h1 className="text-5xl font-bold leading-[1.04] tracking-[-0.045em] text-white sm:text-6xl lg:text-[66px]">
        The Enterprise
        <br />
        Source of{" "}
        <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
          Truth.
        </span>
      </h1>

      {/* Description */}
      <p className="mt-7 max-w-lg text-base leading-7 text-slate-400 sm:text-lg">
        Unify knowledge, automate work, and build the future together
        with an intelligent operating system designed for modern
        organizations.
      </p>

      {/* Back */}
      <div className="mt-9">
        <a
          href="/"
          className="group inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-violet-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-cyan-500/25"
        >
          Back to Atlas

          <span className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </a>
      </div>
    </section>
  );
}