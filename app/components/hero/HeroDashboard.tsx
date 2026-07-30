import type { HeroData } from "@/app/types/landing";

import Badge from "../ui/Badge";
import PrimaryButton from "../ui/PrimaryButton";
import SecondaryButton from "../ui/SecondaryButton";
import MetricCard from "../ui/MetricCard";
import GlowBackground from "../ui/GlowBackground";
import LogoCloud from "../ui/LogoCloud";

type Props = {
  data: HeroData;
};

export default function HeroDashboard({
  data,
}: Props) {

  return (

    <GlowBackground>

      <section className="relative overflow-hidden py-28">

        <div className="mx-auto grid max-w-7xl items-center gap-20 lg:grid-cols-2">

          {/* LEFT */}

          <div>

            <Badge>
              ✨ {data.badge}
            </Badge>

            <h1 className="mt-8 text-6xl font-black leading-none tracking-tight">

              {data.title}

              <span className="block bg-gradient-to-r from-indigo-400 to-violet-500 bg-clip-text text-transparent">

                {data.highlightWord}

              </span>

            </h1>

            <p className="mt-8 max-w-xl text-xl leading-8 text-zinc-400">

              {data.subtitle}

            </p>

            <div className="mt-10 flex flex-wrap gap-4">

              <PrimaryButton>

                {data.primaryCTA}

              </PrimaryButton>

              <SecondaryButton>

                {data.secondaryCTA}

              </SecondaryButton>

            </div>

          </div>

          {/* RIGHT */}

          <div className="relative">

            <div className="rounded-[36px] border border-white/10 bg-zinc-900 p-8 shadow-2xl">

              <div className="flex items-center justify-between">

                <div className="text-lg font-semibold">

                  Dashboard

                </div>

                <div className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-400">

                  Live

                </div>

              </div>

              <div className="mt-10 grid gap-6">

                {data.stats.map((item, index) => (

                  <MetricCard
                    key={index}
                    value={item.value}
                    label={item.label}
                  />

                ))}

              </div>

            </div>

            {/* Floating Cards */}

            <div className="absolute -left-10 top-16 rounded-2xl border border-white/10 bg-zinc-900/90 p-5 backdrop-blur-xl">

              <div className="text-sm text-zinc-400">

                Revenue

              </div>

              <div className="mt-2 text-3xl font-black">

                +48%

              </div>

            </div>

            <div className="absolute -right-8 bottom-10 rounded-2xl border border-white/10 bg-zinc-900/90 p-5 backdrop-blur-xl">

              <div className="text-sm text-zinc-400">

                Conversion

              </div>

              <div className="mt-2 text-3xl font-black">

                7.3%

              </div>

            </div>

          </div>

        </div>

        <LogoCloud />

      </section>

    </GlowBackground>

  );

}