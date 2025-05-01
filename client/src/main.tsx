// client/src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.title = "Bottin des artistes | Diversité Artistique Montréal";

createRoot(document.getElementById("root")!).render(<App />);
