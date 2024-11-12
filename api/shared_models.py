import enum

class SoilTexture(enum.Enum):
    CLAY = 'clay'
    SILT = 'silt'
    SAND = 'sand'
    LOAM = 'loam'
    
    __str__ = lambda self: self.value
    __hash__ = lambda self: hash(self.value)
