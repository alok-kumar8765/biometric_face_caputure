"""
Test project views for demonstrating face_liveness_capture package integration.
"""
import os
import logging
from django.shortcuts import render
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_protect
from django.http import JsonResponse

logger = logging.getLogger(__name__)


@require_http_methods(["GET"])
def index(request):
    """
    Render the test form with face capture widget.
    Displays form fields (name, email, phone, DOB, address) and liveness detection widget.
    """
    logger.info("Rendering test form index page")
    return render(request, 'index.html', {
        'page_title': 'Face Liveness Verification Test'
    })


@csrf_protect
@require_http_methods(["POST"])
def submit_form(request):
    """
    Handle form submission with captured face photo.
    
    Expected POST data:
    - name: User's full name
    - email: User's email address
    - phone: User's phone number
    - dob: User's date of birth (YYYY-MM-DD format)
    - address: User's address
    - captured_image: Base64 encoded face photo from liveness detection
    
    Returns:
    - JSON response with success status and message
    - File saved to media/captured_photos/ directory
    """
    try:
        # Extract form data
        name = request.POST.get('name', '').strip()
        email = request.POST.get('email', '').strip()
        phone = request.POST.get('phone', '').strip()
        dob = request.POST.get('dob', '').strip()
        address = request.POST.get('address', '').strip()
        captured_image = request.POST.get('captured_image', '').strip()
        
        logger.info(f"Form submission from: {name} ({email})")
        
        # Validate required fields
        if not all([name, email, phone, dob, address]):
            logger.warning("Form submission missing required fields")
            return render(request, 'index.html', {
                'error': 'All fields are required',
                'form_data': {
                    'name': name,
                    'email': email,
                    'phone': phone,
                    'dob': dob,
                    'address': address
                }
            }, status=400)
        
        if not captured_image:
            logger.warning("Form submission without captured image")
            return render(request, 'index.html', {
                'error': 'Please capture a photo before submitting',
                'form_data': {
                    'name': name,
                    'email': email,
                    'phone': phone,
                    'dob': dob,
                    'address': address
                }
            }, status=400)
        
        # Create directory for photos if it doesn't exist
        photos_dir = os.path.join(os.path.dirname(__file__), 'captured_photos')
        os.makedirs(photos_dir, exist_ok=True)
        
        # Save metadata to a simple text file (for testing)
        import uuid
        from datetime import datetime
        
        submission_id = str(uuid.uuid4())[:8]
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Save metadata file
        metadata_path = os.path.join(photos_dir, f'{submission_id}_metadata.txt')
        with open(metadata_path, 'w') as f:
            f.write(f"Submission ID: {submission_id}\n")
            f.write(f"Timestamp: {timestamp}\n")
            f.write(f"Name: {name}\n")
            f.write(f"Email: {email}\n")
            f.write(f"Phone: {phone}\n")
            f.write(f"Date of Birth: {dob}\n")
            f.write(f"Address: {address}\n")
            f.write(f"Image Data: {captured_image[:50]}... (truncated)\n")
        
        logger.info(f"Form submission successful. ID: {submission_id}")
        
        # Render success page
        return render(request, 'success.html', {
            'submission_id': submission_id,
            'name': name,
            'email': email,
            'timestamp': timestamp
        })
        
    except Exception as e:
        logger.exception(f"Error processing form submission: {str(e)}")
        return render(request, 'index.html', {
            'error': f'An error occurred: {str(e)}'
        }, status=500)
