import * as ort from "onnxruntime-web";

const SIZE = 560;

type PredictionCallback = (p: number[]) => void;

export class DigitEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private session!: ort.InferenceSession;

  private isMouseDown = false;
  private lastX = 0;
  private lastY = 0;

  private onPredictions?: PredictionCallback;
  private inputName = "";
  private isRunning = false;

  constructor(canvas: HTMLCanvasElement, onPredictions?: PredictionCallback) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.onPredictions = onPredictions;
    this.setupCanvas();
  }

  async init(modelUrl: string) {
    ort.env.wasm.wasmPaths = "/onnx/";
    this.session = await ort.InferenceSession.create(modelUrl, {
      executionProviders: ["wasm"],
    });
    this.inputName = this.session.inputNames[0];
  }

  private setupCanvas() {
    this.ctx.lineWidth = 28;
    this.ctx.lineJoin = "round";
    this.ctx.lineCap = "round";
    this.ctx.strokeStyle = "#212121";
  }

  public onMouseDown = (x: number, y: number) => {
    this.isMouseDown = true;
    this.lastX = x + 0.001;
    this.lastY = y + 0.001;
    this.onMouseMove(x, y);
  };

  public onMouseMove = (x: number, y: number) => {
    if (!this.isMouseDown) return;
    this.drawLine(this.lastX, this.lastY, x, y);
    this.lastX = x;
    this.lastY = y;
  };

  public onMouseUp = () => {
    this.isMouseDown = false;
  };

  public clear = () => {
    this.ctx.clearRect(0, 0, SIZE, SIZE);
    this.onPredictions?.(Array(10).fill(0));
  };

  private drawLine(fromX: number, fromY: number, toX: number, toY: number) {
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();
    this.updatePredictions();
  }

  private async updatePredictions() {
    if (!this.session) return;
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const imgData = this.ctx.getImageData(0, 0, SIZE, SIZE);
      const data = imgData.data;

      const flat = new Float32Array(SIZE * SIZE);
      for (let i = 0; i < SIZE * SIZE; i++) {
        flat[i] = data[i * 4 + 3]; // alpha channel: 0 = background, 255 = drawn
      }

      const tensor = new ort.Tensor("float32", flat, [SIZE * SIZE]);
      const output = await this.session.run({ [this.inputName]: tensor });
      const values = Object.values(output)[0].data as Float32Array;

      this.onPredictions?.(Array.from(values));
    } finally {
      this.isRunning = false;
    }
  }
}
