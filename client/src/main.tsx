import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import axios from "axios";
import { API_BASE } from "./config/api";


axios.defaults.baseURL = API_BASE;
axios.defaults.withCredentials = true;
createRoot(document.getElementById("root")!).render(<App />);
