from faster_whisper import WhisperModel
import math
from typing import Dict, Tuple, List
from dataclasses import dataclass, asdict
import os

@dataclass
class WordPosition:
    start_char: int
    end_char: int
    start_time: float
    end_time: float
    word: str

    def to_dict(self):
        return asdict(self)


class AudioTranscriber:
    def __init__(self, 
                 model_size: str = "tiny",
                 compute_type: str = "int8",  # Options: int8, float16, float32
                 num_threads: int = 4,
                 download_root: str = "./.models"):
        """
        Initialize the transcriber with faster-whisper
        
        Args:
            model_size: Model size (tiny, base, small, medium, large-v3)
            compute_type: Computation type for better performance/memory trade-off
            num_threads: Number of CPU threads to use
            download_root: Directory to cache the models
        """
        # Ensure models directory exists
        os.makedirs(download_root, exist_ok=True)
        
        # Initialize the model
        print(f"Loading whisper.cpp model: {model_size}")
        self.model = WhisperModel(
            model_size_or_path=model_size,
            device="cpu",
            compute_type=compute_type,
            cpu_threads=num_threads,
            download_root=download_root
        )
        print("Model loaded successfully")
    
    def _get_second_range(self, start_time: float, end_time: float) -> range:
        """Convert time range to whole seconds"""
        start_second = math.floor(start_time)
        end_second = math.ceil(end_time)
        return range(start_second, end_second + 1)
    
    def transcribe(self, audio_path: str) -> Tuple[str, Dict[str, dict]]:
        """
        Transcribe audio and return text with spaces and second-to-position mapping
        """
        print(f"Starting transcription of: {audio_path}")
        
        # Transcribe with optimized settings
        segments, _ = self.model.transcribe(
            audio_path,
            word_timestamps=True,
            language="en",
            vad_filter=True,  # Voice activity detection
            vad_parameters=dict(
                min_silence_duration_ms=500  # Adjust based on your needs
            )
        )
        
        # Build text and position mapping
        full_text = ""
        second_to_position = {}
        current_position = 0
        
        # Process each segment
        for segment in segments:
            # Process each word in the segment
            for word in segment.words:
                word_text = word.word
                
                # Handle spacing
                has_leading_space = word_text.startswith(" ")
                clean_word = word_text.strip()
                
                if not has_leading_space and current_position > 0:
                    full_text += " "
                    current_position += 1
                elif has_leading_space:
                    full_text += " "
                    current_position += 1
                
                # Store word position
                word_with_space = f" {clean_word}" if (has_leading_space or current_position > 0) else clean_word
                start_pos = current_position
                end_pos = start_pos + len(clean_word)
                
                word_pos = WordPosition(
                    start_char=start_pos,
                    end_char=end_pos,
                    start_time=word.start,
                    end_time=word.end,
                    word=word_with_space
                )
                
                # Store position for each whole second
                for second in self._get_second_range(word.start, word.end):
                    second_to_position[str(second)] = word_pos.to_dict()
                
                # Add word to full text
                full_text += clean_word
                current_position = end_pos
        
        print(f"Transcription completed. Text length: {len(full_text)}")
        return full_text, second_to_position

    def get_word_at_second(self, second_map: Dict[str, dict], second: int) -> WordPosition:
        """Get word information at a specific second"""
        word_dict = second_map.get(str(second))
        if word_dict:
            return WordPosition(**word_dict)
        return None


# Example usage:
if __name__ == "__main__":
    # Initialize with optimal settings for most use cases
    transcriber = AudioTranscriber(
        model_size="base",        # Good balance of speed and accuracy
        compute_type="int8",      # Fastest computation type
        num_threads=4,            # Adjust based on your CPU
        download_root="./.models" # Cache models locally
    )
    
    # Test transcription
    audio_file = "test.mp3"
    text, timestamps = transcriber.transcribe(audio_file)
    print(f"Transcribed text length: {len(text)}")
    print(f"Number of timestamp entries: {len(timestamps)}")