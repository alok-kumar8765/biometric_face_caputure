from face_liveness_capture.backend.detection import verify_liveness

# Replace with real base64 from widget
fake_base64 = "data:image/jpeg;base64,....."

result = verify_liveness(fake_base64)
print(result)

#from face_liveness_capture.backend.face_utils import decode_base64_image
#from face_liveness_capture.backend.detection import verify_liveness
#import cv2

## Load image directly
#img = cv2.imread("E:/Work_Station/ChatGPT Code/tests/railway_pic.jpg")  # path to any real image

## Mock decode_base64_image
#def fake_decode(_):
#    return img

## Override function
#import face_liveness_capture.backend.detection as detection
#detection.decode_base64_image = fake_decode

#result = verify_liveness("anything_here")
#print(result)
