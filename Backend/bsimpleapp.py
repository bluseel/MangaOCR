import easyocr
from PIL import Image
import io
import base64
import re
import numpy as np

# Initialize EasyOCR reader
reader = easyocr.Reader(['en'], gpu=False)

def decode_base64_image(data):
    """Decode a base64 image string, fixing padding and newline issues."""
    print("decoding....")
    img_data = re.sub('^data:image/.+;base64,', '', data)
    img_data = img_data.replace('\n', '').replace('\r', '')
    padding = len(img_data) % 4
    if padding != 0:
        img_data += '=' * (4 - padding)  # Add the necessary padding
    
    try:
        # Decode and open the image
        image = Image.open(io.BytesIO(base64.b64decode(img_data)))
        # Convert the PIL image to a numpy array
        image_np = np.array(image)
        return image_np
    except Exception as e:
        print(f"Error decoding image: {e}")
        return None

def extract_simple_text(image_data):
    """Extract text from the image using EasyOCR."""
    image_np = decode_base64_image(image_data)
    print("extractin....")
    
    if image_np is None:
        print("Failed to decode image.")
        return "No text found."

    # Use EasyOCR to extract text
    result = reader.readtext(image_np)
    
    # Extract the detected text
    extracted_text = ' '.join([text[1] for text in result])  # Join all detected texts
    
    return extracted_text
