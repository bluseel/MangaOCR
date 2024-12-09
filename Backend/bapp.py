import easyocr
from PIL import Image
import io
import base64
import re
import numpy as np
import cv2
import matplotlib.pyplot as plt
import os

# Initialize EasyOCR reader
reader = easyocr.Reader(['en'], gpu=False)

def decode_base64_image(data):
    """Decode a base64 image string, fixing padding and newline issues."""
    img_data = re.sub('^data:image/.+;base64,', '', data)
    img_data = img_data.replace('\n', '').replace('\r', '')
    padding = len(img_data) % 4
    if padding != 0:
        img_data += '=' * (4 - padding)  # Add the necessary padding
    
    try:
        # Decode and open the image
        return Image.open(io.BytesIO(base64.b64decode(img_data)))
    except Exception as e:
        print(f"Error decoding image: {e}")
        return None

def preprocess_image(image):
    """Preprocess the image for better OCR accuracy."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                   cv2.THRESH_BINARY, 11, 2)
    kernel = np.ones((3, 3), np.uint8)
    processed_image = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

    # Save the preprocessed image
    cv2.imwrite('output/preprocessed_image.png', processed_image)
    
    return processed_image

def extract_blue_regions(image):
    """Extract blue regions from the image."""
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    lower_blue = np.array([100, 150, 50])
    upper_blue = np.array([140, 255, 255])
    blue_mask = cv2.inRange(hsv, lower_blue, upper_blue)
    blue_regions = cv2.bitwise_and(image, image, mask=blue_mask)

    # Save the blue mask image
    cv2.imwrite('output/blue_mask.png', blue_mask)

    return blue_mask, blue_regions

def read_text_from_blocks(image, blue_mask):
    """Extract text blocks from the blue mask regions."""
    contours, _ = cv2.findContours(blue_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    blocks = []
    contours = sorted(contours, key=lambda c: cv2.boundingRect(c)[0], reverse=True)
    
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        block = image[y:y+h, x:x+w]
        blocks.append((x, y, w, h, block))
    
    rows = []
    current_row = []
    previous_y = None
    row_threshold = 20

    for block in blocks:
        _, y, _, _, _ = block
        if previous_y is None or abs(previous_y - y) < row_threshold:
            current_row.append(block)
        else:
            rows.append(sorted(current_row, key=lambda b: b[0]))
            current_row = [block]
        previous_y = y
    
    if current_row:
        rows.append(sorted(current_row, key=lambda b: b[0]))

    return rows

def extract_text_from_image(image_data):
    """Extract text from the image using easyocr."""
    image = decode_base64_image(image_data)
    
    if not image:
        print("Failed to decode image.")
        return [], None, None, None
    
    image_np = np.array(image)
    preprocessed_image = preprocess_image(image_np)
    blue_mask, blue_regions = extract_blue_regions(image_np)
    rows = read_text_from_blocks(image_np, blue_mask)

    extracted_texts = []

    for row in rows:
        for _, _, _, _, block in row:
            result = reader.readtext(block)
            block_text = " ".join([text[1] for text in result])
            extracted_texts.append(block_text)

    # Save the original image with blue regions
    cv2.imwrite('output/original_image_with_blue_regions.png', image_np)

    return extracted_texts, image_np, preprocessed_image, blue_mask


def main():
    """Wait for the image data to be passed and process it."""
    image_data = input("Please paste your base64 encoded image data: ")
    
    # Ensure the output directory exists
    if not os.path.exists('output'):
        os.makedirs('output')

    extracted_texts, original_image, preprocessed_image, blue_mask = extract_text_from_image(image_data)

    if extracted_texts:
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

        plt.tight_layout()
        plt.show()

        # Save the extracted texts to a file
        with open('output/ocr.txt', 'w') as f:
            for idx, text in enumerate(extracted_texts):
                f.write(f"Block {idx + 1}: {text}\n")
            print("Extracted text saved to ocr.txt.")
    else:
        print("No text was extracted from the image.")

# Call the main function to wait for image input
if __name__ == "__main__":
    main()
