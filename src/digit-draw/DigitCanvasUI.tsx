import React from "react";

type Props = {
  predictions: number[];
  onClear: () => void;

  onCanvasMouseDown?: (x: number, y: number) => void;
  onCanvasMouseMove?: (x: number, y: number) => void;
  onCanvasMouseUp?: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
};

export default function DigitCanvasUI({
  predictions,
  onClear,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  canvasRef,
}: Props) {
  const maxIndex = predictions.length > 0 ? predictions.indexOf(Math.max(...predictions)) : -1;
  console.log("rerenders");
  const toXY = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();

    // IMPORTANT: convert to 280x280 space
    const scaleX = 280 / rect.width;
    const scaleY = 280 / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  return (
    <div style={{ display: "flex", gap: 20 }}>
      {/* Canvas */}
      <div>
        <canvas
          ref={canvasRef}
          width={280}
          height={280}
          style={{ border: "1px solid black" }}
          onMouseDown={(e) => {
            const { x, y } = toXY(e);
            console.log(x, y);
            onCanvasMouseDown?.(x, y);
          }}
          onMouseMove={(e) => {
            const { x, y } = toXY(e);
            onCanvasMouseMove?.(x, y);
          }}
          onMouseUp={() => onCanvasMouseUp?.()}
        />

        <button onClick={onClear}>CLEAR</button>
      </div>

      {/* Predictions */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
        {predictions.map((p, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div
              style={{
                height: 150,
                width: 20,
                display: "flex",
                alignItems: "flex-end",
                border: "1px solid #ccc",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: `${Math.max(0, Math.min(1, p)) * 100}%`,
                  background: i === maxIndex ? "limegreen" : "gray",
                  transition: "height 0.1s",
                }}
              />
            </div>
            <div>{i}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
