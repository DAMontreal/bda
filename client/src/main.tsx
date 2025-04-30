import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.title = "Bottin des artistes | Diversité Artistique Montréal";

createRoot(document.getElementById("root")!).render(<App />);

import router from './router' // This should now correctly resolve to client/src/router/index.ts
// ... other imports
app.use(router)
