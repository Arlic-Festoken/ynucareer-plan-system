export function delay(ms = 520) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
