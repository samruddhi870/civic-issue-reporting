# DFD 2.0 & 5.0 - Image Validation, EXIF Stripping & Storage Service
import os
import uuid
from PIL import Image
from werkzeug.utils import secure_filename
from flask import current_app

def allowed_file(filename):
    """Check if file extension is allowed."""
    return "." in filename and \
           filename.rsplit(".", 1)[1].lower() in current_app.config["ALLOWED_EXTENSIONS"]

def process_and_save_image(file_storage, folder="uploads", max_dimension=1920):
    """
    Validates image, strips EXIF data for citizen privacy,
    resizes if excessive, and saves clean file to disk.
    Returns: relative web URL path or None if invalid.
    """
    if not file_storage or not file_storage.filename:
        return None, "No file provided"

    if not allowed_file(file_storage.filename):
        return None, "Unsupported file format. Allowed: JPG, PNG, WEBP"

    # Read image using Pillow
    try:
        img = Image.open(file_storage.stream)
        img.verify()  # Verify image integrity
        
        # Re-open because verify() closes or alters file pointer
        file_storage.stream.seek(0)
        img = Image.open(file_storage.stream)
        
        # Convert RGBA to RGB if saving as JPEG
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Resize if dimensions exceed max_dimension
        width, height = img.size
        if width > max_dimension or height > max_dimension:
            img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

        # Create clean image copy to completely strip EXIF metadata
        clean_img = Image.new(img.mode, img.size)
        clean_img.putdata(list(img.getdata()))

        # Save to uploads directory with unique uuid
        upload_dir = current_app.config["UPLOAD_FOLDER"]
        os.makedirs(upload_dir, exist_ok=True)
        
        unique_name = f"{uuid.uuid4().hex}.jpg"
        target_path = os.path.join(upload_dir, unique_name)
        
        clean_img.save(target_path, "JPEG", quality=85, optimize=True)
        file_size = os.path.getsize(target_path)
        
        relative_url = f"/uploads/{unique_name}"
        return {
            "image_url": relative_url,
            "file_size": file_size,
            "mime_type": "image/jpeg"
        }, None

    except Exception as e:
        return None, f"Image processing failed: {str(e)}"
