import type { ResourcePercentages, ResourceShareId } from "@/lib/unocalcAllocation";
import { resourceNodeRadius } from "@/lib/unocalcDiagram";

type UnoBalanceDiagramProps = {
  shares: ResourcePercentages;
  labels: Record<ResourceShareId, string>;
};

// Four inner nodes correspond to the four sections in resource allocation.
// The outer circle, cross-axes and four perimeter anchor points stay fixed.
const NODES = [
  { id: "retail", x: 95, y: 160 },
  { id: "design", x: 160, y: 95 },
  { id: "installation", x: 160, y: 225 },
  { id: "components", x: 225, y: 160 },
] as const;

const PERIMETER_POINTS = [
  { x: 160, y: 40 },
  { x: 280, y: 160 },
  { x: 160, y: 280 },
  { x: 40, y: 160 },
] as const;

/**
 * A graphic interpretation of the author's resource-balance concept.
 * The area of each inner circle is proportional to its share of the total.
 * This does not represent physically measured forces or energy.
 */
export default function UnoBalanceDiagram({ shares, labels }: UnoBalanceDiagramProps) {
  const description = NODES.map((node, index) =>
    labels[node.id] + ": " + shares[index] + "%"
  ).join("; ");

  return (
    <svg
      viewBox="0 0 320 320"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={description}
      className="mx-auto block h-auto w-full max-w-[350px] overflow-visible text-foreground"
    >
      <circle
        cx="160"
        cy="160"
        r="120"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.57"
      />
      <path
        d="M40 160 H280 M160 40 V280"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.42"
      />
      {PERIMETER_POINTS.map(({ x, y }) => (
        <circle
          key={x + "-" + y}
          cx={x}
          cy={y}
          r="2.7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          opacity="0.85"
        />
      ))}
      <circle
        cx="160"
        cy="160"
        r="11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.91"
      />
      {NODES.map((node, index) => (
        <circle
          key={node.id}
          cx={node.x}
          cy={node.y}
          r={resourceNodeRadius(shares[index])}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.95"
          style={{ transition: "r 300ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      ))}
    </svg>
  );
}
