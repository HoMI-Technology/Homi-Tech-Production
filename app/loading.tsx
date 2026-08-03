import { ThresholdCompass } from "@/components/brand/ThresholdCompass";

/** Global route-transition loading state — the compass holds the room. */
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <ThresholdCompass size={120} />
      <p className="text-sm text-dim" role="status">
        Finding your bearings…
      </p>
    </div>
  );
}
