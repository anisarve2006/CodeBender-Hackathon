import { describe, it, expect } from 'vitest';
import { hashToken, generateToken, timingSafeEqual } from '@/lib/auth/crypto';
import { can } from '@/lib/utils/rbac';
import { COMMON_PASSWORDS } from '@/lib/auth/common-passwords';

describe('Auth Crypto & Token Utilities', () => {
  it('generates random url-safe base64 tokens', () => {
    const token = generateToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThanOrEqual(32);
  });

  it('generates deterministic SHA-256 hashes', () => {
    const token = 'test-token-value';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it('performs timing safe string equality checks', () => {
    expect(timingSafeEqual('secret123', 'secret123')).toBe(true);
    expect(timingSafeEqual('secret123', 'secret999')).toBe(false);
    expect(timingSafeEqual('short', 'longer-string')).toBe(false);
  });

  it('identifies common weak passwords', () => {
    expect(COMMON_PASSWORDS.has('1234567890')).toBe(true);
    expect(COMMON_PASSWORDS.has('password123')).toBe(true);
    expect(COMMON_PASSWORDS.has('SuperSecureP@ssw0rd!2026')).toBe(false);
  });
});

describe('RBAC Permission Matrix Tests', () => {
  it('permits owners full management rights', () => {
    expect(can('owner', 'manage_members')).toBe(true);
    expect(can('owner', 'invite_members')).toBe(true);
    expect(can('owner', 'export_circle')).toBe(true);
    expect(can('owner', 'create_tasks')).toBe(true);
    expect(can('owner', 'manage_records')).toBe(true);
  });

  it('restricts coordinators from exporting circle or deleting last owner', () => {
    expect(can('coordinator', 'invite_members')).toBe(true);
    expect(can('coordinator', 'export_circle')).toBe(false);
    expect(can('coordinator', 'manage_members')).toBe(false);
  });

  it('restricts caregivers to claiming and creating tasks, not managing members', () => {
    expect(can('caregiver', 'manage_members')).toBe(false);
    expect(can('caregiver', 'invite_members')).toBe(false);
    expect(can('caregiver', 'create_tasks')).toBe(true);
    expect(can('caregiver', 'claim_tasks')).toBe(true);
  });

  it('enforces viewers as read-only', () => {
    expect(can('viewer', 'create_tasks')).toBe(false);
    expect(can('viewer', 'manage_records')).toBe(false);
    expect(can('viewer', 'claim_tasks')).toBe(false);
    expect(can('viewer', 'view_dashboard')).toBe(true);
    expect(can('viewer', 'view_normal_documents')).toBe(true);
    expect(can('viewer', 'view_restricted_documents')).toBe(false);
  });

  it('restricts care recipients from seeing internal activity log', () => {
    expect(can('care_recipient', 'view_activity_log')).toBe(false);
    expect(can('viewer', 'view_activity_log')).toBe(true);
  });
});
