import { FaTrash } from "react-icons/fa";
import "./rectangle.css";

const RectangleOverlay = ({
  rectangles,
  activeRectangleIndex,
  onRectangleClick,
  onDelete,
  setResizing,
  onResize, // Assuming you have a function to handle resizing
}) => {
  return (
    <>
      {rectangles.map((rect, index) => (
        <div
          key={index}
          className="rectangle"
          style={{
            position: "absolute",
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            border: "2px solid #ff0000", // Border color
            cursor: activeRectangleIndex === index ? "move" : "default",
          }}
          onClick={(e) => onRectangleClick(index, e)}
        >
          {activeRectangleIndex === index && (
            <>
              <button
                onClick={() => onDelete(index)}
                className="delete-button"
                style={{
                  position: "absolute",
                  top: "-20px",
                  left: "50%",
                  transform: "translateX(-50%)",
                }}
              >
                <FaTrash />
              </button>

              {/* Resize dots */}
              {["topLeft", "topRight", "bottomLeft", "bottomRight"].map(
                (corner) => (
                  <div
                    key={corner}
                    className="resize-dot"
                    style={{
                      position: "absolute",
                      cursor: `resize-${corner}`, // Dynamic cursor
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      ...(corner === "topLeft" && {
                        top: -5,
                        left: -5,
                        cursor: "nwse-resize",
                      }),
                      ...(corner === "topRight" && {
                        top: -5,
                        right: -5,
                        cursor: "nesw-resize",
                      }),
                      ...(corner === "bottomLeft" && {
                        bottom: -5,
                        left: -5,
                        cursor: "nesw-resize",
                      }),
                      ...(corner === "bottomRight" && {
                        bottom: -5,
                        right: -5,
                        cursor: "nwse-resize",
                      }),
                    }}
                    onMouseDown={(e) => {
                      setResizing(corner, rect, index);
                      e.stopPropagation(); // Prevent triggering other events
                    }}
                  />
                )
              )}
            </>
          )}
        </div>
      ))}
    </>
  );
};

export default RectangleOverlay;
