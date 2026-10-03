import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const ownerKey = 'scgf-push-owner';

export function pushSupportMessage() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && !window.matchMedia('(display-mode: standalone)').matches && !navigator.standalone) {
    return 'On iPhone or iPad, add SC Group Finder to your Home Screen, then open it there (iOS 16.4+).';
  }
  if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'Background notifications are unavailable in this browser. In-app alerts remain available.';
  }
  return '';
}

const bytes = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)), c => c.charCodeAt(0));

export async function getPushSubscription() {
  if (!('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration('/');
  return registration?.pushManager?.getSubscription() || null;
}

async function setWorkerOwner(userId) {
  const registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration?.active) return;
  await new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Notification device update timed out')); }, 5000);
    channel.port1.onmessage = () => { clearTimeout(timer); channel.port1.close(); resolve(); };
    registration.active.postMessage({type: 'PUSH_OWNER', userId}, [channel.port2]);
  });
}

export async function enableWebPush(userId, publicKey) {
  const unsupported = pushSupportMessage();
  if (unsupported) throw new Error(unsupported);
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error(permission === 'denied'
    ? 'Notifications are blocked. Allow them in this site’s browser settings.' : 'Notification permission was not granted.');
  await navigator.serviceWorker.register('/push-sw.js', {scope: '/', updateViaCache: 'none'});
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Notification worker is not ready. Please try again.')), 15000)),
  ]);
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && localStorage.getItem(ownerKey) !== userId) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription = subscription || await Promise.race([
    registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: bytes(publicKey)}),
    new Promise((_, reject) => setTimeout(() => reject(new Error('The browser push service did not respond. Please try again later.')), 20000)),
  ]);
  try {
    await axios.post(`${API}/push/subscriptions`, subscription.toJSON());
    await setWorkerOwner(userId);
    localStorage.setItem(ownerKey, userId);
  } catch (error) {
    await subscription.unsubscribe().catch(() => {});
    throw error;
  }
  return subscription;
}

export async function disableWebPush() {
  if (!('serviceWorker' in navigator)) return;
  // Persist the privacy guard before revocation, including when the network is offline.
  await setWorkerOwner(null);
  localStorage.removeItem(ownerKey);
  const subscription = await getPushSubscription();
  if (!subscription) return;
  let serverRemoved = false;
  try {
    await axios.delete(`${API}/push/subscriptions`, {data: {endpoint: subscription.endpoint}, timeout: 5000});
    serverRemoved = true;
  } catch (_) { /* Provider revocation below invalidates delivery even offline from our API. */ }
  const removed = await subscription.unsubscribe().catch(() => false);
  if (!removed && !serverRemoved) throw new Error('Device alerts paused locally; server removal will require a connection.');
}

export async function refreshWebPush(userId) {
  if (pushSupportMessage()) return;
  const subscription = await getPushSubscription();
  if (!subscription) return;
  if (localStorage.getItem(ownerKey) !== userId) {
    await disableWebPush();
    return;
  }
  if (Notification.permission !== 'granted') { await disableWebPush(); return; }
  await navigator.serviceWorker.register('/push-sw.js', {updateViaCache: 'none'});
  await axios.post(`${API}/push/subscriptions`, subscription.toJSON());
}

export const ownsPushSubscription = userId => localStorage.getItem(ownerKey) === userId;