import { Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import UeberTCSPage from "./pages/UeberTCSPage";

export const homeRoutes = (
  <>
    <Route path="/" element={<HomePage />} />
    <Route path="/ueber-tcs" element={<UeberTCSPage />} />
  </>
);
