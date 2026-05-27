export function normalizePhone(raw: string): string {
  let p = raw.replace(/[\s\-\(\)\.]/g, "");
  if (p.startsWith("+880")) p = p.slice(4);
  else if (p.startsWith("880") && p.length === 13) p = p.slice(3);
  if (p.length === 10 && !p.startsWith("0")) p = "0" + p;
  return p;
}
