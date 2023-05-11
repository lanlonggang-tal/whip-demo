import { useEffect, useRef, useState } from 'react';
import { Button, Space, Switch, Input, Message } from "@arco-design/web-react";
import { IconRefresh } from '@arco-design/web-react/icon';

import { v4 as uuid } from "uuid";
import { PromiseLock, getAudioStats, getVideoStats, playVideo, sleep } from './util';
import { usePublish } from "./sdk/dist/index.esm.js"

function Publisher(props: {AppID?: string, AppKey?: string, Domain?: string, StreamID?: string, PullAuth?: boolean, parameter?: string, Token: string}) {
  const _pubLock = new PromiseLock();

  if (!props.Token) {
    throw new Error("Token is required")
  }
  const SessionID = useRef(uuid()).current;
  const PullAuth = useRef(true).current;
  const Domain = useRef(props.Domain || window.location.host).current;
  const AppID = useRef(props.AppID || "bc22d5").current;
  const AppKey = useRef(props.AppKey || "00eec858271ea752").current;

  const [ StreamID, setStreamID ] = useState(props.StreamID || uuid());
  const [ pullUrl, setPullUrl ] = useState("");
  const [ pushState, setPushState ] = useState(false);
  const [ MuteAudio, setMuteAudio ] = useState(false);
  const [ MuteVideo, setMuteVideo ] = useState(false);
  const [ iceState, setIceState ] = useState("");
  const [ dtlsAudioState, setDtlsAudioState ] = useState("");
  const [ dtlsVideoState, setDtlsVideoState ] = useState("");
  const [ resolution, setResolution ] = useState("");
  const [ frameRate, setFrameRate ] = useState("");
  const [ codeRate, setCodeRate ] = useState("");
  const [ volume, setVolume ] = useState("");
  const [ errorMessage, setErrorMessage ] = useState("");
  const [ videoRenderDom, setVideoRenderDom ] = useState<HTMLDivElement | null>(null);
  const [ audio, setAudio ] = useState<MediaStreamTrack | null>(null);
  const [ video, setVideo ] = useState<MediaStreamTrack | null>(null);

  const { publish, mute, unpublish, getPeerConnection } = usePublish(props.Token);

  const startCapture = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    })
  
    const audio = stream.getAudioTracks()[0];
    const video = stream.getVideoTracks()[0];

    if (!audio) {
      throw new Error("获取麦克风失败")
    }

    if (!video) {
      throw new Error("获取摄像头失败")
    }

    if (videoRenderDom) {
      playVideo(videoRenderDom, stream)
    }
    return { audio, video };
  }
  const startPush = async () => {
    if (!AppID || !StreamID || !Domain || !SessionID || !AppKey) {
      setErrorMessage("参数不全");
      Message.error("参数不全");
      return;
    }
    const { audio, video } = await startCapture();
    setAudio(audio);
    setVideo(video);
    await publish(audio, video);
    setPushState(true);
    setPullUrl(`${window.location.origin}${window.location.pathname}?mode=pull&Domain=${Domain}&AppID=${AppID}&AppKey=${AppKey}&StreamID=${StreamID}&PullAuth=${PullAuth}&${props.parameter}`);
  }

  const stopPush = async () => {
    await unpublish();
    setPushState(false);
  }

  const startStatsLoop = async (audio: MediaStreamTrack, video: MediaStreamTrack) => {
    if (!pushState) {
      return;
    }
    const audioStats = await getAudioStats(getPeerConnection(), audio);
    const videoStats = await getVideoStats(getPeerConnection(), video);
    setVolume(audioStats.volume);
    setCodeRate(videoStats.vbps.toString());
    setFrameRate(videoStats.fps);
    setResolution(videoStats.resolution);

    await sleep(1000);
    startStatsLoop(audio, video);
  }

  useEffect(() => {
    if (pushState && audio && video) {
      startStatsLoop(audio, video)
    }
  }, [ pushState, audio, video ])
  return (
    <>
      <div className="Contrainer-left">

      </div>
      <div
        style={{
          width: 680,
          height: 365,
          display: "flex",
          flexWrap: "wrap",
          background: "#D3D3D3",
          marginTop: -55,
        }}
      >
        <div
          style={{ width: 480, height: 375, marginTop: -5 }}
          ref={(r) => setVideoRenderDom(r)}
        ></div>
        <div style={{ width: 200, height: 360 }}>
          <div
            className="Video-info"
            style={{
              marginTop: -14,
              marginLeft: 20,
              padding: 10,
              paddingTop: 0,
            }}
          >
            <p>
              <b>Info: </b>
            </p>
            <p id="ICE">Conn State：{iceState}</p>
            <p id="Resolution">
              Resolution：
              {resolution === "undefined*undefined"
                ? "读取中"
                : resolution}
            </p>
            <p id="FrameRate">
              Frame Rate：
              {frameRate === "undefined"
                ? "读取中"
                : frameRate}
            </p>
            <p id="VideoBitrate">Video Bitrate：{codeRate}</p>
            <p id="Volume">Volume：{volume}</p>
            <p id="ErrorMessage" style={{ color: "red" }}>
              {errorMessage
                ? `错误信息：${errorMessage}`
                : ""}
            </p>
          </div>
        </div>
        <div>
          <Space direction="vertical" size="medium">
            <div>
              {/* <div className="Basic-message">
                <span>StreamID：</span>
              </div> */}
              <Input
                id="StreamID"
                style={{ width: 400, marginRight: 10 }}
                value={StreamID}
                onChange={(v) => setStreamID(v)}
                placeholder="StreamID"
                suffix={<IconRefresh onClick={() => setStreamID(uuid())} />}
                addAfter={
                  <Button
                    id="pushButton"
                    type="primary"
                    status={pushState ? "danger" : "default"}
                    onClick={() => {
                      if (pushState) {
                        stopPush();
                      } else {
                        startPush();
                      }
                    }}
                  >
                    {pushState ? "StopPush" : "StartPush"}
                  </Button>
                }
                afterStyle={{ padding: 0, border: 'none' }}
              />
            </div>
            <Space direction="vertical">
              <Space>
                <Space>
                  <Button
                    id="PullLink"
                    disabled={!pushState}
                    onClick={() => {
                      window.open(pullUrl);
                    }}
                  >
                    PullLink
                  </Button>
                </Space>
                <div></div>
              </Space>
            </Space>
          </Space>
          <Space>
            Video:
            <Switch
              id="MuteVideo"
              checked={MuteVideo}
              onChange={async (v) => {
                setMuteVideo(v);
                if (dtlsVideoState === "connected") {
                  const unlock = await _pubLock.lock();
                  mute(v, "video");
                  unlock();
                }
              }}
            ></Switch>
            Audio:
            <Switch
              id="MuteAudio"
              checked={MuteAudio}
              onChange={async (v) => {
                setMuteAudio(v);
                if (dtlsAudioState === "connected") {
                  const unlock = await _pubLock.lock();
                  mute(v, "audio");
                  unlock();
                }
              }}
            ></Switch>
          </Space>
        </div>
      </div>
    </>
  );
}

export default Publisher;
