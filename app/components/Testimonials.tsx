type TestimonialsProps = {
  items: {
    name: string;
    company: string;
    text: string;
  }[];
};

export default function Testimonials({
  items,
}: TestimonialsProps) {
  return (
    <section className="mt-24">

      <h2 className="mb-10 text-4xl font-bold">
        Testimonials
      </h2>

      <div className="grid gap-8 md:grid-cols-3">

        {items.map((item, index) => (

          <div
            key={index}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8"
          >

            <p className="text-zinc-300 leading-8">
              "{item.text}"
            </p>

            <div className="mt-8">

              <div className="font-bold">
                {item.name}
              </div>

              <div className="text-zinc-500">
                {item.company}
              </div>

            </div>

          </div>

        ))}

      </div>

    </section>
  );
}