import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import { FaPen, FaSave, FaPrint, FaTrash, FaHeart } from "react-icons/fa"; // Added FaTrash for delete button
import "./App.css";
import RectangleOverlay from "./RectangleOverlay";
import axios from "axios"; // Import axios for making HTTP requests
// import { color } from "html2canvas/dist/types/css/types/color";

const App = () => {
  const [rectangles, setRectangles] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canDraw, setCanDraw] = useState(false); // State to enable/disable drawing
  const [startPoint, setStartPoint] = useState(null);
  const [activeRectangleIndex, setActiveRectangleIndex] = useState(null); // Track the active rectangle
  const [dragging, setDragging] = useState(false); // For moving rectangles
  const [resizing, setResizing] = useState(null); // Track resizing state (top-left, top-right, etc.)
  const imageRef = useRef(null);
  const [outpuText, setoutpuText] = useState("~~~ Nothing scanned yet ~~~");
  const [arrayText, setarrayText] = useState([]);
  const [isArrayText, setisArrayText] = useState(false);

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
      // Capture only the image and overlays within the image container
      const canvas = await html2canvas(imageRef.current.parentElement, {
        backgroundColor: null, // Retain transparency
        useCORS: true, // For cross-origin images
      });

      // Convert the canvas to an image and trigger download
      const link = document.createElement("a");
      link.download = "exported-image.png"; // Name of the downloaded file
      link.href = canvas.toDataURL("image/png"); // Get the PNG data URL
      link.click();
    } catch (error) {
      console.error("Failed to export the image:", error);
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

  // Function to capture the image as base64 and send to the backend
  const captureAndProcessImage = async () => {
    setoutpuText("Scanning...");
    try {
      // Capture only the image and overlays within the image container
      const canvas = await html2canvas(imageRef.current.parentElement, {
        backgroundColor: null, // Retain transparency
        useCORS: true, // For cross-origin images
      });

      // Convert the canvas to a base64 image
      const base64Image = canvas.toDataURL();

      // Send the base64 image to the backend
      const response = await axios.post("http://127.0.0.1:5000/ocr", {
        image: base64Image,
      });

      if (response.data.text) {
        // alert("Extracted Text: " + response.data.text); // Display the extracted text
        setoutpuText(response.data.text);
        setarrayText(response.data.text);
        setisArrayText(true);
        console.log("truuuuuuuuuuuuuuuuuuuuu");
      } else {
        // alert("Error extracting text.");
        setoutpuText("Error extracting text.");
        setisArrayText(false);
      }
    } catch (error) {
      console.error("Error capturing or sending the image:", error);
      setisArrayText(false);
    }
  };

  const simpleOCRandCapture = async () => {
    if (rectangles.length != 0) {
      captureAndProcessImage();
      return;
    }
    setoutpuText("Performing Simple OCR...");
    try {
      setisArrayText(false);

      // Capture only the image and overlays within the image container
      const canvas = await html2canvas(imageRef.current.parentElement, {
        backgroundColor: null, // Retain transparency
        useCORS: true, // For cross-origin images
      });

      // Convert the canvas to a base64 image
      const base64Image = canvas.toDataURL();

      // Send the base64 image to the backend
      const response = await axios.post("http://127.0.0.1:5000/simpleocr", {
        image: base64Image,
      });

      if (response.data.text) {
        // Update output text with extracted OCR result
        console.log(response.data.text);
        setoutpuText(response.data.text);
      } else {
        setoutpuText("Error extracting text.");
      }
    } catch (error) {
      console.error("Error capturing or sending the image:", error);
      setoutpuText("Failed to process the image.");
    }
  };

  // ---------------------------
  const [imageSrc, setImageSrc] = useState("");
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result); // Set the uploaded image as the src
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="mainbody">
      <div className="titlesection">
        <h1 className="title">OCR</h1>
      </div>
      <div className="bodysection">
        <div className="output">
          <div className="toolbar">Output Section</div>
          <div className="output-section-body">
            <p>1. Click on pen and draw rectangles</p>
            <p>2. Then click heart to get results here:</p>
            <div className="output-box">
              {isArrayText ? (
                arrayText ? (
                  arrayText.map((item, index) => (
                    <span key={index} style={{ display: "block" }}>
                      {item.toUpperCase()}
                    </span>
                  ))
                ) : (
                  <div></div>
                )
              ) : (
                outpuText
              )}
            </div>
          </div>
        </div>
        <div
          className="App input"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          tabIndex={0}
        >
          {/* Overlay when in pen mode */}
          {isPenMode && <div className="overlay" />}

          {/* Sticky toolbar */}
          <div className="toolbar">
            <div>Input Section</div>
            <div>
              <button
                className={`toolbar-button ${canDraw ? "active" : ""}`}
                onClick={toggleDrawing}
                title="Toggle Drawing"
              >
                <FaPen />
              </button>
              <button
                className="toolbar-button"
                style={{ display: "none" }}
                onClick={exportImage}
                title="Download"
              >
                <FaSave />
              </button>
              <button
                className="toolbar-button"
                onClick={printRectangleCoords}
                style={{ display: "none" }}
                title="Print Coordinates"
              >
                <FaPrint />
              </button>

              <button
                className="toolbar-button"
                onClick={simpleOCRandCapture}
                title="Simple OCR"
              >
                <FaHeart />
              </button>

              {/* New heart button for capture and process */}
              <button
                className="toolbar-button"
                onClick={captureAndProcessImage}
                style={{ display: "none" }}
                title="Capture & Process Image"
              >
                <span style={{ paddingBottom: "20px" }}>❤️</span>
              </button>
            </div>
          </div>

          {/* Scrollable image container */}
          {imageSrc ? (
            <div className="scroll-container">
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt="Scrollable content"
                  className="scrollable-image"
                  ref={imageRef}
                  onMouseDown={handleMouseDown}
                />
              ) : (
                <></>
              )}
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
          ) : (
            <div className="fileinput">
              <label htmlFor="file-input" className="upload-btn">
                Upload Image
              </label>
              <input
                type="file"
                id="file-input"
                name="ImageStyle"
                onChange={handleImageUpload}
                className="fileinput-tag"
              />
            </div>
          )}
        </div>
      </div>
      <div class="copyright-container">
        <p class="copyright-text">
          Project by: Baseer Ahmed, Muhammad Hassan, Attique Sahito
        </p>
      </div>
    </div>
  );
};

export default App;
