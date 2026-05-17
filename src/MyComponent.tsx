import { useEffect, useRef, useState } from "react";
import * as ort from "onnxruntime-web";

export default function MyComponent() {
  const [isSpeech, setIsSpeech] = useState(false);
  const [loading, setLoading] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let mounted = true;

    async function start() {
      //
      // 1. Configure ONNX Runtime
      //
      ort.env.wasm.wasmPaths = "/onnx/";
      ort.env.wasm.numThreads = 1; // for now, safest option!!!!!!!!!!!!!!!
      ort.env.wasm.proxy = false;
      ort.env.wasm.simd = true;
      //
      // 2. Load model
      //
      // Put your silero model in /public
      // Example:
      // /public/silero_vad.onnx
      //
      const session = await ort.InferenceSession.create("/silero_vad.onnx", {
        executionProviders: ["wasm"],
      });

      //
      // 3. Get microphone
      //
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      //
      // 4. Create audio context
      //
      const audioContext = new AudioContext({
        sampleRate: 16000,
      });

      audioContextRef.current = audioContext;

      //
      // 5. Create microphone source
      //
      const source = audioContext.createMediaStreamSource(stream);

      //
      // 6. Create script processor
      //
      // 4096 buffer size is easy for demo purposes
      //
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processorRef.current = processor;

      //
      // Silero V5 requires:
      //
      // input
      // state
      // sr
      //
      // state shape:
      // [2, 1, 128]
      //
      let state = new ort.Tensor("float32", new Float32Array(2 * 1 * 128), [2, 1, 128]);

      const sr = new ort.Tensor("int64", BigInt64Array.from([16000n]), []);

      processor.onaudioprocess = async (event) => {
        if (!mounted) return;

        try {
          //
          // Raw mic samples
          //
          const input = event.inputBuffer.getChannelData(0);

          //
          // Silero expects exactly 512 samples
          //
          // We'll take first 512
          //
          const slice = input.slice(0, 512);

          //
          // Create tensor
          //
          const inputTensor = new ort.Tensor("float32", slice, [1, 512]);

          //
          // Run inference
          //
          const result = await session.run({
            input: inputTensor,
            state,
            sr,
          });
          console.log("session result >> ", result);
          //
          // Output probability
          //
          // Usually:
          // output => speech probability
          //
          const output = result.output.data as Float32Array;
          console.log("output  >> ", output);
          //
          // Next recurrent state
          //
          //@ts-ignore
          state = result.stateN as ort.Tensor;

          const probability = output[0];

          //
          // Simple threshold
          //
          const speaking = probability > 0.5;

          setIsSpeech(speaking);

          console.log({
            probability,
            speaking,
          });
        } catch (err) {
          console.error(err);
        }
      };

      //
      // Required connections
      //
      source.connect(processor);
      processor.connect(audioContext.destination);

      setLoading(false);
    }

    start();

    return () => {
      mounted = false;

      processorRef.current?.disconnect();

      audioContextRef.current?.close();

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  return (
    <div className="flex items-center justify-center p-20">
      <div
        className="h-40 w-40 rounded-xl transition-colors"
        style={{
          backgroundColor: loading ? "gray" : isSpeech ? "limegreen" : "crimson",
        }}
      />
    </div>
  );
}
