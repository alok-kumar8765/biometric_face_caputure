# django_integration/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.shortcuts import render
import json
import base64
import logging
from face_liveness_capture.backend.detection import verify_liveness
from django.middleware.csrf import get_token

logger = logging.getLogger(__name__)


@csrf_protect
def upload_face(request):
    """Accepts JSON POST with `image` (data URL / base64) and returns verification result."""
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "POST method required"}, status=400)

    try:
        data = json.loads(request.body)
        image_data = data.get("image")
        if not image_data:
            logger.warning("upload_face called without image")
            return JsonResponse({"success": False, "error": "No image provided"}, status=400)

        logger.info("Received upload_face request from %s", request.META.get('REMOTE_ADDR'))

        # Call core verification logic
        result = verify_liveness(image_data)

        logger.info("verify_liveness result: %s", result)

        return JsonResponse(result)

    except Exception as e:
        logger.exception("Exception in upload_face")
        return JsonResponse({"success": False, "error": str(e)}, status=500)


def widget_view(request):
    """Render the frontend widget page (ensures CSRF cookie is set)."""
    # ensure CSRF cookie is set for JS POSTs
    get_token(request)
    return render(request, 'face_liveness_capture/widget.html')


@ensure_csrf_cookie
def demo_widget(request):
    """Render the demo widget page so browsers receive a CSRF cookie."""
    return render(request, 'face_liveness_capture/widget.html')