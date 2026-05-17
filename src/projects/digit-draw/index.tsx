import { useEffect, useRef, useState } from "react";
import DigitCanvasUI from "./DigitCanvasUI";
import { DigitEngine } from "./DigitEngine";

export default function DigitDraw() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<DigitEngine | null>(null);

  const [predictions, setPredictions] = useState<number[]>(Array(10).fill(0));

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new DigitEngine(canvasRef.current, (p) => setPredictions(p));

    engineRef.current = engine;
    engine.init("/digit-draw/onnx_model.onnx");

    return () => {
      engineRef.current = null;
    };
  }, []);

  return (
    <>
      <DigitCanvasUI
        canvasRef={canvasRef}
        predictions={predictions}
        onClear={() => engineRef.current?.clear()}
        onCanvasMouseDown={(x, y) => engineRef.current?.onMouseDown(x, y)}
        onCanvasMouseMove={(x, y) => engineRef.current?.onMouseMove(x, y)}
        onCanvasMouseUp={() => engineRef.current?.onMouseUp()}
      />
    </>
  );
}
