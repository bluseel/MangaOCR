import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import { FaPen, FaSave, FaPrint, FaTrash } from "react-icons/fa"; // Added FaTrash for delete button
import "./App.css";
import RectangleOverlay from "./RectangleOverlay";

const App = () => {
  const [rectangles, setRectangles] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canDraw, setCanDraw] = useState(false); // State to enable/disable drawing
  const [startPoint, setStartPoint] = useState(null);
  const [activeRectangleIndex, setActiveRectangleIndex] = useState(null); // Track the active rectangle
  const [dragging, setDragging] = useState(false); // For moving rectangles
  const [resizing, setResizing] = useState(null); // Track resizing state (top-left, top-right, etc.)
  const imageRef = useRef(null);

  const [isPenMode, setIsPenMode] = useState(false); // Track if we're in pen mode or not

  const handleMouseDown = (e) => {
    if (!canDraw) return;

    // Prevent the default action of the mouse event (which is dragging the image)
    e.preventDefault();

    const rect = imageRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left; // Get mouse position relative to the image container
    const startY = e.clientY - rect.top; // Get mouse position relative to the image container

    setStartPoint({ x: startX, y: startY });

    setRectangles((prev) => [
      ...prev,
      {
        x: startX,
        y: startY,
        width: 0,
        height: 0,
      },
    ]);
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (isDrawing) {
      const rect = imageRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const updatedRectangle = {
        x: Math.min(startPoint.x, currentX),
        y: Math.min(startPoint.y, currentY),
        width: Math.abs(currentX - startPoint.x),
        height: Math.abs(currentY - startPoint.y),
      };

      // Update the last rectangle being drawn
      setRectangles((prev) => {
        const newRects = [...prev];
        newRects[newRects.length - 1] = updatedRectangle;
        return newRects;
      });
    }

    if (dragging && activeRectangleIndex !== null) {
      // Handle rectangle movement
      const rect = imageRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      const deltaX = currentX - startPoint.x;
      const deltaY = currentY - startPoint.y;

      const updatedRectangles = [...rectangles];
      updatedRectangles[activeRectangleIndex] = {
        ...updatedRectangles[activeRectangleIndex],
        x: updatedRectangles[activeRectangleIndex].x + deltaX,
        y: updatedRectangles[activeRectangleIndex].y + deltaY,
      };

      setRectangles(updatedRectangles);
      setStartPoint({ x: currentX, y: currentY });
    }

    if (resizing !== null) {
      // Handle resizing
      const rect = imageRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      let updatedRectangles = [...rectangles];
      const currentRect = updatedRectangles[activeRectangleIndex];

      if (resizing === "topLeft") {
        currentRect.width += currentRect.x - currentX;
        currentRect.height += currentRect.y - currentY;
        currentRect.x = currentX;
        currentRect.y = currentY;
      } else if (resizing === "topRight") {
        currentRect.width = currentX - currentRect.x;
        currentRect.height += currentRect.y - currentY;
        currentRect.y = currentY;
      } else if (resizing === "bottomLeft") {
        currentRect.width += currentRect.x - currentX;
        currentRect.height = currentY - currentRect.y;
        currentRect.x = currentX;
      } else if (resizing === "bottomRight") {
        currentRect.width = currentX - currentRect.x;
        currentRect.height = currentY - currentRect.y;
      }

      updatedRectangles[activeRectangleIndex] = currentRect;
      setRectangles(updatedRectangles);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setDragging(false);
    setResizing(null);
  };

  const toggleDrawing = () => {
    setCanDraw((prev) => !prev);
    setIsPenMode(!isPenMode); // Toggle pen mode when switching drawing
  };

  // Handle clicking a rectangle
  const handleRectangleClick = (index, e) => {
    e.stopPropagation(); // Prevent triggering other events
    setActiveRectangleIndex(index);
  };

  // Handle deleting a rectangle
  const handleDelete = (index) => {
    setRectangles((prev) => prev.filter((_, i) => i !== index));
    setActiveRectangleIndex(null); // Clear the active rectangle after deletion
  };

  // Adjust the rectangle positions during export
  const exportImage = async () => {
    try {
      // Capture the page content using html2canvas
      const canvas = await html2canvas(document.body, {
        scrollY: 0, // Prevent the page from scrolling when capturing the image
        backgroundColor: "black", // Set the background color to black for the entire canvas
      });

      // Create a link to download the captured image
      const link = document.createElement("a");
      link.download = "exported-page.png"; // Name of the downloaded file
      link.href = canvas.toDataURL("image/png"); // Convert the canvas to a PNG data URL

      // Trigger the download
      link.click();
    } catch (error) {
      console.error("Failed to export the image:", error); // Error handling
    }
  };

  // Function to log rectangle coordinates
  const printRectangleCoords = () => {
    rectangles.forEach((rect, index) => {
      const p1 = { x: rect.x, y: rect.y }; // Top-left corner
      const p2 = { x: rect.x + rect.width, y: rect.y }; // Top-right corner
      const p3 = { x: rect.x + rect.width, y: rect.y + rect.height }; // Bottom-right corner
      const p4 = { x: rect.x, y: rect.y + rect.height }; // Bottom-left corner

      console.log(
        `Rectangle ${index + 1}: p1(${p1.x}, ${p1.y}) p2(${p2.x}, ${p2.y}) p3(${
          p3.x
        }, ${p3.y}) p4(${p4.x}, ${p4.y})`
      );
    });
  };

  return (
    <div
      className="App"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      tabIndex={0}
    >
      {/* Overlay when in pen mode */}
      {isPenMode && <div className="overlay" />}

      {/* Sticky toolbar */}
      <div className="toolbar">
        <button
          className={`toolbar-button ${canDraw ? "active" : ""}`}
          onClick={toggleDrawing}
          title="Toggle Drawing"
        >
          <FaPen />
        </button>
        <button
          className="toolbar-button"
          onClick={exportImage}
          title="Download"
        >
          <FaSave />
        </button>
        <button
          className="toolbar-button"
          onClick={printRectangleCoords}
          title="Print Coordinates"
        >
          <FaPrint />
        </button>
      </div>

      {/* Scrollable image container */}

      <div className="scroll-container">
        <img
          src="/4.jpg"
          alt="Scrollable content"
          className="scrollable-image"
          ref={imageRef}
          style={{
            height: "300vh",
            width: "100%",
          }}
          onMouseDown={handleMouseDown}
        />
        <>
          <RectangleOverlay
            rectangles={rectangles}
            activeRectangleIndex={activeRectangleIndex}
            onRectangleClick={handleRectangleClick}
            onDelete={handleDelete}
            setResizing={setResizing}
          />
        </>
      </div>
    </div>
  );
};

export default App;
