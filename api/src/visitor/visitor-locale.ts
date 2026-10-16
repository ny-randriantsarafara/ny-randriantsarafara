import { BlockList, isIP } from 'node:net';

import type { Locale } from '@portfolio/content';

const frenchCountries = new Set(
  'BE BF BI BJ BL CA CD CF CG CH CI CM DJ DZ FR GA GF GN GP GQ HT KM LB LU MA MC MF MG ML MQ MR MU NC NE PF PM RE RW SC SN TD TG TN VU WF YT'.split(
    ' '
  )
);
const excluded = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 3],
] as const)
  excluded.addSubnet(address, prefix, 'ipv4');
const globalIpv6 = new BlockList();
globalIpv6.addSubnet('2000::', 3, 'ipv6');
excluded.addSubnet('2001:db8::', 32, 'ipv6');

export type VisitorLocaleResolver = (address: string) => Promise<Locale>;

export function createVisitorLocaleResolver(fetchImpl: typeof fetch): VisitorLocaleResolver {
  return async (address) => {
    const version = isIP(address);
    if (version === 0) return 'en';
    if (version === 4 && excluded.check(address, 'ipv4')) return 'en';
    if (version === 6 && (!globalIpv6.check(address, 'ipv6') || excluded.check(address, 'ipv6')))
      return 'en';

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<'en'>((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        resolve('en');
      }, 1000);
    });
    const lookup = async (): Promise<Locale> => {
      try {
        const response = await fetchImpl(`https://api.country.is/${address}`, {
          signal: controller.signal,
        });
        if (!response.ok) return 'en';
        const body: unknown = await response.json();
        if (typeof body !== 'object' || body === null || !('country' in body)) return 'en';
        return typeof body.country === 'string' && frenchCountries.has(body.country) ? 'fr' : 'en';
      } catch {
        return 'en';
      }
    };
    try {
      return await Promise.race([lookup(), timeout]);
    } finally {
      clearTimeout(timer);
    }
  };
}
