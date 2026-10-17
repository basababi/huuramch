import { networkInterfaces } from 'node:os';
import { Controller, Get, Inject, NotFoundException } from '@nestjs/common';
import { CONFIG, type ServerConfig } from '../config';
import { ContentService } from '../content/content.service';

/** Virtual adapters (VirtualBox, Hyper-V, Docker, VPNs) are never the Wi-Fi the phones are on. */
const VIRTUAL =
  /virtualbox|vbox|vmware|vethernet|hyper-v|docker|wsl|loopback|tailscale|zerotier|utun|bridge/i;

export function lanAddresses(): string[] {
  const out: Array<{ address: string; score: number }> = [];
  for (const [name, infos] of Object.entries(networkInterfaces())) {
    if (VIRTUAL.test(name)) continue;
    for (const info of infos ?? []) {
      if (info.family !== 'IPv4' || info.internal || info.address.startsWith('169.254.')) continue;
      // Prefer Wi-Fi, then Ethernet, then anything else; the VirtualBox host-only range is last.
      const score = /wi-?fi|wlan|wireless/i.test(name)
        ? 3
        : /ethernet|^en|^eth/i.test(name)
          ? 2
          : 1;
      out.push({
        address: info.address,
        score: info.address.startsWith('192.168.56.') ? 0 : score,
      });
    }
  }
  return out.sort((a, b) => b.score - a.score).map((o) => o.address);
}

@Controller()
export class HealthController {
  constructor(
    @Inject(CONFIG) private readonly config: ServerConfig,
    @Inject(ContentService) private readonly content: ContentService,
  ) {}

  @Get('health')
  health() {
    return { ok: true, content: this.content.source, pairs: this.content.pairs().length };
  }

  /** Lets the host's lobby build a QR code that phones on the same Wi-Fi can open. */
  @Get('network')
  network() {
    if (!this.config.exposeLan) throw new NotFoundException();
    return { addresses: lanAddresses() };
  }
}
