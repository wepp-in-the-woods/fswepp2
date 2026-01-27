from __future__ import annotations

import os
from dataclasses import dataclass

from .file_utils import atomic_write


@dataclass(frozen=True)
class FrostSettings:
    wint_red: int
    fine_top: int
    fine_bot: int
    ksnowf: float = 1.0
    kresf: float = 1.0
    ksoilf: float = 1.0
    kfactor1: float = 0.5
    kfactor2: float | None = None
    kfactor3: float | None = None

    def to_text(self) -> str:
        line1 = f"{self.wint_red} {self.fine_top} {self.fine_bot}"
        parts = [self.ksnowf, self.kresf, self.ksoilf, self.kfactor1]
        if self.kfactor2 is not None:
            parts.append(self.kfactor2)
        if self.kfactor3 is not None:
            parts.append(self.kfactor3)
        line2 = " ".join(f"{value:.6f}" for value in parts)
        return f"{line1}\n{line2}\n"


FROST_DEFAULTS = {
    "disturbed": FrostSettings(1, 2, 2),
    "ermit": FrostSettings(1, 2, 2),
    "wepproad": FrostSettings(0, 2, 2),
    "fume": FrostSettings(1, 2, 2),
}


def ensure_frost_file(dir_path: str, settings: FrostSettings, filename: str = "frost.txt") -> str:
    os.makedirs(dir_path, exist_ok=True)
    frost_path = os.path.join(dir_path, filename)
    contents = settings.to_text()
    if os.path.exists(frost_path):
        try:
            with open(frost_path, "r") as handle:
                if handle.read() == contents:
                    return frost_path
        except OSError:
            pass
    with atomic_write(frost_path, "w") as handle:
        handle.write(contents)
    return frost_path
