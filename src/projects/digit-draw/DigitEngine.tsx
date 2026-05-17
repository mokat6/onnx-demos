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
    ort.env.wasm.wasmPaths = `${import.meta.env.BASE_URL}onnx/`;
    // creates session. Expensive. done once. runs on wasm
    this.session = await ort.InferenceSession.create(modelUrl, {
      executionProviders: ["wasm"],
    });
    // every onnx model has named inputs and outputs. This one has one input named "0". Normally use better names, could be multiple
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

      /*
A tensor is just a multi-dimensional array with a declared type and shape. Three things define it:

dtype — "float32" here. Must match what the model was trained with. Common options: "float32", "int64", "uint8".
data — a typed array (Float32Array, Int32Array, etc.) containing the flat values.
shape — an array of dimensions. [313600] means rank-1, 313600 elements. A typical image model would use [1, 1, 28, 28] meaning batch=1, channels=1, height=28, width=28.
  Shape is metadata — it doesn't change the underlying flat data, it just tells the model how to interpret it.
*/

      const tensor = new ort.Tensor("float32", flat, [SIZE * SIZE]);

      /*
This executes the model. You pass a map of { inputName: tensor } and get back a map of { outputName: tensor }

 It's async because the WASM backend runs the computation off the main thread. The model does all its matrix multiplications, activations, etc. internally — you just hand it data and get results back.

 backends:
 "wasm" — runs on the CPU via WebAssembly, works in any browser
"webgpu" — uses the GPU through the browser's WebGPU API, much faster
"cuda" — uses an Nvidia GPU directly, only available in server/desktop environments
"cpu" — plain CPU, no browser sandbox constraints


*/

      const output = await this.session.run({ [this.inputName]: tensor });

      /*
      Reading the output

      The output is also a tensor. .data gives you back the flat typed array. In your case it's 10 floats — one score per digit class (0–9)
      */
      console.log("output >>> ", output);
      const values = Object.values(output)[0].data as Float32Array;
      console.log("output222 >>> ", Object.values(output)[0].data);

      this.onPredictions?.(Array.from(values));
    } finally {
      this.isRunning = false;
    }
  }
}

/* 
The mental model is simple: session loads the model once, tensor wraps your input data, run() does the inference, output tensor has your results. Everything else is bookkeeping about names, shapes, and data types matching what the model was trained to expect
*/

/*
So "tensor" is really just the ML world's word for "typed, shaped array". NumPy calls them ndarray, PyTorch calls them Tensor, ONNX Runtime calls them Tensor — they're all the same concept
*/

/*
ArrayBuffer — raw bytes, no interpretation at all
Float32Array / Uint8Array etc — same bytes, but now you've declared how wide each element is and how to interpret the bits (signed, unsigned, float)
Tensor — same as a typed array, but now you've also declared how those elements are arranged in N-dimensional space


So a tensor is basically Float32Array + shape metadata. When the model sees shape [1, 1, 560, 560] it knows to treat every group of 560 values as a row, every group of 560 rows as a 2D image, etc. Without the shape it's just a flat bag of numbers with no structure


*/

/*
tensor.cpuData  // the raw internal Float32Array
tensor.data     // the public getter, also returns the Float32Array


"30" is export time output name. Probably auto assigned or sth. like named input is "0"
we convert to array and take first item.
*/
