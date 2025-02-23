from dataclasses import dataclass, asdict

@dataclass
class TimeFrame:
    start_time: float
    end_time: float
    text: str

    def to_dict(self):
        return asdict(self)

@dataclass
class WordPosition:
    start_char: int
    end_char: int
    start_time: float
    end_time: float
    word: str

    def to_dict(self):
        return asdict(self)
