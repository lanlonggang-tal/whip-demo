// Copyright 2022 ByteDance Ltd. and/or its affiliates.
// SPDX-License-Identifier: BSD-3-Clause

import { SignJWT } from "jose";
export interface TokenParameters {
  AppID: string;
  StreamID: string;
  Action: string;
  PullAuth?: boolean;
  AppKey?: string;
}

// 生成token
export async function generateToken({
  AppID,
  StreamID,
  Action,
  PullAuth,
  AppKey,
}: TokenParameters) {
  // return AppID;
  const payload: any = {
    version: "1.0",
    appID: AppID,
    streamID: StreamID,
    action: Action,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  if (Action === "pub") {
    payload.enableSubAuth = !!PullAuth;
  }
  const textEncoder = new TextEncoder();
  return await new SignJWT(payload)
    .setProtectedHeader({
      alg: "HS256",
      typ: "JWT",
    })
    .sign(textEncoder.encode(AppKey));
}

// 解析URL参数
export function getUrlPrmt(url?: string): { [v: string]: string } {
  url = url ? url : window.location.href;
  let _pa = url.substring(url.indexOf("?") + 1);
  let _arrS = _pa.split("&");
  let _rs: any = {};
  for (let i = 0, _len = _arrS.length; i < _len; i++) {
    let pos = _arrS[i].indexOf("=");
    if (pos === -1) {
      continue;
    }

    let name = _arrS[i].substring(0, pos),
      value = window.decodeURIComponent(_arrS[i].substring(pos + 1));
    _rs[name] = value;
  }
  return _rs;
}

// 锁
let lockId = 1;
export class PromiseLock {
  private lockingPromise: Promise<void> = Promise.resolve();
  private locks = 0;
  private name = "";
  private lockId: number;

  public constructor(name?: string) {
    this.lockId = lockId++;
    if (name) {
      this.name = name;
    }
  }

  public get isLocked(): boolean {
    return this.locks > 0;
  }

  public lock(): Promise<() => void> {
    this.locks += 1;
    let unlockNext: () => void;
    const willLock: Promise<void> = new Promise((resolve) => {
      unlockNext = () => {
        this.locks -= 1;
        resolve();
      };
    });
    const willUnlock = this.lockingPromise.then(() => unlockNext);
    this.lockingPromise = this.lockingPromise.then(() => willLock);
    return willUnlock;
  }
}

export function playVideo(videoRenderDom: HTMLDivElement, stream: MediaStream) {
  const videoDom = document.createElement("video");
  videoDom.srcObject = stream;
  videoDom.muted = true;
  videoDom.setAttribute("muted", "");
  videoDom.play();
  videoDom.height = 375;
  videoDom.width = 480;
  videoRenderDom?.appendChild(videoDom);
  document.body.addEventListener("click", () => {
    if (videoDom.paused) {
      videoDom.play();
    }
  });
}

export async function sleep(timeout: number) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, timeout)
  })
}

export async function getAudioStats(pc: RTCPeerConnection, track: MediaStreamTrack) {
  const stats = await pc.getStats(track);
  const result = {
    volume: '0'
  };
  stats.forEach((report) => {
    if (report.type === "media-source") {
      result.volume = Number((report.audioLevel ? report.audioLevel : 0) * 255).toFixed(6);
    }
  });
  return result;
}

const videoStatsMap = new Map();
export async function getVideoStats(pc: RTCPeerConnection, track: MediaStreamTrack) {
  const prev = videoStatsMap.get(track) || {
    timestamp: 0,
    headerBytesSent: 0,
    bytesSent: 0
  };
  const stats = await pc.getStats(track);
  const result = {
    resolution: '',
    fps: '',
    vbps: '0 Kbps'
  };
  stats.forEach((report) => {
    if (report.type === "outbound-rtp") {
      result.resolution = String(report.frameWidth) + "*" + String(report.frameHeight);
      result.fps = report.framesPerSecond;

      const duration = report.timestamp - prev.timestamp;
      result.vbps = Math.floor(8* (report.bytesSent + report.headerBytesSent - prev.bytesSent - prev.headerBytesSent) / duration) + ' Kbps';
      videoStatsMap.set(track, report);
    }
  });
  return result;
}