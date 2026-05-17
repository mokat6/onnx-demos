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
  private hasIntroText = true;

  private onPredictions?: PredictionCallback;

  private inputName = "";

  constructor(canvas: HTMLCanvasElement, onPredictions?: PredictionCallback) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.onPredictions = onPredictions;

    this.setupCanvas();
  }

  async init(modelUrl: string) {
    // IMPORTANT for Vite / wasm
    ort.env.wasm.wasmPaths = "/onnx/";

    this.session = await ort.InferenceSession.create(modelUrl, {
      executionProviders: ["wasm"],
    });

    console.log("SESSION input names  ", this.session.inputNames);
    console.log("SESSION nput metadata", this.session.inputMetadata);

    this.inputName = this.session.inputNames[0];

    // this.drawIntro();
  }

  // ------------------------
  // Canvas setup
  // ------------------------
  private setupCanvas() {
    this.ctx.lineWidth = 28;
    this.ctx.lineJoin = "round";
    this.ctx.lineCap = "round";
    this.ctx.strokeStyle = "#212121";
    this.ctx.fillStyle = "#212121";
    this.ctx.font = "28px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
  }

  private drawIntro() {
    this.ctx.clearRect(0, 0, SIZE, SIZE);
    this.ctx.fillText("Draw a number here!", SIZE / 2, SIZE / 2);
  }

  // ------------------------
  // Mouse API
  // ------------------------
  public onMouseDown = (x: number, y: number) => {
    console.log("[engine] on mouse down");
    this.isMouseDown = true;

    if (this.hasIntroText) {
      this.clear();
      this.hasIntroText = false;
    }

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
    // this.drawIntro();
    this.onPredictions?.(Array(10).fill(0));
  };

  // ------------------------
  // Core drawing
  // ------------------------
  private drawLine(fromX: number, fromY: number, toX: number, toY: number) {
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();

    this.updatePredictions();
  }

  // ------------------------
  // ONNX inference
  // ------------------------
  private async updatePredictions() {
    if (!this.session) return;

    const imgData = this.ctx.getImageData(0, 0, SIZE, SIZE);
    const data = imgData.data;

    // Convert RGBA → grayscale
    const flat = new Float32Array(SIZE * SIZE);

    for (let i = 0; i < SIZE * SIZE; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];

      // simple grayscale
      // flat[i] = (r + g + b) / (3 * 255);  // OG was this one
      flat[i] = 1 - (r + g + b) / (3 * 255);
    }

    // IMPORTANT: model expects FULL SIZE IMAGE FLATTENED
    const tensor = new ort.Tensor("float32", flat, [SIZE * SIZE]);

    const output = await this.session.run({
      [this.inputName]: tensor,
    });

    const values = Object.values(output)[0].data as Float32Array;

    this.onPredictions?.(Array.from(values));
  }
}
