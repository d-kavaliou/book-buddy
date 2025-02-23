import math
import os
import json
from dataclasses import asdict
from typing import Dict, Tuple, List, Optional

from faster_whisper import WhisperModel
from .entities import WordPosition
from .transcription_data import TranscriptionData

class AudioTranscriber:
    def __init__(self, 
        model_size: str = "tiny",
        compute_type: str = "int8",
        num_threads: int = 4,
        download_root: str = "./.models"
    ):
        os.makedirs(download_root, exist_ok=True)

        print(f"Loading whisper.cpp model: {model_size}")
        self.model = WhisperModel(
            model_size_or_path=model_size,
            device="cpu",
            compute_type=compute_type,
            cpu_threads=num_threads,
            download_root=download_root
        )
        print("Model loaded successfully")

    def transcribe(self, audio_path: str, save_path: Optional[str] = None) -> TranscriptionData:
        """
        Transcribe audio and return TranscriptionData object.
        Optionally save the results if save_path is provided.
        """
        print(f"Starting transcription of: {audio_path}")

        segments, _ = self.model.transcribe(
            audio_path,
            word_timestamps=True,
            language="en",
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )
        
        full_text = ""
        word_positions = []
        char_to_second = {}
        current_position = 0
        
        for segment in segments:
            for word in segment.words:
                word_text = word.word
                has_leading_space = word_text.startswith(" ")
                clean_word = word_text.strip()
                start_second = math.floor(word.start)
                
                if not has_leading_space and current_position > 0:
                    full_text += " "
                    char_to_second[current_position] = start_second
                    current_position += 1
                elif has_leading_space:
                    full_text += " "
                    char_to_second[current_position] = start_second
                    current_position += 1
                
                start_pos = current_position
                end_pos = start_pos + len(clean_word)
                
                for char_pos in range(start_pos, end_pos):
                    char_to_second[char_pos] = start_second
                
                word_positions.append(WordPosition(
                    start_char=start_pos,
                    end_char=end_pos,
                    start_time=word.start,
                    end_time=word.end,
                    word=clean_word
                ))
                
                full_text += clean_word
                current_position = end_pos
        
        print(f"Transcription completed. Text length: {len(full_text)}")
        
        transcription_data = TranscriptionData(
            text=full_text,
            word_positions=word_positions,
            char_to_second=char_to_second
        )
        
        if save_path:
            transcription_data.save(save_path)
            
        return transcription_data


# Example usage:
if __name__ == "__main__":
    transcriber = AudioTranscriber(
        model_size="base",
        compute_type="int8",
        num_threads=4,
        download_root="./.models"
    )
    
    # Test transcription with saving
    audio_file = "test.mp3"
    save_path = "transcriptions/test"
    
    # Transcribe and save
    trans_data = transcriber.transcribe(audio_file, save_path)
    print(f"Transcribed text: '{trans_data.text}'")
    
    # Load saved transcription
    loaded_data = TranscriptionData.load(save_path)
    
    # Example 1: Find timing for a phrase
    search_phrase = "hello world"
    timeframe = loaded_data.find_timeframe(search_phrase)
    if timeframe:
        print(f"Found '{timeframe.text}'")
        print(f"Starts at: {timeframe.start_time:.2f}s")
        print(f"Ends at: {timeframe.end_time:.2f}s")
    
    # Example 2: Find text at a specific second
    second = 5
    text_at_second = loaded_data.get_text_at_second(second)
    if text_at_second:
        print(f"At second {second}: '{text_at_second}'")