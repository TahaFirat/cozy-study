// src/utils/wakeLock.ts
// Screen Wake Lock API implementation to prevent mobile and tablet sleep during focus study

let wakeLockSentinel: any = null;
let iosKeepAwakeVideo: HTMLVideoElement | null = null;

function acquireIosFallback() {
  if (typeof document === 'undefined') return;
  if (!iosKeepAwakeVideo) {
    try {
      const video = document.createElement('video');
      video.setAttribute('playsinline', '');
      video.setAttribute('muted', '');
      video.muted = true;
      video.loop = true;
      video.style.position = 'fixed';
      video.style.opacity = '0.001';
      video.style.pointerEvents = 'none';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.top = '-100px';
      video.style.left = '-100px';
      // 1-frame silent video data URI to keep iOS WKWebView display awake
      video.src = 'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAADFtb292AAAAbG12aGQAAAAAAAAAAAAAAAAAAAPoAAAAAAABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAB0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAACgAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAE1tZGlhAAAAIA==';
      video.play().catch(() => {});
      document.body.appendChild(video);
      iosKeepAwakeVideo = video;
    } catch {}
  } else {
    iosKeepAwakeVideo.play().catch(() => {});
  }
}

function releaseIosFallback() {
  if (iosKeepAwakeVideo) {
    try {
      iosKeepAwakeVideo.pause();
      iosKeepAwakeVideo.remove();
    } catch {}
    iosKeepAwakeVideo = null;
  }
}

export async function requestWakeLock(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      if (!wakeLockSentinel) {
        wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => {
          wakeLockSentinel = null;
        });
      }
      return true;
    } catch {
      acquireIosFallback();
      return true;
    }
  }
  acquireIosFallback();
  return true;
}

export async function releaseWakeLock(): Promise<void> {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
      wakeLockSentinel = null;
    } catch {}
  }
  releaseIosFallback();
}

export function initScreenWakeLock(): () => void {
  // Request initially
  requestWakeLock();

  // Re-acquire on app return / foreground
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      requestWakeLock();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    releaseWakeLock();
  };
}
