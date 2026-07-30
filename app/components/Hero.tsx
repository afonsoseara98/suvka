import type { HeroData } from "@/app/types/landing";
import { heroRegistry } from "./hero/registry";

type HeroProps = {
  data: HeroData;
};

export default function Hero({ data }: HeroProps) {
  const HeroComponent =
    heroRegistry[data.imageStyle] ??
    heroRegistry.dashboard;

  return <HeroComponent data={data} />;
}