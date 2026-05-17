import { useEffect, useRef, useState } from "react";
import * as ort from "onnxruntime-web";

const labels = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "del",
  "nothing",
  "space",
];

let mediaStream: MediaStream | null = null;
let sendFramesInterval: ReturnType<typeof setInterval> | null = null;
let session: ort.InferenceSession | null = null;
let isWebcamOn = false;

const SignLanguage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [predictionTxt, setPredictionTxt] = useState("");
  const [buttonTxt, setButtonTxt] = useState("Start Webcam");

  useEffect(() => {
    (async () => {
      ort.env.wasmPaths = `${import.meta.env.BASE_URL}onnx/`;
      session = await ort.InferenceSession.create(`${import.meta.env.BASE_URL}sign-language/asl_sign.onnx`, {
        executionProviders: ["wasm"],
      });
    })();

    return () => {
      // cleanup on unmount
      if (sendFramesInterval) clearInterval(sendFramesInterval);
      if (mediaStream) mediaStream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleButtonClick = async () => {
    if (!videoRef.current) return;

    try {
      if (!isWebcamOn) {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = mediaStream;
        isWebcamOn = true;
        setButtonTxt("Stop Webcam");
        sendFramesForPrediction();
      } else {
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
          mediaStream = null;
        }
        videoRef.current.srcObject = null;
        isWebcamOn = false;
        setButtonTxt("Start Webcam");
        if (sendFramesInterval) {
          clearInterval(sendFramesInterval);
          sendFramesInterval = null;
        }
        setPredictionTxt("");
      }
    } catch (error) {
      console.error("Error accessing webcam:", error);
    }
  };

  function sendFramesForPrediction() {
    sendFramesInterval = setInterval(async () => {
      if (!videoRef.current || !session) return;

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return;

      const targetWidth = 224;
      const targetHeight = 224;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const imageData_transformed = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData_transformed.data;
      const channels = 3;

      const normalizedData = new Float32Array(channels * targetWidth * targetHeight);
      for (let i = 0; i < data.length; i++) {
        normalizedData[i] = data[i] / 255;
      }

      const permutedData = new Float32Array(channels * targetWidth * targetHeight);
      for (let i = 0; i < data.length; i += 4) {
        permutedData[i] = normalizedData[i + 3]; // Alpha
        permutedData[i + 1] = normalizedData[i]; // Red
        permutedData[i + 2] = normalizedData[i + 1]; // Green
        permutedData[i + 3] = normalizedData[i + 2]; // Blue
      }

      const inputTensor = new ort.Tensor("float32", permutedData, [1, channels, targetHeight, targetWidth]);

      await sendImageForPrediction(inputTensor);
    }, 1000);
  }

  async function sendImageForPrediction(inputTensor: ort.Tensor) {
    if (!session) return;

    const feeds = { input1: inputTensor };
    const outputMap = await session.run(feeds);
    const outputData = outputMap.output1.data as Float32Array;

    let max = outputData[0];
    let maxIndex = 0;
    for (let i = 1; i < outputData.length; i++) {
      if (outputData[i] > max) {
        max = outputData[i];
        maxIndex = i;
      }
    }

    setPredictionTxt(labels[maxIndex]);
  }

  return (
    <div>
      <h1>Sign Language Alphabet Recognizer</h1>
      <video ref={videoRef} autoPlay width="224" height="224" className="border" />
      <div>
        <button onClick={handleButtonClick}>{buttonTxt}</button>
      </div>
      <div>
        <h2>Prediction:</h2>
        <h2>{predictionTxt}</h2>
      </div>
    </div>
  );
};

export default SignLanguage;
