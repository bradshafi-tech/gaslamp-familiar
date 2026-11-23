/** Eight cosmetic-only Dwarf Dragon colour variants (no stat difference). */
export const DWARF_DRAGON_COLORS: { id: string; name: string; hex: number }[] = [
  { id: "amethyst", name: "Amethyst", hex: 0x6b3fa0 },
  { id: "ruby", name: "Ruby", hex: 0xb83240 },
  { id: "emerald", name: "Emerald", hex: 0x2f8f5b },
  { id: "sapphire", name: "Sapphire", hex: 0x3a6fd4 },
  { id: "gold", name: "Gold", hex: 0xd4a824 },
  { id: "obsidian", name: "Obsidian", hex: 0x2a2a32 },
  { id: "pearl", name: "Pearl", hex: 0xe8e0f0 },
  { id: "copper", name: "Copper", hex: 0xc47a3a },
];

export function randomDwarfDragonColor() {
  return DWARF_DRAGON_COLORS[Math.floor(Math.random() * DWARF_DRAGON_COLORS.length)]!;
}
