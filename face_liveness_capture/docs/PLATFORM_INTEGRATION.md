# Platform-Specific Integration Guides

Complete integration examples for popular frameworks and platforms.

## Table of Contents
1. [Node.js Express](#nodejs-express)
2. [Laravel](#laravel)
3. [FastAPI](#fastapi)
4. [Go Gin](#go-gin)
5. [Ruby on Rails](#ruby-on-rails)
6. [Spring Boot](#spring-boot)

---

## Node.js Express

### Installation
```bash
npm install express multer axios cors dotenv
```

### Setup
```javascript
// .env
FACE_API_URL=http://localhost:8000/api
FACE_API_TOKEN=your-api-token
NODE_ENV=development

// config/faceapi.js
module.exports = {
  baseUrl: process.env.FACE_API_URL,
  token: process.env.FACE_API_TOKEN,
  timeout: 30000,
  retryAttempts: 3
};

// services/faceapi.service.js
const axios = require('axios');
const config = require('../config/faceapi');

class FaceAPIService {
  constructor() {
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Authorization': `Bearer ${config.token}`
      }
    });
  }
  
  async uploadFace(filePath, userId, metadata = {}) {
    const FormData = require('form-data');
    const fs = require('fs');
    
    const form = new FormData();
    form.append('image', fs.createReadStream(filePath));
    form.append('user_id', userId);
    form.append('metadata', JSON.stringify(metadata));
    
    try {
      const response = await this.client.post('/face-capture/', form, {
        headers: form.getHeaders()
      });
      return response.data;
    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
  
  async verifyLiveness(faceId, userId, threshold = 0.9) {
    try {
      const response = await this.client.post('/verify-liveness/', {
        face_id: faceId,
        user_id: userId,
        threshold
      });
      return response.data;
    } catch (error) {
      throw new Error(`Verification failed: ${error.message}`);
    }
  }
  
  async health() {
    try {
      const response = await this.client.get('/health/');
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }
}

module.exports = new FaceAPIService();

// middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG and PNG images are allowed'));
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// routes/face.routes.js
const express = require('express');
const upload = require('../middleware/uploadMiddleware');
const faceAPI = require('../services/faceapi.service');
const router = express.Router();

router.post('/verify-face', upload.single('face_image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file required' });
    }
    
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    // Upload face
    const uploadResult = await faceAPI.uploadFace(
      req.file.path,
      user_id,
      { source: 'express', timestamp: new Date().toISOString() }
    );
    
    if (!uploadResult.success) {
      return res.status(400).json(uploadResult);
    }
    
    const faceId = uploadResult.data.id;
    
    // Verify liveness
    const verifyResult = await faceAPI.verifyLiveness(
      faceId,
      user_id,
      parseFloat(req.body.threshold) || 0.9
    );
    
    if (verifyResult.data.is_live) {
      res.json({
        success: true,
        message: 'Face verified as live',
        confidence: verifyResult.data.confidence,
        details: verifyResult.data.details
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Face liveness check failed',
        reason: 'Spoofing detected'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get('/health', async (req, res) => {
  try {
    const health = await faceAPI.health();
    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router;

// app.js (main)
const express = require('express');
const faceRoutes = require('./routes/face.routes');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/face', faceRoutes);

app.listen(3000, () => {
  console.log('Express server running on :3000');
});
```

### Usage
```bash
# POST /api/face/verify-face
curl -X POST http://localhost:3000/api/face/verify-face \
  -F "face_image=@photo.jpg" \
  -F "user_id=john_doe" \
  -F "threshold=0.95"
```

---

## Laravel

### Installation
```bash
composer require guzzlehttp/guzzle
php artisan make:service FaceLivenessService
```

### Setup
```php
// config/face_liveness.php
return [
    'api_url' => env('FACE_LIVENESS_URL', 'http://localhost:8000/api'),
    'api_token' => env('FACE_LIVENESS_TOKEN'),
    'timeout' => 30,
];

// app/Services/FaceLivenessService.php
<?php

namespace App\Services;

use GuzzleHttp\Client;
use Illuminate\Http\UploadedFile;
use Exception;

class FaceLivenessService
{
    protected $client;
    protected $baseUrl;
    protected $token;
    
    public function __construct()
    {
        $this->baseUrl = config('face_liveness.api_url');
        $this->token = config('face_liveness.api_token');
        
        $this->client = new Client([
            'timeout' => config('face_liveness.timeout'),
        ]);
    }
    
    /**
     * Upload face image
     */
    public function uploadFace(UploadedFile $file, $userId, $metadata = [])
    {
        $multipart = [
            [
                'name' => 'image',
                'contents' => fopen($file->path(), 'r'),
                'filename' => $file->getClientOriginalName()
            ],
            [
                'name' => 'user_id',
                'contents' => $userId
            ],
            [
                'name' => 'metadata',
                'contents' => json_encode($metadata)
            ]
        ];
        
        try {
            $response = $this->client->post(
                "{$this->baseUrl}/face-capture/",
                [
                    'multipart' => $multipart,
                    'headers' => $this->getHeaders()
                ]
            );
            
            return json_decode($response->getBody(), true);
        } catch (Exception $e) {
            throw new Exception("Upload failed: {$e->getMessage()}");
        }
    }
    
    /**
     * Verify liveness
     */
    public function verifyLiveness($faceId, $userId, $threshold = 0.9)
    {
        try {
            $response = $this->client->post(
                "{$this->baseUrl}/verify-liveness/",
                [
                    'json' => [
                        'face_id' => $faceId,
                        'user_id' => $userId,
                        'threshold' => $threshold
                    ],
                    'headers' => $this->getHeaders()
                ]
            );
            
            return json_decode($response->getBody(), true);
        } catch (Exception $e) {
            throw new Exception("Verification failed: {$e->getMessage()}");
        }
    }
    
    /**
     * Check health
     */
    public function health()
    {
        try {
            $response = $this->client->get(
                "{$this->baseUrl}/health/",
                ['headers' => $this->getHeaders()]
            );
            
            return json_decode($response->getBody(), true);
        } catch (Exception $e) {
            throw new Exception("Health check failed: {$e->getMessage()}");
        }
    }
    
    protected function getHeaders()
    {
        return [
            'Authorization' => "Bearer {$this->token}",
            'Content-Type' => 'application/json'
        ];
    }
}

// app/Http/Controllers/FaceVerificationController.php
<?php

namespace App\Http\Controllers;

use App\Services\FaceLivenessService;
use Illuminate\Http\Request;

class FaceVerificationController extends Controller
{
    protected $faceService;
    
    public function __construct(FaceLivenessService $faceService)
    {
        $this->faceService = $faceService;
    }
    
    public function verifyFace(Request $request)
    {
        $validated = $request->validate([
            'face_image' => 'required|image|mimes:jpeg,png|max:5000',
            'user_id' => 'required|string',
            'threshold' => 'numeric|between:0,1'
        ]);
        
        try {
            // Upload face
            $uploadResult = $this->faceService->uploadFace(
                $request->file('face_image'),
                $validated['user_id'],
                [
                    'source' => 'laravel',
                    'ip' => $request->ip(),
                    'timestamp' => now()->toIso8601String()
                ]
            );
            
            if (!$uploadResult['success']) {
                return response()->json($uploadResult, 400);
            }
            
            $faceId = $uploadResult['data']['id'];
            
            // Verify liveness
            $verifyResult = $this->faceService->verifyLiveness(
                $faceId,
                $validated['user_id'],
                $validated['threshold'] ?? 0.9
            );
            
            if ($verifyResult['data']['is_live']) {
                return response()->json([
                    'success' => true,
                    'message' => 'Face verified as live',
                    'confidence' => $verifyResult['data']['confidence'],
                    'details' => $verifyResult['data']['details']
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Face liveness verification failed'
                ], 400);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    public function health()
    {
        try {
            $health = $this->faceService->health();
            return response()->json($health);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'unhealthy',
                'error' => $e->getMessage()
            ], 503);
        }
    }
}

// routes/api.php
Route::post('/face/verify', [FaceVerificationController::class, 'verifyFace']);
Route::get('/face/health', [FaceVerificationController::class, 'health']);
```

### .env
```
FACE_LIVENESS_URL=http://localhost:8000/api
FACE_LIVENESS_TOKEN=your-api-token
```

### Usage
```bash
php artisan serve

# In your frontend or test
curl -X POST http://localhost:8000/api/face/verify \
  -F "face_image=@photo.jpg" \
  -F "user_id=john_doe"
```

---

## FastAPI

### Installation
```bash
pip install fastapi uvicorn python-multipart httpx aiofiles
```

### Setup
```python
# config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    face_api_url: str = "http://localhost:8000/api"
    face_api_token: str = "your-api-token"
    timeout: int = 30
    
    class Config:
        env_file = ".env"

settings = Settings()

# services/face_api.py
import httpx
import json
from typing import Optional, Dict, Any
from config import settings

class FaceAPIClient:
    def __init__(self):
        self.base_url = settings.face_api_url
        self.token = settings.face_api_token
        self.timeout = settings.timeout
    
    async def upload_face(
        self,
        image_data: bytes,
        user_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Upload face image"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            files = {
                'image': ('image.jpg', image_data, 'image/jpeg'),
                'user_id': (None, user_id),
                'metadata': (None, json.dumps(metadata or {}))
            }
            
            headers = {'Authorization': f'Bearer {self.token}'}
            
            response = await client.post(
                f'{self.base_url}/face-capture/',
                files=files,
                headers=headers
            )
            
            return response.json()
    
    async def verify_liveness(
        self,
        face_id: str,
        user_id: str,
        threshold: float = 0.9
    ) -> Dict[str, Any]:
        """Verify face liveness"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            headers = {'Authorization': f'Bearer {self.token}'}
            
            payload = {
                'face_id': face_id,
                'user_id': user_id,
                'threshold': threshold
            }
            
            response = await client.post(
                f'{self.base_url}/verify-liveness/',
                json=payload,
                headers=headers
            )
            
            return response.json()
    
    async def health(self) -> Dict[str, Any]:
        """Check API health"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            headers = {'Authorization': f'Bearer {self.token}'}
            
            response = await client.get(
                f'{self.base_url}/health/',
                headers=headers
            )
            
            return response.json()

# main.py
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from services.face_api import FaceAPIClient
from config import settings
import os

app = FastAPI(title="Face Liveness API Gateway")

face_client = FaceAPIClient()

@app.post("/verify-face")
async def verify_face(
    face_image: UploadFile = File(...),
    user_id: str = Form(...),
    threshold: float = Form(default=0.9)
):
    """Verify face liveness"""
    try:
        # Validate file type
        if face_image.content_type not in ['image/jpeg', 'image/png']:
            raise HTTPException(
                status_code=400,
                detail="Image must be JPEG or PNG"
            )
        
        # Read file
        image_data = await face_image.read()
        
        # Upload face
        upload_result = await face_client.upload_face(
            image_data,
            user_id,
            {
                'source': 'fastapi',
                'filename': face_image.filename
            }
        )
        
        if not upload_result.get('success'):
            raise HTTPException(
                status_code=400,
                detail=upload_result.get('error', {}).get('message', 'Upload failed')
            )
        
        face_id = upload_result['data']['id']
        
        # Verify liveness
        verify_result = await face_client.verify_liveness(
            face_id,
            user_id,
            threshold
        )
        
        if verify_result['data']['is_live']:
            return {
                'success': True,
                'message': 'Face verified as live',
                'confidence': verify_result['data']['confidence'],
                'details': verify_result['data']['details']
            }
        else:
            raise HTTPException(
                status_code=400,
                detail='Face liveness verification failed'
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.get("/health")
async def health():
    """Check health"""
    try:
        health_result = await face_client.health()
        return health_result
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                'status': 'unhealthy',
                'error': str(e)
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

### Usage
```bash
uvicorn main:app --reload

# Test endpoint
curl -X POST http://localhost:8001/verify-face \
  -F "face_image=@photo.jpg" \
  -F "user_id=john_doe" \
  -F "threshold=0.95"
```

---

## Go Gin

### Installation
```bash
go get github.com/gin-gonic/gin
go get github.com/go-resty/resty/v2
```

### Setup
```go
// config/config.go
package config

import "os"

type Config struct {
    FaceAPIURL   string
    FaceAPIToken string
    ServerPort   string
}

func Load() *Config {
    return &Config{
        FaceAPIURL:   getEnv("FACE_API_URL", "http://localhost:8000/api"),
        FaceAPIToken: getEnv("FACE_API_TOKEN", ""),
        ServerPort:   getEnv("SERVER_PORT", ":8080"),
    }
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

// services/faceapi.go
package services

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "mime/multipart"
    "net/http"
    "os"
    "path/filepath"
    "time"
)

type FaceAPIClient struct {
    baseURL string
    token   string
    client  *http.Client
}

type UploadResponse struct {
    Success bool `json:"success"`
    Data    struct {
        ID        string  `json:"id"`
        Landmarks [][]int `json:"landmarks"`
        Detected  bool    `json:"detected"`
        Confidence float64 `json:"confidence"`
    } `json:"data"`
}

type VerifyResponse struct {
    Success bool `json:"success"`
    Data    struct {
        IsLive     bool    `json:"is_live"`
        Confidence float64 `json:"confidence"`
        Details    map[string]interface{} `json:"details"`
    } `json:"data"`
}

func NewFaceAPIClient(baseURL, token string) *FaceAPIClient {
    return &FaceAPIClient{
        baseURL: baseURL,
        token:   token,
        client: &http.Client{
            Timeout: 30 * time.Second,
        },
    }
}

func (c *FaceAPIClient) UploadFace(imagePath, userID string) (*UploadResponse, error) {
    file, err := os.Open(imagePath)
    if err != nil {
        return nil, fmt.Errorf("failed to open image: %w", err)
    }
    defer file.Close()
    
    body := &bytes.Buffer{}
    writer := multipart.NewWriter(body)
    
    // Add image
    part, err := writer.CreateFormFile("image", filepath.Base(imagePath))
    if err != nil {
        return nil, err
    }
    io.Copy(part, file)
    
    // Add user_id
    writer.WriteField("user_id", userID)
    
    // Add metadata
    metadata := map[string]string{"source": "go_app"}
    metadataJSON, _ := json.Marshal(metadata)
    writer.WriteField("metadata", string(metadataJSON))
    
    writer.Close()
    
    // Create request
    req, err := http.NewRequest(
        "POST",
        fmt.Sprintf("%s/face-capture/", c.baseURL),
        body,
    )
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
    
    var result UploadResponse
    json.NewDecoder(resp.Body).Decode(&result)
    
    return &result, nil
}

func (c *FaceAPIClient) VerifyLiveness(faceID, userID string, threshold float64) (*VerifyResponse, error) {
    payload := map[string]interface{}{
        "face_id":   faceID,
        "user_id":   userID,
        "threshold": threshold,
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
    
    var result VerifyResponse
    json.NewDecoder(resp.Body).Decode(&result)
    
    return &result, nil
}

// handlers/face.go
package handlers

import (
    "net/http"
    "path/filepath"
    
    "your-app/services"
    "github.com/gin-gonic/gin"
)

type FaceHandler struct {
    apiClient *services.FaceAPIClient
}

func NewFaceHandler(apiClient *services.FaceAPIClient) *FaceHandler {
    return &FaceHandler{apiClient: apiClient}
}

func (h *FaceHandler) VerifyFace(c *gin.Context) {
    file, err := c.FormFile("face_image")
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": "Image file required",
        })
        return
    }
    
    userID := c.PostForm("user_id")
    if userID == "" {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": "User ID required",
        })
        return
    }
    
    // Save temp file
    tempPath := filepath.Join("/tmp", file.Filename)
    if err := c.SaveUploadedFile(file, tempPath); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": "Failed to save image",
        })
        return
    }
    
    // Upload face
    uploadResult, err := h.apiClient.UploadFace(tempPath, userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": err.Error(),
        })
        return
    }
    
    if !uploadResult.Success {
        c.JSON(http.StatusBadRequest, uploadResult)
        return
    }
    
    faceID := uploadResult.Data.ID
    
    // Verify liveness
    verifyResult, err := h.apiClient.VerifyLiveness(faceID, userID, 0.9)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": err.Error(),
        })
        return
    }
    
    if verifyResult.Data.IsLive {
        c.JSON(http.StatusOK, gin.H{
            "success":    true,
            "message":    "Face verified as live",
            "confidence": verifyResult.Data.Confidence,
        })
    } else {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "message": "Face liveness verification failed",
        })
    }
}

// main.go
package main

import (
    "your-app/config"
    "your-app/handlers"
    "your-app/services"
    
    "github.com/gin-gonic/gin"
)

func main() {
    cfg := config.Load()
    
    // Initialize API client
    apiClient := services.NewFaceAPIClient(cfg.FaceAPIURL, cfg.FaceAPIToken)
    
    // Initialize Gin
    router := gin.Default()
    
    // Initialize handlers
    faceHandler := handlers.NewFaceHandler(apiClient)
    
    // Routes
    router.POST("/api/face/verify", faceHandler.VerifyFace)
    
    router.Run(cfg.ServerPort)
}
```

### Usage
```bash
FACE_API_URL=http://localhost:8000/api \
FACE_API_TOKEN=your-api-token \
go run main.go

# Test
curl -X POST http://localhost:8080/api/face/verify \
  -F "face_image=@photo.jpg" \
  -F "user_id=john_doe"
```

---

## Ruby on Rails

### Gemfile
```ruby
gem 'httparty'
gem 'aws-sdk-s3' # optional for image storage

# Add to Gemfile
source 'https://rubygems.org'
git_source(:github) { |repo| "https://github.com/#{repo}.git" }

gem 'rails', '~> 7.0.0'
gem 'httparty'
```

### Setup
```ruby
# config/initializers/face_liveness.rb
FACE_LIVENESS_CONFIG = {
  api_url: ENV['FACE_LIVENESS_URL'] || 'http://localhost:8000/api',
  api_token: ENV['FACE_LIVENESS_TOKEN'],
  timeout: 30
}

# app/services/face_liveness_service.rb
class FaceLivenessService
  include HTTParty
  
  def initialize
    @base_url = FACE_LIVENESS_CONFIG[:api_url]
    @token = FACE_LIVENESS_CONFIG[:api_token]
    @timeout = FACE_LIVENESS_CONFIG[:timeout]
  end
  
  def upload_face(file_path, user_id, metadata = {})
    multipart_body = build_multipart_body(file_path, user_id, metadata)
    
    response = self.class.post(
      "#{@base_url}/face-capture/",
      body: multipart_body,
      headers: default_headers,
      timeout: @timeout
    )
    
    JSON.parse(response.body)
  rescue StandardError => e
    { success: false, error: e.message }
  end
  
  def verify_liveness(face_id, user_id, threshold = 0.9)
    payload = {
      face_id: face_id,
      user_id: user_id,
      threshold: threshold
    }
    
    response = self.class.post(
      "#{@base_url}/verify-liveness/",
      body: payload.to_json,
      headers: default_headers.merge('Content-Type' => 'application/json'),
      timeout: @timeout
    )
    
    JSON.parse(response.body)
  rescue StandardError => e
    { success: false, error: e.message }
  end
  
  def health
    response = self.class.get(
      "#{@base_url}/health/",
      headers: default_headers,
      timeout: @timeout
    )
    
    JSON.parse(response.body)
  rescue StandardError => e
    { status: 'unhealthy', error: e.message }
  end
  
  private
  
  def default_headers
    {
      'Authorization' => "Bearer #{@token}"
    }
  end
  
  def build_multipart_body(file_path, user_id, metadata)
    # Implementation for multipart body
    # This would typically use HTTParty's multipart capability
    File.read(file_path)
  end
end

# app/controllers/face_verifications_controller.rb
class FaceVerificationsController < ApplicationController
  before_action :set_face_service
  
  def verify_face
    # Validate input
    validate_face_upload_params
    
    # Upload face
    upload_result = @face_service.upload_face(
      face_image_file.path,
      params[:user_id],
      { source: 'rails', timestamp: Time.now.iso8601 }
    )
    
    unless upload_result['success']
      return render json: upload_result, status: :bad_request
    end
    
    face_id = upload_result['data']['id']
    
    # Verify liveness
    verify_result = @face_service.verify_liveness(
      face_id,
      params[:user_id],
      params[:threshold]&.to_f || 0.9
    )
    
    if verify_result['data']['is_live']
      render json: {
        success: true,
        message: 'Face verified as live',
        confidence: verify_result['data']['confidence'],
        details: verify_result['data']['details']
      }
    else
      render json: {
        success: false,
        message: 'Face liveness verification failed'
      }, status: :bad_request
    end
  rescue StandardError => e
    render json: {
      success: false,
      message: e.message
    }, status: :internal_server_error
  end
  
  def health
    health_result = @face_service.health
    render json: health_result
  end
  
  private
  
  def set_face_service
    @face_service = FaceLivenessService.new
  end
  
  def validate_face_upload_params
    unless params[:face_image].present?
      render json: { error: 'Image required' }, status: :bad_request and return
    end
    
    unless params[:user_id].present?
      render json: { error: 'User ID required' }, status: :bad_request and return
    end
  end
  
  def face_image_file
    params[:face_image]
  end
end

# config/routes.rb
Rails.application.routes.draw do
  post '/api/face/verify', to: 'face_verifications#verify_face'
  get '/api/face/health', to: 'face_verifications#health'
end
```

### Usage
```bash
rails server -p 3000

# Test
curl -X POST http://localhost:3000/api/face/verify \
  -F "face_image=@photo.jpg" \
  -F "user_id=john_doe"
```

---

## Spring Boot

### pom.xml
```xml
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>com.squareup.okhttp3</groupId>
        <artifactId>okhttp</artifactId>
    </dependency>
    <dependency>
        <groupId>com.google.code.gson</groupId>
        <artifactId>gson</artifactId>
    </dependency>
</dependencies>
```

### Setup
```java
// src/main/java/com/example/config/FaceLivenessConfig.java
package com.example.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "face-liveness")
public class FaceLivenessConfig {
    private String apiUrl;
    private String apiToken;
    private int timeout;
    
    // Getters and setters
    public String getApiUrl() { return apiUrl; }
    public void setApiUrl(String apiUrl) { this.apiUrl = apiUrl; }
    
    public String getApiToken() { return apiToken; }
    public void setApiToken(String apiToken) { this.apiToken = apiToken; }
    
    public int getTimeout() { return timeout; }
    public void setTimeout(int timeout) { this.timeout = timeout; }
}

// src/main/java/com/example/service/FaceLivenessService.java
package com.example.service;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.concurrent.TimeUnit;

@Service
public class FaceLivenessService {
    private final OkHttpClient client;
    private final FaceLivenessConfig config;
    
    @Autowired
    public FaceLivenessService(FaceLivenessConfig config) {
        this.config = config;
        this.client = new OkHttpClient.Builder()
            .connectTimeout(config.getTimeout(), TimeUnit.SECONDS)
            .readTimeout(config.getTimeout(), TimeUnit.SECONDS)
            .build();
    }
    
    public JsonObject uploadFace(File imageFile, String userId) throws Exception {
        MultipartBody.Builder builder = new MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("image", imageFile.getName(),
                RequestBody.create(imageFile, MediaType.parse("image/*")))
            .addFormDataPart("user_id", userId)
            .addFormDataPart("metadata", "{\"source\":\"spring\"}");
        
        Request request = new Request.Builder()
            .url(config.getApiUrl() + "/face-capture/")
            .addHeader("Authorization", "Bearer " + config.getApiToken())
            .post(builder.build())
            .build();
        
        try (Response response = client.newCall(request).execute()) {
            return JsonParser.parseString(response.body().string()).getAsJsonObject();
        }
    }
    
    public JsonObject verifyLiveness(String faceId, String userId, double threshold) throws Exception {
        JsonObject payload = new JsonObject();
        payload.addProperty("face_id", faceId);
        payload.addProperty("user_id", userId);
        payload.addProperty("threshold", threshold);
        
        RequestBody body = RequestBody.create(
            payload.toString(),
            MediaType.parse("application/json")
        );
        
        Request request = new Request.Builder()
            .url(config.getApiUrl() + "/verify-liveness/")
            .addHeader("Authorization", "Bearer " + config.getApiToken())
            .post(body)
            .build();
        
        try (Response response = client.newCall(request).execute()) {
            return JsonParser.parseString(response.body().string()).getAsJsonObject();
        }
    }
}

// src/main/java/com/example/controller/FaceVerificationController.java
package com.example.controller;

import com.example.service.FaceLivenessService;
import com.google.gson.JsonObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.file.Files;

@RestController
@RequestMapping("/api/face")
public class FaceVerificationController {
    @Autowired
    private FaceLivenessService faceService;
    
    @PostMapping("/verify")
    public ResponseEntity<?> verifyFace(
        @RequestParam("face_image") MultipartFile faceImage,
        @RequestParam("user_id") String userId,
        @RequestParam(value = "threshold", defaultValue = "0.9") double threshold
    ) {
        try {
            // Convert to file
            File tempFile = File.createTempFile("face_", ".jpg");
            faceImage.transferTo(tempFile);
            
            // Upload face
            JsonObject uploadResult = faceService.uploadFace(tempFile, userId);
            
            if (!uploadResult.get("success").getAsBoolean()) {
                return ResponseEntity.badRequest().body(uploadResult);
            }
            
            String faceId = uploadResult.getAsJsonObject("data").get("id").getAsString();
            
            // Verify liveness
            JsonObject verifyResult = faceService.verifyLiveness(faceId, userId, threshold);
            
            if (verifyResult.getAsJsonObject("data").get("is_live").getAsBoolean()) {
                return ResponseEntity.ok(verifyResult);
            } else {
                return ResponseEntity.badRequest().body(verifyResult);
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
}
```

### application.properties
```properties
face-liveness.api-url=http://localhost:8000/api
face-liveness.api-token=your-api-token
face-liveness.timeout=30
```

### Usage
```bash
mvn spring-boot:run

# Test
curl -X POST http://localhost:8080/api/face/verify \
  -F "face_image=@photo.jpg" \
  -F "user_id=john_doe"
```

---

## Quick Reference

| Framework | Language | Setup | Key Library |
|-----------|----------|-------|-------------|
| Express | Node.js | npm install | axios, multer |
| Laravel | PHP | composer require | guzzlehttp |
| FastAPI | Python | pip install | httpx, aiofiles |
| Gin | Go | go get | net/http |
| Rails | Ruby | bundle add | httparty |
| Spring | Java | Maven | okhttp3, gson |

All examples follow the same REST API pattern:
1. Upload face image → Get face ID
2. Verify liveness → Get live/fake decision
3. Handle errors gracefully

