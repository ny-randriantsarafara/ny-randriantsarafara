export type DeviceClass = 'mobile' | 'tablet' | 'desktop';

export function readDeviceClass(userAgent: string): DeviceClass {
  const normalized = userAgent.toLowerCase();
  if (normalized.includes('ipad') || normalized.includes('tablet')) {
    return 'tablet';
  }
  if (
    normalized.includes('mobile') ||
    normalized.includes('iphone') ||
    normalized.includes('android')
  ) {
    return 'mobile';
  }
  return 'desktop';
}
