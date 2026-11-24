import { TOWN_BOUNDS, type WorldNode } from "../content/world";

/** Static region labels for the start map (world XZ → minimap). */
export type MinimapLabel = {
  text: string;
  x: number;
  z: number;
  color: string;
};

export const START_MAP_LABELS: MinimapLabel[] = [
  { text: "Trees", x: -8, z: 3.2, color: "#5a9e6a" },
  { text: "Oaks", x: -8.8, z: 7, color: "#3f6b3a" },
  { text: "Ores", x: 7.6, z: 3.6, color: "#c07848" },
  { text: "Fish", x: -1, z: 6.5, color: "#6a9ec9" },
  { text: "Furnace", x: 4, z: -4, color: "#ff6a2a" },
  { text: "Craft", x: 6.5, z: -3.5, color: "#b08a5a" },
  { text: "Stove", x: -5.5, z: -3.5, color: "#e07060" },
  { text: "Shop", x: -1.2, z: -5.6, color: "#d4af37" },
  { text: "NPCs", x: -1, z: -4, color: "#c4a882" },
  { text: "Rats", x: 2.8, z: 10, color: "#9aa3b2" },
  { text: "Shade", x: 3, z: 13, color: "#8a4dff" },
];

export class Minimap {
  readonly root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private w = 168;
  private h = 168;

  constructor(host: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "minimap";
    this.root.innerHTML = `<div class="minimap-title">Start map</div>`;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "minimap-canvas";
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.root.appendChild(this.canvas);
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("minimap 2d context missing");
    this.ctx = ctx;
    host.appendChild(this.root);
  }

  /** Draw bounds, POI labels, optional node dots, and player. */
  draw(player: { x: number; z: number; rotY: number }, nodes?: WorldNode[]) {
    const { ctx, w, h } = this;
    const { minX, maxX, minZ, maxZ } = TOWN_BOUNDS;
    const pad = 10;
    const mapW = w - pad * 2;
    const mapH = h - pad * 2;

    const toPx = (x: number, z: number) => {
      const u = (x - minX) / (maxX - minX);
      const v = (z - minZ) / (maxZ - minZ);
      // +Z is "north" / up on the minimap
      return { px: pad + u * mapW, py: pad + (1 - v) * mapH };
    };

    ctx.clearRect(0, 0, w, h);
    // Panel fill
    ctx.fillStyle = "rgba(12, 18, 24, 0.92)";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(201, 162, 39, 0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

    // Soft zone washes
    const zones: { x: number; z: number; r: number; color: string }[] = [
      { x: -8, z: 4, r: 3.2, color: "rgba(90, 158, 106, 0.18)" },
      { x: 7.5, z: 3.5, r: 2.6, color: "rgba(192, 120, 72, 0.18)" },
      { x: -1, z: 6.5, r: 2.2, color: "rgba(106, 158, 201, 0.2)" },
      { x: 2, z: -4.2, r: 4.5, color: "rgba(180, 140, 80, 0.12)" },
      { x: 3, z: 11, r: 3.5, color: "rgba(140, 100, 160, 0.14)" },
    ];
    for (const z of zones) {
      const p = toPx(z.x, z.z);
      const rx = (z.r / (maxX - minX)) * mapW;
      const ry = (z.r / (maxZ - minZ)) * mapH;
      ctx.fillStyle = z.color;
      ctx.beginPath();
      ctx.ellipse(p.px, p.py, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Node dots (sparse — skip duplicates by kind clusters)
    if (nodes) {
      for (const n of nodes) {
        if (n.kind === "wild_pet" || n.kind === "ground_egg") continue;
        const p = toPx(n.x, n.z);
        ctx.fillStyle = nodeColor(n.kind);
        ctx.beginPath();
        ctx.arc(p.px, p.py, n.kind === "enemy" ? 2.2 : 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Labels
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const label of START_MAP_LABELS) {
      const p = toPx(label.x, label.z);
      ctx.font = "600 9px \"Segoe UI\", system-ui, sans-serif";
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillText(label.text, p.px + 0.8, p.py + 0.8);
      ctx.fillStyle = label.color;
      ctx.fillText(label.text, p.px, p.py);
    }

    // Player wedge
    const pp = toPx(player.x, player.z);
    ctx.save();
    ctx.translate(pp.px, pp.py);
    // rotY: 0 faces +Z (up on map); canvas Y grows down so negate
    ctx.rotate(-player.rotY);
    ctx.fillStyle = "#f2e8d5";
    ctx.strokeStyle = "#1a1408";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  destroy() {
    this.root.remove();
  }
}

function nodeColor(kind: WorldNode["kind"]): string {
  switch (kind) {
    case "tree":
      return "#5a9e6a";
    case "rock":
      return "#c07848";
    case "fish":
      return "#6a9ec9";
    case "forge":
      return "#ff6a2a";
    case "bench":
      return "#b08a5a";
    case "stove":
      return "#e07060";
    case "shop":
      return "#d4af37";
    case "npc":
      return "#c4a882";
    case "enemy":
      return "#c45c4a";
    default:
      return "#9aa3b2";
  }
}
