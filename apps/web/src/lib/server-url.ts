/**
 * Where the game server lives. In production set NEXT_PUBLIC_SERVER_URL; locally the server runs
 * next to the web app on port 3001 of the same host — which also works for phones on the same
 * Wi-Fi that opened the page by its LAN address.
 */
export function serverUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SERVER_URL;
  if (configured) return configured.replace(/\/$/, '');
  return `${window.location.protocol}//${window.location.hostname}:3001`;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * The base URL phones should open (for the lobby QR). If the host opened the app on `localhost`,
 * phones can't reach that, so ask the server for this machine's LAN address.
 */
export async function shareableOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_PUBLIC_URL;
  if (configured) return configured.replace(/\/$/, '');
  const { protocol, hostname, port, origin } = window.location;
  if (!LOCAL_HOSTS.has(hostname)) return origin;
  try {
    const response = await fetch(`${serverUrl()}/network`);
    if (!response.ok) return origin;
    const { addresses } = (await response.json()) as { addresses: string[] };
    const lan = addresses[0];
    return lan ? `${protocol}//${lan}${port ? `:${port}` : ''}` : origin;
  } catch {
    return origin;
  }
}
