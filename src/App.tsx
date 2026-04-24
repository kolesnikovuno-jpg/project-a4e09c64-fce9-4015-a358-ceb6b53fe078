import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Canvas from "./pages/Canvas";
import Pricing from "./pages/Pricing";
import UnoCalc from "./pages/UnoCalc";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import PixelTransition from "./pages/PixelTransition";
import Lyra from "./pages/Lyra";
import LyraConcept from "./pages/LyraConcept";
import Garden from "./pages/Garden";
import Gateway from "./pages/Gateway";
import UnoStudio from "./pages/UnoStudio";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/doodle" element={<Canvas />} />
          <Route path="/pixels" element={<PixelTransition />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/unocalc" element={<UnoCalc />} />
          <Route path="/about" element={<About />} />
          <Route path="/lyra" element={<Lyra />} />
          <Route path="/garden" element={<Garden />} />
          <Route path="/lyra-concept" element={<LyraConcept />} />
          <Route path="/gateway" element={<Gateway />} />
          <Route path="/unostudio" element={<UnoStudio />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
