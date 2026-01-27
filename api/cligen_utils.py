import os
import shutil
import subprocess


_thisdir = os.path.dirname(os.path.abspath(__file__))
_bin_dir = os.path.join(_thisdir, "cligen", "bin")

CLIGEN431_BIN = os.path.join(_bin_dir, "cligen431")
CLIGEN430_BIN = os.path.join(_bin_dir, "cligen430")
CLIGEN532_BIN = os.path.join(_bin_dir, "cligen532")


class CligenError(RuntimeError):
    def __init__(self, message, log_tail=None):
        super().__init__(message)
        self.log_tail = log_tail or ""


def _read_log_tail(log_path, max_chars=2000):
    if not log_path or not os.path.exists(log_path):
        return ""
    try:
        with open(log_path, "r") as log_file:
            return log_file.read()[-max_chars:].strip()
    except OSError:
        return ""


def _write_inp_4x(inp_path, par_path, cli_path, years, version):
    with open(inp_path, "w") as inp_file:
        inp_file.write(f"{version}\n")
        inp_file.write(f"{par_path}\n")
        inp_file.write("n do not display file here\n")
        inp_file.write("5 Multiple-year WEPP format\n")
        inp_file.write("1\n")
        inp_file.write(f"{years}\n")
        inp_file.write(f"{cli_path}\n")
        inp_file.write("n\n")


def _write_inp_5x(inp_path, years, cli_fname):
    with open(inp_path, "w") as inp_file:
        inp_file.write("5\n1\n{years}\n{cli_fname}\nn\n\n".format(
            years=years,
            cli_fname=cli_fname,
        ))


def run_cligen(par_path, cli_path, years, cliver="5.3.2", randseed=12345, wd=None):
    if not os.path.exists(par_path):
        raise CligenError("CLIGEN parameter file does not exist.")
    if wd is None:
        wd = os.path.dirname(par_path) or "."
    os.makedirs(wd, exist_ok=True)

    cli_fname = os.path.basename(cli_path)

    if cliver in ("4.31", "4.30"):
        cligen_bin = CLIGEN431_BIN if cliver == "4.31" else CLIGEN430_BIN
        if not os.path.exists(cligen_bin):
            raise CligenError(f"cligen {cliver} binary not found.")
        short_id = os.path.splitext(cli_fname)[0][:8]
        short_par = f"c43_{short_id}.par"
        short_cli = f"c43_{short_id}.cli"
        short_inp = f"c43_{short_id}.inp"
        inp_path = os.path.join(wd, short_inp)
        log_path = os.path.join(wd, f"cligen4x_{short_id}.log")
        short_par_path = os.path.join(wd, short_par)
        short_cli_path = os.path.join(wd, short_cli)
        if par_path != short_par_path:
            shutil.copy(par_path, short_par_path)
        _write_inp_4x(inp_path, short_par, short_cli, years, cliver)
        cmd = [cligen_bin, f"-r{randseed}"]
        stdin_path = inp_path
    else:
        if not os.path.exists(CLIGEN532_BIN):
            raise CligenError("cligen532 binary not found.")
        # CLIGEN 5.3 truncates filenames to 50 chars, so use short names
        # similar to the 4.3 approach, then rename output afterward.
        short_id = os.path.splitext(cli_fname)[0][:8]
        short_par = f"c53_{short_id}.par"
        short_cli = f"c53_{short_id}.cli"
        short_inp = f"c53_{short_id}.inp"
        inp_path = os.path.join(wd, short_inp)
        log_path = os.path.join(wd, f"cligen53_{short_id}.log")
        short_par_path = os.path.join(wd, short_par)
        short_cli_path = os.path.join(wd, short_cli)
        if par_path != short_par_path:
            shutil.copy(par_path, short_par_path)
        _write_inp_5x(inp_path, years, short_cli)
        cmd = [CLIGEN532_BIN, f"-i{short_par}", f"-r{randseed}"]
        stdin_path = inp_path

    if os.path.exists(cli_path):
        os.remove(cli_path)
    if cliver in ("4.31", "4.30", "5.3.2"):
        if os.path.exists(short_cli_path):
            os.remove(short_cli_path)

    try:
        with open(stdin_path, "r") as stdin_file, open(log_path, "w") as log_file:
            proc = subprocess.Popen(
                cmd,
                stdin=stdin_file,
                stdout=log_file,
                stderr=log_file,
                cwd=wd,
            )
            proc.wait(timeout=50)
    except Exception as exc:
        tail = _read_log_tail(log_path)
        raise CligenError("Failed to generate climate file.", tail) from exc

    if cliver in ("4.31", "4.30", "5.3.2"):
        if os.path.exists(short_cli_path):
            shutil.move(short_cli_path, cli_path)
    if not os.path.exists(cli_path):
        tail = _read_log_tail(log_path)
        raise CligenError("Failed to generate climate file (output missing).", tail)

    return cli_path
