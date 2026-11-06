import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserCameraProvider } from '../camera/BrowserCameraProvider.ts';
import type { CameraEnvironment } from '../camera/types.ts';

class FakeTrack extends EventTarget {
  readyState: MediaStreamTrackState = 'live';
  stopped = 0;
  constructor(readonly deviceId = 'camera-a') { super(); }
  stop() { this.stopped++; this.readyState = 'ended'; }
  getSettings() { return { deviceId: this.deviceId }; }
  disconnect() { this.readyState = 'ended'; this.dispatchEvent(new Event('ended')); }
}
function stream(deviceId = 'camera-a') {
  const track = new FakeTrack(deviceId);
  return { track, value: { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => { resolve = yes; });
  return { promise, resolve };
}
function environment() {
  const opened: ReturnType<typeof stream>[] = [];
  const constraints: MediaStreamConstraints[] = [];
  let rejectName: string | null = null;
  let secure = true;
  let supported = true;
  let drawDimensions: number[] = [];
  let canvas: HTMLCanvasElement | null = null;
  const media = new EventTarget() as EventTarget & {
    getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
    enumerateDevices: () => Promise<MediaDeviceInfo[]>;
  };
  media.getUserMedia = async (input) => {
    constraints.push(input);
    if (rejectName) throw Object.assign(new Error('sensitive browser detail'), { name: rejectName });
    const deviceId = typeof input.video === 'object' && typeof input.video.deviceId === 'object'
      ? (input.video.deviceId as ConstrainDOMStringParameters).exact as string : 'camera-a';
    const current = stream(deviceId); opened.push(current); return current.value;
  };
  media.enumerateDevices = async () => [
    { kind: 'videoinput', deviceId: 'camera-a', label: 'Camera A' },
    { kind: 'videoinput', deviceId: 'camera-b', label: 'Camera B' },
    { kind: 'audioinput', deviceId: 'microphone', label: 'Mic' },
  ] as MediaDeviceInfo[];
  const env: CameraEnvironment = {
    isSecure: () => secure,
    mediaDevices: () => supported ? media : undefined,
    createCanvas: () => {
      canvas = {
        width: 0, height: 0,
        getContext: () => ({ drawImage: (_video: unknown, _x: number, _y: number, width: number, height: number) => { drawDimensions = [width, height]; } }),
        toBlob: (callback: BlobCallback, type: string) => callback(new Blob(['fake-frame'], { type })),
      } as unknown as HTMLCanvasElement;
      return canvas;
    },
  };
  return { env, media, opened, constraints, setError: (name: string) => { rejectName = name; },
    setSecure: (value: boolean) => { secure = value; }, setSupported: (value: boolean) => { supported = value; },
    dimensions: () => drawDimensions, canvas: () => canvas };
}
function video(source: MediaStream, readyState = 2) {
  return { srcObject: source, readyState, videoWidth: 1920, videoHeight: 1080 } as HTMLVideoElement;
}

test('camera checks secure context and MediaDevices before acquiring any device', async () => {
  const insecure = environment(); insecure.setSecure(false);
  const camera = new BrowserCameraProvider(insecure.env);
  assert.equal(await camera.startCamera('TICKET_QR'), false);
  assert.equal(camera.getCameraStatus().issue?.code, 'INSECURE_CONTEXT');
  assert.equal(insecure.constraints.length, 0);
  const unsupported = environment(); unsupported.setSupported(false);
  const other = new BrowserCameraProvider(unsupported.env);
  await other.startCamera('FACE');
  assert.equal(other.getCameraStatus().status, 'UNSUPPORTED');
});

for (const [name, status] of [['NotAllowedError', 'PERMISSION_DENIED'], ['NotFoundError', 'UNAVAILABLE'], ['NotReadableError', 'UNAVAILABLE']] as const) {
  test(`${name} maps to safe camera status without private browser payload`, async () => {
    const setup = environment(); setup.setError(name);
    const camera = new BrowserCameraProvider(setup.env);
    await camera.startCamera('TICKET_QR');
    assert.equal(camera.getCameraStatus().status, status);
    assert.ok(!camera.getCameraStatus().issue?.message.includes('sensitive'));
    assert.equal(camera.getCameraStatus().stream, null);
  });
}

test('start requests permission once, never audio, and modes reuse the same live stream', async () => {
  const setup = environment(); const camera = new BrowserCameraProvider(setup.env);
  const first = camera.startCamera('TICKET_QR');
  assert.equal(camera.getCameraStatus().status, 'REQUESTING_PERMISSION');
  const second = camera.startCamera('TICKET_QR');
  await Promise.all([first, second]);
  assert.equal(setup.constraints.length, 1);
  assert.equal(setup.constraints[0]?.audio, false);
  const original = camera.getCameraStatus().stream;
  camera.switchMode('IDENTITY_QR'); camera.switchMode('FACE');
  assert.equal(camera.getCameraStatus().mode, 'FACE');
  assert.equal(camera.getCameraStatus().stream, original);
  assert.equal(setup.constraints.length, 1);
  camera.stopCamera();
  assert.equal(setup.opened[0]?.track.stopped, 1);
  assert.equal(camera.getCameraStatus().status, 'IDLE');
  assert.equal(camera.getCameraStatus().stream, null);
  camera.stopCamera(); assert.equal(setup.opened[0]?.track.stopped, 1);
});

test('changing camera stops old tracks before requesting another device', async () => {
  const setup = environment(); const camera = new BrowserCameraProvider(setup.env);
  await camera.startCamera('TICKET_QR');
  const original = setup.media.getUserMedia;
  setup.media.getUserMedia = async (constraints) => {
    assert.equal(setup.opened[0]?.track.readyState, 'ended');
    return original(constraints);
  };
  await camera.startCamera('TICKET_QR', 'camera-b');
  assert.equal(camera.getCameraStatus().selectedDeviceId, 'camera-b');
  assert.equal(camera.getCameraStatus().devices.length, 2);
  camera.stopCamera();
});

test('stop during permission releases late stream and a new start waits for the old acquisition', async () => {
  const setup = environment(); const old = deferred<MediaStream>();
  let requests = 0; const late = stream();
  const original = setup.media.getUserMedia;
  setup.media.getUserMedia = (constraints) => ++requests === 1 ? old.promise : original(constraints);
  const camera = new BrowserCameraProvider(setup.env);
  const first = camera.startCamera('TICKET_QR');
  await Promise.resolve();
  camera.stopCamera();
  const second = camera.startCamera('FACE');
  await Promise.resolve(); assert.equal(requests, 1);
  old.resolve(late.value); await Promise.all([first, second]);
  assert.equal(late.track.stopped, 1);
  assert.notEqual(camera.getCameraStatus().stream, late.value);
  assert.equal(camera.getCameraStatus().mode, 'FACE');
  assert.equal(requests, 2);
  camera.stopCamera();
});

test('track ended updates disconnected status and stops all owned tracks', async () => {
  const setup = environment(); const camera = new BrowserCameraProvider(setup.env);
  await camera.startCamera('FACE');
  setup.opened[0]!.track.disconnect();
  assert.equal(camera.getCameraStatus().status, 'DISCONNECTED');
  assert.equal(camera.getCameraStatus().stream, null);
});

test('capture refuses unready/unowned video and bounds a ready JPEG frame without retaining pixels', async () => {
  const setup = environment(); const camera = new BrowserCameraProvider(setup.env);
  await camera.startCamera('FACE'); const source = camera.getCameraStatus().stream!;
  await assert.rejects(camera.captureFrame(video(source, 0)), { code: 'CAPTURE_NOT_READY' });
  await assert.rejects(camera.captureFrame(video(stream().value)), { code: 'CAMERA_NOT_ACTIVE' });
  const frame = await camera.captureFrame(video(source));
  assert.equal(frame.blob.type, 'image/jpeg');
  assert.deepEqual([frame.width, frame.height], [1280, 720]);
  assert.deepEqual(setup.dimensions(), [1280, 720]);
  assert.equal(setup.canvas()?.width, 0);
  assert.equal(setup.canvas()?.height, 0);
  camera.stopCamera();
  await assert.rejects(camera.captureFrame(video(source)), { code: 'CAMERA_NOT_ACTIVE' });
});

test('capture callback after stop or mode switch is cancelled and its Blob is discarded', async () => {
  for (const action of ['stop', 'mode'] as const) {
    const setup = environment(); let callback: BlobCallback | null = null;
    const originalCanvas = setup.env.createCanvas;
    setup.env.createCanvas = () => {
      const canvas = originalCanvas(); canvas.toBlob = (receive) => { callback = receive; }; return canvas;
    };
    const camera = new BrowserCameraProvider(setup.env); await camera.startCamera('TICKET_QR');
    const pending = camera.captureFrame(video(camera.getCameraStatus().stream!));
    const rejected = assert.rejects(pending, { code: 'CAPTURE_CANCELLED' });
    if (action === 'stop') camera.stopCamera(); else camera.switchMode('FACE');
    const receive = callback as BlobCallback | null; receive?.(new Blob(['late']));
    await rejected;
    assert.equal(setup.canvas()?.width, 0);
    camera.stopCamera();
  }
});

test('stop after encoder resolves but before capture consumer resumes still discards frame', async () => {
  const setup = environment(); const camera = new BrowserCameraProvider(setup.env);
  await camera.startCamera('FACE');
  const pending = camera.captureFrame(video(camera.getCameraStatus().stream!));
  camera.stopCamera();
  await assert.rejects(pending, { code: 'CAPTURE_CANCELLED' });
});

test('device enumeration cannot hold an acquired camera start or block switching devices', async () => {
  const setup = environment(); const never = deferred<MediaDeviceInfo[]>();
  setup.media.enumerateDevices = () => never.promise;
  const camera = new BrowserCameraProvider(setup.env);
  const outcome = await Promise.race([camera.startCamera('TICKET_QR'), new Promise<string>((resolve) => setTimeout(() => resolve('blocked'), 20))]);
  assert.equal(outcome, true);
  camera.stopCamera(); never.resolve([]);
});

test('devicechange refreshes the selector while stopped provider ignores late enumerations', async () => {
  const setup = environment(); const camera = new BrowserCameraProvider(setup.env);
  await camera.startCamera('TICKET_QR');
  setup.media.enumerateDevices = async () => [{ kind: 'videoinput', deviceId: 'camera-c', label: 'Camera C' }] as MediaDeviceInfo[];
  setup.media.dispatchEvent(new Event('devicechange')); await Promise.resolve();
  assert.equal(camera.getCameraStatus().devices[0]?.deviceId, 'camera-c');
  camera.stopCamera(); setup.media.dispatchEvent(new Event('devicechange')); await Promise.resolve();
  assert.deepEqual(camera.getCameraStatus().devices, []);
});

test('caller AbortSignal and encoder failure are safe capture errors', async () => {
  const setup = environment(); const camera = new BrowserCameraProvider(setup.env);
  await camera.startCamera('FACE'); const source = camera.getCameraStatus().stream!;
  const abort = new AbortController(); abort.abort();
  await assert.rejects(camera.captureFrame(video(source), abort.signal), { code: 'CAPTURE_CANCELLED' });
  setup.env.createCanvas = () => ({ getContext: () => null }) as unknown as HTMLCanvasElement;
  await assert.rejects(camera.captureFrame(video(source)), { code: 'CAPTURE_FAILED' });
  camera.stopCamera();
});

test('initialization failure after getUserMedia always releases acquired tracks', async () => {
  const setup = environment();
  const original = setup.media.getUserMedia;
  setup.media.getUserMedia = async (constraints) => {
    const result = await original(constraints);
    setup.media.addEventListener = () => { throw new Error('listener failure'); };
    return result;
  };
  const camera = new BrowserCameraProvider(setup.env);
  assert.equal(await camera.startCamera('FACE'), false);
  assert.equal(setup.opened[0]?.track.readyState, 'ended');
  assert.equal(camera.getCameraStatus().stream, null);
  camera.stopCamera();
});

test('optional track settings failure preserves usable preview and cleanup ownership', async () => {
  const setup = environment(); const original = setup.media.getUserMedia;
  setup.media.getUserMedia = async (constraints) => {
    const result = await original(constraints);
    setup.opened[0]!.track.getSettings = () => { throw new Error('metadata unavailable'); };
    return result;
  };
  const camera = new BrowserCameraProvider(setup.env);
  assert.equal(await camera.startCamera('FACE'), true);
  camera.stopCamera(); assert.equal(setup.opened[0]?.track.readyState, 'ended');
});

test('late enumeration cannot overwrite newer hotplug device list in same stream generation', async () => {
  const setup = environment(); const old = deferred<MediaDeviceInfo[]>(); let enumerations = 0;
  setup.media.enumerateDevices = () => ++enumerations === 1 ? old.promise
    : Promise.resolve([{ kind: 'videoinput', deviceId: 'camera-new', label: 'New' }] as MediaDeviceInfo[]);
  const camera = new BrowserCameraProvider(setup.env); await camera.startCamera('FACE');
  setup.media.dispatchEvent(new Event('devicechange')); await Promise.resolve();
  old.resolve([{ kind: 'videoinput', deviceId: 'camera-old', label: 'Old' }] as MediaDeviceInfo[]); await Promise.resolve();
  assert.equal(camera.getCameraStatus().devices[0]?.deviceId, 'camera-new'); camera.stopCamera();
});
