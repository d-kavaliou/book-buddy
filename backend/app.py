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
async def upload_file(
    file: UploadFile = File(...),
    file_type: Optional[str] = Form("unknown")
):
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

    # Save uploaded file
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
        text, timestamp_map = transcriber.transcribe(filepath)
        logger.info(f"Transcription completed for file: {filename}")

        # Save transcription results
        with open(filepath + '.txt', 'w') as f:
            f.write(text)
        with open(filepath + '.json', 'w') as f:
            json.dump(timestamp_map, f)
        logger.info(f"Transcription results saved for file: {filename}")

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
    
    # Check if the processing is complete
    txt_path = os.path.join(UPLOAD_FOLDER, filename + '.txt')
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    
    if os.path.exists(txt_path):
        logger.debug(f"Processing completed for file: {filename}")
        return StatusResponse(status="completed")
    
    # Check if the file exists but processing hasn't completed
    if os.path.exists(file_path):
        logger.debug(f"Processing in progress for file: {filename}")
        return StatusResponse(status="processing")
    
    logger.warning(f"File not found: {filename}")
    raise HTTPException(status_code=404, detail="File not found")


@app.post("/api/context", response_model=ContextResponse)
async def get_context(request: TimestampRequest):
    logger.info(f"Getting context for timestamp {request.timestamp} in file {request.fileName}")
    
    try:
        # Get paths for timestamp map and transcription text
        json_path = os.path.join(UPLOAD_FOLDER, f"{request.fileName}.json")
        text_path = os.path.join(UPLOAD_FOLDER, f"{request.fileName}.txt")
        
        # Check if files exist
        if not os.path.exists(json_path) or not os.path.exists(text_path):
            logger.warning(f"Transcription files not found for {request.fileName}")
            raise HTTPException(
                status_code=404, 
                detail="Transcription not found for this file"
            )
            
        # Load timestamp map and full text
        with open(json_path, 'r') as f:
            timestamp_map = json.load(f)

        logger.debug(f"Loaded timestamp map for {timestamp_map}")
        
        with open(text_path, 'r') as f:
            full_text = f.read()

        current_timestamp = str(int(request.timestamp))
        word_info = timestamp_map[current_timestamp]
        
        context = full_text[:word_info['start_char']]

        logger.info(f"Context found for timestamp {word_info}")
        
        return ContextResponse(
            context=context,
            start_position=word_info['start_char'],
            end_position=word_info['end_char']
        )
        
    except Exception as e:
        error_msg = f"Failed to get context: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_msg)

class NoteRequest(BaseModel):
    book_name: str
    note: str

class Note(BaseModel):
    date: str
    book_name: str
    note: str

class NoteResponse(BaseModel):
    notes: list[Note]


@app.post("/api/add_note", response_model=NoteResponse)
async def add_note(request: NoteRequest):
    logger.info(f"Adding note: {request.note}")
    try:
        note = {
            'date': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'book_name': request.book_name,
            'note': request.note
        }

        with open('notes/notes.json', 'a') as f:
            json.dump(note, f)
            f.write('\n')
    except Exception as e:
        error_msg = f"Failed to add note: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_msg)
    
    return NoteResponse(message="Note added successfully to notes.json")

@app.get("/api/get_notes", response_model=NoteResponse)
async def get_notes():
    logger.info("Getting notes")
    try:
        with open('notes/notes.json', 'r') as f:
            notes = [json.loads(line) for line in f]
        return NoteResponse(notes=notes)
    except Exception as e:
        error_msg = f"Failed to get notes: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_msg)


if __name__ == "__main__":
    import uvicorn
    logger.info("Starting server...")
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True, log_level="debug")