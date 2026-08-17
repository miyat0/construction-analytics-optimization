/**
 * Presentation-only title formatting. Does not mutate stored values.
 * Ensures consistent casing in UI title positions (e.g. "house" → "House").
 */
export const formatDisplayTitle = (value: string | null | undefined): string => {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/\S+/g, (word) => {
    if (word.length === 1) {
      return word.toUpperCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
};

export default formatDisplayTitle;
