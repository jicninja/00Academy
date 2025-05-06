export class VideoDetector {
  public video: HTMLVideoElement;

  constructor() {
    this.video = Object.assign(document.createElement('video'), {
      autoplay: true,
      playsInline: true,
    });
  }

  public async initialize(): Promise<void> {
    document.body.appendChild(this.video);
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    this.video.srcObject = stream;
    await this.video.play();
  }
}
