import { describe, it, expect } from 'vitest';
import { Notification } from './notification.entity';

function buildUserNotification() {
  return Notification.create({
    id: 'notif_1',
    userId: 'user_1',
    kind: 'booking',
    iconClassName: 'calendar-check',
    title: 'Upcoming appointment',
    message: 'Starts in 10 minutes',
  });
}

function buildBusinessNotification() {
  return Notification.create({
    id: 'notif_2',
    businessId: 'biz_1',
    kind: 'team',
    iconClassName: 'users',
    title: 'Jordan joined your team',
    message: 'Jordan Lee accepted the invitation',
  });
}

describe('Notification.create', () => {
  it('starts unread with no readAt', () => {
    const notification = buildUserNotification();
    expect(notification.isRead).toBe(false);
    expect(notification.readAt).toBeNull();
  });

  it('defaults body to an empty array and href to null when omitted', () => {
    const notification = buildUserNotification();
    expect(notification.body).toEqual([]);
    expect(notification.href).toBeNull();
  });

  it('throws when neither userId nor businessId is provided', () => {
    expect(() =>
      Notification.create({
        id: 'notif_3',
        kind: 'system',
        iconClassName: 'bell',
        title: 'Orphan notification',
        message: 'Should not be creatable',
      }),
    ).toThrow();
  });

  it('allows both userId and businessId to be set', () => {
    const notification = Notification.create({
      id: 'notif_4',
      userId: 'user_1',
      businessId: 'biz_1',
      kind: 'booking',
      iconClassName: 'calendar-check',
      title: 'Booking confirmed',
      message: 'Scoped to both the user and their business',
    });
    expect(notification.userId).toBe('user_1');
    expect(notification.businessId).toBe('biz_1');
  });
});

describe('Notification.markAsRead', () => {
  it('flips isRead and stamps readAt', () => {
    const read = buildUserNotification().markAsRead();
    expect(read.isRead).toBe(true);
    expect(read.readAt).not.toBeNull();
  });

  it('is idempotent — marking an already-read notification again keeps the original readAt', () => {
    const read = buildUserNotification().markAsRead();
    const readAgain = read.markAsRead();
    expect(readAgain.readAt).toBe(read.readAt);
  });
});

describe('Notification.isVisibleTo', () => {
  it('a user-targeted notification is visible only to that user', () => {
    const notification = buildUserNotification();
    expect(notification.isVisibleTo('user_1', null)).toBe(true);
    expect(notification.isVisibleTo('user_2', null)).toBe(false);
  });

  it('a business-targeted notification is visible to any caller in that business', () => {
    const notification = buildBusinessNotification();
    expect(notification.isVisibleTo('user_1', 'biz_1')).toBe(true);
    expect(notification.isVisibleTo('user_2', 'biz_1')).toBe(true);
    expect(notification.isVisibleTo('user_1', 'biz_2')).toBe(false);
    expect(notification.isVisibleTo('user_1', null)).toBe(false);
  });
});

describe('Notification.equals', () => {
  it('compares by id', () => {
    const a = buildUserNotification();
    const b = Notification.reconstitute({ ...a.toProps(), title: 'different' });
    expect(a.equals(b)).toBe(true);
  });
});
