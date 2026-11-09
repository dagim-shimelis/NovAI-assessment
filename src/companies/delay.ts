export async function requestDelay(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 300 + Math.floor(Math.random() * 501)));
}
