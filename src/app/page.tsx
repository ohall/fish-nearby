import { MapExperience } from "@/features/map/map-experience";
import { previewWaters } from "@/features/map/preview-waters";

export default function HomePage() {
  return <MapExperience waters={previewWaters} />;
}
