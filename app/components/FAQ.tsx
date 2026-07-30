type FAQProps = {
  items: {
    question: string;
    answer: string;
  }[];
};

export default function FAQ({ items }: FAQProps) {
  return (
    <section className="mt-24">

      <h2 className="mb-10 text-4xl font-bold">
        FAQ
      </h2>

      <div className="space-y-6">

        {items.map((item, index) => (

          <div
            key={index}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8"
          >

            <div className="font-bold">
              {item.question}
            </div>

            <div className="mt-4 text-zinc-400">
              {item.answer}
            </div>

          </div>

        ))}

      </div>

    </section>
  );
}