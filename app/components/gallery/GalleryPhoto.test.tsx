// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import GalleryPhoto from "./GalleryPhoto";
import { compileTheme } from "@/app/styles/theme";
import { neutralStrategyDna } from "@/app/ai/testFixtures";

const theme = compileTheme(neutralStrategyDna({}));
const image = { url: "https://images.pexels.com/photos/1/x.jpeg", alt: "Bacalhau à Braga" };

// What the browser reports for an image element whose fetch already finished. Defined on the
// prototype so it is true at mount, which is the whole point - the state being tested is one
// React never sees an event for.
function pretendAlreadyFinished(naturalWidth: number) {
  Object.defineProperty(HTMLImageElement.prototype, "complete", {
    value: true,
    configurable: true,
  });
  Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", {
    value: naturalWidth,
    configurable: true,
  });
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(HTMLImageElement.prototype, "complete");
  Reflect.deleteProperty(HTMLImageElement.prototype, "naturalWidth");
});

// The gallery is server-rendered, so a photograph can finish loading before React attaches
// onLoad - and then there is no event left to wait for. This shipped: four fully decoded
// photographs held at opacity 0, a restaurant's gallery rendering as four empty frames.
describe("a photograph that arrived before React did", () => {
  it("shows one that had already loaded at mount, with no load event", () => {
    pretendAlreadyFinished(1880);
    render(<GalleryPhoto image={image} theme={theme} aspectRatio="4/3" />);

    expect(screen.getByAltText("Bacalhau à Braga").style.opacity).toBe("1");
  });

  it("treats one that completed with no pixels as failed", () => {
    // complete && naturalWidth === 0 is a broken image, and it must not be left invisible
    // but present - the frame is the designed fallback.
    pretendAlreadyFinished(0);
    render(<GalleryPhoto image={image} theme={theme} aspectRatio="4/3" />);

    expect(screen.queryByAltText("Bacalhau à Braga")).toBeNull();
  });

  it("still fades in normally when the load event does arrive", () => {
    render(<GalleryPhoto image={image} theme={theme} aspectRatio="4/3" />);
    const img = screen.getByAltText("Bacalhau à Braga");

    expect(img.style.opacity, "hidden until it lands").toBe("0");
    fireEvent.load(img);
    expect(img.style.opacity).toBe("1");
  });

  it("keeps the frame rather than a gap when the photograph fails", () => {
    render(<GalleryPhoto image={image} theme={theme} aspectRatio="4/3" />);
    fireEvent.error(screen.getByAltText("Bacalhau à Braga"));

    expect(screen.queryByAltText("Bacalhau à Braga")).toBeNull();
  });
});
