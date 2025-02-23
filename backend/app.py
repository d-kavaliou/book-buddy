from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import logging
import traceback
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from src.audio_transcriber import AudioTranscriber
from difflib import SequenceMatcher

from src.transcription_data import TranscriptionData

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Audio Transcription API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants and initialization
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
    logger.info(f"Created upload directory at {UPLOAD_FOLDER}")

# Mount the uploads directory to serve files
app.mount("/uploads", StaticFiles(directory=UPLOAD_FOLDER), name="uploads")

# Initialize transcriber
try:
    transcriber = AudioTranscriber(model_size="tiny")
    logger.info("AudioTranscriber initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize AudioTranscriber: {str(e)}\n{traceback.format_exc()}")
    raise

# Response models
class UploadResponse(BaseModel):
    message: str
    filename: str
    file_type: str

class StatusResponse(BaseModel):
    status: str

class ContextResponse(BaseModel):
    context: str
    start_position: int
    end_position: int

class TimestampRequest(BaseModel):
    timestamp: float
    fileName: str

class TimestampsByTextRequest(BaseModel):
    context_text: str
    file_name: str

class TimestampResponse(BaseModel):
    start_time: float
    end_time: float

def find_text_position(full_text: str, search_text: str) -> tuple[int, int]:
    """
    Find the best matching position of search_text within full_text.
    Returns tuple of (start_char, end_char) positions.
    """
    # Clean and normalize texts for comparison
    clean_full = full_text.strip().lower()
    clean_search = search_text.strip().lower()
    
    # Find best matching substring
    matcher = SequenceMatcher(None, clean_full, clean_search)
    match = matcher.find_longest_match(0, len(clean_full), 0, len(clean_search))
    
    if match.size < len(clean_search) * 0.8:  # 80% match threshold
        raise ValueError("Could not find a close enough match for the provided text")
    
    # Get the actual positions from the original text
    start_char = match.a
    end_char = start_char + match.size
    
    return start_char, end_char

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.now()
    response = None
    
    # Log request details
    logger.info(f"Request started: {request.method} {request.url}")
    logger.debug(f"Headers: {dict(request.headers)}")
    
    try:
        response = await call_next(request)
        
        # Log response details
        process_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"Request completed: {request.method} {request.url} - Status: {response.status_code} - Time: {process_time}s")
        
        return response
    except Exception as e:
        logger.error(f"Request failed: {request.method} {request.url}\n{traceback.format_exc()}")
        raise
    finally:
        if response is None:
            process_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"Request failed to complete: {request.method} {request.url} - Time: {process_time}s")

@app.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...), file_type: Optional[str] = Form("unknown")):
    logger.info(f"Processing upload request for file: {file.filename}")

    if not file:
        logger.warning("Upload request received with no file")
        raise HTTPException(status_code=400, detail="No file provided")

    filename = file.filename
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    if os.path.exists(filepath):
        logger.warning(f"File already exists: {filepath}")
        return UploadResponse(
            message="File already exists",
            filename=filename,
            file_type=file_type
        )

    try:
        contents = await file.read()
        with open(filepath, "wb") as f:
            f.write(contents)
        logger.info(f"File saved successfully at: {filepath}")
    except Exception as e:
        error_msg = f"Failed to save file: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_msg)

    # Process the file
    try:
        logger.info(f"Starting transcription for file: {filename}")
        context_data = transcriber.transcribe(filepath)
        logger.info(f"Transcription completed for file: {filename}")

        context_data.save(filepath)
        logger.info(f"Transcription results saved")

    except Exception as e:
        error_msg = f"Transcription failed: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_msg)

    return UploadResponse(
        message="File uploaded successfully",
        filename=filename,
        file_type=file_type
    )

@app.get("/files")
async def list_files():
    logger.info("Processing request to list files")
    try:
        files = os.listdir(UPLOAD_FOLDER)
        logger.debug(f"Files found: {files}")
        return JSONResponse(content=files)
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to list files: {error_msg}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.get("/uploads/{filename}")
async def get_file(filename: str):
    logger.info(f"Processing request to get file: {filename}")
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(filepath):
        logger.warning(f"File not found: {filepath}")
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)

@app.get("/status/{filename}", response_model=StatusResponse)
async def get_processing_status(filename: str):
    logger.info(f"Checking processing status for file: {filename}")
    
    txt_path = os.path.join(UPLOAD_FOLDER, filename + '.txt')
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    
    if os.path.exists(txt_path):
        logger.debug(f"Processing completed for file: {filename}")
        return StatusResponse(status="completed")
    
    if os.path.exists(file_path):
        logger.debug(f"Processing in progress for file: {filename}")
        return StatusResponse(status="processing")
    
    logger.warning(f"File not found: {filename}")
    raise HTTPException(status_code=404, detail="File not found")

@app.post("/api/context", response_model=ContextResponse)
async def get_context(request: TimestampRequest):
    logger.info(f"Getting context for timestamp {request.timestamp} in file {request.fileName}")
    
    try:
        file_path = os.path.join(UPLOAD_FOLDER, request.fileName)
        context_data = TranscriptionData.load(file_path)

        start_char, end_char, context = context_data.get_text_at_second(int(request.timestamp))

        return ContextResponse(
            context=context,
            start_position=start_char,
            end_position=end_char
        )
        
    except Exception as e:
        error_msg = f"Failed to get context: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/api/timestamps", response_model=TimestampResponse)
async def get_timestamps_for_text(request: TimestampsByTextRequest):
    logger.info(f"Getting timestamps for text segment in file {request.file_name}")
    
    try:
        file_path = os.path.join(UPLOAD_FOLDER, request.file_name)
        
        # Check if files exist
        if not os.path.exists(file_path):
            logger.warning(f"Transcription files not found for {request.file_name}")
            raise HTTPException(
                status_code=404, 
                detail="Transcription not found for this file"
            )

        context_data = TranscriptionData.load(file_path)
        frame = context_data.find_timeframe(request.context_text)
        
        return TimestampResponse(
            start_time=frame.start_time,
            end_time=frame.end_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Failed to get timestamps: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_msg)

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting server...")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True, log_level="debug")