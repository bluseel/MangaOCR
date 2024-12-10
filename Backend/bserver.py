# bserver.py
import cv2  # Add this import statement at the top
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from bapp import extract_text_from_image
from bsimpleapp import extract_simple_text

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes (allowing React to communicate with the backend)

@app.route('/ocr', methods=['POST'])
def ocr():
    # Get the base64 image string from the frontend
    print("-------------------------------")
    data = request.json.get('image')  # Assumes the image is sent as a JSON payload
    if not data:
        return jsonify({'error': 'No image provided'}), 400
    
    # Process the image and extract text
    try:
        extracted_text, image_np, preprocessed_image, blue_mask = extract_text_from_image(data)
        
        # Convert the processed image (image_np) to a base64 string
        _, buffer = cv2.imencode('.png', image_np)
        image_base64 = base64.b64encode(buffer).decode('utf-8')

        return jsonify({
            'text': extracted_text,
            'image': image_base64  # Include the image as base64
        })
    except Exception as e:
        # Log the error for debugging purposes
        print(f"Error during OCR processing: {str(e)}")
        return jsonify({'error': f"Internal server error: {str(e)}"}), 500


@app.route('/simpleocr', methods=['POST'])
def simple_ocr():
    # Get the base64 image string from the frontend
    data = request.json.get('image')
    if not data:
        return jsonify({'error': 'No image provided'}), 400

    # Extract text using extract_text_from_image function
    try:
        extracted_text = extract_simple_text(data)  # Only return the extracted text
        return jsonify({'text': extracted_text})  # Send only the text

    except Exception as e:
        print(f"Error during simple OCR processing: {str(e)}")
        return jsonify({'error': f"Internal server error: {str(e)}"}), 500



if __name__ == '__main__':
    app.run(debug=True)
