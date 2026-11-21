import { describe, it, expect } from 'vitest';
import manifest from '@/app/manifest';

describe('Member B: PWA Manifest & Platform Capabilities', () => {
  it('manifest returns correct standalone PWA configuration', () => {
    const config = manifest();
    expect(config.name).toBe('Family Care Hub');
    expect(config.short_name).toBe('CareHub');
    expect(config.display).toBe('standalone');
    expect(config.start_url).toBe('/');
    expect(config.background_color).toBeTruthy();
    expect(config.theme_color).toBeTruthy();
    expect(Array.isArray(config.icons)).toBe(true);
    expect(config.icons?.length).toBeGreaterThan(0);
  });
});
