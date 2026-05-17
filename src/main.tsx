import ReactDOM from "react-dom/client";
import { createBrowserRouter, Link } from "react-router";
import { RouterProvider } from "react-router/dom";
import VadOld from "./projects/vad/VadOld";
import DigitDraw from "./projects/digit-draw";
import "./index.css";
import PasswordStrength from "./projects/password-strength";
import SignLanguage from "./projects/sign-language-letters";

export const Nav = () => {
  console.log("import.meta.env.BASE_URL >> ", import.meta.env.BASE_URL);

  return (
    <div>
      {["digit-draw", "vad-old", "password-strength", "sign-language"].map((itm) => (
        <div key={itm}>
          <Link to={itm}>{itm}</Link>
        </div>
      ))}
      <p className="mt-24!">
        <a href="https://netron.app/">https://netron.app/</a> to inspect annx model inputs and outputs and internals
      </p>
    </div>
  );
};

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Nav />,
    },
    {
      path: "/digit-draw",
      element: <DigitDraw />,
    },
    {
      path: "/vad-old",
      element: <VadOld />,
    },
    {
      path: "/password-strength",
      element: <PasswordStrength />,
    },
    {
      path: "/sign-language",
      element: <SignLanguage />,
    },
  ],
  {
    basename: import.meta.env.BASE_URL.replace(/\/$/, ""),
  },
);

console.log("import.meta.env.BASE_URL >> ", import.meta.env.BASE_URL);

const root = document.getElementById("root");

ReactDOM.createRoot(root!).render(<RouterProvider router={router} />);
