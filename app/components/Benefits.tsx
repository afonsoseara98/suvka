import type { LandingPage } from "@/app/types/landing";

type BenefitsProps = {
  items: LandingPage["benefits"];
};

export default function Benefits({
  items,
}: BenefitsProps) {
  return (
    <section className="relative mt-32 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute right-1/2 top-0 -z-10 h-96 w-96 translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />

      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <span className="inline-flex rounded-full border border-zinc-800 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-400 backdrop-blur">
            Why choose us
          </span>

          <h2 className="mt-6 text-5xl font-bold tracking-tight">
            Benefits that make
            <br />
            the difference
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            Designed to help businesses build trust, increase conversions
            and deliver a better experience to every visitor.
          </p>
        </div>

        <div className="mt-20 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {items.map((benefit, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur transition-all duration-300 hover:-translate-y-2 hover:border-zinc-600 hover:shadow-2xl"
            >
              {/* Glow */}
              <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl opacity-0 transition duration-500 group-hover:opacity-100" />

              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl text-black shadow-lg">
                  {benefit.icon}
                </div>

                <h3 className="mt-8 text-2xl font-bold">
                  {benefit.title}
                </h3>

                <p className="mt-4 leading-7 text-zinc-400">
                  {benefit.description}
                </p>

                <div className="mt-8 flex items-center gap-2 text-sm font-medium text-white">
                  Discover more

                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}