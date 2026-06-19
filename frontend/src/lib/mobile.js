import { App } from '@capacitor/app';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

export const LAST_LOCATION_KEY = 'logitrack:last-location';
export const PUSH_TOKEN_KEY = 'logitrack:push-token';
export const LAST_BARCODE_KEY = 'logitrack:last-barcode';

export function isNativePlatform() {
  return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();
}

export function getPlatform() {
  try {
    return Capacitor.getPlatform();
  } catch {
    return 'web';
  }
}

export async function getNetworkStatus() {
  try {
    const { Network } = await import('@capacitor/network');
    const status = await Network.getStatus();
    return { connected: status.connected, online: navigator.onLine !== false && status.connected };
  } catch {
    return { connected: navigator.onLine !== false, online: navigator.onLine !== false };
  }
}

function emit(name, detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(`logitrack:mobile-${name}`, { detail }));
}

function base64ToBlob(base64, type) {
  const binary = atob(base64);
  const length = binary.length;
  const array = new Uint8Array(length);

  for (let i = 0; i < length; i += 1) {
    array[i] = binary.charCodeAt(i);
  }

  return new Blob([array], { type });
}

export async function capturePhoto({ quality = 90 } = {}) {
  const photo = await Camera.getPhoto({
    quality,
    allowEditing: false,
    correctOrientation: true,
    source: CameraSource.Camera,
    resultType: CameraResultType.Base64,
    saveToGallery: false,
  });

  if (!photo.base64String) {
    throw new Error('Camera did not return image data');
  }

  const format = photo.format || 'jpeg';
  const type = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
  const blob = base64ToBlob(photo.base64String, type);

  return new File([blob], `logitrack-${Date.now()}.${format}`, { type });
}

export async function requestLocation({ persist = true } = {}) {
  if (isNativePlatform()) {
    const permission = await Geolocation.requestPermissions({ permissions: ['location'] });
    if (permission.location !== 'granted') {
      throw new Error('Location permission was not granted');
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
    });

    const payload = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp,
      source: 'capacitor',
    };

    if (persist) {
      await Preferences.set({ key: LAST_LOCATION_KEY, value: JSON.stringify(payload) });
    }

    emit('location', payload);
    return payload;
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const payload = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
          source: 'browser',
        };

        if (persist) {
          localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(payload));
        }

        emit('location', payload);
        resolve(payload);
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      },
    );
  });
}

export async function getLastLocation() {
  try {
    const { value } = await Preferences.getString({ key: LAST_LOCATION_KEY });
    return value ? JSON.parse(value) : null;
  } catch {
    const value = localStorage.getItem(LAST_LOCATION_KEY);
    return value ? JSON.parse(value) : null;
  }
}

export async function scanBarcode() {
  if (isNativePlatform()) {
    const { barcodes } = await BarcodeScanner.scan();
    const barcode = barcodes?.[0];

    if (!barcode) {
      throw new Error('No barcode was scanned');
    }

    const payload = {
      value: barcode.displayValue || barcode.rawValue,
      format: barcode.format,
      rawValue: barcode.rawValue,
      timestamp: Date.now(),
    };

    await Preferences.set({ key: LAST_BARCODE_KEY, value: JSON.stringify(payload) });
    emit('barcode', payload);
    return payload;
  }

  const value = window.prompt('Barcode scanner is only available in the native app. Enter the code manually.');
  if (!value) {
    throw new Error('No barcode was entered');
  }

  const payload = { value, format: 'manual', rawValue: value, timestamp: Date.now() };
  await Preferences.set({ key: LAST_BARCODE_KEY, value: JSON.stringify(payload) }).catch(() => {});
  emit('barcode', payload);
  return payload;
}

export async function requestPushNotifications({ endpoint } = {}) {
  if (!isNativePlatform()) {
    return null;
  }

  const { PushNotifications } = await import('@capacitor/push-notifications');
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') {
    throw new Error('Notification permission was not granted');
  }

  const { value } = await PushNotifications.register();
  if (!value) {
    throw new Error('Push notification registration did not return a token');
  }

  await Preferences.set({ key: PUSH_TOKEN_KEY, value });

  if (endpoint) {
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
      body: JSON.stringify({
        token: value,
        platform: getPlatform(),
      }),
    });
  }

  emit('push-token', { token: value, platform: getPlatform() });
  return value;
}

export async function getPushToken() {
  try {
    const { value } = await Preferences.getString({ key: PUSH_TOKEN_KEY });
    return value || null;
  } catch {
    return null;
  }
}

export function initMobileListeners() {
  if (typeof window === 'undefined') return;

  try {
    App.addListener('appUrlOpen', (event) => emit('deep-link', event));
  } catch {}

  if (!isNativePlatform()) return;

  import('@capacitor/push-notifications').then(({ PushNotifications }) => {
    try {
      PushNotifications.addListener('registration', (token) => emit('push-token', token));
    } catch {}

    try {
      PushNotifications.addListener('registrationError', (error) => emit('push-error', error));
    } catch {}

    try {
      PushNotifications.addListener('pushNotificationReceived', (notification) => emit('push-received', notification));
    } catch {}

    try {
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => emit('push-action', notification));
    } catch {}
  }).catch(() => {});
}