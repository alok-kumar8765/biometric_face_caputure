# REST API Guide - Multi-Language Integration

This guide demonstrates how to integrate the Face Liveness Capture API from **any programming language** - just like Twilio, SendGrid, or Stripe SDKs work across all platforms.

## Table of Contents
1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Request/Response Format](#requestresponse-format)
5. [Language Examples](#language-examples)
6. [Error Handling](#error-handling)

---

## API Overview

The Face Liveness Capture API provides REST endpoints that can be called from any HTTP client. Your backend (Node.js, PHP, Go, Python, etc.) can:

1. **Upload a face image** for analysis
2. **Verify liveness** of the captured face
3. **Check service health**

**Base URL:** `http://localhost:8000/api/` (or your deployment URL)

### Why REST API?
- ✅ Language-agnostic (works with any backend)
- ✅ HTTP standard (works with any framework - Express, Laravel, Flask, Gin, etc.)
- ✅ No SDK dependency (no Python/Django requirement)
- ✅ Works cross-domain (your backend talks to our backend)

---

## Authentication

### Bearer Token (Recommended)
```
Authorization: Bearer YOUR_API_TOKEN
```

### API Key Header
```
X-API-Key: YOUR_API_KEY
```

### Getting Tokens
1. **Development:** Pass `token='your-test-token'` to Django settings
2. **Production:** Use Django Token Authentication or API key management

---

## Endpoints

### 1. Upload Face Image
```
POST /api/face-capture/
Content-Type: multipart/form-data

Parameters:
  - image (file): Face image (JPEG/PNG, max 5MB)
  - user_id (string, optional): Unique user identifier
  - session_id (string, optional): Session tracking ID
  - metadata (JSON, optional): Additional data
```

**Response (200 OK):**
```json
{
  "id": "uuid-1234",
  "image_url": "/media/faces/uuid-1234.jpg",
  "landmarks": [[x, y], [x, y], ...],
  "detected": true,
  "confidence": 0.95,
  "user_id": "user123",
  "session_id": "session-abc",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Verify Liveness
```
POST /api/verify-liveness/
Content-Type: application/json

Parameters:
  - face_id (string): ID from face-capture endpoint
  - user_id (string, optional): User identifier
  - threshold (float, optional): Confidence threshold (0.0-1.0)
```

**Response (200 OK):**
```json
{
  "is_live": true,
  "confidence": 0.98,
  "details": {
    "blink_detected": true,
    "head_movement": true,
    "lighting": "good"
  },
  "face_id": "uuid-1234",
  "timestamp": "2024-01-15T10:31:00Z"
}
```

### 3. Health Check
```
GET /api/health/
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "opencv": "ok"
  }
}
```

---

## Request/Response Format

### Standard Response Format
```json
{
  "success": true,
  "data": {
    // endpoint-specific data
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "INVALID_IMAGE",
    "message": "Image format not supported",
    "details": {
      "allowed_formats": ["jpeg", "png"],
      "received_format": "webp"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Error Codes
| Code | Status | Meaning |
|------|--------|---------|
| INVALID_IMAGE | 400 | Image not JPEG/PNG or corrupted |
| NO_FACE_DETECTED | 400 | No face found in image |
| LIVENESS_FAILED | 400 | Face is not live (spoofing detected) |
| INVALID_FACE_ID | 404 | Face ID doesn't exist |
| AUTH_FAILED | 401 | Invalid token/API key |
| RATE_LIMITED | 429 | Too many requests |
| SERVER_ERROR | 500 | Internal error |

---

## Language Examples

### Python (Django/Flask/FastAPI)
```python
import requests
import json
from pathlib import Path

# Configuration
API_BASE_URL = "http://localhost:8000/api"
API_TOKEN = "your-api-token"

headers = {
    "Authorization": f"Bearer {API_TOKEN}"
}

# 1. Upload face image
def upload_face(image_path: str, user_id: str = None):
    """Upload a face image for analysis"""
    with open(image_path, 'rb') as image_file:
        files = {
            'image': image_file,
            'user_id': (None, user_id or 'user123'),
            'metadata': (None, json.dumps({
                'source': 'mobile_app',
                'version': '1.0'
            }))
        }
        
        response = requests.post(
            f"{API_BASE_URL}/face-capture/",
            files=files,
            headers=headers
        )
    
    return response.json()

# 2. Verify liveness
def verify_liveness(face_id: str, user_id: str = None):
    """Verify if captured face is live"""
    payload = {
        'face_id': face_id,
        'user_id': user_id or 'user123',
        'threshold': 0.90
    }
    
    response = requests.post(
        f"{API_BASE_URL}/verify-liveness/",
        json=payload,
        headers=headers
    )
    
    return response.json()

# 3. Check health
def check_health():
    """Check API server health"""
    response = requests.get(
        f"{API_BASE_URL}/health/",
        headers=headers
    )
    return response.json()

# Usage
if __name__ == "__main__":
    # Upload
    face_result = upload_face('face.jpg', user_id='john_doe')
    print("Upload result:", face_result)
    
    if face_result.get('success'):
        face_id = face_result['data']['id']
        
        # Verify
        verify_result = verify_liveness(face_id, user_id='john_doe')
        print("Verification result:", verify_result)
        
        if verify_result.get('data', {}).get('is_live'):
            print("✓ Face is live and authentic!")
        else:
            print("✗ Face liveness check failed")
    
    # Health
    health = check_health()
    print("API Health:", health)
```

### Node.js (Express/Fastify/NestJS)
```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Configuration
const API_BASE_URL = 'http://localhost:8000/api';
const API_TOKEN = 'your-api-token';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`
  }
});

// 1. Upload face image
async function uploadFace(imagePath, userId = 'user123') {
  const form = new FormData();
  form.append('image', fs.createReadStream(imagePath));
  form.append('user_id', userId);
  form.append('metadata', JSON.stringify({
    source: 'web_app',
    version: '1.0'
  }));
  
  try {
    const response = await client.post('/face-capture/', form, {
      headers: form.getHeaders()
    });
    return response.data;
  } catch (error) {
    console.error('Upload failed:', error.response?.data || error.message);
    throw error;
  }
}

// 2. Verify liveness
async function verifyLiveness(faceId, userId = 'user123') {
  try {
    const response = await client.post('/verify-liveness/', {
      face_id: faceId,
      user_id: userId,
      threshold: 0.90
    });
    return response.data;
  } catch (error) {
    console.error('Verification failed:', error.response?.data || error.message);
    throw error;
  }
}

// 3. Check health
async function checkHealth() {
  try {
    const response = await client.get('/health/');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error.response?.data || error.message);
    throw error;
  }
}

// Usage (Express example)
const express = require('express');
const app = express();

app.post('/verify-user', async (req, res) => {
  try {
    // Save uploaded file
    const imagePath = req.files.face.tempFilePath;
    const userId = req.body.user_id;
    
    // Step 1: Upload face
    const uploadResult = await uploadFace(imagePath, userId);
    console.log('Upload result:', uploadResult);
    
    if (!uploadResult.success) {
      return res.status(400).json(uploadResult);
    }
    
    const faceId = uploadResult.data.id;
    
    // Step 2: Verify liveness
    const verifyResult = await verifyLiveness(faceId, userId);
    console.log('Verification result:', verifyResult);
    
    if (verifyResult.data.is_live) {
      res.json({
        success: true,
        message: 'Face verified as live!',
        confidence: verifyResult.data.confidence
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Face liveness check failed'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.listen(3000, () => console.log('Server running on :3000'));
```

### PHP (Laravel/Symfony/WordPress)
```php
<?php

class FaceLivenessAPI {
    private $base_url = 'http://localhost:8000/api';
    private $api_token = 'your-api-token';
    
    /**
     * Upload face image
     */
    public function uploadFace($imagePath, $userId = 'user123') {
        $curl = curl_init();
        
        // Prepare multipart form data
        $post_fields = array(
            'image' => new CURLFile($imagePath),
            'user_id' => $userId,
            'metadata' => json_encode([
                'source' => 'php_app',
                'version' => '1.0'
            ])
        );
        
        curl_setopt_array($curl, array(
            CURLOPT_URL => "{$this->base_url}/face-capture/",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $post_fields,
            CURLOPT_HTTPHEADER => array(
                "Authorization: Bearer {$this->api_token}"
            ),
            CURLOPT_TIMEOUT => 30
        ));
        
        $response = curl_exec($curl);
        $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
        
        if ($http_code === 200) {
            return json_decode($response, true);
        } else {
            throw new Exception("Upload failed: {$response}");
        }
    }
    
    /**
     * Verify liveness
     */
    public function verifyLiveness($faceId, $userId = 'user123') {
        $curl = curl_init();
        
        $payload = json_encode([
            'face_id' => $faceId,
            'user_id' => $userId,
            'threshold' => 0.90
        ]);
        
        curl_setopt_array($curl, array(
            CURLOPT_URL => "{$this->base_url}/verify-liveness/",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => array(
                "Authorization: Bearer {$this->api_token}",
                "Content-Type: application/json"
            ),
            CURLOPT_TIMEOUT => 30
        ));
        
        $response = curl_exec($curl);
        $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
        
        if ($http_code === 200) {
            return json_decode($response, true);
        } else {
            throw new Exception("Verification failed: {$response}");
        }
    }
    
    /**
     * Check health
     */
    public function checkHealth() {
        $curl = curl_init();
        
        curl_setopt_array($curl, array(
            CURLOPT_URL => "{$this->base_url}/health/",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => array(
                "Authorization: Bearer {$this->api_token}"
            ),
            CURLOPT_TIMEOUT => 10
        ));
        
        $response = curl_exec($curl);
        $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
        
        if ($http_code === 200) {
            return json_decode($response, true);
        } else {
            throw new Exception("Health check failed");
        }
    }
}

// Laravel usage example
Route::post('/api/verify-face', function (\Illuminate\Http\Request $request) {
    try {
        $api = new FaceLivenessAPI();
        
        // Validate input
        $validated = $request->validate([
            'face_image' => 'required|image|mimes:jpeg,png|max:5000',
            'user_id' => 'required|string'
        ]);
        
        // Upload face
        $imagePath = $request->file('face_image')->path();
        $uploadResult = $api->uploadFace($imagePath, $validated['user_id']);
        
        if (!$uploadResult['success']) {
            return response()->json($uploadResult, 400);
        }
        
        $faceId = $uploadResult['data']['id'];
        
        // Verify liveness
        $verifyResult = $api->verifyLiveness($faceId, $validated['user_id']);
        
        if ($verifyResult['data']['is_live']) {
            return response()->json([
                'success' => true,
                'message' => 'Face verified as live!',
                'confidence' => $verifyResult['data']['confidence']
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Face liveness check failed'
            ], 400);
        }
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => $e->getMessage()
        ], 500);
    }
});
```

### Go (Gin/Echo/Fiber)
```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
)

const (
	APIURL    = "http://localhost:8000/api"
	APIToken  = "your-api-token"
)

type FaceLivenessClient struct {
	baseURL string
	token   string
	client  *http.Client
}

func NewFaceLivenessClient(token string) *FaceLivenessClient {
	return &FaceLivenessClient{
		baseURL: APIURL,
		token:   token,
		client:  &http.Client{},
	}
}

// UploadFace uploads a face image
func (c *FaceLivenessClient) UploadFace(imagePath, userID string) (map[string]interface{}, error) {
	file, err := os.Open(imagePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	
	// Create multipart form
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	
	// Add image file
	part, err := writer.CreateFormFile("image", filepath.Base(imagePath))
	if err != nil {
		return nil, err
	}
	io.Copy(part, file)
	
	// Add user_id
	writer.WriteField("user_id", userID)
	
	// Add metadata
	metadata := map[string]string{
		"source":  "go_app",
		"version": "1.0",
	}
	metadataJSON, _ := json.Marshal(metadata)
	writer.WriteField("metadata", string(metadataJSON))
	
	writer.Close()
	
	// Create request
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/face-capture/", c.baseURL), body)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.token))
	req.Header.Set("Content-Type", writer.FormDataContentType())
	
	// Send request
	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	// Parse response
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	
	return result, nil
}

// VerifyLiveness verifies face liveness
func (c *FaceLivenessClient) VerifyLiveness(faceID, userID string) (map[string]interface{}, error) {
	payload := map[string]interface{}{
		"face_id":   faceID,
		"user_id":   userID,
		"threshold": 0.90,
	}
	
	payloadJSON, _ := json.Marshal(payload)
	req, err := http.NewRequest(
		"POST",
		fmt.Sprintf("%s/verify-liveness/", c.baseURL),
		bytes.NewBuffer(payloadJSON),
	)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.token))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	
	return result, nil
}

// CheckHealth checks API health
func (c *FaceLivenessClient) CheckHealth() (map[string]interface{}, error) {
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/health/", c.baseURL), nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.token))
	
	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	
	return result, nil
}

// Usage example with Gin
func main() {
	api := NewFaceLivenessClient(APIToken)
	
	// Upload and verify
	uploadResult, err := api.UploadFace("face.jpg", "user123")
	if err != nil {
		fmt.Printf("Upload failed: %v\n", err)
		return
	}
	
	fmt.Println("Upload result:", uploadResult)
	
	if success, ok := uploadResult["success"].(bool); ok && success {
		data := uploadResult["data"].(map[string]interface{})
		faceID := data["id"].(string)
		
		verifyResult, err := api.VerifyLiveness(faceID, "user123")
		if err != nil {
			fmt.Printf("Verification failed: %v\n", err)
			return
		}
		
		fmt.Println("Verification result:", verifyResult)
	}
}
```

### Ruby (Rails/Sinatra)
```ruby
require 'net/http'
require 'json'
require 'multipart_body'

class FaceLivenessAPI
  attr_reader :base_url, :api_token
  
  def initialize(api_token = 'your-api-token')
    @base_url = 'http://localhost:8000/api'
    @api_token = api_token
  end
  
  # Upload face image
  def upload_face(image_path, user_id = 'user123')
    uri = URI("#{base_url}/face-capture/")
    
    # Build multipart form data
    form = MultipartForm.new
    form.add_file('image', image_path)
    form.add_field('user_id', user_id)
    form.add_field('metadata', {
      source: 'ruby_app',
      version: '1.0'
    }.to_json)
    
    # Create request
    req = Net::HTTP::Post.new(uri)
    req['Authorization'] = "Bearer #{api_token}"
    req.set_form(form.fields, form.boundary)
    
    # Send request
    response = Net::HTTP.start(uri.hostname, uri.port) { |http| http.request(req) }
    JSON.parse(response.body)
  end
  
  # Verify liveness
  def verify_liveness(face_id, user_id = 'user123')
    uri = URI("#{base_url}/verify-liveness/")
    
    payload = {
      face_id: face_id,
      user_id: user_id,
      threshold: 0.90
    }
    
    # Create request
    req = Net::HTTP::Post.new(uri)
    req['Authorization'] = "Bearer #{api_token}"
    req['Content-Type'] = 'application/json'
    req.body = payload.to_json
    
    # Send request
    response = Net::HTTP.start(uri.hostname, uri.port) { |http| http.request(req) }
    JSON.parse(response.body)
  end
  
  # Check health
  def check_health
    uri = URI("#{base_url}/health/")
    
    req = Net::HTTP::Get.new(uri)
    req['Authorization'] = "Bearer #{api_token}"
    
    response = Net::HTTP.start(uri.hostname, uri.port) { |http| http.request(req) }
    JSON.parse(response.body)
  end
end

# Rails controller example
class FaceVerificationController < ApplicationController
  def verify_user
    begin
      api = FaceLivenessAPI.new
      
      # Validate input
      return render json: { error: 'Image required' }, status: :bad_request if params[:face_image].blank?
      
      # Save uploaded file
      image_path = params[:face_image].path
      user_id = params[:user_id] || 'user123'
      
      # Upload face
      upload_result = api.upload_face(image_path, user_id)
      
      unless upload_result['success']
        return render json: upload_result, status: :bad_request
      end
      
      face_id = upload_result['data']['id']
      
      # Verify liveness
      verify_result = api.verify_liveness(face_id, user_id)
      
      if verify_result['data']['is_live']
        render json: {
          success: true,
          message: 'Face verified as live!',
          confidence: verify_result['data']['confidence']
        }
      else
        render json: {
          success: false,
          message: 'Face liveness check failed'
        }, status: :bad_request
      end
    rescue => e
      render json: {
        success: false,
        message: e.message
      }, status: :internal_server_error
    end
  end
end
```

### Java (Spring Boot/Micronaut)
```java
import okhttp3.*;
import com.google.gson.*;
import java.io.File;

public class FaceLivenessClient {
    private static final String BASE_URL = "http://localhost:8000/api";
    private static final String API_TOKEN = "your-api-token";
    private static final OkHttpClient client = new OkHttpClient();
    private static final Gson gson = new Gson();
    
    /**
     * Upload face image
     */
    public static JsonObject uploadFace(String imagePath, String userId) throws Exception {
        File imageFile = new File(imagePath);
        
        RequestBody requestBody = new MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("image", imageFile.getName(),
                RequestBody.create(imageFile, MediaType.parse("image/*")))
            .addFormDataPart("user_id", userId)
            .addFormDataPart("metadata", gson.toJson(new JsonObject() {{
                addProperty("source", "java_app");
                addProperty("version", "1.0");
            }}))
            .build();
        
        Request request = new Request.Builder()
            .url(BASE_URL + "/face-capture/")
            .addHeader("Authorization", "Bearer " + API_TOKEN)
            .post(requestBody)
            .build();
        
        try (Response response = client.newCall(request).execute()) {
            return JsonParser.parseString(response.body().string()).getAsJsonObject();
        }
    }
    
    /**
     * Verify liveness
     */
    public static JsonObject verifyLiveness(String faceId, String userId) throws Exception {
        JsonObject payload = new JsonObject();
        payload.addProperty("face_id", faceId);
        payload.addProperty("user_id", userId);
        payload.addProperty("threshold", 0.90);
        
        RequestBody requestBody = RequestBody.create(
            payload.toString(),
            MediaType.parse("application/json")
        );
        
        Request request = new Request.Builder()
            .url(BASE_URL + "/verify-liveness/")
            .addHeader("Authorization", "Bearer " + API_TOKEN)
            .post(requestBody)
            .build();
        
        try (Response response = client.newCall(request).execute()) {
            return JsonParser.parseString(response.body().string()).getAsJsonObject();
        }
    }
    
    /**
     * Check health
     */
    public static JsonObject checkHealth() throws Exception {
        Request request = new Request.Builder()
            .url(BASE_URL + "/health/")
            .addHeader("Authorization", "Bearer " + API_TOKEN)
            .get()
            .build();
        
        try (Response response = client.newCall(request).execute()) {
            return JsonParser.parseString(response.body().string()).getAsJsonObject();
        }
    }
}

// Spring Boot REST Controller example
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class FaceVerificationController {
    
    @PostMapping("/verify-face")
    public ResponseEntity<?> verifyFace(
        @RequestParam MultipartFile faceImage,
        @RequestParam(defaultValue = "user123") String userId
    ) {
        try {
            // Save uploaded file
            File tempFile = File.createTempFile("face_", ".jpg");
            faceImage.transferTo(tempFile);
            
            // Upload face
            JsonObject uploadResult = FaceLivenessClient.uploadFace(tempFile.getAbsolutePath(), userId);
            
            if (!uploadResult.get("success").getAsBoolean()) {
                return ResponseEntity.badRequest().body(uploadResult);
            }
            
            String faceId = uploadResult.getAsJsonObject("data").get("id").getAsString();
            
            // Verify liveness
            JsonObject verifyResult = FaceLivenessClient.verifyLiveness(faceId, userId);
            
            if (verifyResult.getAsJsonObject("data").get("is_live").getAsBoolean()) {
                JsonObject response = new JsonObject();
                response.addProperty("success", true);
                response.addProperty("message", "Face verified as live!");
                response.addProperty("confidence", 
                    verifyResult.getAsJsonObject("data").get("confidence").getAsDouble());
                
                return ResponseEntity.ok(response);
            } else {
                JsonObject response = new JsonObject();
                response.addProperty("success", false);
                response.addProperty("message", "Face liveness check failed");
                
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            JsonObject error = new JsonObject();
            error.addProperty("success", false);
            error.addProperty("message", e.getMessage());
            
            return ResponseEntity.status(500).body(error);
        }
    }
}
```

### cURL (Command Line)
```bash
#!/bin/bash

# Configuration
API_BASE_URL="http://localhost:8000/api"
API_TOKEN="your-api-token"
USER_ID="user123"

# 1. Upload face image
echo "=== Uploading face image ==="
UPLOAD_RESPONSE=$(curl -s -X POST "$API_BASE_URL/face-capture/" \
  -H "Authorization: Bearer $API_TOKEN" \
  -F "image=@face.jpg" \
  -F "user_id=$USER_ID" \
  -F 'metadata={"source":"curl","version":"1.0"}')

echo "$UPLOAD_RESPONSE" | jq .

# Extract face ID
FACE_ID=$(echo "$UPLOAD_RESPONSE" | jq -r '.data.id')
echo "Face ID: $FACE_ID"

# 2. Verify liveness
echo -e "\n=== Verifying liveness ==="
VERIFY_RESPONSE=$(curl -s -X POST "$API_BASE_URL/verify-liveness/" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"face_id\": \"$FACE_ID\",
    \"user_id\": \"$USER_ID\",
    \"threshold\": 0.90
  }")

echo "$VERIFY_RESPONSE" | jq .

# Check if live
IS_LIVE=$(echo "$VERIFY_RESPONSE" | jq -r '.data.is_live')
CONFIDENCE=$(echo "$VERIFY_RESPONSE" | jq -r '.data.confidence')

if [ "$IS_LIVE" = "true" ]; then
  echo -e "\n✓ Face is LIVE with confidence: $CONFIDENCE"
else
  echo -e "\n✗ Face is NOT LIVE (spoofing detected)"
fi

# 3. Check health
echo -e "\n=== Checking API health ==="
curl -s -X GET "$API_BASE_URL/health/" \
  -H "Authorization: Bearer $API_TOKEN" | jq .
```

---

## Error Handling

### Retry Logic (Recommended for Production)

```python
# Python example with exponential backoff
import requests
import time

def make_request_with_retry(url, method='GET', max_retries=3, **kwargs):
    """Make HTTP request with exponential backoff retry"""
    for attempt in range(max_retries):
        try:
            response = requests.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            if attempt == max_retries - 1:
                raise
            
            wait_time = 2 ** attempt  # exponential backoff: 1, 2, 4 seconds
            print(f"Request failed, retrying in {wait_time}s...")
            time.sleep(wait_time)
```

### Rate Limiting

The API enforces rate limits:
- **Free tier:** 100 requests/hour
- **Pro tier:** 10,000 requests/hour

Response headers include:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1705315200
```

When rate limited (429 response):
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded",
    "retry_after": 3600
  }
}
```

---

## Best Practices

1. **Always validate responses** - Check `success` flag before accessing `data`
2. **Implement retry logic** - Use exponential backoff for transient failures
3. **Handle rate limiting** - Respect `X-RateLimit-*` headers
4. **Use connection pooling** - Reuse HTTP connections for better performance
5. **Log API calls** - Track requests/responses for debugging
6. **Set timeouts** - Prevent hanging requests (recommend 30s)
7. **Validate images** - Ensure valid JPEG/PNG before uploading
8. **Cache results** - Don't re-verify same face multiple times
9. **Use HTTPS in production** - Replace `http://` with `https://`
10. **Rotate API tokens** - Change tokens regularly for security

---

## Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| 401 Unauthorized | Check API token is valid and passed in Authorization header |
| 400 Bad Request | Validate request format; check image format is JPEG/PNG |
| 404 Not Found | Verify endpoint URL and face ID exist |
| 429 Too Many Requests | Reduce request rate; implement backoff |
| 500 Server Error | Check API logs; retry with exponential backoff |

### Debug Mode

Add debug logging to see request/response details:

```python
import logging
import http.client as http_client

http_client.HTTPConnection.debuglevel = 1
logging.basicConfig()
logging.getLogger().setLevel(logging.DEBUG)
requests_log = logging.getLogger("requests.packages.urllib3")
requests_log.setLevel(logging.DEBUG)
requests_log.propagate = True
```

---

## Summary

The Face Liveness Capture API is **completely language-agnostic**:

✅ Works with **any HTTP client** in any language  
✅ No SDK required - just standard REST principles  
✅ Suitable for **backend-to-backend** integration  
✅ Scales across multiple backends (Node.js, PHP, Go, Python, Ruby, Java, etc.)  
✅ Works with **any framework** (Express, Laravel, Flask, Spring, etc.)  

Use the examples above as templates for your specific programming language and framework.
