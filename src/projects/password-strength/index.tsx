import { useEffect, useRef, useState } from "react";
import * as ort from "onnxruntime-web";

const charToIdx = {};
const maxLength = 16;

function encodePassword(password: string) {
  const encoded = [];
  for (let i = 0; i < maxLength; i++) {
    if (i < password.length) {
      encoded.push(charToIdx[password[i]] || 0);
    } else {
      encoded.push(0);
    }
  }
  return new Int32Array(encoded);
}

let session = null;

const PasswordStrength = () => {
  const [prediction, setPrediction] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  useEffect(() => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[{]}\\|;:'\",<.>/?`~ ";
    let idx = 1;
    for (const char of chars) {
      charToIdx[char] = idx++;
    }

    (async () => {
      ort.env.wasmPaths = "/onnx/";
      session = await ort.InferenceSession.create("password/password_strength_cnn.onnx", {
        executionProviders: ["wasm"],
      });
    })();
  }, []);

  const clickHandler = async () => {
    const encoded = encodePassword(passwordInput);
    console.log("encoded: ", encoded);

    // const inputTensor = new ort.Tensor("float32", slice, [1, 512]);
    const tensor = new ort.Tensor("int32", encoded, [1, maxLength]);
    const feeds = { input: tensor };
    const output = await session.run(feeds);
    const prediction = output.output.data;

    const predictedClass = prediction.indexOf(Math.max(...prediction));

    console.log("prediction:  ", prediction);
    console.log("predictionClass:  ", predictedClass);
    const maps = { "0": "weak", "1": "not too bad", "2": "strong" };

    setPrediction(maps[predictedClass]);
  };

  return (
    <div className="flex gap-12">
      <label>
        Enter password
        <input className="border" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
      </label>
      <div>
        <div>
          <button className="border p-2 active:bg-gray-800" onClick={clickHandler}>
            Predict
          </button>
        </div>
        <div>Your password is: {prediction}</div>
      </div>
    </div>
  );
};

export default PasswordStrength;
