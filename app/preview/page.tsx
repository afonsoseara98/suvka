import { notFound } from "next/navigation";
import { BENCHMARK_BUSINESSES } from "@/app/benchmark/businesses";
import { buildPipeline } from "@/app/ai/builders/PipelineBuilder";
import { selectAnchor } from "@/app/styles/palettes";

// CONTACT SHEET - development only.
//
// Judging output quality one page at a time hides the thing that matters most: whether
// twenty businesses look like twenty products or like one template filled in twenty times.
// That is only visible side by side, at a size where composition and colour read but copy
// does not - the same reason a photographer prints a contact sheet before choosing a frame.
//
// Each cell is the real page, rendered by the real pipeline through /preview/[id], scaled
// down. Nothing here is a mock-up of a page; it IS the page.
export const dynamic = "force-dynamic";

const FRAME_WIDTH = 1440;
const FRAME_HEIGHT = 4200;
const SCALE = 0.19;

export default function ContactSheet() {
  if (process.env.NODE_ENV === "production") notFound();

  const cells = BENCHMARK_BUSINESSES.map((business) => {
    const pipeline = buildPipeline(business.prompt);
    return {
      id: business.id,
      label: business.label,
      anchor: selectAnchor(pipeline.dna),
      heroVariant: pipeline.sections.find((s) => s.type === "hero")?.variant ?? "-",
      sectionCount: pipeline.sections.length,
    };
  });

  return (
    <main style={{ background: "#111", color: "#eee", padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>Suvka output — all 20 benchmark businesses</h1>
      <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 20 }}>
        Real pipeline, real stored copy, real resolved photography. {FRAME_WIDTH}×{FRAME_HEIGHT} at {SCALE * 100}%.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(5, ${FRAME_WIDTH * SCALE}px)`, gap: 18 }}>
        {cells.map((cell) => (
          <div key={cell.id}>
            <div style={{ fontSize: 11, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
              <strong>{cell.label}</strong>
              <span style={{ opacity: 0.55 }}>
                {cell.anchor.id} · {cell.heroVariant} · {cell.sectionCount}
              </span>
            </div>
            <div
              style={{
                width: FRAME_WIDTH * SCALE,
                height: FRAME_HEIGHT * SCALE,
                overflow: "hidden",
                border: "1px solid #333",
                borderRadius: 4,
              }}
            >
              {/* Twenty iframes loading at once made every one of them blank: each is a
                  server render that resolves a stock photo, and twenty simultaneous
                  requests to the same image API get throttled. Deferring the off-screen
                  ones lets the browser stagger them, which is the difference between an
                  instrument that works and one that quietly reports nothing. */}
              <iframe
                src={`/preview/${cell.id}`}
                width={FRAME_WIDTH}
                height={FRAME_HEIGHT}
                style={{
                  border: 0,
                  transform: `scale(${SCALE})`,
                  transformOrigin: "top left",
                  pointerEvents: "none",
                }}
                loading="lazy"
              />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
