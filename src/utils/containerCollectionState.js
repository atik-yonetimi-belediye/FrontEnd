const COLLECTION_STAGES = [
  { maxHours: 6, color: '#22c55e', label: 'Yeşil' },
  { maxHours: 12, color: '#eab308', label: 'Sarı' },
  { maxHours: 18, color: '#f97316', label: 'Turuncu' },
  { maxHours: Infinity, color: '#ef4444', label: 'Kırmızı' },
];

export function getCollectionButtonState(lastCollectedAt, now = new Date()) {
  if (!lastCollectedAt) return COLLECTION_STAGES.at(-1);

  const elapsedHours = Math.max(0, (now.getTime() - new Date(lastCollectedAt).getTime()) / 3_600_000);
  return COLLECTION_STAGES.find((stage) => elapsedHours < stage.maxHours) || COLLECTION_STAGES.at(-1);
}

export const COLLECTION_COLOR_REFRESH_MS = 60_000;
