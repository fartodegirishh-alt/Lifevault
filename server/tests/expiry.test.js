import { getExpiryStatus, getDaysLeft, calculateWarrantyEndDate } from '../utils/expiry.js';

describe('getExpiryStatus edge cases', () => {
  const referenceDate = new Date('2026-10-28T12:00:00Z');

  test('expired yesterday (-1 day) returns Expired', () => {
    const yesterday = '2026-10-27';
    expect(getExpiryStatus(yesterday, referenceDate)).toBe('Expired');
    expect(getDaysLeft(yesterday, referenceDate)).toBe(-1);
  });

  test('expires today (0 days left) returns Expiring soon', () => {
    const today = '2026-10-28';
    expect(getExpiryStatus(today, referenceDate)).toBe('Expiring soon');
    expect(getDaysLeft(today, referenceDate)).toBe(0);
  });

  test('expires in exactly 30 days returns Expiring soon', () => {
    // 2026-10-28 + 30 days = 2026-11-27
    const thirtyDays = '2026-11-27';
    expect(getExpiryStatus(thirtyDays, referenceDate, 30)).toBe('Expiring soon');
    expect(getDaysLeft(thirtyDays, referenceDate)).toBe(30);
  });

  test('expires in 31 days returns Active', () => {
    // 2026-10-28 + 31 days = 2026-11-28
    const thirtyOneDays = '2026-11-28';
    expect(getExpiryStatus(thirtyOneDays, referenceDate, 30)).toBe('Active');
    expect(getDaysLeft(thirtyOneDays, referenceDate)).toBe(31);
  });

  test('missing or null date returns No expiry date', () => {
    expect(getExpiryStatus(null, referenceDate)).toBe('No expiry date');
    expect(getExpiryStatus('', referenceDate)).toBe('No expiry date');
    expect(getExpiryStatus(undefined, referenceDate)).toBe('No expiry date');
    expect(getDaysLeft(null, referenceDate)).toBeNull();
  });

  test('invalid date returns Invalid date', () => {
    expect(getExpiryStatus('not-a-date', referenceDate)).toBe('Invalid date');
    expect(getDaysLeft('invalid-date-string', referenceDate)).toBeNull();
  });

  test('calculateWarrantyEndDate correctly calculates future date', () => {
    const purchaseDate = '2026-01-15';
    const months = 12;
    expect(calculateWarrantyEndDate(purchaseDate, months)).toBe('2027-01-15');
  });
});
