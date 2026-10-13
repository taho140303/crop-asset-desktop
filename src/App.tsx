import { CanvasArea } from "@/components/layout/CanvasArea";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { RightInspector } from "@/components/layout/RightInspector";
import { TopBar } from "@/components/layout/TopBar";

function App() {
  return (
    <div className="flex h-full w-full flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <LeftSidebar />
        <CanvasArea />
        <RightInspector />
      </div>
    </div>
  );
}

export default App;
