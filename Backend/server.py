import cv2
import numpy as np
import easyocr
import matplotlib.pyplot as plt

# Initialize EasyOCR reader
reader = easyocr.Reader(['en'], gpu=False)

def preprocess_image(image):
    # Convert the image to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Apply Gaussian Blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Apply adaptive thresholding to highlight text
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                   cv2.THRESH_BINARY, 11, 2)
    
    # Use morphological operations to clean up any small noise
    kernel = np.ones((3, 3), np.uint8)
    processed_image = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

    return processed_image

def extract_blue_regions(image):
    # Convert to HSV color space
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    # Define the HSV range for blue color
    lower_blue = np.array([100, 150, 50])
    upper_blue = np.array([140, 255, 255])

    # Create a mask for blue regions
    blue_mask = cv2.inRange(hsv, lower_blue, upper_blue)

    # Bitwise operation to retain only the blue regions
    blue_regions = cv2.bitwise_and(image, image, mask=blue_mask)

    return blue_mask, blue_regions

def read_text_from_blocks(image, blue_mask):
    # Extract contours from the blue mask to identify blocks
    contours, _ = cv2.findContours(blue_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    blocks = []
    
    # Sort contours by their x-coordinate (right to left)
    contours = sorted(contours, key=lambda c: cv2.boundingRect(c)[0], reverse=True)
    
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        block = image[y:y+h, x:x+w]
        blocks.append((x, y, w, h, block))
    
    # Sort blocks into rows based on their y-coordinate
    rows = []
    current_row = []
    previous_y = None
    row_threshold = 20  # Set a threshold to differentiate between rows (adjust if needed)

    for block in blocks:
        _, y, _, _, _ = block
        if previous_y is None or abs(previous_y - y) < row_threshold:
            current_row.append(block)
        else:
            rows.append(sorted(current_row, key=lambda b: b[0]))  # Sort the row from left to right
            current_row = [block]
        previous_y = y
    
    # Append the last row
    if current_row:
        rows.append(sorted(current_row, key=lambda b: b[0]))  # Sort the last row from left to right

    return rows

def process_image_for_ocr(image_path):
    # Load the image
    image = cv2.imread(image_path)

    # Preprocess the image for better OCR
    preprocessed_image = preprocess_image(image)

    # Extract blue regions
    blue_mask, blue_regions = extract_blue_regions(image)

    # Get the blocks (sorted right to left and top to bottom)
    rows = read_text_from_blocks(image, blue_mask)

    extracted_texts = []

    # Perform OCR on each block and collect the results
    for row in rows:
        for _, _, _, _, block in row:
            result = reader.readtext(block)
            block_text = " ".join([text[1] for text in result])
            extracted_texts.append(block_text)

    return extracted_texts, image, preprocessed_image, blue_mask

# Path to the image
image_path = './a.png'

# Extract text from the blue blocks in the image and get other outputs
extracted_texts, original_image, preprocessed_image, blue_mask = process_image_for_ocr(image_path)

# Display the original image and the preprocessed image using Matplotlib
fig, axs = plt.subplots(1, 2, figsize=(15, 7))

# Original Image with Blue Blocks
axs[0].imshow(cv2.cvtColor(original_image, cv2.COLOR_BGR2RGB))
axs[0].set_title("Original Image with Blue Blocks")
axs[0].axis('off')

# Preprocessed Image
axs[1].imshow(preprocessed_image, cmap='gray')
axs[1].set_title("Preprocessed Image")
axs[1].axis('off')

# Print the extracted text from each block row by row
for idx, text in enumerate(extracted_texts):
    print(f"Block {idx+1}: {text}")

plt.tight_layout()
plt.show()
