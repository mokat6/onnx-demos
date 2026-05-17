import ReactDOM from "react-dom/client";
import { createBrowserRouter, Link } from "react-router";
import { RouterProvider } from "react-router/dom";
import VadOld from "./projects/vad/VadOld";
import DigitDraw from "./projects/digit-draw";
import "./index.css";
import PasswordStrength from "./projects/password-strength";

export const Nav = () => {
  return ["digit-draw", "vad-old", "password-strength"].map((itm) => (
    <div>
      <Link to={itm}>{itm}</Link>
    </div>
  ));
};

const router = createBrowserRouter([
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
]);

const root = document.getElementById("root");

ReactDOM.createRoot(root!).render(<RouterProvider router={router} />);
