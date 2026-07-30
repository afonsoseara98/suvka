type PricingProps = {
  plans: {
    name: string;
    price: string;
    features: string[];
  }[];
};

export default function Pricing({
  plans,
}: PricingProps) {
  return (
    <section className="mt-24">

      <h2 className="mb-10 text-4xl font-bold">
        Pricing
      </h2>

      <div className="grid gap-8 md:grid-cols-3">

        {plans.map((plan, index) => (

          <div
            key={index}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-10"
          >

            <h3 className="text-3xl font-bold">
              {plan.name}
            </h3>

            <div className="mt-4 text-5xl font-bold">
              €{plan.price}
            </div>

            <div className="mt-8 space-y-3">

              {plan.features.map((feature, i) => (

                <div key={i}>
                  ✓ {feature}
                </div>

              ))}

            </div>

          </div>

        ))}

      </div>

    </section>
  );
}