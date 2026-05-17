import { useRef, useState } from "react";
import * as ort from "onnxruntime-web";

export default function SileroVadFixed() {
  const [speaking, setSpeaking] = useState(false);

  const sessionRef = useRef<ort.InferenceSession | null>(null);
  const stateRef = useRef<ort.Tensor | null>(null);

  async function start() {
    const session = await ort.InferenceSession.create("/models/silero_vad.onnx", {
      executionProviders: ["wasm"],
    });

    sessionRef.current = session;

    // INIT STATE (important!)
    stateRef.current = new ort.Tensor(
      "float32",
      new Float32Array(2 * 1 * 128), // correct default size for silero v6
      [2, 1, 128],
    );

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    const audioContext = new AudioContext({
      sampleRate: 16000,
    });

    const source = audioContext.createMediaStreamSource(stream);

    const processor = audioContext.createScriptProcessor(512, 1, 1);

    const buffer: number[] = [];

    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = async (e) => {
      const input = e.inputBuffer.getChannelData(0);

      for (let i = 0; i < input.length; i++) {
        buffer.push(input[i]);
      }

      while (buffer.length >= 512) {
        const chunk = buffer.splice(0, 512);

        const inputTensor = new ort.Tensor("float32", Float32Array.from(chunk), [1, 512]);

        const feeds = {
          input: inputTensor,
          sr: new ort.Tensor("int64", BigInt64Array.from([16000n]), [1]),
          state: stateRef.current!,
        };

        const result = await session.run(feeds);

        const output = result.output as ort.Tensor;
        const prob = output.data[0] as number;

        // update state (CRITICAL)
        stateRef.current = result.state as ort.Tensor;

        setSpeaking(prob > 0.5);
      }
    };
  }

  return (
    <div style={{ textAlign: "center", marginTop: 100 }}>
      <button onClick={start}>Start</button>

      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: "50%",
          margin: "40px auto",
          background: speaking ? "#22c55e" : "#444",
          transform: speaking ? "scale(1.2)" : "scale(1)",
          transition: "all 120ms linear",
        }}
      />
    </div>
  );
}
