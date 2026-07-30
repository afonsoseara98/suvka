import GlassCard from "./GlassCard";

type Props = {
  value: string;
  label: string;
};

export default function MetricCard({
  value,
  label,
}: Props) {
  return (
    <GlassCard>
      <div className="text-3xl font-black">
        {value}
      </div>

      <div className="mt-2 text-zinc-400">
        {label}
      </div>
    </GlassCard>
  );
}