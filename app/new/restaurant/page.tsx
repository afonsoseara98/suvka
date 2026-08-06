"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RequireAuth from "@/app/components/RequireAuth";
import {
  CUISINES,
  STYLES,
  DESCRIPTION_MAX,
  validateRestaurantInput,
  isValid,
  firstErrorField,
  LIMITS,
  type FieldErrors,
  type RestaurantInput,
} from "@/app/lib/restaurant/input";
import { LANGUAGES, DEFAULT_LANGUAGE, type SiteLanguage } from "@/app/lib/restaurant/labels";

const EMPTY: RestaurantInput = {
  name: "",
  cuisine: "Portuguese",
  address: "",
  phone: "",
  schedule: "",
  dishes: [
    { name: "", price: "", description: "" },
    { name: "", price: "", description: "" },
    { name: "", price: "", description: "" },
  ],
  hasDelivery: false,
  style: "Modern",
  description: "",
  email: "",
  language: DEFAULT_LANGUAGE,
  existingWebsite: "",
};

const label = "block text-sm font-medium text-zinc-300";
const field =
  "mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white placeholder-zinc-600 outline-none transition focus:border-zinc-600";
const errorText = "mt-1 text-sm text-red-400";

// Replaces "describe your business" for restaurants. Every field maps to one place on the
// finished page, so there is nothing for the system to infer and nothing for it to invent.
// The labels say what each field is FOR rather than naming it, because an owner filling
// this in is deciding what to type, not identifying a database column.
function RestaurantForm() {
  const router = useRouter();
  const [input, setInput] = useState<RestaurantInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  function set<K extends keyof RestaurantInput>(key: K, value: RestaurantInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
    // Clear the error the moment the person addresses it, rather than making them submit
    // again to find out whether they fixed it.
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  function setDish(index: number, key: keyof RestaurantInput["dishes"][number], value: string) {
    setInput((prev) => ({
      ...prev,
      dishes: prev.dishes.map((dish, i) => (i === index ? { ...dish, [key]: value } : dish)),
    }));
    setErrors((prev) => (prev.dishes ? { ...prev, dishes: undefined } : prev));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFailure(null);

    const found = validateRestaurantInput(input);
    setErrors(found);
    if (!isValid(found)) {
      // Move to the first thing that needs attention. On a phone an error four fields
      // above the button is invisible, and a button that appears to do nothing is a form
      // people abandon.
      const field = firstErrorField(found);
      const element = field ? document.getElementById(String(field)) : null;
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      (element as HTMLElement | null)?.focus?.();
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data?.errors) setErrors(data.errors);
        else setFailure(data?.message ?? "Algo correu mal.");
        return;
      }

      router.push(`/editor/${data.id}`);
    } catch (error) {
      console.error(error);
      setFailure("Não foi possível contactar o servidor. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white">
          ← Voltar
        </Link>

        <h1 className="mt-6 text-3xl font-bold">O site do seu restaurante</h1>
        <p className="mt-2 text-zinc-400">
          Tudo o que escrever aqui aparece no site. Mais nada. Não inventamos avaliações,
          classificações nem números em seu nome.
        </p>

        <fieldset disabled={submitting} className="contents">
        <form onSubmit={submit} className="mt-10 space-y-8" noValidate>
          <div>
            <label className={label} htmlFor="name">
              Nome do restaurante
            </label>
            <input id="name" maxLength={LIMITS.name} className={field} value={input.name} onChange={(e) => set("name", e.target.value)} placeholder="Taberna do Bairro" />
            {errors.name && <p className={errorText}>{errors.name}</p>}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="cuisine">
                Tipo de cozinha
              </label>
              <select id="cuisine" className={field} value={input.cuisine} onChange={(e) => set("cuisine", e.target.value as RestaurantInput["cuisine"])}>
                {CUISINES.map((cuisine) => (
                  <option key={cuisine} value={cuisine}>
                    {cuisine}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={label} htmlFor="style">
                Estilo
              </label>
              <select id="style" className={field} value={input.style} onChange={(e) => set("style", e.target.value as RestaurantInput["style"])}>
                {STYLES.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={label} htmlFor="language">
              Língua do site
            </label>
            <select
              id="language"
              className={field}
              value={input.language}
              onChange={(e) => set("language", e.target.value as SiteLanguage)}
            >
              {LANGUAGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">Em que língua os seus clientes leem o site.</p>
          </div>

          <div>
            <label className={label} htmlFor="address">
              Morada
            </label>
            <input id="address" maxLength={LIMITS.address} className={field} value={input.address} onChange={(e) => set("address", e.target.value)} placeholder="Rua das Flores 112, Porto" />
            {errors.address && <p className={errorText}>{errors.address}</p>}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="phone">
                Telefone
              </label>
              <input id="phone" maxLength={LIMITS.phone} className={field} value={input.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+351 220 145 880" />
              {errors.phone && <p className={errorText}>{errors.phone}</p>}
            </div>

            <div>
              <label className={label} htmlFor="schedule">
                Horário
              </label>
              <textarea
                id="schedule"
                rows={3}
                maxLength={LIMITS.schedule}
                className={field}
                value={input.schedule}
                onChange={(e) => set("schedule", e.target.value)}
                placeholder={"Terça a domingo\n12:00–15:00 e 19:00–22:30\nEncerrado à segunda"}
              />
              {errors.schedule && <p className={errorText}>{errors.schedule}</p>}
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className={label}>Três pratos mais pedidos</span>
              <span className="text-xs text-zinc-500">Ficam na ementa</span>
            </div>

            <div className="mt-3 space-y-3">
              {input.dishes.map((dish, index) => (
                <div key={index} className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                  <input
                    className={field.replace("mt-2 ", "")}
                    value={dish.name}
                    onChange={(e) => setDish(index, "name", e.target.value)}
                    placeholder={index === 0 ? "Bacalhau à Braga" : "Nome do prato"}
                    aria-label={`Prato ${index + 1} — nome`}
                  />
                  <input
                    className={field.replace("mt-2 ", "")}
                    value={dish.price}
                    onChange={(e) => setDish(index, "price", e.target.value)}
                    placeholder="18,50 €"
                    aria-label={`Prato ${index + 1} — preço`}
                  />
                  <input
                    className={`${field.replace("mt-2 ", "")} sm:col-span-2`}
                    value={dish.description}
                    onChange={(e) => setDish(index, "description", e.target.value)}
                    placeholder="Descrição curta (opcional)"
                    aria-label={`Prato ${index + 1} — descrição`}
                  />
                </div>
              ))}
            </div>
            {errors.dishes && <p className={errorText}>{errors.dishes}</p>}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                maxLength={LIMITS.email}
                className={field}
                value={input.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="reservas@tabernadobairro.pt"
              />
              <p className="mt-1 text-xs text-zinc-500">Aparece no site para os clientes o contactarem.</p>
              {errors.email && <p className={errorText}>{errors.email}</p>}
            </div>

            <div>
              <label className={label} htmlFor="existingWebsite">
                Site atual <span className="font-normal text-zinc-500">— opcional</span>
              </label>
              <input
                id="existingWebsite"
                maxLength={LIMITS.existingWebsite}
                className={field}
                value={input.existingWebsite}
                onChange={(e) => set("existingWebsite", e.target.value)}
                placeholder="tabernadobairro.pt"
              />
              {/* Never rendered on the finished site. Asked because replacing a site and
                  being someone's first site are different products, and we do not yet know
                  which one this is. */}
              <p className="mt-1 text-xs text-zinc-500">Não aparece em lado nenhum. É só para sabermos se já tem site.</p>
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={input.hasDelivery}
              onChange={(e) => set("hasDelivery", e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-950"
            />
            Fazemos take-away ou entregas
          </label>

          <div>
            <div className="flex items-baseline justify-between">
              <label className={label} htmlFor="description">
                Uma frase sobre a casa (opcional)
              </label>
              <span className="text-xs text-zinc-500">
                {input.description.length}/{DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              id="description"
              rows={2}
              maxLength={DESCRIPTION_MAX}
              className={field}
              value={input.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Uma sala pequena na Rua das Flores, a cozinhar o que o mercado dá."
            />
            {errors.description && <p className={errorText}>{errors.description}</p>}
          </div>

          {failure && (
            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {failure}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-white px-6 py-4 font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {submitting ? "A criar o seu site…" : "Criar o meu site"}
          </button>

          {/* Says what is happening during the couple of seconds the photographs are being
              fetched, so the wait reads as work rather than as a hang. */}
          {submitting && (
            <p className="text-center text-sm text-zinc-500">A escolher fotografias e a montar as páginas. Demora poucos segundos.</p>
          )}
        </form>
        </fieldset>
      </div>
    </main>
  );
}

export default function NewRestaurantPage() {
  return (
    <RequireAuth>
      <RestaurantForm />
    </RequireAuth>
  );
}
