import { useEffect, useRef, useState } from 'react';
import { PageHeader } from "@arco-design/web-react";
import { v4 as uuid } from "uuid";
import { generateToken, getUrlPrmt } from './util';
import './App.css';
import Publisher from './Publisher';

function App() {
  const queryObject = getUrlPrmt();

  const mode = useRef(queryObject.mode || "push").current;
  const AppID = useRef(queryObject.AppID || "bc22d5").current;
  const AppKey = useRef(queryObject.AppKey || "00eec858271ea752").current;
  const StreamID = useRef(queryObject.StreamID || uuid()).current;

  const [ Token, setToken ] = useState("");

  useEffect(() => {
    if (mode === 'push') {
      generateToken({
        AppID,
        StreamID,
        Action: "pub",
        PullAuth: true,
        AppKey,
      }).then((token) => setToken(token))
    }
  }, [AppID, StreamID, AppKey, mode])
  return (
    <div className="Page">
      <PageHeader title="Welcome to the WTN Demo" className="Header" />
      <div className="Contrainer">
        { Token ? <Publisher AppID={AppID} StreamID={StreamID} AppKey={AppKey} Token={Token} ></Publisher> : null}
      </div>
    </div>
  );
}

export default App;
