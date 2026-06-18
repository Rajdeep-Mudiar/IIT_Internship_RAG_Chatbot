import { useState } from "react";

import UploadBox from "../components/UploadBox";

import ChatBox from "../components/ChatBox";

import ModelTable from "../components/ModelTable";

import ScoreChart from "../components/ScoreChart";

import LatencyChart from "../components/LatencyChart";

import GroundedChart from "../components/GroundedChart";

function Home() {
  const [results, setResults] = useState([]);

  return (
    <div>
      <UploadBox />

      <ChatBox setResults={setResults} />

      <ModelTable results={results} />

      <LatencyChart results={results} />

      <GroundedChart results={results} />

      <ScoreChart results={results} />
    </div>
  );
}

export default Home;
