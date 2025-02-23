import math
import os
import json
from dataclasses import asdict
from typing import Dict, List, Optional

from .entities import WordPosition, TimeFrame


class TranscriptionData:
    def __init__(self, 
        text: str,
        word_positions: List[WordPosition],
        char_to_second: Dict[int, int]
    ):
        self.text = text
        self.word_positions = word_positions
        self.char_to_second = char_to_second

    def save(self, base_path: str):
        """Save transcription data to files"""
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(base_path), exist_ok=True)
        
        # Save full text
        with open(f"{base_path}.txt", "w", encoding="utf-8") as f:
            f.write(self.text)
            
        # Save word positions
        word_positions_data = [asdict(wp) for wp in self.word_positions]
        with open(f"{base_path}.words.json", "w", encoding="utf-8") as f:
            json.dump(word_positions_data, f, indent=2)
            
        # Save char to second mapping
        with open(f"{base_path}.timing.json", "w", encoding="utf-8") as f:
            json.dump(self.char_to_second, f, indent=2)

    @classmethod
    def load(cls, base_path: str) -> "TranscriptionData":
        """Load transcription data from files"""
        # Load full text
        with open(f"{base_path}.txt", "r", encoding="utf-8") as f:
            text = f.read()
            
        # Load word positions
        with open(f"{base_path}.words.json", "r", encoding="utf-8") as f:
            word_positions_data = json.load(f)
            word_positions = [
                WordPosition(**wp_dict) for wp_dict in word_positions_data
            ]
            
        # Load char to second mapping
        with open(f"{base_path}.timing.json", "r", encoding="utf-8") as f:
            char_to_second = {
                int(k): v for k, v in json.load(f).items()
            }
            
        return cls(text, word_positions, char_to_second)

    def find_timeframe(self, search_text: str) -> Optional[TimeFrame]:
        """Find the timeframe for a given text in the transcription"""
        start_idx = self.text.find(search_text)
        if start_idx == -1:
            return None
            
        end_idx = start_idx + len(search_text)
        
        matching_words = [
            wp for wp in self.word_positions 
            if (wp.start_char <= end_idx and wp.end_char >= start_idx)
        ]
        
        if not matching_words:
            return None
            
        start_time = min(word.start_time for word in matching_words)
        end_time = max(word.end_time for word in matching_words)
        
        return TimeFrame(
            start_time=start_time,
            end_time=end_time,
            text=search_text
        )

    def get_text_at_second(self, second: int) -> Optional[str]:
        """Find the text being spoken at a specific second"""
        words_at_second = [
            wp for wp in self.word_positions 
            if (math.floor(wp.start_time) <= second <= math.ceil(wp.end_time))
        ]
        
        if not words_at_second:
            return None
            
        start_char = min(wp.start_char for wp in words_at_second)
        end_char = max(wp.end_char for wp in words_at_second)

        return start_char, end_char, self.text[:end_char]
