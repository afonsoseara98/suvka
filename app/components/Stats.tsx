type StatsProps = {
  items: {
    value: string;
    label: string;
  }[];
};

export default function Stats({ items }: StatsProps) {
  return (
    <section className="mt-24">
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center"
          >
            <div className="text-5xl font-bold text-white">
              {item.value}
            </div>

            <p className="mt-3 text-zinc-400">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}