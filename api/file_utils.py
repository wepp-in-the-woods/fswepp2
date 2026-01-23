import os
import tempfile
from contextlib import contextmanager


@contextmanager
def atomic_write(path, mode="w", encoding="utf-8"):
    dirpath = os.path.dirname(path)
    if dirpath:
        os.makedirs(dirpath, exist_ok=True)

    fd, tmp_path = tempfile.mkstemp(prefix=".tmp", dir=dirpath or None)
    try:
        if "b" in mode:
            with os.fdopen(fd, mode) as handle:
                yield handle
        else:
            with os.fdopen(fd, mode, encoding=encoding) as handle:
                yield handle
        os.replace(tmp_path, path)
    except Exception:
        try:
            os.unlink(tmp_path)
        except FileNotFoundError:
            pass
        raise
