"""
CEEMDAN Preprocessing for IoT sensor time-series.
Compatible with Python 3.12 + EMD-signal==2.0.0
Falls back to moving-average decomposition if PyEMD unavailable.
"""
import numpy as np
import torch
import logging

logger = logging.getLogger(__name__)

try:
    from PyEMD import CEEMDAN
    CEEMDAN_AVAILABLE = True
except ImportError:
    CEEMDAN_AVAILABLE = False
    logger.warning("PyEMD not available — using moving-average fallback")


class CEEMDANPreprocessor:
    def __init__(self, n_imfs=4, window_size=64, overlap=0.5, n_ensembles=50):
        self.n_imfs      = n_imfs
        self.window_size = window_size
        self.stride      = max(1, int(window_size * (1 - overlap)))
        self.ceemdan     = CEEMDAN(trials=n_ensembles, noise_width=0.2) if CEEMDAN_AVAILABLE else None

    def normalize(self, signal):
        lo, hi = signal.min(), signal.max()
        if hi - lo < 1e-8: return np.zeros_like(signal), lo, hi
        return (signal - lo) / (hi - lo), lo, hi

    def _fallback_decompose(self, signal):
        imfs, rem = [], signal.copy()
        for i in range(self.n_imfs - 1):
            w = max(3, len(signal) // (2 ** (i + 1)))
            if w % 2 == 0: w += 1
            trend = np.convolve(rem, np.ones(w)/w, mode='same')
            imfs.append(rem - trend)
            rem = trend
        imfs.append(rem)
        return np.array(imfs[:self.n_imfs])

    def decompose(self, signal):
        norm, _, _ = self.normalize(signal)
        if self.ceemdan is not None and len(signal) >= 8:
            try:
                imfs = self.ceemdan(norm)
                n    = min(self.n_imfs, len(imfs))
                sel  = imfs[:n]
                if len(sel) < self.n_imfs:
                    sel = np.vstack([sel, np.zeros((self.n_imfs-len(sel), len(signal)))])
                return sel
            except Exception as e:
                logger.warning(f"CEEMDAN failed: {e}")
        return self._fallback_decompose(norm)

    def create_windows(self, imfs):
        _, L = imfs.shape
        wins = [imfs[:, s:s+self.window_size] for s in range(0, L-self.window_size+1, self.stride)]
        if not wins:
            wins = [np.pad(imfs, ((0,0),(0,self.window_size-L)))]
        return np.array(wins)

    def process(self, sensor_data: dict) -> torch.Tensor:
        channels = []
        for _, readings in sensor_data.items():
            sig = np.array(readings, dtype=np.float32)
            if len(sig) < 4:
                channels.append(np.zeros((self.n_imfs, self.window_size), dtype=np.float32))
                continue
            imfs = self.decompose(sig)
            wins = self.create_windows(imfs)
            channels.append(wins[0])
        if not channels:
            raise ValueError("No sensor data")
        w  = min(c.shape[-1] for c in channels)
        cb = np.vstack([c[:,:w] for c in channels])
        return torch.tensor(cb, dtype=torch.float32).unsqueeze(0)


class SensorDataValidator:
    RANGES = {
        "temperature":(-20,60),"humidity":(0,100),"co2":(300,5000),
        "soil_moisture":(0,100),"ndvi":(-1,1),"wind_speed":(0,100),
    }
    def validate_and_clean(self, data):
        out = {}
        for k,v in data.items():
            arr = np.array(v, dtype=np.float32)
            arr = arr[np.isfinite(arr)]
            if len(arr)==0: continue
            if k in self.RANGES: arr = np.clip(arr, *self.RANGES[k])
            out[k] = arr.tolist()
        return out
