type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className = "",
}: SectionHeadingProps) {
  return (
    <div
      className={`
        max-w-3xl
        ${align === "center" ? "mx-auto text-center" : "text-left"}
        ${className}
      `}
    >
      {eyebrow && (
        <div
          className="
            mb-4
            inline-flex
            items-center
            rounded-full
            border
            border-cyan-400/20
            bg-cyan-400/5
            px-3
            py-1.5
            text-xs
            font-semibold
            uppercase
            tracking-[0.18em]
            text-cyan-300
            backdrop-blur-xl
          "
        >
          <span className="mr-2 h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
          {eyebrow}
        </div>
      )}

      <h2
        className="
          text-3xl
          font-bold
          tracking-tight
          text-white
          sm:text-4xl
          lg:text-5xl
        "
      >
        {title}
      </h2>

      {description && (
        <p
          className="
            mt-4
            text-base
            leading-7
            text-slate-400
            sm:text-lg
          "
        >
          {description}
        </p>
      )}
    </div>
  );
}
