/**
 * Lazy subscription expiry helper.
 * Call before any subscription-dependent logic to mark stale subscriptions expired.
 */
const { Subscription } = require('../models');

/**
 * Mark all active subscriptions past expiresAt as expired for a given account.
 * Fire-and-forget — does not block the caller.
 */
async function expireSubscriptions(accountId) {
  const now = new Date();
  await Subscription.updateMany(
    { account: accountId, status: 'active', expiresAt: { $lte: now } },
    { $set: { status: 'expired' } }
  );
}

/**
 * Get the current active (non-expired) subscription for an account.
 * Automatically expires stale subscriptions first.
 */
async function getActiveSubscription(accountId) {
  await expireSubscriptions(accountId);
  return Subscription.findOne({
    account: accountId,
    status: 'active',
    expiresAt: { $gt: new Date() },
  });
}

module.exports = { expireSubscriptions, getActiveSubscription };
